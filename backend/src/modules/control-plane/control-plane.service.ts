import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import { RiskGateRequest } from '../risk-gate/risk-gate.types';
import {
  ControlPlaneStatus,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
  CreateResearchRunRequest,
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
          detail: 'Paper execution enclave is not implemented',
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
        'No paper execution enclave',
        'No Toss or broker read-only adapter',
        'No signed order-plan workflow',
        'No reconciliation loop',
        'No operational kill switch runtime',
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

  async listResearchRuns(): Promise<ResearchRun[]> {
    return this.researchRunRepository.find({ order: { updatedAt: 'DESC' } });
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
