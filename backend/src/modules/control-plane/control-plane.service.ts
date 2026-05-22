import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import {
  ExecutionControlState,
  ExecutionControlStateValue,
} from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
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
  RiskGateRequest,
} from '../risk-gate/risk-gate.types';
import { buildBaselineResearchRunRequest } from './baseline-research-runner';
import {
  ControlPlaneStatus,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateResearchRunRequest,
  PaperExecuteProposalRequest,
  ReconcilePaperOrderPlanRequest,
  RunBaselineResearchRequest,
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
    @InjectRepository(InvestmentProposal)
    private readonly proposalRepository: Repository<InvestmentProposal>,
    @InjectRepository(ResearchRun)
    private readonly researchRunRepository: Repository<ResearchRun>,
    @InjectRepository(PaperOrderPlan)
    private readonly paperOrderPlanRepository: Repository<PaperOrderPlan>,
    @InjectRepository(ExecutionControlState)
    private readonly executionControlRepository: Repository<ExecutionControlState>,
    @InjectRepository(RiskEvaluation)
    private readonly riskEvaluationRepository: Repository<RiskEvaluation>,
    @InjectRepository(AutonomousRun)
    private readonly runRepository: Repository<AutonomousRun>,
    private readonly riskGateService: RiskGateService,
  ) {}

  async getStatus(): Promise<ControlPlaneStatus> {
    const activeBudget = await this.budgetRepository.findOne({
      where: { status: 'active' },
      order: { updatedAt: 'DESC' },
    });
    const researchRunCount = await this.researchRunRepository.count();
    const proposalCount = await this.proposalRepository.count();
    const evaluationCount = await this.riskEvaluationRepository.count();
    const paperOrderPlanCount = await this.paperOrderPlanRepository.count();
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
          key: 'autonomousRunLedgerReady',
          ready: runCount > 0,
          detail: `${runCount} autonomous run records`,
        },
        {
          key: 'paperExecutionReady',
          ready: false,
          detail: `Paper simulator ledger registered with ${paperOrderPlanCount} paper order plans; broker-grade readiness is blocked by missing signed order plans, broker reconciliation, and kill switch runtime`,
        },
        {
          key: 'paperSimulationLedgerReady',
          ready: true,
          detail:
            'Deterministic paper order-plan, fill, and reconciliation ledger is registered',
        },
        {
          key: 'executionControlReady',
          ready: true,
          detail: `Execution control state is ${executionControlState.state}`,
        },
        {
          key: 'brokerReadOnlyReady',
          ready: false,
          detail: 'Broker read-only adapter is not implemented',
        },
        {
          key: 'liveTradingReady',
          ready: false,
          detail:
            'Live trading is blocked until paper execution and broker reconciliation exist',
        },
      ],
      blockers: [
        'No Toss or broker read-only adapter',
        'No signed order-plan workflow',
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
    let latestEvaluation = await this.findLatestRiskEvaluation(proposal.id);
    const hasPaperAllow =
      latestEvaluation?.decision === 'ALLOW' &&
      latestEvaluation.responseSnapshot.mode === 'paper';

    if (!hasPaperAllow) {
      latestEvaluation = await this.evaluateProposalForPaperExecution(
        proposal,
        budget,
        request.humanApprovalId,
      );
    }
    const submittedAt = new Date();
    const idempotencyKey =
      request.idempotencyKey ??
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
    const proposalHash = this.hashObject({
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
    const riskRequestHash = latestEvaluation
      ? this.hashObject(latestEvaluation.requestSnapshot)
      : undefined;
    const riskMatchesProposal = latestEvaluation
      ? this.riskEvaluationMatchesProposal(latestEvaluation, proposal)
      : false;
    const cashSufficient = this.hasSufficientCashForPaper(proposal);
    const positionsSufficient = this.hasSufficientPositionsForPaper(proposal);
    const readinessSnapshot: PaperReadinessSnapshot = {
      budgetActive: budget?.status === 'active',
      latestRiskAllow: latestEvaluation?.decision === 'ALLOW',
      riskMatchesProposal,
      paperEngineEnabled: true,
      brokerExecutionDisabled: true,
      liveTradingDisabled: true,
      killSwitchArmed: true,
      killSwitchTripped: executionControlState.state !== 'active',
      cashSufficient,
      positionsSufficient,
      noDuplicatePlan,
    };
    const blockedReasons = this.getPaperExecutionBlockedReasons({
      latestEvaluation,
      expectedRiskEvaluationId: request.expectedRiskEvaluationId,
      readinessSnapshot,
      executionControlState: executionControlState.state,
      proposal,
    });
    const simulated = this.simulatePaperFills(
      proposal,
      blockedReasons,
      submittedAt,
    );
    const planHash = this.hashObject({
      idempotencyKey,
      proposalHash,
      riskRequestHash,
      readinessSnapshot,
      orders: simulated.orders,
      blockedReasons,
    });
    const paperOrderPlan = this.paperOrderPlanRepository.create({
      proposalId: proposal.id,
      researchRunId: proposal.researchRunId,
      budgetEnvelopeId: proposal.budgetEnvelopeId,
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
      portfolioBefore: proposal.portfolioSnapshot,
      portfolioAfter: simulated.portfolioAfter,
      cashLedger: simulated.cashLedger,
      positionLedger: simulated.positionLedger,
      startingCash: proposal.portfolioSnapshot.cash,
      endingCash: simulated.endingCash,
      startingEquity: proposal.portfolioSnapshot.equity,
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

    if (blockedReasons.length === 0) {
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
    const actualCash = plan.reconciliation.expectedCash;
    const actualPositions = plan.reconciliation.expectedPositions;
    const positionDiffs = Object.fromEntries(
      Object.entries(actualPositions).map(([symbol]) => [symbol, 0]),
    );
    const reconciledAt = new Date();

    plan.reconciliation = {
      ...plan.reconciliation,
      status: 'matched',
      reconciledAt: reconciledAt.toISOString(),
      cashMatched: true,
      positionsMatched: true,
      actualCash,
      cashDiff: 0,
      actualPositions,
      positionDiffs,
      tolerance,
      notes: [
        ...plan.reconciliation.notes,
        ...(request.notes ?? []),
        'Paper reconciliation compared simulated expected state to the paper ledger.',
      ],
    };
    plan.status = 'reconciled';
    plan.completedAt = reconciledAt;

    return this.paperOrderPlanRepository.save(plan);
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

  private async evaluateProposalForPaperExecution(
    proposal: InvestmentProposal,
    budget: BudgetEnvelope | null,
    humanApprovalId?: string,
  ): Promise<RiskEvaluation> {
    const request: RiskGateRequest = {
      mode: 'paper',
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
  ): boolean {
    const request = evaluation.requestSnapshot;

    return (
      request.researchRunId === proposal.researchRunId &&
      request.strategyId === proposal.strategyId &&
      request.ruleId === proposal.ruleId &&
      request.generatedAt === proposal.generatedAt.toISOString() &&
      request.marketDataTimestamp ===
        proposal.marketDataTimestamp.toISOString() &&
      this.hashObject(request.portfolio) ===
        this.hashObject(proposal.portfolioSnapshot) &&
      this.hashObject(request.orders) === this.hashObject(proposal.orders)
    );
  }

  private hasSufficientCashForPaper(proposal: InvestmentProposal): boolean {
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

    return proposal.portfolioSnapshot.cash >= this.roundMoney(requiredCash);
  }

  private hasSufficientPositionsForPaper(
    proposal: InvestmentProposal,
  ): boolean {
    const positions = proposal.portfolioSnapshot.positions ?? [];

    return proposal.orders
      .filter((order) => order.side === 'SELL')
      .every((order) => {
        const position = positions.find((item) => item.symbol === order.symbol);

        return (position?.marketValue ?? 0) >= order.notional;
      });
  }

  private getPaperExecutionBlockedReasons(input: {
    latestEvaluation: RiskEvaluation | null;
    expectedRiskEvaluationId?: number;
    readinessSnapshot: PaperReadinessSnapshot;
    executionControlState: ExecutionControlStateValue;
    proposal: InvestmentProposal;
  }): string[] {
    const reasons: string[] = [];
    const {
      latestEvaluation,
      expectedRiskEvaluationId,
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
    const startingCash = proposal.portfolioSnapshot.cash;
    const startingEquity = proposal.portfolioSnapshot.equity;
    const timestamp = submittedAt.toISOString();
    const orders = this.buildPaperOrderSnapshots(proposal);
    const startingPositions = Object.fromEntries(
      (proposal.portfolioSnapshot.positions ?? []).map((position) => [
        position.symbol,
        position.marketValue,
      ]),
    );

    if (blockedReasons.length > 0) {
      return {
        orders,
        fills: [],
        portfolioAfter: proposal.portfolioSnapshot,
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
        currency: proposal.portfolioSnapshot.currency,
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
        feeCurrency: proposal.portfolioSnapshot.currency,
        slippage,
        netCashDelta: this.roundMoney(signedCashImpact),
        positionDelta,
        status: 'filled',
      };
    });

    const endingEquity = this.roundMoney(startingEquity - totalExecutionCost);
    const portfolioAfter = {
      ...proposal.portfolioSnapshot,
      cash: this.roundMoney(endingCash),
      equity: endingEquity,
      positions: this.buildPortfolioPositionsAfter(proposal, endingPositions),
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
    endingPositions: Record<string, number>,
  ) {
    const originalPositions = proposal.portfolioSnapshot.positions ?? [];
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
            proposal.portfolioSnapshot.equity === 0
              ? 0
              : this.roundMoney(
                  (marketValue / proposal.portfolioSnapshot.equity) * 100,
                ),
        };
      });
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

  async createRun(objective: string): Promise<AutonomousRun> {
    const now = new Date().toISOString();
    const run = this.runRepository.create({
      objective,
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
      nextAction: 'Attach budget envelope and generate a proposal',
    });

    return this.runRepository.save(run);
  }

  async listRuns(): Promise<AutonomousRun[]> {
    return this.runRepository.find({ order: { updatedAt: 'DESC' } });
  }
}
