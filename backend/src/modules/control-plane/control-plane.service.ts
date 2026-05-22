import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import { RiskGateRequest } from '../risk-gate/risk-gate.types';
import {
  ControlPlaneStatus,
  CreateBudgetEnvelopeRequest,
  CreateInvestmentProposalRequest,
} from './control-plane.types';

@Injectable()
export class ControlPlaneService {
  constructor(
    @InjectRepository(BudgetEnvelope)
    private readonly budgetRepository: Repository<BudgetEnvelope>,
    @InjectRepository(InvestmentProposal)
    private readonly proposalRepository: Repository<InvestmentProposal>,
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
    const generatedAt = new Date(request.generatedAt);
    const marketDataTimestamp = new Date(request.marketDataTimestamp);

    const proposal = this.proposalRepository.create({
      budgetEnvelopeId: request.budgetEnvelopeId,
      strategyId: request.strategyId,
      ruleId: request.ruleId,
      actor: request.actor ?? 'strategy',
      status: 'generated',
      generatedAt,
      marketDataTimestamp,
      portfolioSnapshot: request.portfolioSnapshot,
      orders: request.orders,
      thesis: request.thesis,
      evidenceRefs: request.evidenceRefs ?? [],
      brokerExecutionEnabled: false,
      requiresHumanApproval: true,
    });

    return this.proposalRepository.save(proposal);
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
      strategyId: proposal.strategyId,
      ruleId: proposal.ruleId,
      generatedAt: proposal.generatedAt.toISOString(),
      marketDataTimestamp: proposal.marketDataTimestamp.toISOString(),
      portfolio: proposal.portfolioSnapshot,
      orders: proposal.orders,
      policy: budget?.policy,
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
