import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { AutonomousRunSchedule } from '../../entities/autonomous-run-schedule.entity';
import {
  BrokerSnapshot,
  BrokerSnapshotReconciliation,
} from '../../entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import {
  ExecutionControlState,
  ExecutionControlStateValue,
} from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { OrderPlanApproval } from '../../entities/order-plan-approval.entity';
import {
  PaperAccountEvent,
  PaperAccountEventSnapshot,
  PaperAccountEventType,
} from '../../entities/paper-account-event.entity';
import { PaperAccount } from '../../entities/paper-account.entity';
import {
  PaperCashLedgerEntry,
  PaperFill,
  PaperOrderSnapshot,
  PaperOrderPlan,
  PaperPositionLedgerEntry,
  PaperReadinessSnapshot,
  PaperReconciliation,
} from '../../entities/paper-order-plan.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import {
  PortfolioSnapshot,
  ProposedOrder,
  RiskGateRequest,
} from '../risk-gate/risk-gate.types';
import { buildBaselineResearchRunRequest } from './baseline-research-runner';
import {
  AdvanceAutonomousRunRequest,
  ControlPlaneStatus,
  CreateAutonomousRunScheduleRequest,
  CreateAutonomousRunRequest,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateOrderPlanApprovalRequest,
  CreateResearchRunRequest,
  ImportBrokerSnapshotRequest,
  PaperExecuteProposalRequest,
  PromotePaperAccountRequest,
  ReconcileBrokerSnapshotRequest,
  ReconcilePaperOrderPlanRequest,
  RunBaselineResearchRequest,
  SeedPaperAccountRequest,
  TickAutonomousRunScheduleRequest,
  UpdateExecutionControlRequest,
} from './control-plane.types';

@Injectable()
export class ControlPlaneService {
  private readonly disallowedModelCategories = new Set([
    'llm_direct_trade',
    'reinforcement_learning_allocator',
    'direct_order_model',
  ]);

  constructor(
    @InjectRepository(BudgetEnvelope)
    private readonly budgetRepository: Repository<BudgetEnvelope>,
    @InjectRepository(BrokerSnapshot)
    private readonly brokerSnapshotRepository: Repository<BrokerSnapshot>,
    @InjectRepository(InvestmentProposal)
    private readonly proposalRepository: Repository<InvestmentProposal>,
    @InjectRepository(OrderPlanApproval)
    private readonly orderPlanApprovalRepository: Repository<OrderPlanApproval>,
    @InjectRepository(ResearchRun)
    private readonly researchRunRepository: Repository<ResearchRun>,
    @InjectRepository(PaperAccount)
    private readonly paperAccountRepository: Repository<PaperAccount>,
    @InjectRepository(PaperAccountEvent)
    private readonly paperAccountEventRepository: Repository<PaperAccountEvent>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperOrderPlanRepository: Repository<PaperOrderPlan>,
    @InjectRepository(ExecutionControlState)
    private readonly executionControlRepository: Repository<ExecutionControlState>,
    @InjectRepository(RiskEvaluation)
    private readonly riskEvaluationRepository: Repository<RiskEvaluation>,
    @InjectRepository(AutonomousRun)
    private readonly runRepository: Repository<AutonomousRun>,
    @InjectRepository(AutonomousRunSchedule)
    private readonly runScheduleRepository: Repository<AutonomousRunSchedule>,
    private readonly riskGateService: RiskGateService,
  ) {}

  async getStatus(): Promise<ControlPlaneStatus> {
    const activeBudget = await this.budgetRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });
    const researchRunCount = await this.researchRunRepository.count();
    const proposalCount = await this.proposalRepository.count();
    const orderPlanApprovalCount =
      await this.orderPlanApprovalRepository.count();
    const evaluationCount = await this.riskEvaluationRepository.count();
    const paperAccountCount = await this.paperAccountRepository.count();
    const paperAccountEventCount =
      await this.paperAccountEventRepository.count();
    const paperOrderPlanCount = await this.paperOrderPlanRepository.count();
    const brokerSnapshotCount = await this.brokerSnapshotRepository.count();
    const executionControlState = await this.getExecutionControlState();
    const runCount = await this.runRepository.count();

    return {
      brokerExecutionEnabled: false,
      liveTradingReady: false,
      readiness: [
        {
          key: 'budgetEnvelopeActive',
          ready: Boolean(activeBudget),
          detail: activeBudget
            ? `Active budget: ${activeBudget.name}`
            : 'No active budget envelope',
        },
        {
          key: 'researchRunLedgerReady',
          ready: researchRunCount > 0,
          detail: `${researchRunCount} research run records`,
        },
        {
          key: 'proposalLedgerReady',
          ready: proposalCount > 0,
          detail: `${proposalCount} proposal records`,
        },
        {
          key: 'riskGateReady',
          ready: true,
          detail: 'Deterministic risk gate is registered',
        },
        {
          key: 'riskAuditReady',
          ready: evaluationCount > 0,
          detail: `${evaluationCount} risk evaluations`,
        },
        {
          key: 'signedOrderPlanApprovalReady',
          ready: orderPlanApprovalCount > 0,
          detail: `${orderPlanApprovalCount} signed order-plan approvals`,
        },
        {
          key: 'autonomousRunLedgerReady',
          ready: runCount > 0,
          detail: `${runCount} autonomous run records`,
        },
        {
          key: 'paperExecutionReady',
          ready: false,
          detail: `Paper simulator ledger registered with ${paperOrderPlanCount} paper order plans; broker-grade readiness is blocked by production signing custody, broker reconciliation, and kill switch runtime`,
        },
        {
          key: 'paperSimulationLedgerReady',
          ready: true,
          detail:
            'Deterministic paper order-plan, fill, and reconciliation ledger is registered',
        },
        {
          key: 'paperAccountReady',
          ready: paperAccountCount > 0,
          detail: `${paperAccountCount} durable paper account records`,
        },
        {
          key: 'paperAccountEventLedgerReady',
          ready: paperAccountEventCount > 0,
          detail: `${paperAccountEventCount} append-only paper account events`,
        },
        {
          key: 'executionControlReady',
          ready: true,
          detail: `Execution control state is ${executionControlState.state}`,
        },
        {
          key: 'brokerReadOnlyReady',
          ready: false,
          detail:
            'Live broker adapter is not implemented; read-only snapshot ledger is available',
        },
        {
          key: 'brokerSnapshotLedgerReady',
          ready: brokerSnapshotCount > 0,
          detail: `${brokerSnapshotCount} broker read-only snapshots imported`,
        },
        {
          key: 'liveTradingReady',
          ready: false,
          detail:
            'Live trading is blocked until paper execution and broker reconciliation exist',
        },
      ],
      blockers: [
        'No verified Toss read-only adapter schema or credentials',
        'No production signed order-plan workflow',
        'No broker reconciliation loop',
        'No production kill switch runtime',
      ],
    };
  }

  async createBudgetEnvelope(
    request: CreateBudgetEnvelopeRequest,
  ): Promise<BudgetEnvelope> {
    const defaultPolicy = this.riskGateService.getPolicy();
    const policy = {
      ...defaultPolicy,
      ...request.policy,
      allowedAssetClasses:
        request.allowedAssetClasses ??
        request.policy?.allowedAssetClasses ??
        defaultPolicy.allowedAssetClasses,
      allowLiveTrading: false,
      requireHumanApproval: true,
    };

    const budget = this.budgetRepository.create({
      name: request.name,
      status: 'active',
      mode: request.mode ?? 'dry_run',
      currency: request.currency ?? 'KRW',
      totalBudget: request.totalBudget,
      cashReservePct: request.cashReservePct ?? 20,
      allowedAssetClasses: policy.allowedAssetClasses,
      policy,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      notes: request.notes,
    });

    return this.budgetRepository.save(budget);
  }

  async listBudgetEnvelopes(): Promise<BudgetEnvelope[]> {
    return this.budgetRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async createProposal(
    request: CreateInvestmentProposalRequest,
  ): Promise<InvestmentProposal> {
    if (!request.researchRunId) {
      throw new BadRequestException('Proposal requires a researchRunId');
    }

    const researchRun = await this.researchRunRepository.findOne({
      where: { id: request.researchRunId },
    });

    if (!researchRun) {
      throw new NotFoundException(
        `Research run ${request.researchRunId} not found`,
      );
    }

    if (
      !researchRun.advanceEligible ||
      researchRun.status !== 'proposal_ready'
    ) {
      throw new BadRequestException(
        `Research run ${request.researchRunId} is not proposal-ready`,
      );
    }

    const generatedAt = new Date(request.generatedAt);
    const marketDataTimestamp = new Date(request.marketDataTimestamp);

    const proposal = this.proposalRepository.create({
      budgetEnvelopeId: request.budgetEnvelopeId,
      researchRunId: request.researchRunId,
      strategyId: request.strategyId,
      ruleId: request.ruleId,
      actor: request.actor ?? 'strategy',
      status: 'generated',
      generatedAt,
      marketDataTimestamp,
      portfolioSnapshot: request.portfolioSnapshot,
      orders: request.orders,
      thesis: request.thesis,
      evidenceRefs: request.evidenceRefs ?? researchRun.artifactRefs,
      brokerExecutionEnabled: false,
      requiresHumanApproval: true,
    });

    const savedProposal = await this.proposalRepository.save(proposal);
    researchRun.phase = 'proposal_linked';
    await this.researchRunRepository.save(researchRun);

    return savedProposal;
  }

  async listProposals(): Promise<InvestmentProposal[]> {
    return this.proposalRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async evaluateProposal(proposalId: number): Promise<RiskEvaluation> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    if (!proposal.researchRunId) {
      throw new BadRequestException(
        `Proposal ${proposalId} requires research run provenance`,
      );
    }

    const budget = proposal.budgetEnvelopeId
      ? await this.budgetRepository.findOne({
          where: { id: proposal.budgetEnvelopeId },
        })
      : await this.budgetRepository.findOne({
          where: { status: 'active' },
          order: { updatedAt: 'DESC' },
        });

    const request: RiskGateRequest = {
      mode: budget?.mode ?? 'dry_run',
      actor: proposal.actor,
      researchRunId: proposal.researchRunId,
      strategyId: proposal.strategyId,
      ruleId: proposal.ruleId,
      generatedAt: proposal.generatedAt.toISOString(),
      marketDataTimestamp: proposal.marketDataTimestamp.toISOString(),
      portfolio: proposal.portfolioSnapshot,
      orders: proposal.orders,
      policy: budget?.policy,
      evidenceRefs: proposal.evidenceRefs,
      executionIntent: 'evaluate_only',
    };

    const response = this.riskGateService.evaluate(request);
    const evaluation = this.riskEvaluationRepository.create({
      proposalId: proposal.id,
      decision: response.decision,
      reasons: response.reasons,
      requestSnapshot: request,
      responseSnapshot: response,
      brokerExecutionEnabled: false,
      requiresHumanApproval: response.requiresHumanApproval,
      evaluatedAt: new Date(response.evaluatedAt),
    });

    const saved = await this.riskEvaluationRepository.save(evaluation);
    proposal.status =
      response.decision === 'DENY'
        ? 'rejected'
        : response.decision === 'REVIEW'
          ? 'needs_review'
          : request.mode === 'paper'
            ? 'paper_ready'
            : 'evaluated';
    proposal.requiresHumanApproval = response.requiresHumanApproval;
    await this.proposalRepository.save(proposal);

    return saved;
  }

  async listRiskEvaluations(): Promise<RiskEvaluation[]> {
    return this.riskEvaluationRepository.find({
      order: { evaluatedAt: 'DESC' },
    });
  }

  async createOrderPlanApproval(
    proposalId: number,
    request: CreateOrderPlanApprovalRequest,
  ): Promise<OrderPlanApproval> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    if (!request.approver?.trim()) {
      throw new BadRequestException('Order-plan approval requires approver');
    }

    if (!request.reason?.trim()) {
      throw new BadRequestException('Order-plan approval requires reason');
    }

    const budget = proposal.budgetEnvelopeId
      ? await this.budgetRepository.findOne({
          where: { id: proposal.budgetEnvelopeId },
        })
      : await this.budgetRepository.findOne({
          where: { status: 'active' },
          order: { updatedAt: 'DESC' },
        });
    const paperAccount = await this.findPaperAccountForProposal(proposal);
    if (!paperAccount) {
      throw new BadRequestException(
        'Order-plan approval requires an explicitly promoted paper account',
      );
    }
    const paperPortfolio = this.buildPaperAccountPortfolio(paperAccount);
    const idempotencyKey =
      request.idempotencyKey ?? `paper:proposal:${proposal.id}:approved`;
    const approvalRef = `approval:${proposal.id}:${idempotencyKey}:${request.approver}`;
    const latestEvaluation = await this.evaluateProposalForPaperExecution(
      proposal,
      budget,
      approvalRef,
      paperPortfolio,
    );

    if (
      request.expectedRiskEvaluationId !== undefined &&
      latestEvaluation.id !== request.expectedRiskEvaluationId
    ) {
      throw new BadRequestException(
        `Expected risk evaluation ${request.expectedRiskEvaluationId} does not match approval evaluation ${latestEvaluation.id}`,
      );
    }

    if (latestEvaluation.decision !== 'ALLOW') {
      throw new BadRequestException(
        `Order-plan approval requires paper-mode ALLOW risk evaluation, got ${latestEvaluation.decision}`,
      );
    }

    const expiresAt = request.expiresAt ? new Date(request.expiresAt) : null;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new BadRequestException('Order-plan approval expiresAt is invalid');
    }

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Order-plan approval cannot be expired');
    }

    const proposalHash = this.hashProposal(proposal);
    const riskRequestHash = this.hashObject(latestEvaluation.requestSnapshot);
    const approvedAt = new Date();
    const approvalSnapshot = {
      proposalId: proposal.id,
      riskEvaluationId: latestEvaluation.id,
      mode: 'paper' as const,
      approver: request.approver,
      reason: request.reason,
      idempotencyKey,
      approvedOrderCount: latestEvaluation.responseSnapshot.approvedOrderCount,
      approvedAt: approvedAt.toISOString(),
      expiresAt: expiresAt?.toISOString(),
      proposalHash,
      riskRequestHash,
    };
    const approvalHash = this.hashObject(approvalSnapshot);

    const approval = await this.orderPlanApprovalRepository.save(
      this.orderPlanApprovalRepository.create({
        proposalId: proposal.id,
        budgetEnvelopeId: proposal.budgetEnvelopeId,
        riskEvaluationId: latestEvaluation.id,
        idempotencyKey,
        mode: 'paper',
        approver: request.approver,
        reason: request.reason,
        status: 'active',
        proposalHash,
        riskRequestHash,
        approvalHash,
        approvalSnapshot,
        approvedAt,
        expiresAt: expiresAt ?? undefined,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );

    proposal.status = 'paper_ready';
    proposal.requiresHumanApproval = false;
    await this.proposalRepository.save(proposal);

    return approval;
  }

  async listOrderPlanApprovals(): Promise<OrderPlanApproval[]> {
    return this.orderPlanApprovalRepository.find({
      order: { updatedAt: 'DESC' },
    });
  }

  async getPaperAccountState(): Promise<PaperAccount> {
    const latest = await this.paperAccountRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });

    if (latest) {
      return latest;
    }

    throw new NotFoundException(
      'No active paper account exists. A paper execution or explicit seed step must create it first.',
    );
  }

  async seedPaperAccount(
    request: SeedPaperAccountRequest,
  ): Promise<PaperAccount> {
    if (!request.actor?.trim()) {
      throw new BadRequestException('Paper account seed requires actor');
    }

    if (!request.reason?.trim()) {
      throw new BadRequestException('Paper account seed requires reason');
    }

    if (
      request.cash < 0 ||
      (request.equity !== undefined && request.equity < 0)
    ) {
      throw new BadRequestException(
        'Paper account seed cash/equity cannot be negative',
      );
    }

    const positions = request.positions ?? [];
    const positionsValue = positions.reduce(
      (total, position) => total + (position.marketValue ?? 0),
      0,
    );
    const equity =
      request.equity ?? this.roundMoney(request.cash + positionsValue);

    if (equity < request.cash) {
      throw new BadRequestException(
        'Paper account seed equity cannot be below cash',
      );
    }

    const budget = request.budgetEnvelopeId
      ? await this.budgetRepository.findOne({
          where: { id: request.budgetEnvelopeId },
        })
      : null;

    if (request.budgetEnvelopeId && !budget) {
      throw new NotFoundException(
        `Budget envelope ${request.budgetEnvelopeId} not found`,
      );
    }

    const idempotencyKey =
      request.idempotencyKey ??
      `paper-account-seed:${request.budgetEnvelopeId ?? 'default'}:${request.actor}`;
    const requestHash = this.hashObject({
      budgetEnvelopeId: request.budgetEnvelopeId,
      name: request.name,
      currency: request.currency ?? budget?.currency ?? 'KRW',
      cash: this.roundMoney(request.cash),
      equity: this.roundMoney(equity),
      positions,
      actor: request.actor,
      reason: request.reason,
      idempotencyKey,
    });
    const existingSeed =
      await this.findPaperAccountEventByIdempotencyKey(idempotencyKey);

    if (existingSeed) {
      this.assertIdempotentEventReplay(existingSeed, requestHash);
      const existingAccount = await this.paperAccountRepository.findOne({
        where: { id: existingSeed.paperAccountId },
      });

      if (existingAccount) {
        return existingAccount;
      }
    }

    const existingAccounts = await this.paperAccountRepository.find({
      order: { updatedAt: 'DESC' },
    });
    const existingAccount = existingAccounts.find(
      (account) =>
        ['seeded', 'active'].includes(account.status) &&
        (request.budgetEnvelopeId
          ? account.budgetEnvelopeId === request.budgetEnvelopeId
          : !account.budgetEnvelopeId),
    );

    if (existingAccount) {
      throw new BadRequestException(
        `Paper account ${existingAccount.id} already exists for this scope; seed is intentionally one-time and idempotent`,
      );
    }

    const currency = request.currency ?? budget?.currency ?? 'KRW';
    const grossExposurePct =
      request.grossExposurePct ??
      this.calculateGrossExposurePct(positions, equity);
    const paperAccount = await this.paperAccountRepository.save(
      this.paperAccountRepository.create({
        name:
          request.name ??
          (budget
            ? `${budget.name} seeded paper account`
            : 'Seeded paper account'),
        budgetEnvelopeId: request.budgetEnvelopeId,
        status: 'seeded',
        currency,
        cash: this.roundMoney(request.cash),
        equity: this.roundMoney(equity),
        grossExposurePct,
        positions,
        cashLedger: [],
        positionLedger: [],
        appliedPlanIds: [],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );

    await this.appendPaperAccountEvent({
      paperAccount,
      eventType: 'explicit_seed',
      idempotencyKey,
      actor: request.actor,
      reason: request.reason,
      requestHash,
      cashBefore: 0,
      cashAfter: paperAccount.cash,
      equityBefore: 0,
      equityAfter: paperAccount.equity,
      positionsBefore: [],
      positionsAfter: paperAccount.positions,
    });

    return paperAccount;
  }

  async promotePaperAccount(
    paperAccountId: number,
    request: PromotePaperAccountRequest,
  ): Promise<PaperAccount> {
    if (!request.actor?.trim()) {
      throw new BadRequestException('Paper account promotion requires actor');
    }

    if (!request.reason?.trim()) {
      throw new BadRequestException('Paper account promotion requires reason');
    }

    const paperAccount = await this.paperAccountRepository.findOne({
      where: { id: paperAccountId },
    });

    if (!paperAccount) {
      throw new NotFoundException(`Paper account ${paperAccountId} not found`);
    }

    const idempotencyKey =
      request.idempotencyKey ?? `paper-account-promote:${paperAccount.id}`;
    const requestHash = this.hashObject({
      paperAccountId,
      actor: request.actor,
      reason: request.reason,
      expectedEventHash: request.expectedEventHash,
      expectedCurrentActiveAccountId: request.expectedCurrentActiveAccountId,
      idempotencyKey,
    });
    const existingPromotion =
      await this.findPaperAccountEventByIdempotencyKey(idempotencyKey);

    if (existingPromotion) {
      this.assertIdempotentEventReplay(existingPromotion, requestHash);
      return paperAccount;
    }

    if (paperAccount.status !== 'seeded') {
      throw new BadRequestException(
        `Paper account ${paperAccount.id} must be seeded before promotion`,
      );
    }

    const latestEvent = await this.getLatestPaperAccountEvent(paperAccount.id);

    if (!latestEvent || latestEvent.eventType !== 'explicit_seed') {
      throw new BadRequestException(
        'Paper account promotion requires an explicit seed event',
      );
    }

    if (
      request.expectedEventHash &&
      latestEvent.eventHash !== request.expectedEventHash
    ) {
      throw new BadRequestException(
        'Paper account promotion expectedEventHash mismatch',
      );
    }

    const activeAccount = await this.findActivePaperAccountForScope(
      paperAccount.budgetEnvelopeId,
    );

    if (
      activeAccount &&
      activeAccount.id !== request.expectedCurrentActiveAccountId
    ) {
      throw new BadRequestException(
        `Active paper account ${activeAccount.id} already exists for this scope`,
      );
    }

    paperAccount.status = 'active';
    const saved = await this.paperAccountRepository.save(paperAccount);
    await this.appendPaperAccountEvent({
      paperAccount: saved,
      eventType: 'account_promoted',
      idempotencyKey,
      actor: request.actor,
      reason: request.reason,
      requestHash,
      cashBefore: saved.cash,
      cashAfter: saved.cash,
      equityBefore: saved.equity,
      equityAfter: saved.equity,
      positionsBefore: saved.positions,
      positionsAfter: saved.positions,
    });

    return saved;
  }

  async listPaperAccountEvents(): Promise<PaperAccountEvent[]> {
    const events = await this.paperAccountEventRepository.find({
      order: { createdAt: 'DESC' },
    });

    return events.sort(
      (left, right) =>
        right.createdAt.getTime() - left.createdAt.getTime() ||
        right.sequence - left.sequence,
    );
  }

  async importBrokerSnapshot(
    request: ImportBrokerSnapshotRequest,
  ): Promise<BrokerSnapshot> {
    this.assertReadOnlyBrokerSnapshotRequest(request);

    const asOf = new Date(request.asOf);

    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException(
        'Broker snapshot asOf must be a valid date',
      );
    }

    if (asOf.getTime() > Date.now() + 60_000) {
      throw new BadRequestException('Broker snapshot asOf cannot be future');
    }

    if (request.cash < 0 || request.equity < 0) {
      throw new BadRequestException(
        'Broker snapshot cash and equity cannot be negative',
      );
    }

    const positions = request.positions ?? [];
    const grossExposurePct =
      request.grossExposurePct ??
      this.calculateGrossExposurePct(positions, request.equity);
    const actualBrokerPositions = this.positionsToMarketValueMap(positions);
    const reconciliation: BrokerSnapshotReconciliation = {
      status: 'not_checked',
      cashMatched: false,
      equityMatched: false,
      positionsMatched: false,
      actualBrokerCash: this.roundMoney(request.cash),
      actualBrokerEquity: this.roundMoney(request.equity),
      actualBrokerPositions,
      tolerance: 0.01,
      maxAgeMinutes: 60,
      notes: [
        'Imported as read-only broker evidence. No order endpoint was called.',
      ],
    };

    return this.brokerSnapshotRepository.save(
      this.brokerSnapshotRepository.create({
        provider: request.provider ?? 'manual',
        sourceRef: request.sourceRef,
        accountRefHash: request.accountRef
          ? this.hashObject({ accountRef: request.accountRef })
          : undefined,
        status: 'imported',
        currency: request.currency ?? 'KRW',
        cash: this.roundMoney(request.cash),
        equity: this.roundMoney(request.equity),
        grossExposurePct,
        positions,
        asOf,
        reconciliation,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  }

  async listBrokerSnapshots(): Promise<BrokerSnapshot[]> {
    return this.brokerSnapshotRepository.find({
      order: { asOf: 'DESC', updatedAt: 'DESC' },
    });
  }

  async getLatestBrokerSnapshot(): Promise<BrokerSnapshot> {
    const latest = await this.brokerSnapshotRepository.findOne({
      where: {},
      order: { asOf: 'DESC', updatedAt: 'DESC' },
    });

    if (!latest) {
      throw new NotFoundException('No broker read-only snapshot exists');
    }

    return latest;
  }

  async reconcileBrokerSnapshot(
    snapshotId: number,
    request: ReconcileBrokerSnapshotRequest = {},
  ): Promise<BrokerSnapshot> {
    const snapshot = await this.brokerSnapshotRepository.findOne({
      where: { id: snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException(`Broker snapshot ${snapshotId} not found`);
    }

    const paperAccount = request.paperAccountId
      ? await this.paperAccountRepository.findOne({
          where: { id: request.paperAccountId },
        })
      : await this.paperAccountRepository.findOne({
          where: { status: 'active' },
          order: { updatedAt: 'DESC' },
        });

    if (!paperAccount) {
      throw new NotFoundException(
        'Broker snapshot reconciliation requires an active paper account',
      );
    }

    const tolerance = request.tolerance ?? snapshot.reconciliation.tolerance;
    const maxAgeMinutes =
      request.maxAgeMinutes ?? snapshot.reconciliation.maxAgeMinutes;
    const checkedAt = new Date();
    const ageMinutes = (checkedAt.getTime() - snapshot.asOf.getTime()) / 60_000;
    const expectedPaperPositions = this.positionsToMarketValueMap(
      paperAccount.positions,
    );
    const actualBrokerPositions = this.positionsToMarketValueMap(
      snapshot.positions,
    );
    const allSymbols = Array.from(
      new Set([
        ...Object.keys(expectedPaperPositions),
        ...Object.keys(actualBrokerPositions),
      ]),
    );
    const positionDiffs = Object.fromEntries(
      allSymbols.map((symbol) => [
        symbol,
        this.roundMoney(
          (actualBrokerPositions[symbol] ?? 0) -
            (expectedPaperPositions[symbol] ?? 0),
        ),
      ]),
    );
    const cashDiff = this.roundMoney(snapshot.cash - paperAccount.cash);
    const equityDiff = this.roundMoney(snapshot.equity - paperAccount.equity);
    const cashMatched = Math.abs(cashDiff) <= tolerance;
    const equityMatched = Math.abs(equityDiff) <= tolerance;
    const positionsMatched = Object.values(positionDiffs).every(
      (diff) => Math.abs(diff) <= tolerance,
    );
    const stale = ageMinutes > maxAgeMinutes;
    const status = stale
      ? 'stale'
      : cashMatched && equityMatched && positionsMatched
        ? 'matched'
        : 'mismatch';

    snapshot.status = status;
    snapshot.reconciliation = {
      status,
      checkedAt: checkedAt.toISOString(),
      paperAccountId: paperAccount.id,
      cashMatched,
      equityMatched,
      positionsMatched,
      expectedPaperCash: paperAccount.cash,
      actualBrokerCash: snapshot.cash,
      cashDiff,
      expectedPaperEquity: paperAccount.equity,
      actualBrokerEquity: snapshot.equity,
      equityDiff,
      expectedPaperPositions,
      actualBrokerPositions,
      positionDiffs,
      tolerance,
      maxAgeMinutes,
      notes: [
        ...snapshot.reconciliation.notes,
        ...(request.notes ?? []),
        stale
          ? `Broker snapshot is stale: ${this.roundMoney(ageMinutes)} minutes old.`
          : 'Broker snapshot compared against active paper account state.',
      ],
    };

    return this.brokerSnapshotRepository.save(snapshot);
  }

  async getExecutionControlState(): Promise<ExecutionControlState> {
    const latest = await this.executionControlRepository.findOne({
      where: {},
      order: { createdAt: 'DESC' },
    });

    if (latest) {
      return latest;
    }

    return this.executionControlRepository.save(
      this.executionControlRepository.create({
        state: 'active',
        actor: 'system',
        reason: 'Default execution-control state for paper simulation only.',
      }),
    );
  }

  async updateExecutionControlState(
    request: UpdateExecutionControlRequest,
  ): Promise<ExecutionControlState> {
    return this.executionControlRepository.save(
      this.executionControlRepository.create({
        state: request.state,
        actor: request.actor ?? 'human',
        reason: request.reason,
      }),
    );
  }

  async paperExecuteProposal(
    proposalId: number,
    request: PaperExecuteProposalRequest = {},
  ): Promise<PaperOrderPlan> {
    const proposal = await this.proposalRepository.findOne({
      where: { id: proposalId },
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal ${proposalId} not found`);
    }

    const executionControlState = await this.getExecutionControlState();
    const budget = proposal.budgetEnvelopeId
      ? await this.budgetRepository.findOne({
          where: { id: proposal.budgetEnvelopeId },
        })
      : await this.budgetRepository.findOne({
          where: { status: 'active' },
          order: { updatedAt: 'DESC' },
        });
    const paperAccount = await this.findPaperAccountForProposal(proposal);
    const paperPortfolioBefore = paperAccount
      ? this.buildPaperAccountPortfolio(paperAccount)
      : this.buildSeedPaperPortfolioForProposal(proposal, budget);
    const orderPlanApproval = await this.findOrderPlanApprovalForPaperExecution(
      proposal.id,
      request,
    );
    let latestEvaluation = orderPlanApproval
      ? await this.riskEvaluationRepository.findOne({
          where: { id: orderPlanApproval.riskEvaluationId },
        })
      : await this.findLatestRiskEvaluation(proposal.id);
    const hasPaperAllow =
      latestEvaluation?.decision === 'ALLOW' &&
      latestEvaluation.responseSnapshot.mode === 'paper' &&
      this.riskEvaluationMatchesProposal(
        latestEvaluation,
        proposal,
        paperPortfolioBefore,
      );

    if (!hasPaperAllow) {
      latestEvaluation = await this.evaluateProposalForPaperExecution(
        proposal,
        budget,
        orderPlanApproval?.approvalHash,
        paperPortfolioBefore,
      );
    }
    const submittedAt = new Date();
    const idempotencyKey =
      request.idempotencyKey ??
      orderPlanApproval?.idempotencyKey ??
      `paper:proposal:${proposal.id}:risk:${latestEvaluation?.id ?? 'none'}`;
    const existingIdempotentPlan =
      await this.findPaperOrderPlanByIdempotencyKey(
        proposal.id,
        idempotencyKey,
      );

    if (existingIdempotentPlan) {
      return existingIdempotentPlan;
    }

    const existingPlans = await this.findPaperOrderPlansForProposal(
      proposal.id,
    );
    const noDuplicatePlan = !existingPlans.some((plan) =>
      [
        'planned',
        'simulating',
        'partially_filled',
        'filled',
        'reconciled',
      ].includes(plan.status),
    );
    const proposalHash = this.hashProposal(proposal);
    const riskRequestHash = latestEvaluation
      ? this.hashObject(latestEvaluation.requestSnapshot)
      : undefined;
    const riskMatchesProposal = latestEvaluation
      ? this.riskEvaluationMatchesProposal(
          latestEvaluation,
          proposal,
          paperPortfolioBefore,
        )
      : false;
    const cashSufficient = this.hasSufficientCashForPaper(
      proposal,
      paperPortfolioBefore,
    );
    const positionsSufficient = this.hasSufficientPositionsForPaper(
      proposal,
      paperPortfolioBefore,
    );
    const readinessSnapshot: PaperReadinessSnapshot = {
      budgetActive: budget?.status === 'active',
      latestRiskAllow: latestEvaluation?.decision === 'ALLOW',
      riskMatchesProposal,
      paperEngineEnabled: true,
      brokerExecutionDisabled: true,
      liveTradingDisabled: true,
      explicitPaperAccountActive: Boolean(paperAccount),
      killSwitchArmed: true,
      killSwitchTripped: executionControlState.state !== 'active',
      cashSufficient,
      positionsSufficient,
      noDuplicatePlan,
    };
    const blockedReasons = this.getPaperExecutionBlockedReasons({
      latestEvaluation,
      expectedRiskEvaluationId: request.expectedRiskEvaluationId,
      orderPlanApproval,
      idempotencyKey,
      readinessSnapshot,
      executionControlState: executionControlState.state,
      proposal,
    });
    const simulated = this.simulatePaperFills(
      proposal,
      paperPortfolioBefore,
      blockedReasons,
      submittedAt,
    );

    const planHash = this.hashObject({
      idempotencyKey,
      proposalHash,
      riskRequestHash,
      orderPlanApprovalHash: orderPlanApproval?.approvalHash,
      readinessSnapshot,
      orders: simulated.orders,
      blockedReasons,
    });
    const paperOrderPlan = this.paperOrderPlanRepository.create({
      proposalId: proposal.id,
      researchRunId: proposal.researchRunId,
      budgetEnvelopeId: proposal.budgetEnvelopeId,
      paperAccountId: paperAccount?.id,
      orderPlanApprovalId: orderPlanApproval?.id,
      riskEvaluationId: latestEvaluation?.id,
      proposalHash,
      riskRequestHash,
      planHash,
      idempotencyKey,
      status: blockedReasons.length > 0 ? 'blocked' : 'filled',
      mode: 'paper',
      submittedAt,
      completedAt: blockedReasons.length > 0 ? submittedAt : undefined,
      readinessSnapshot,
      orders: simulated.orders,
      fills: simulated.fills,
      portfolioBefore: paperPortfolioBefore,
      portfolioAfter: simulated.portfolioAfter,
      cashLedger: simulated.cashLedger,
      positionLedger: simulated.positionLedger,
      startingCash: paperPortfolioBefore.cash,
      endingCash: simulated.endingCash,
      startingEquity: paperPortfolioBefore.equity,
      endingEquity: simulated.endingEquity,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      reconciliation: simulated.reconciliation,
      killSwitchSnapshot: {
        armed: true,
        tripped: executionControlState.state !== 'active',
        checkedAt: submittedAt.toISOString(),
        reason: `Execution control state is ${executionControlState.state}.`,
      },
      killSwitchEvent:
        executionControlState.state === 'active'
          ? undefined
          : {
              armed: true,
              tripped: true,
              reason: `Execution control state is ${executionControlState.state}.`,
              actor: executionControlState.actor,
              timestamp: submittedAt.toISOString(),
            },
      blockedReasons,
    });

    const saved = await this.paperOrderPlanRepository.save(paperOrderPlan);

    if (blockedReasons.length === 0 && paperAccount) {
      await this.applyPaperPlanToAccount(saved, paperAccount);
      if (orderPlanApproval) {
        orderPlanApproval.status = 'consumed';
        orderPlanApproval.consumedAt = submittedAt;
        orderPlanApproval.consumedByPaperOrderPlanId = saved.id;
        await this.orderPlanApprovalRepository.save(orderPlanApproval);
      }
      proposal.status = 'paper_ready';
      await this.proposalRepository.save(proposal);
    }

    return saved;
  }

  async listPaperOrderPlans(): Promise<PaperOrderPlan[]> {
    return this.paperOrderPlanRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async getPaperOrderPlan(planId: number): Promise<PaperOrderPlan> {
    const plan = await this.paperOrderPlanRepository.findOne({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException(`Paper order plan ${planId} not found`);
    }

    return plan;
  }

  async reconcilePaperOrderPlan(
    planId: number,
    request: ReconcilePaperOrderPlanRequest = {},
  ): Promise<PaperOrderPlan> {
    const plan = await this.getPaperOrderPlan(planId);

    if (plan.status === 'blocked') {
      return plan;
    }

    const tolerance = request.tolerance ?? plan.reconciliation.tolerance;
    const paperAccount = plan.paperAccountId
      ? await this.paperAccountRepository.findOne({
          where: { id: plan.paperAccountId },
        })
      : await this.findPaperAccountForPlan(plan);

    if (!paperAccount) {
      throw new NotFoundException(
        `Paper account for order plan ${planId} not found`,
      );
    }

    const { actualCash, actualPositions } =
      this.buildPlanScopedActualsFromAccount(plan, paperAccount);
    const expectedPositions = plan.reconciliation.expectedPositions;
    const allSymbols = Array.from(
      new Set([
        ...Object.keys(expectedPositions),
        ...Object.keys(actualPositions),
      ]),
    );
    const positionDiffs = Object.fromEntries(
      allSymbols.map((symbol) => [
        symbol,
        this.roundMoney(
          (actualPositions[symbol] ?? 0) - (expectedPositions[symbol] ?? 0),
        ),
      ]),
    );
    const cashDiff = this.roundMoney(
      actualCash - plan.reconciliation.expectedCash,
    );
    const cashMatched = Math.abs(cashDiff) <= tolerance;
    const positionsMatched = Object.values(positionDiffs).every(
      (diff) => Math.abs(diff) <= tolerance,
    );
    const reconciledAt = new Date();

    plan.reconciliation = {
      ...plan.reconciliation,
      status: cashMatched && positionsMatched ? 'matched' : 'mismatch',
      reconciledAt: reconciledAt.toISOString(),
      cashMatched,
      positionsMatched,
      actualCash,
      cashDiff,
      actualPositions,
      positionDiffs,
      tolerance,
      notes: [
        ...plan.reconciliation.notes,
        ...(request.notes ?? []),
        'Paper reconciliation compared expected state to account ledger entries for this plan.',
      ],
    };
    plan.status =
      cashMatched && positionsMatched ? 'reconciled' : 'reconciliation_failed';
    plan.completedAt = reconciledAt;
    paperAccount.lastReconciledAt = reconciledAt;
    await this.paperAccountRepository.save(paperAccount);

    return this.paperOrderPlanRepository.save(plan);
  }

  private buildPlanScopedActualsFromAccount(
    plan: PaperOrderPlan,
    paperAccount: PaperAccount,
  ): {
    actualCash: number;
    actualPositions: Record<string, number>;
  } {
    const planFillIds = new Set(plan.fills.map((fill) => fill.paperFillId));
    const accountCashEvents = paperAccount.cashLedger.filter((entry) =>
      planFillIds.has(entry.paperFillId),
    );
    const accountPositionEvents = paperAccount.positionLedger.filter((entry) =>
      planFillIds.has(entry.paperFillId),
    );
    const actualCash =
      accountCashEvents.length > 0
        ? accountCashEvents[accountCashEvents.length - 1].balanceAfter
        : plan.portfolioBefore.cash;
    const actualPositions = {
      ...this.positionsToMarketValueMap(plan.portfolioBefore.positions),
    };

    for (const entry of accountPositionEvents) {
      actualPositions[entry.symbol] = entry.positionNotionalAfter;
    }

    return {
      actualCash: this.roundMoney(actualCash),
      actualPositions,
    };
  }

  async createResearchRun(
    request: CreateResearchRunRequest,
  ): Promise<ResearchRun> {
    const blockedReasons = this.getResearchRunBlockedReasons(request);
    const advanceEligible = blockedReasons.length === 0;
    const researchRun = this.researchRunRepository.create({
      budgetEnvelopeId: request.budgetEnvelopeId,
      objective: request.objective,
      strategyFamily: request.strategyFamily,
      hypothesis: request.hypothesis,
      status: advanceEligible ? 'proposal_ready' : 'blocked',
      phase: advanceEligible ? 'artifacts_persisted' : 'backtested',
      advanceEligible,
      blockedReasons,
      datasetRefs: request.datasetRefs,
      featureRefs: request.featureRefs,
      timestampLagRules: request.timestampLagRules,
      noLookaheadChecked: request.noLookaheadChecked,
      benchmark: request.benchmark,
      costModel: request.costModel,
      slippageModel: request.slippageModel,
      modelName: request.modelName,
      modelCategory: request.modelCategory ?? 'baseline',
      trainingWindow: request.trainingWindow,
      validationWindow: request.validationWindow,
      backtestMetrics: request.backtestMetrics,
      artifactRefs: request.artifactRefs,
      artifactHashes: request.artifactHashes,
      knownFailureModes: request.knownFailureModes,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
    });

    return this.researchRunRepository.save(researchRun);
  }

  private async findLatestRiskEvaluation(
    proposalId: number,
  ): Promise<RiskEvaluation | null> {
    const evaluations = await this.riskEvaluationRepository.find({
      order: { evaluatedAt: 'DESC' },
    });

    return (
      evaluations
        .filter((evaluation) => evaluation.proposalId === proposalId)
        .sort(
          (left, right) =>
            right.evaluatedAt.getTime() - left.evaluatedAt.getTime(),
        )[0] ?? null
    );
  }

  private async findOrderPlanApprovalForPaperExecution(
    proposalId: number,
    request: PaperExecuteProposalRequest,
  ): Promise<OrderPlanApproval | null> {
    if (request.orderPlanApprovalId) {
      const approval = await this.orderPlanApprovalRepository.findOne({
        where: { id: request.orderPlanApprovalId },
      });

      if (!approval) {
        throw new NotFoundException(
          `Order-plan approval ${request.orderPlanApprovalId} not found`,
        );
      }

      return approval;
    }

    const approvals = await this.orderPlanApprovalRepository.find({
      order: { updatedAt: 'DESC' },
    });

    return (
      approvals.find(
        (approval) =>
          approval.proposalId === proposalId &&
          approval.status === 'active' &&
          (!request.idempotencyKey ||
            approval.idempotencyKey === request.idempotencyKey),
      ) ?? null
    );
  }

  private async evaluateProposalForPaperExecution(
    proposal: InvestmentProposal,
    budget: BudgetEnvelope | null,
    humanApprovalId?: string,
    portfolio?: PortfolioSnapshot,
  ): Promise<RiskEvaluation> {
    const request: RiskGateRequest = {
      mode: 'paper',
      actor: proposal.actor,
      researchRunId: proposal.researchRunId,
      strategyId: proposal.strategyId,
      ruleId: proposal.ruleId,
      generatedAt: proposal.generatedAt.toISOString(),
      marketDataTimestamp: proposal.marketDataTimestamp.toISOString(),
      portfolio: portfolio ?? proposal.portfolioSnapshot,
      orders: proposal.orders,
      policy: budget?.policy,
      evidenceRefs: proposal.evidenceRefs,
      humanApprovalId,
      executionIntent: 'evaluate_only',
    };
    const response = this.riskGateService.evaluate(request);
    const evaluation = this.riskEvaluationRepository.create({
      proposalId: proposal.id,
      decision: response.decision,
      reasons: response.reasons,
      requestSnapshot: request,
      responseSnapshot: response,
      brokerExecutionEnabled: false,
      requiresHumanApproval: response.requiresHumanApproval,
      evaluatedAt: new Date(response.evaluatedAt),
    });

    return this.riskEvaluationRepository.save(evaluation);
  }

  private async findPaperAccountForProposal(
    proposal: InvestmentProposal,
  ): Promise<PaperAccount | null> {
    const existingForBudget = proposal.budgetEnvelopeId
      ? await this.paperAccountRepository.findOne({
          where: {
            budgetEnvelopeId: proposal.budgetEnvelopeId,
            status: 'active',
          },
          order: { updatedAt: 'DESC' },
        })
      : null;

    if (existingForBudget) {
      return existingForBudget;
    }

    const existingActive = await this.paperAccountRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });

    if (
      existingActive &&
      (!proposal.budgetEnvelopeId ||
        existingActive.budgetEnvelopeId === proposal.budgetEnvelopeId)
    ) {
      return existingActive;
    }

    return null;
  }

  private async findPaperAccountForPlan(
    plan: PaperOrderPlan,
  ): Promise<PaperAccount | null> {
    if (plan.budgetEnvelopeId) {
      return this.paperAccountRepository.findOne({
        where: {
          budgetEnvelopeId: plan.budgetEnvelopeId,
          status: 'active',
        },
        order: { updatedAt: 'DESC' },
      });
    }

    return this.paperAccountRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });
  }

  private buildSeedPaperPortfolioForProposal(
    proposal: InvestmentProposal,
    budget: BudgetEnvelope | null,
  ): PortfolioSnapshot {
    const seedCash = budget?.totalBudget ?? proposal.portfolioSnapshot.cash;
    const seedEquity = budget?.totalBudget ?? proposal.portfolioSnapshot.equity;
    const seedPositions = proposal.portfolioSnapshot.positions ?? [];

    return {
      currency: budget?.currency ?? proposal.portfolioSnapshot.currency,
      cash: seedCash,
      equity: seedEquity,
      grossExposurePct: this.calculateGrossExposurePct(
        seedPositions,
        seedEquity,
      ),
      positions: seedPositions,
    };
  }

  private async applyPaperPlanToAccount(
    plan: PaperOrderPlan,
    paperAccount: PaperAccount,
  ): Promise<PaperAccount> {
    if (paperAccount.appliedPlanIds.includes(plan.id)) {
      return paperAccount;
    }

    const cashBefore = paperAccount.cash;
    const equityBefore = paperAccount.equity;
    const positionsBefore = paperAccount.positions ?? [];
    paperAccount.cash = plan.portfolioAfter.cash;
    paperAccount.equity = plan.portfolioAfter.equity;
    paperAccount.positions = plan.portfolioAfter.positions ?? [];
    paperAccount.grossExposurePct = this.calculateGrossExposurePct(
      paperAccount.positions,
      paperAccount.equity,
    );
    paperAccount.cashLedger = [...paperAccount.cashLedger, ...plan.cashLedger];
    paperAccount.positionLedger = [
      ...paperAccount.positionLedger,
      ...plan.positionLedger,
    ];
    paperAccount.appliedPlanIds = [...paperAccount.appliedPlanIds, plan.id];
    paperAccount.lastAppliedPlanId = plan.id;

    const saved = await this.paperAccountRepository.save(paperAccount);
    await this.appendPaperAccountEvent({
      paperAccount: saved,
      eventType: 'paper_order_plan',
      sourceId: plan.id,
      idempotencyKey: `paper-account-plan:${plan.id}`,
      actor: 'paper-execution-engine',
      reason: `Applied paper order plan ${plan.id}.`,
      requestHash: this.hashObject({
        paperAccountId: saved.id,
        paperOrderPlanId: plan.id,
        planHash: plan.planHash,
        cashBefore,
        cashAfter: saved.cash,
        equityBefore,
        equityAfter: saved.equity,
      }),
      cashBefore,
      cashAfter: saved.cash,
      equityBefore,
      equityAfter: saved.equity,
      positionsBefore,
      positionsAfter: saved.positions,
    });

    return saved;
  }

  private async appendPaperAccountEvent(input: {
    paperAccount: PaperAccount;
    eventType: PaperAccountEventType;
    sourceId?: number;
    idempotencyKey: string;
    actor: string;
    reason: string;
    requestHash: string;
    cashBefore: number;
    cashAfter: number;
    equityBefore: number;
    equityAfter: number;
    positionsBefore: PortfolioSnapshot['positions'];
    positionsAfter: PortfolioSnapshot['positions'];
  }): Promise<PaperAccountEvent> {
    const existing = await this.findPaperAccountEventByIdempotencyKey(
      input.idempotencyKey,
    );

    if (existing) {
      this.assertIdempotentEventReplay(existing, input.requestHash);
      return existing;
    }

    const existingEvents = await this.paperAccountEventRepository.find({
      order: { createdAt: 'ASC' },
    });
    const accountEvents = existingEvents
      .filter((event) => event.paperAccountId === input.paperAccount.id)
      .sort((left, right) => left.sequence - right.sequence);
    const previousEvent = accountEvents[accountEvents.length - 1];
    const sequence = (previousEvent?.sequence ?? 0) + 1;
    const recordedAt = new Date();
    const eventSnapshot: PaperAccountEventSnapshot = {
      paperAccountId: input.paperAccount.id,
      budgetEnvelopeId: input.paperAccount.budgetEnvelopeId,
      eventType: input.eventType,
      sourceId: input.sourceId,
      idempotencyKey: input.idempotencyKey,
      actor: input.actor,
      reason: input.reason,
      sequence,
      currency: input.paperAccount.currency,
      cashBefore: this.roundMoney(input.cashBefore),
      cashAfter: this.roundMoney(input.cashAfter),
      equityBefore: this.roundMoney(input.equityBefore),
      equityAfter: this.roundMoney(input.equityAfter),
      positionsBefore: input.positionsBefore ?? [],
      positionsAfter: input.positionsAfter ?? [],
      previousEventHash: previousEvent?.eventHash,
      requestHash: input.requestHash,
      recordedAt: recordedAt.toISOString(),
    };
    const eventHash = this.hashObject(eventSnapshot);

    return this.paperAccountEventRepository.save(
      this.paperAccountEventRepository.create({
        paperAccountId: input.paperAccount.id,
        budgetEnvelopeId: input.paperAccount.budgetEnvelopeId,
        eventType: input.eventType,
        sourceId: input.sourceId,
        idempotencyKey: input.idempotencyKey,
        actor: input.actor,
        reason: input.reason,
        sequence,
        currency: input.paperAccount.currency,
        cashBefore: eventSnapshot.cashBefore,
        cashAfter: eventSnapshot.cashAfter,
        equityBefore: eventSnapshot.equityBefore,
        equityAfter: eventSnapshot.equityAfter,
        cashDelta: this.roundMoney(input.cashAfter - input.cashBefore),
        equityDelta: this.roundMoney(input.equityAfter - input.equityBefore),
        previousEventHash: previousEvent?.eventHash,
        requestHash: input.requestHash,
        eventHash,
        eventSnapshot,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  }

  private async findPaperAccountEventByIdempotencyKey(
    idempotencyKey: string,
  ): Promise<PaperAccountEvent | null> {
    const events = await this.paperAccountEventRepository.find({
      order: { createdAt: 'DESC' },
    });

    return (
      events.find((event) => event.idempotencyKey === idempotencyKey) ?? null
    );
  }

  private assertIdempotentEventReplay(
    event: PaperAccountEvent,
    requestHash: string,
  ): void {
    if (event.requestHash !== requestHash) {
      throw new BadRequestException(
        `Idempotency key ${event.idempotencyKey} was already used with a different request`,
      );
    }
  }

  private async getLatestPaperAccountEvent(
    paperAccountId: number,
  ): Promise<PaperAccountEvent | null> {
    const events = await this.paperAccountEventRepository.find({
      order: { createdAt: 'DESC' },
    });

    return (
      events
        .filter((event) => event.paperAccountId === paperAccountId)
        .sort((left, right) => right.sequence - left.sequence)[0] ?? null
    );
  }

  private async findActivePaperAccountForScope(
    budgetEnvelopeId?: number,
  ): Promise<PaperAccount | null> {
    const accounts = await this.paperAccountRepository.find({
      order: { updatedAt: 'DESC' },
    });

    return (
      accounts.find(
        (account) =>
          account.status === 'active' &&
          (budgetEnvelopeId
            ? account.budgetEnvelopeId === budgetEnvelopeId
            : !account.budgetEnvelopeId),
      ) ?? null
    );
  }

  private buildPaperAccountPortfolio(
    paperAccount: PaperAccount,
  ): PortfolioSnapshot {
    return {
      currency: paperAccount.currency,
      cash: paperAccount.cash,
      equity: paperAccount.equity,
      grossExposurePct: paperAccount.grossExposurePct,
      positions: paperAccount.positions,
    };
  }

  private async findPaperOrderPlansForProposal(
    proposalId: number,
  ): Promise<PaperOrderPlan[]> {
    const plans = await this.paperOrderPlanRepository.find({
      order: { updatedAt: 'DESC' },
    });

    return plans.filter((plan) => plan.proposalId === proposalId);
  }

  private async findPaperOrderPlanByIdempotencyKey(
    proposalId: number,
    idempotencyKey: string,
  ): Promise<PaperOrderPlan | null> {
    const plans = await this.findPaperOrderPlansForProposal(proposalId);

    return plans.find((plan) => plan.idempotencyKey === idempotencyKey) ?? null;
  }

  private riskEvaluationMatchesProposal(
    evaluation: RiskEvaluation,
    proposal: InvestmentProposal,
    portfolio: PortfolioSnapshot = proposal.portfolioSnapshot,
  ): boolean {
    const request = evaluation.requestSnapshot;

    return (
      request.researchRunId === proposal.researchRunId &&
      request.strategyId === proposal.strategyId &&
      request.ruleId === proposal.ruleId &&
      request.generatedAt === proposal.generatedAt.toISOString() &&
      request.marketDataTimestamp ===
        proposal.marketDataTimestamp.toISOString() &&
      this.hashObject(request.portfolio) === this.hashObject(portfolio) &&
      this.hashObject(request.orders) === this.hashObject(proposal.orders)
    );
  }

  private hasSufficientCashForPaper(
    proposal: InvestmentProposal,
    portfolio: PortfolioSnapshot,
  ): boolean {
    const requiredCash = proposal.orders
      .filter((order) => order.side === 'BUY')
      .reduce(
        (total, order) =>
          total +
          order.notional +
          this.roundMoney(order.notional * 0.001) +
          this.roundMoney(order.notional * 0.0005),
        0,
      );

    return portfolio.cash >= this.roundMoney(requiredCash);
  }

  private hasSufficientPositionsForPaper(
    proposal: InvestmentProposal,
    portfolio: PortfolioSnapshot,
  ): boolean {
    const availableBySymbol = this.positionsToMarketValueMap(
      portfolio.positions,
    );
    const requiredSellBySymbol = proposal.orders
      .filter((order) => order.side === 'SELL')
      .reduce<Record<string, number>>((required, order) => {
        required[order.symbol] = this.roundMoney(
          (required[order.symbol] ?? 0) + order.notional,
        );

        return required;
      }, {});

    return Object.entries(requiredSellBySymbol).every(
      ([symbol, requiredNotional]) =>
        (availableBySymbol[symbol] ?? 0) >= requiredNotional,
    );
  }

  private getPaperExecutionBlockedReasons(input: {
    latestEvaluation: RiskEvaluation | null;
    expectedRiskEvaluationId?: number;
    orderPlanApproval: OrderPlanApproval | null;
    idempotencyKey: string;
    readinessSnapshot: PaperReadinessSnapshot;
    executionControlState: ExecutionControlStateValue;
    proposal: InvestmentProposal;
  }): string[] {
    const reasons: string[] = [];
    const {
      latestEvaluation,
      expectedRiskEvaluationId,
      orderPlanApproval,
      idempotencyKey,
      readinessSnapshot,
      executionControlState,
      proposal,
    } = input;

    if (!readinessSnapshot.budgetActive) {
      reasons.push('Paper execution requires an active budget envelope');
    }

    if (!latestEvaluation) {
      reasons.push(
        'Paper execution requires a paper-mode ALLOW risk evaluation',
      );
    } else if (latestEvaluation.decision !== 'ALLOW') {
      reasons.push(`Latest risk decision is ${latestEvaluation.decision}`);
    } else if (latestEvaluation.responseSnapshot.mode !== 'paper') {
      reasons.push(
        'Paper execution requires a paper-mode ALLOW risk evaluation',
      );
    }

    if (
      expectedRiskEvaluationId !== undefined &&
      latestEvaluation?.id !== expectedRiskEvaluationId
    ) {
      reasons.push(
        `Expected risk evaluation ${expectedRiskEvaluationId} does not match latest evaluation ${latestEvaluation?.id ?? 'none'}`,
      );
    }

    if (latestEvaluation && !readinessSnapshot.riskMatchesProposal) {
      reasons.push('Latest risk evaluation does not match proposal snapshot');
    }

    if (!readinessSnapshot.explicitPaperAccountActive) {
      reasons.push(
        'Paper execution requires an explicitly promoted paper account',
      );
    }

    if (!orderPlanApproval) {
      reasons.push('Signed order-plan approval is required');
    } else {
      if (orderPlanApproval.status !== 'active') {
        reasons.push(
          `Signed order-plan approval is ${orderPlanApproval.status}`,
        );
      }

      if (
        orderPlanApproval.expiresAt &&
        orderPlanApproval.expiresAt.getTime() <= Date.now()
      ) {
        reasons.push('Signed order-plan approval is expired');
      }

      if (orderPlanApproval.idempotencyKey !== idempotencyKey) {
        reasons.push('Signed order-plan approval idempotency key mismatch');
      }

      if (latestEvaluation?.id !== orderPlanApproval.riskEvaluationId) {
        reasons.push('Signed order-plan approval risk evaluation mismatch');
      }
    }

    if (!readinessSnapshot.cashSufficient) {
      reasons.push('Paper execution cash check failed');
    }

    if (!readinessSnapshot.positionsSufficient) {
      reasons.push('Paper execution position check failed');
    }

    if (!readinessSnapshot.noDuplicatePlan) {
      reasons.push('Existing non-blocked paper order plan already exists');
    }

    if (
      executionControlState === 'paused' ||
      executionControlState === 'halted'
    ) {
      reasons.push(`Execution control state is ${executionControlState}`);
    }

    if (
      executionControlState === 'reducing' &&
      proposal.orders.some((order) => order.side !== 'SELL')
    ) {
      reasons.push('Execution control reducing state only permits SELL orders');
    }

    return reasons;
  }

  private simulatePaperFills(
    proposal: InvestmentProposal,
    portfolioBefore: PortfolioSnapshot,
    blockedReasons: string[],
    submittedAt: Date,
  ): {
    orders: PaperOrderSnapshot[];
    fills: PaperFill[];
    portfolioAfter: PortfolioSnapshot;
    cashLedger: PaperCashLedgerEntry[];
    positionLedger: PaperPositionLedgerEntry[];
    endingCash: number;
    endingEquity: number;
    reconciliation: PaperReconciliation;
  } {
    const startingCash = portfolioBefore.cash;
    const startingEquity = portfolioBefore.equity;
    const timestamp = submittedAt.toISOString();
    const orders = this.buildPaperOrderSnapshots(proposal);
    const startingPositions = Object.fromEntries(
      (portfolioBefore.positions ?? []).map((position) => [
        position.symbol,
        position.marketValue,
      ]),
    );

    if (blockedReasons.length > 0) {
      return {
        orders,
        fills: [],
        portfolioAfter: portfolioBefore,
        cashLedger: [],
        positionLedger: [],
        endingCash: startingCash,
        endingEquity: startingEquity,
        reconciliation: {
          status: 'not_required',
          cashMatched: true,
          positionsMatched: true,
          expectedCash: startingCash,
          actualCash: startingCash,
          cashDiff: 0,
          expectedPositions: startingPositions,
          actualPositions: startingPositions,
          positionDiffs: Object.fromEntries(
            Object.keys(startingPositions).map((symbol) => [symbol, 0]),
          ),
          tolerance: 0.01,
          notes: ['No fills were simulated because the plan is blocked.'],
        },
      };
    }

    let endingCash = startingCash;
    let totalExecutionCost = 0;
    const endingPositions: Record<string, number> = { ...startingPositions };
    const cashLedger: PaperCashLedgerEntry[] = [];
    const positionLedger: PaperPositionLedgerEntry[] = [];
    const fills = orders.map((order): PaperFill => {
      const fillPrice = order.requestedPrice ?? 1;
      const quantity =
        order.requestedQuantity ??
        this.roundQuantity(order.requestedNotional / fillPrice);
      const fee = this.roundMoney(order.requestedNotional * 0.001);
      const slippage = this.roundMoney(order.requestedNotional * 0.0005);
      const signedCashImpact =
        order.side === 'SELL'
          ? order.requestedNotional - fee - slippage
          : -order.requestedNotional - fee - slippage;
      const positionDelta =
        order.side === 'SELL' ? -quantity : this.roundQuantity(quantity);
      const notionalDelta =
        order.side === 'SELL'
          ? -order.requestedNotional
          : order.requestedNotional;
      endingCash += signedCashImpact;
      totalExecutionCost += fee + slippage;
      endingPositions[order.symbol] = this.roundMoney(
        (endingPositions[order.symbol] ?? 0) + notionalDelta,
      );
      const paperFillId = `${order.paperOrderId}:fill:0`;
      cashLedger.push({
        paperCashEventId: `${paperFillId}:cash`,
        paperFillId,
        timestamp,
        currency: portfolioBefore.currency,
        amount: this.roundMoney(signedCashImpact),
        balanceAfter: this.roundMoney(endingCash),
        reason: `${order.side} paper fill net cash delta`,
      });
      positionLedger.push({
        paperPositionEventId: `${paperFillId}:position`,
        paperFillId,
        timestamp,
        symbol: order.symbol,
        quantityDelta: positionDelta,
        notionalDelta: this.roundMoney(notionalDelta),
        positionNotionalAfter: endingPositions[order.symbol],
      });

      return {
        paperFillId,
        paperOrderId: order.paperOrderId,
        timestamp,
        symbol: order.symbol,
        side: order.side,
        quantity,
        fillPrice,
        grossNotional: order.requestedNotional,
        requestedNotional: order.requestedNotional,
        filledNotional: order.requestedNotional,
        fee,
        feeCurrency: portfolioBefore.currency,
        slippage,
        netCashDelta: this.roundMoney(signedCashImpact),
        positionDelta,
        status: 'filled',
      };
    });

    const endingEquity = this.roundMoney(startingEquity - totalExecutionCost);
    const positionsAfter = this.buildPortfolioPositionsAfter(
      proposal,
      portfolioBefore,
      endingPositions,
    );
    const portfolioAfter = {
      ...proposal.portfolioSnapshot,
      ...portfolioBefore,
      cash: this.roundMoney(endingCash),
      equity: endingEquity,
      positions: positionsAfter,
      grossExposurePct: this.calculateGrossExposurePct(
        positionsAfter,
        endingEquity,
      ),
    };

    return {
      orders,
      fills,
      portfolioAfter,
      cashLedger,
      positionLedger,
      endingCash: this.roundMoney(endingCash),
      endingEquity,
      reconciliation: {
        status: 'pending',
        cashMatched: false,
        positionsMatched: false,
        expectedCash: this.roundMoney(endingCash),
        expectedPositions: endingPositions,
        tolerance: 0.01,
        notes: [
          'Paper fills are deterministic simulations only.',
          'No broker credentials, account ids, or live order endpoints were used.',
          'Explicit paper reconciliation is still required before promotion.',
        ],
      },
    };
  }

  private buildPaperOrderSnapshots(
    proposal: InvestmentProposal,
  ): PaperOrderSnapshot[] {
    return proposal.orders.map((order, index) => ({
      paperOrderId: `paper-order:${proposal.id}:${index}`,
      proposalOrderIndex: index,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      requestedNotional: order.notional,
      requestedQuantity: order.quantity,
      requestedPrice: order.price,
      targetPositionPct: order.targetPositionPct,
      marketDataTimestamp: proposal.marketDataTimestamp.toISOString(),
      feeModelRef: 'fixed-10bps-paper-fee-v1',
      slippageModelRef: 'fixed-5bps-paper-slippage-v1',
      sourceOrder: order,
    }));
  }

  private buildPortfolioPositionsAfter(
    proposal: InvestmentProposal,
    portfolioBefore: PortfolioSnapshot,
    endingPositions: Record<string, number>,
  ) {
    const originalPositions = portfolioBefore.positions ?? [];
    const originalBySymbol = new Map(
      originalPositions.map((position) => [position.symbol, position]),
    );

    return Object.entries(endingPositions)
      .filter(([, marketValue]) => Math.abs(marketValue) > 0)
      .map(([symbol, marketValue]) => {
        const original = originalBySymbol.get(symbol);

        return {
          symbol,
          assetClass:
            original?.assetClass ??
            proposal.orders.find((order) => order.symbol === symbol)
              ?.assetClass ??
            'unknown',
          marketValue,
          weightPct:
            portfolioBefore.equity === 0
              ? 0
              : this.roundMoney((marketValue / portfolioBefore.equity) * 100),
        };
      });
  }

  private positionsToMarketValueMap(
    positions: PortfolioSnapshot['positions'] = [],
  ): Record<string, number> {
    return Object.fromEntries(
      positions.map((position) => [position.symbol, position.marketValue]),
    );
  }

  private assertReadOnlyBrokerSnapshotRequest(
    request: ImportBrokerSnapshotRequest,
  ): void {
    const disallowedKeys = [
      'brokerCredentials',
      'accessToken',
      'refreshToken',
      'secret',
      'clientSecret',
      'apiKey',
      'accountId',
      'orders',
      'order',
      'clientOrderId',
      'placeOrder',
      'cancelOrder',
    ];
    const presentDisallowedKey = disallowedKeys.find(
      (key) =>
        (request as unknown as Record<string, unknown>)[key] !== undefined,
    );

    if (presentDisallowedKey) {
      throw new BadRequestException(
        `Broker read-only snapshots cannot include ${presentDisallowedKey}`,
      );
    }
  }

  private calculateGrossExposurePct(
    positions: PortfolioSnapshot['positions'] = [],
    equity: number,
  ): number {
    if (equity === 0) {
      return 0;
    }

    const grossExposure = positions.reduce(
      (total, position) => total + Math.abs(position.marketValue),
      0,
    );

    return this.roundMoney((grossExposure / equity) * 100);
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }

  private roundQuantity(value: number): number {
    return Number(value.toFixed(8));
  }

  private hashObject(value: unknown): string {
    return `sha256:${createHash('sha256')
      .update(this.stableStringify(value))
      .digest('hex')}`;
  }

  private hashProposal(proposal: InvestmentProposal): string {
    return this.hashObject({
      proposalId: proposal.id,
      budgetEnvelopeId: proposal.budgetEnvelopeId,
      researchRunId: proposal.researchRunId,
      strategyId: proposal.strategyId,
      ruleId: proposal.ruleId,
      generatedAt: proposal.generatedAt,
      marketDataTimestamp: proposal.marketDataTimestamp,
      portfolioSnapshot: proposal.portfolioSnapshot,
      orders: proposal.orders,
      evidenceRefs: proposal.evidenceRefs,
    });
  }

  private stableStringify(value: unknown): string {
    if (value instanceof Date) {
      return JSON.stringify(value.toISOString());
    }

    if (Array.isArray(value)) {
      return `[${value.map((item) => this.stableStringify(item)).join(',')}]`;
    }

    if (value && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey));

      return `{${entries
        .map(
          ([key, entryValue]) =>
            `${JSON.stringify(key)}:${this.stableStringify(entryValue)}`,
        )
        .join(',')}}`;
    }

    return JSON.stringify(value);
  }

  async listResearchRuns(): Promise<ResearchRun[]> {
    return this.researchRunRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async runBaselineResearch(
    request: RunBaselineResearchRequest,
  ): Promise<ResearchRun> {
    const budget = request.budgetEnvelopeId
      ? await this.budgetRepository.findOne({
          where: { id: request.budgetEnvelopeId },
        })
      : await this.budgetRepository.findOne({
          where: { status: 'active' },
          order: { updatedAt: 'DESC' },
        });

    if (request.budgetEnvelopeId && !budget) {
      throw new NotFoundException(
        `Budget ${request.budgetEnvelopeId} not found`,
      );
    }

    if (!budget && !request.initialCapital) {
      throw new BadRequestException(
        'Baseline research requires a budget envelope or initialCapital',
      );
    }

    const researchRunRequest = buildBaselineResearchRunRequest(
      {
        ...request,
        budgetEnvelopeId: request.budgetEnvelopeId ?? budget?.id,
      },
      budget,
    );

    return this.createResearchRun(researchRunRequest);
  }

  private getResearchRunBlockedReasons(
    request: CreateResearchRunRequest,
  ): string[] {
    const reasons: string[] = [];

    if (!request.benchmark) {
      reasons.push('Benchmark is required');
    }

    if (!request.costModel) {
      reasons.push('Transaction cost model is required');
    }

    if (!request.slippageModel) {
      reasons.push('Slippage model is required');
    }

    if (!request.noLookaheadChecked) {
      reasons.push('No-lookahead check must pass before proposal creation');
    }

    const datasetRefs = request.datasetRefs ?? [];
    const artifactRefs = request.artifactRefs ?? [];
    const artifactHashes = request.artifactHashes ?? {};

    if (!datasetRefs.length) {
      reasons.push('At least one dataset reference is required');
    }

    for (const datasetRef of datasetRefs) {
      if (!datasetRef.availabilityTimestamp) {
        reasons.push(`Dataset ${datasetRef.id} is missing availability time`);
      }
    }

    if (!request.validationWindow?.start || !request.validationWindow?.end) {
      reasons.push('Validation window is required');
    }

    if (!artifactRefs.length) {
      reasons.push('At least one audit artifact is required');
    }

    for (const artifactRef of artifactRefs) {
      if (!artifactHashes[artifactRef]) {
        reasons.push(`Artifact ${artifactRef} is missing a hash`);
      }
    }

    const metrics = request.backtestMetrics;
    const coreMetrics = [
      ['totalReturnPct', metrics.totalReturnPct],
      ['benchmarkReturnPct', metrics.benchmarkReturnPct],
      ['maxDrawdownPct', metrics.maxDrawdownPct],
      ['sharpeRatio', metrics.sharpeRatio],
      ['turnoverPct', metrics.turnoverPct],
      ['tradeCount', metrics.tradeCount],
    ] as const;

    for (const [name, value] of coreMetrics) {
      if (!Number.isFinite(value)) {
        reasons.push(`Backtest metric ${name} must be finite`);
      }
    }

    if (metrics.tradeCount <= 0) {
      reasons.push('Backtest must include at least one trade');
    }

    const modelCategory = request.modelCategory ?? 'baseline';
    if (this.disallowedModelCategories.has(modelCategory)) {
      reasons.push(`Model category ${modelCategory} is not allowed`);
    }

    if (modelCategory !== 'baseline') {
      if (!request.trainingWindow?.start || !request.trainingWindow?.end) {
        reasons.push('Trained models require a training window');
      }

      if (!request.modelName) {
        reasons.push('Trained models require a model name');
      }
    }

    return reasons;
  }

  async createRun(
    request: CreateAutonomousRunRequest | string,
  ): Promise<AutonomousRun> {
    const objective =
      typeof request === 'string' ? request : request.objective?.trim();

    if (!objective) {
      throw new BadRequestException('Autonomous run requires objective');
    }

    const budgetEnvelopeId =
      typeof request === 'string' ? undefined : request.budgetEnvelopeId;

    if (budgetEnvelopeId) {
      const budget = await this.budgetRepository.findOne({
        where: { id: budgetEnvelopeId },
      });

      if (!budget) {
        throw new NotFoundException(
          `Budget envelope ${budgetEnvelopeId} not found`,
        );
      }
    }

    const now = new Date().toISOString();
    const run = this.runRepository.create({
      objective,
      budgetEnvelopeId,
      status: 'idle',
      currentStage: 'budget_defined',
      timeline: [
        {
          at: now,
          stage: 'idle',
          message: 'Run created. Waiting for research and proposal generation.',
        },
      ],
      lastAction: 'Created run ledger entry',
      nextAction: budgetEnvelopeId
        ? 'Advance run to generate research, proposal, and risk evaluation'
        : 'Attach or create an active budget envelope before advancing',
    });

    return this.runRepository.save(run);
  }

  async listRuns(): Promise<AutonomousRun[]> {
    return this.runRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async createRunSchedule(
    request: CreateAutonomousRunScheduleRequest,
  ): Promise<AutonomousRunSchedule> {
    this.validateCreateRunScheduleRequest(request);

    if (!request.objective?.trim()) {
      throw new BadRequestException('Autonomous schedule requires objective');
    }

    const budget = await this.budgetRepository.findOne({
      where: { id: request.budgetEnvelopeId },
    });

    if (!budget) {
      throw new NotFoundException(
        `Budget envelope ${request.budgetEnvelopeId} not found`,
      );
    }

    if (budget.status !== 'active') {
      throw new BadRequestException(
        'Autonomous schedule requires an active budget envelope',
      );
    }

    const cadenceMinutes = request.cadenceMinutes ?? 60;
    const mode = request.mode ?? 'dry_run';

    const nextRunAt = request.nextRunAt
      ? new Date(request.nextRunAt)
      : new Date();

    if (Number.isNaN(nextRunAt.getTime())) {
      throw new BadRequestException('Autonomous schedule nextRunAt is invalid');
    }

    return this.runScheduleRepository.save(
      this.runScheduleRepository.create({
        budgetEnvelopeId: budget.id,
        objective: request.objective.trim(),
        mode,
        cadenceMinutes,
        nextRunAt,
        enabled: request.enabled ?? true,
        attemptPaperExecution:
          mode === 'paper' && (request.attemptPaperExecution ?? true),
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  }

  async listRunSchedules(): Promise<AutonomousRunSchedule[]> {
    return this.runScheduleRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async listDueRunSchedules(
    limit = 5,
    now = new Date(),
  ): Promise<AutonomousRunSchedule[]> {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new BadRequestException('Due schedule limit must be positive');
    }

    return this.runScheduleRepository.find({
      where: [
        {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
          leaseExpiresAt: IsNull(),
        },
        {
          enabled: true,
          nextRunAt: LessThanOrEqual(now),
          leaseExpiresAt: LessThanOrEqual(now),
        },
      ],
      order: { nextRunAt: 'ASC' },
      take: limit,
    });
  }

  async tickRunSchedule(
    scheduleId: number,
    request: TickAutonomousRunScheduleRequest = {},
  ): Promise<AutonomousRun> {
    this.validateTickRunScheduleRequest(request);

    const schedule = await this.runScheduleRepository.findOne({
      where: { id: scheduleId },
    });

    if (!schedule) {
      throw new NotFoundException(
        `Autonomous schedule ${scheduleId} not found`,
      );
    }

    const now = new Date();
    const force = request.force ?? false;

    if (!schedule.enabled && !force) {
      throw new BadRequestException('Autonomous schedule is disabled');
    }

    if (schedule.nextRunAt.getTime() > now.getTime() && !force) {
      throw new BadRequestException('Autonomous schedule is not due yet');
    }

    const leaseTtlSeconds = request.leaseTtlSeconds ?? 120;
    const leaseOwner = (
      request.leaseOwner ??
      request.actor ??
      'manual-tick'
    ).trim();
    const leaseExpiresAt = new Date(now.getTime() + leaseTtlSeconds * 1000);
    const cycleKey = `schedule:${schedule.id}:${schedule.nextRunAt.toISOString()}`;
    const leaseCriteria = force
      ? [
          { id: schedule.id, leaseExpiresAt: IsNull() },
          { id: schedule.id, leaseExpiresAt: LessThanOrEqual(now) },
        ]
      : [
          {
            id: schedule.id,
            enabled: true,
            nextRunAt: schedule.nextRunAt,
            leaseExpiresAt: IsNull(),
          },
          {
            id: schedule.id,
            enabled: true,
            nextRunAt: schedule.nextRunAt,
            leaseExpiresAt: LessThanOrEqual(now),
          },
        ];
    const leaseResult = await this.runScheduleRepository.update(leaseCriteria, {
      leaseOwner,
      leaseExpiresAt,
      lastTickAt: now,
      lastError: null,
    });

    if (!leaseResult.affected) {
      throw new BadRequestException(
        `Autonomous schedule is already leased by ${schedule.leaseOwner ?? 'unknown'}`,
      );
    }

    try {
      const budget = await this.budgetRepository.findOne({
        where: { id: schedule.budgetEnvelopeId, status: 'active' },
      });

      if (!budget) {
        throw new BadRequestException(
          'Autonomous schedule requires an active budget envelope',
        );
      }

      let run = await this.findRunByScheduleCycle(schedule.id, cycleKey);

      if (!run) {
        run = this.runRepository.create({
          objective: schedule.objective,
          budgetEnvelopeId: schedule.budgetEnvelopeId,
          scheduleId: schedule.id,
          cycleKey,
          status: 'idle',
          currentStage: 'budget_defined',
          startedAt: new Date(),
          timeline: [
            {
              at: new Date().toISOString(),
              stage: 'idle',
              message: 'Created run ledger entry',
            },
          ],
          lastAction: 'Created run ledger entry',
          nextAction:
            'Advance run to generate research, proposal, and risk evaluation',
        });
        this.appendRunTimeline(
          run,
          'idle',
          `Schedule ${schedule.id} tick acquired by ${leaseOwner}.`,
        );
        run = await this.runRepository.save(run);
      }

      const advancedRun = await this.advanceRun(run.id, {
        attemptPaperExecution:
          schedule.mode === 'paper' &&
          (request.attemptPaperExecution ?? schedule.attemptPaperExecution),
      });
      const nextRunAt = new Date(
        schedule.nextRunAt.getTime() + schedule.cadenceMinutes * 60_000,
      );
      await this.releaseScheduleLease(schedule, leaseOwner, leaseExpiresAt, {
        lastRunId: advancedRun.id,
        lastCycleKey: cycleKey,
        nextRunAt,
        lastError:
          advancedRun.status === 'failed' ? (advancedRun.error ?? null) : null,
      });

      return advancedRun;
    } catch (error) {
      await this.releaseScheduleLease(schedule, leaseOwner, leaseExpiresAt, {
        lastError:
          error instanceof Error
            ? error.message
            : 'Autonomous schedule tick failed',
      });
      throw error;
    }
  }

  async advanceRun(
    runId: number,
    request: AdvanceAutonomousRunRequest = {},
  ): Promise<AutonomousRun> {
    const run = await this.runRepository.findOne({ where: { id: runId } });

    if (!run) {
      throw new NotFoundException(`Autonomous run ${runId} not found`);
    }

    try {
      const executionControl = await this.getExecutionControlState();
      if (
        executionControl.state === 'paused' ||
        executionControl.state === 'halted'
      ) {
        run.status = executionControl.state;
        run.currentStage = 'execution_control_blocked';
        run.lastAction = `Execution control is ${executionControl.state}`;
        run.nextAction =
          'Resume execution control before advancing the autonomous run';
        this.appendRunTimeline(
          run,
          executionControl.state,
          `Run did not advance because execution control is ${executionControl.state}.`,
        );
        return this.runRepository.save(run);
      }

      const budget = await this.findBudgetForRun(run);

      if (!budget) {
        run.status = 'failed';
        run.currentStage = 'budget_missing';
        run.lastAction = 'Budget lookup failed';
        run.nextAction = 'Create or attach an active budget envelope';
        run.error = 'Autonomous run requires an active budget envelope';
        this.appendRunTimeline(run, 'failed', run.error);
        return this.runRepository.save(run);
      }

      run.budgetEnvelopeId = budget.id;
      run.status = 'researching';
      run.currentStage = 'research_running';
      run.lastAction = `Selected budget envelope ${budget.id}`;
      run.nextAction = 'Run deterministic baseline research';
      this.appendRunTimeline(
        run,
        'researching',
        `Selected budget ${budget.name} (${budget.currency} ${budget.totalBudget}).`,
      );
      await this.runRepository.save(run);

      const researchRun = run.researchRunId
        ? await this.researchRunRepository.findOne({
            where: { id: run.researchRunId },
          })
        : await this.runBaselineResearch({
            budgetEnvelopeId: budget.id,
            objective: run.objective,
            initialCapital: budget.totalBudget,
          });

      if (!researchRun) {
        throw new NotFoundException(
          `Research run ${run.researchRunId} not found`,
        );
      }

      run.researchRunId = researchRun.id;
      this.appendRunTimeline(
        run,
        'researching',
        `Research run ${researchRun.id} finished with status ${researchRun.status}.`,
      );

      if (!researchRun.advanceEligible) {
        run.status = 'failed';
        run.currentStage = 'research_blocked';
        run.lastAction = `Research run ${researchRun.id} is blocked`;
        run.nextAction =
          'Review research blocked reasons before proposal generation';
        run.error = researchRun.blockedReasons.join('; ');
        this.appendRunTimeline(run, 'failed', run.error);
        return this.runRepository.save(run);
      }

      const proposal = run.proposalId
        ? await this.proposalRepository.findOne({
            where: { id: run.proposalId },
          })
        : await this.createBaselineProposalFromRun(researchRun, budget);

      if (!proposal) {
        throw new NotFoundException(`Proposal ${run.proposalId} not found`);
      }

      run.proposalId = proposal.id;
      run.status = 'proposed';
      run.currentStage = 'proposal_generated';
      run.lastAction = `Generated proposal ${proposal.id}`;
      run.nextAction = 'Evaluate proposal risk';
      this.appendRunTimeline(
        run,
        'proposed',
        `Proposal ${proposal.id} generated with ${proposal.orders.length} order(s).`,
      );
      await this.runRepository.save(run);

      const evaluation = run.riskEvaluationId
        ? await this.riskEvaluationRepository.findOne({
            where: { id: run.riskEvaluationId },
          })
        : await this.evaluateProposal(proposal.id);

      if (!evaluation) {
        throw new NotFoundException(
          `Risk evaluation ${run.riskEvaluationId} not found`,
        );
      }

      run.riskEvaluationId = evaluation.id;
      run.status = 'risk_checked';
      run.currentStage = 'risk_evaluated';
      run.lastAction = `Risk evaluation ${evaluation.id} returned ${evaluation.decision}`;
      run.nextAction =
        evaluation.decision === 'ALLOW'
          ? 'Wait for signed paper approval and active paper account before execution'
          : 'Resolve risk decision before paper execution';
      this.appendRunTimeline(
        run,
        'risk_checked',
        `Risk evaluation ${evaluation.id} returned ${evaluation.decision}.`,
      );

      const paperPlan =
        request.attemptPaperExecution === false
          ? null
          : await this.tryPaperExecutionForRun(proposal);

      if (paperPlan) {
        run.paperOrderPlanId = paperPlan.id;
        run.status =
          paperPlan.status === 'blocked' ? 'risk_checked' : 'paper_ready';
        run.currentStage =
          paperPlan.status === 'blocked'
            ? 'paper_execution_blocked'
            : 'paper_execution_recorded';
        run.lastAction = `Paper order plan ${paperPlan.id} ${paperPlan.status}`;
        run.nextAction =
          paperPlan.status === 'blocked'
            ? paperPlan.blockedReasons.join('; ')
            : 'Reconcile paper order plan and broker read-only snapshot';
        this.appendRunTimeline(
          run,
          run.status,
          `Paper order plan ${paperPlan.id} ${paperPlan.status}.`,
        );
      }

      run.error = undefined;
      return this.runRepository.save(run);
    } catch (error) {
      run.status = 'failed';
      run.currentStage = 'failed';
      run.error =
        error instanceof Error ? error.message : 'Autonomous run failed';
      run.lastAction = 'Autonomous run advance failed';
      run.nextAction = 'Inspect the failed run timeline and fix the blocker';
      this.appendRunTimeline(run, 'failed', run.error);
      return this.runRepository.save(run);
    }
  }

  private async findBudgetForRun(
    run: AutonomousRun,
  ): Promise<BudgetEnvelope | null> {
    if (run.budgetEnvelopeId) {
      return this.budgetRepository.findOne({
        where: { id: run.budgetEnvelopeId, status: 'active' },
      });
    }

    return this.budgetRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });
  }

  private validateCreateRunScheduleRequest(
    request: CreateAutonomousRunScheduleRequest,
  ): void {
    if (
      !Number.isInteger(request.budgetEnvelopeId) ||
      request.budgetEnvelopeId <= 0
    ) {
      throw new BadRequestException(
        'Autonomous schedule requires a positive budgetEnvelopeId',
      );
    }

    const allowedModes = new Set(['dry_run', 'paper', 'broker_read_only']);

    if (request.mode && !allowedModes.has(request.mode)) {
      throw new BadRequestException(
        'Autonomous schedules cannot enable live trading',
      );
    }

    if (
      request.cadenceMinutes !== undefined &&
      (!Number.isInteger(request.cadenceMinutes) || request.cadenceMinutes < 5)
    ) {
      throw new BadRequestException(
        'Autonomous schedule cadence must be at least 5 minutes',
      );
    }

    this.validateOptionalBoolean(
      request.enabled,
      'Autonomous schedule enabled must be boolean',
    );
    this.validateOptionalBoolean(
      request.attemptPaperExecution,
      'Autonomous schedule attemptPaperExecution must be boolean',
    );
  }

  private validateTickRunScheduleRequest(
    request: TickAutonomousRunScheduleRequest,
  ): void {
    this.validateOptionalBoolean(
      request.force,
      'Autonomous schedule force must be boolean',
    );
    this.validateOptionalBoolean(
      request.attemptPaperExecution,
      'Autonomous schedule attemptPaperExecution must be boolean',
    );

    if (
      request.leaseTtlSeconds !== undefined &&
      (!Number.isInteger(request.leaseTtlSeconds) ||
        request.leaseTtlSeconds < 1 ||
        request.leaseTtlSeconds > 3600)
    ) {
      throw new BadRequestException(
        'Autonomous schedule leaseTtlSeconds must be between 1 and 3600',
      );
    }

    this.validateOptionalNonEmptyString(
      request.actor,
      'Autonomous schedule actor must be a non-empty string',
    );
    this.validateOptionalNonEmptyString(
      request.leaseOwner,
      'Autonomous schedule leaseOwner must be a non-empty string',
    );
  }

  private validateOptionalBoolean(value: unknown, message: string): void {
    if (value !== undefined && typeof value !== 'boolean') {
      throw new BadRequestException(message);
    }
  }

  private validateOptionalNonEmptyString(
    value: unknown,
    message: string,
  ): void {
    if (value !== undefined && (typeof value !== 'string' || !value.trim())) {
      throw new BadRequestException(message);
    }
  }

  private async releaseScheduleLease(
    schedule: AutonomousRunSchedule,
    leaseOwner: string,
    leaseExpiresAt: Date,
    update: Partial<AutonomousRunSchedule>,
  ): Promise<void> {
    await this.runScheduleRepository.update(
      {
        id: schedule.id,
        leaseOwner,
        leaseExpiresAt,
      },
      {
        ...update,
        leaseOwner: null,
        leaseExpiresAt: null,
      },
    );
  }

  private async findRunByScheduleCycle(
    scheduleId: number,
    cycleKey: string,
  ): Promise<AutonomousRun | null> {
    return this.runRepository.findOne({
      where: { scheduleId, cycleKey },
    });
  }

  private async createBaselineProposalFromRun(
    researchRun: ResearchRun,
    budget: BudgetEnvelope,
  ): Promise<InvestmentProposal> {
    const generatedAt = new Date().toISOString();
    const investableBudget = this.roundMoney(
      budget.totalBudget * (1 - budget.cashReservePct / 100),
    );
    const maxSinglePositionNotional = this.roundMoney(
      budget.totalBudget * ((budget.policy?.maxSinglePositionPct ?? 20) / 100),
    );
    const orderNotional = this.roundMoney(
      Math.min(
        investableBudget,
        maxSinglePositionNotional,
        budget.policy?.maxOrderNotional ?? 1_000_000,
      ),
    );
    const symbol =
      researchRun.datasetRefs[0]?.universe?.[0] ?? 'SAMPLE_MOMENTUM_BASKET';
    const order: ProposedOrder = {
      symbol,
      assetClass: 'domestic_etf',
      side: 'BUY',
      orderType: 'MARKET',
      notional: orderNotional,
      targetPositionPct: this.roundMoney(
        (orderNotional / budget.totalBudget) * 100,
      ),
    };

    return this.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: `${researchRun.strategyFamily}:autonomous-baseline`,
      ruleId: 'budget-capped-single-position-v1',
      actor: 'scheduler',
      generatedAt,
      marketDataTimestamp: generatedAt,
      portfolioSnapshot: {
        currency: budget.currency,
        equity: budget.totalBudget,
        cash: budget.totalBudget,
        grossExposurePct: 0,
        positions: [],
      },
      orders: [order],
      thesis:
        'Autonomous baseline proposal generated from a reproducible research run and capped by the active budget risk policy.',
      evidenceRefs: researchRun.artifactRefs,
    });
  }

  private async tryPaperExecutionForRun(
    proposal: InvestmentProposal,
  ): Promise<PaperOrderPlan | null> {
    const existingPlan = (
      await this.findPaperOrderPlansForProposal(proposal.id)
    )
      .filter((plan) => plan.status !== 'blocked')
      .sort(
        (left, right) =>
          (right.updatedAt?.getTime?.() ?? right.id ?? 0) -
          (left.updatedAt?.getTime?.() ?? left.id ?? 0),
      )[0];

    if (existingPlan) {
      return existingPlan;
    }

    const activeApproval = (
      await this.orderPlanApprovalRepository.find({
        order: { updatedAt: 'DESC' },
      })
    ).find(
      (approval) =>
        approval.proposalId === proposal.id && approval.status === 'active',
    );
    const paperAccount = await this.findPaperAccountForProposal(proposal);

    if (!activeApproval || !paperAccount) {
      return null;
    }

    return this.paperExecuteProposal(proposal.id, {
      idempotencyKey: activeApproval.idempotencyKey,
      orderPlanApprovalId: activeApproval.id,
      expectedRiskEvaluationId: activeApproval.riskEvaluationId,
    });
  }

  private appendRunTimeline(
    run: AutonomousRun,
    stage: AutonomousRun['status'],
    message: string,
  ): void {
    run.timeline = [
      ...(run.timeline ?? []),
      {
        at: new Date().toISOString(),
        stage,
        message,
      },
    ];
  }
}
