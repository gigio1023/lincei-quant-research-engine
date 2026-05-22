import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { PaperAccount } from '../../entities/paper-account.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import { ControlPlaneService } from './control-plane.service';

describe('ControlPlaneService', () => {
  let service: ControlPlaneService;
  let budgets: BudgetEnvelope[];
  let brokerSnapshots: BrokerSnapshot[];
  let researchRuns: ResearchRun[];
  let proposals: InvestmentProposal[];
  let paperAccounts: PaperAccount[];
  let paperOrderPlans: PaperOrderPlan[];
  let executionControlStates: ExecutionControlState[];
  let evaluations: RiskEvaluation[];
  let runs: AutonomousRun[];

  const makeRepository = <T extends { id?: number }>(items: T[]) => ({
    create: jest.fn((value: Partial<T>) => value as T),
    save: jest.fn(async (value: T) => {
      if (!value.id) {
        value.id = items.length + 1;
        items.push(value);
      }
      return value;
    }),
    find: jest.fn(async () => [...items]),
    findOne: jest.fn(async ({ where }: { where: Partial<T> }) => {
      return (
        items.find((item) =>
          Object.entries(where).every(([key, value]) => item[key] === value),
        ) ?? null
      );
    }),
    count: jest.fn(async () => items.length),
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T00:00:00.000Z'));
    budgets = [];
    brokerSnapshots = [];
    researchRuns = [];
    proposals = [];
    paperAccounts = [];
    paperOrderPlans = [];
    executionControlStates = [];
    evaluations = [];
    runs = [];
    service = new ControlPlaneService(
      makeRepository(budgets) as any,
      makeRepository(brokerSnapshots) as any,
      makeRepository(proposals) as any,
      makeRepository(researchRuns) as any,
      makeRepository(paperAccounts) as any,
      makeRepository(paperOrderPlans) as any,
      makeRepository(executionControlStates) as any,
      makeRepository(evaluations) as any,
      makeRepository(runs) as any,
      new RiskGateService(),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a budget envelope that cannot enable live trading', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Aggressive dry run',
      totalBudget: 10_000_000,
      policy: { allowLiveTrading: true },
    });

    expect(budget.status).toBe('active');
    expect(budget.brokerExecutionEnabled).toBe(false);
    expect(budget.liveTradingEnabled).toBe(false);
    expect(budget.policy.allowLiveTrading).toBe(false);
  });

  it('stores a proposal and persists the risk evaluation result', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Dry run',
      totalBudget: 10_000_000,
    });
    const researchRun = await service.createResearchRun({
      budgetEnvelopeId: budget.id,
      objective: 'Find a liquid long-only dry-run allocation',
      strategyFamily: 'momentum',
      hypothesis: 'Large cap momentum can outperform the benchmark.',
      datasetRefs: [
        {
          id: 'krx-daily-bars',
          source: 'sample',
          windowStart: '2025-01-01',
          windowEnd: '2026-05-22',
          availabilityTimestamp: '2026-05-22T23:50:00.000Z',
        },
      ],
      featureRefs: ['close_20d_return', 'volatility_20d'],
      timestampLagRules: ['Signals use only data available before close.'],
      noLookaheadChecked: true,
      benchmark: 'KOSPI',
      costModel: '10bps fixed commission and tax estimate',
      slippageModel: '5bps notional slippage',
      validationWindow: {
        start: '2026-01-01',
        end: '2026-05-22',
      },
      backtestMetrics: {
        totalReturnPct: 8.2,
        benchmarkReturnPct: 3.1,
        maxDrawdownPct: 4.3,
        sharpeRatio: 1.1,
        turnoverPct: 22,
        tradeCount: 12,
      },
      artifactRefs: ['artifacts/research-runs/momentum-v1/report.md'],
      artifactHashes: {
        'artifacts/research-runs/momentum-v1/report.md': 'sha256:test',
      },
      knownFailureModes: ['Trend reversal can cause delayed exits.'],
    });
    const proposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:00.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 10_000_000,
        grossExposurePct: 0,
      },
      orders: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          side: 'BUY',
          orderType: 'MARKET',
          notional: 500_000,
          targetPositionPct: 5,
        },
      ],
      thesis: 'Simple test proposal',
    });

    const evaluation = await service.evaluateProposal(proposal.id);

    expect(evaluation.decision).toBe('ALLOW');
    expect(evaluation.brokerExecutionEnabled).toBe(false);
    expect(evaluation.requestSnapshot.researchRunId).toBe(researchRun.id);
    expect(evaluations).toHaveLength(1);
    expect(proposals[0].status).toBe('evaluated');
    expect(researchRuns[0].status).toBe('proposal_ready');
    expect(researchRuns[0].phase).toBe('proposal_linked');
  });

  it('simulates paper execution only after an ALLOW risk evaluation', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Paper budget',
      totalBudget: 10_000_000,
    });
    const researchRun = await service.createResearchRun({
      budgetEnvelopeId: budget.id,
      objective: 'Paper execution research run',
      strategyFamily: 'momentum',
      hypothesis: 'Paper execution should simulate fills after risk approval.',
      datasetRefs: [
        {
          id: 'krx-daily-bars',
          source: 'sample',
          windowStart: '2025-01-01',
          windowEnd: '2026-05-22',
          availabilityTimestamp: '2026-05-22T23:50:00.000Z',
        },
      ],
      featureRefs: ['close_20d_return'],
      timestampLagRules: ['Signals use only data available before close.'],
      noLookaheadChecked: true,
      benchmark: 'KOSPI',
      costModel: '10bps fixed commission and tax estimate',
      slippageModel: '5bps notional slippage',
      validationWindow: {
        start: '2026-01-01',
        end: '2026-05-22',
      },
      backtestMetrics: {
        totalReturnPct: 8.2,
        benchmarkReturnPct: 3.1,
        maxDrawdownPct: 4.3,
        sharpeRatio: 1.1,
        turnoverPct: 22,
        tradeCount: 12,
      },
      artifactRefs: ['artifacts/research-runs/paper/report.md'],
      artifactHashes: {
        'artifacts/research-runs/paper/report.md': 'sha256:test',
      },
      knownFailureModes: ['Trend reversal can cause delayed exits.'],
    });
    const proposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:00.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 10_000_000,
        grossExposurePct: 0,
      },
      orders: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          side: 'BUY',
          orderType: 'MARKET',
          notional: 500_000,
          targetPositionPct: 5,
        },
      ],
      thesis: 'Paper execution test proposal',
    });

    await service.evaluateProposal(proposal.id);
    const plan = await service.paperExecuteProposal(proposal.id, {
      idempotencyKey: 'paper-test-1',
      humanApprovalId: 'approval-paper-test-1',
    });

    expect(plan.status).toBe('filled');
    expect(plan.riskEvaluationId).toBe(evaluations[1].id);
    expect(plan.idempotencyKey).toBe('paper-test-1');
    expect(plan.proposalHash).toMatch(/^sha256:/);
    expect(plan.riskRequestHash).toMatch(/^sha256:/);
    expect(plan.planHash).toMatch(/^sha256:/);
    expect(plan.readinessSnapshot).toEqual(
      expect.objectContaining({
        latestRiskAllow: true,
        riskMatchesProposal: true,
        brokerExecutionDisabled: true,
        liveTradingDisabled: true,
        cashSufficient: true,
        noDuplicatePlan: true,
      }),
    );
    expect(plan.brokerExecutionEnabled).toBe(false);
    expect(plan.liveTradingEnabled).toBe(false);
    expect(plan.paperAccountId).toBeDefined();
    expect(plan.orders).toHaveLength(1);
    expect(plan.orders[0]).toEqual(
      expect.objectContaining({
        paperOrderId: 'paper-order:1:0',
        proposalOrderIndex: 0,
        feeModelRef: 'fixed-10bps-paper-fee-v1',
        slippageModelRef: 'fixed-5bps-paper-slippage-v1',
      }),
    );
    expect(plan.fills).toHaveLength(1);
    expect(plan.fills[0]).toEqual(
      expect.objectContaining({
        paperFillId: 'paper-order:1:0:fill:0',
        paperOrderId: 'paper-order:1:0',
        symbol: '005930',
        quantity: 500_000,
        fillPrice: 1,
        grossNotional: 500_000,
        requestedNotional: 500_000,
        filledNotional: 500_000,
        fee: 500,
        feeCurrency: 'KRW',
        slippage: 250,
        netCashDelta: -500_750,
        status: 'filled',
      }),
    );
    expect(plan.cashLedger).toEqual([
      expect.objectContaining({
        amount: -500_750,
        balanceAfter: 9_499_250,
      }),
    ]);
    expect(plan.positionLedger).toEqual([
      expect.objectContaining({
        symbol: '005930',
        quantityDelta: 500_000,
        notionalDelta: 500_000,
        positionNotionalAfter: 500_000,
      }),
    ]);
    expect(plan.endingCash).toBe(9_499_250);
    expect(plan.endingEquity).toBe(9_999_250);
    expect(plan.reconciliation.status).toBe('pending');
    expect(plan.reconciliation.cashMatched).toBe(false);
    expect(plan.reconciliation.expectedCash).toBe(9_499_250);
    expect(plan.killSwitchSnapshot).toEqual(
      expect.objectContaining({
        armed: true,
        tripped: false,
      }),
    );
    expect(proposals[0].status).toBe('paper_ready');
    expect(evaluations).toHaveLength(2);
    expect(evaluations[1].responseSnapshot.mode).toBe('paper');
    expect(evaluations[1].decision).toBe('ALLOW');
    expect(paperAccounts).toHaveLength(1);
    expect(plan.paperAccountId).toBe(paperAccounts[0].id);
    expect(paperAccounts[0]).toEqual(
      expect.objectContaining({
        budgetEnvelopeId: budget.id,
        cash: 9_499_250,
        equity: 9_999_250,
        grossExposurePct: 5,
        lastAppliedPlanId: plan.id,
      }),
    );
    expect(paperAccounts[0].positions).toEqual([
      expect.objectContaining({
        symbol: '005930',
        marketValue: 500_000,
        weightPct: 5,
      }),
    ]);
    expect(paperAccounts[0].cashLedger).toHaveLength(1);
    expect(paperAccounts[0].positionLedger).toHaveLength(1);
    expect(paperAccounts[0].appliedPlanIds).toEqual([plan.id]);

    const idempotentReplay = await service.paperExecuteProposal(proposal.id, {
      idempotencyKey: 'paper-test-1',
    });
    expect(idempotentReplay.id).toBe(plan.id);
    expect(paperAccounts[0].appliedPlanIds).toEqual([plan.id]);

    const reconciled = await service.reconcilePaperOrderPlan(plan.id, {
      notes: ['Unit test reconciliation.'],
    });
    expect(reconciled.status).toBe('reconciled');
    expect(reconciled.reconciliation.status).toBe('matched');
    expect(reconciled.reconciliation.cashMatched).toBe(true);
    expect(reconciled.reconciliation.positionsMatched).toBe(true);
    expect(paperAccounts[0].lastReconciledAt).toBeDefined();

    const secondProposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:30.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 10_000_000,
        grossExposurePct: 0,
      },
      orders: [
        {
          symbol: '000660',
          assetClass: 'domestic_stock',
          side: 'BUY',
          orderType: 'MARKET',
          notional: 250_000,
          targetPositionPct: 2.5,
        },
      ],
      thesis: 'Second paper cycle should start from durable paper account.',
    });
    expect(paperAccounts[0].cash).toBe(9_499_250);

    const secondPlan = await service.paperExecuteProposal(secondProposal.id, {
      idempotencyKey: 'paper-test-2',
      humanApprovalId: 'approval-paper-test-2',
    });
    expect(secondProposal.budgetEnvelopeId).toBe(budget.id);
    expect(paperAccounts).toHaveLength(1);
    expect(secondProposal.id).toBe(2);
    expect(secondPlan.proposalId).toBe(secondProposal.id);
    expect(secondPlan.paperAccountId).toBe(paperAccounts[0].id);
    expect(secondPlan.startingCash).toBe(9_499_250);
    expect(secondPlan.endingCash).toBe(9_248_875);
    expect(evaluations[2].requestSnapshot.portfolio.cash).toBe(9_499_250);
    expect(evaluations[2].requestSnapshot.portfolio.positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: '005930',
          marketValue: 500_000,
        }),
      ]),
    );
    expect(paperAccounts[0].cash).toBe(9_248_875);
    expect(paperAccounts[0].appliedPlanIds).toEqual([plan.id, secondPlan.id]);
    expect(paperAccounts[0].positions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: '005930',
          marketValue: 500_000,
        }),
        expect.objectContaining({
          symbol: '000660',
          marketValue: 250_000,
        }),
      ]),
    );
  });

  it('imports a read-only broker snapshot and reconciles it against paper account state', async () => {
    paperAccounts.push({
      id: 1,
      name: 'Paper account',
      status: 'active',
      currency: 'KRW',
      cash: 9_500_000,
      equity: 10_000_000,
      grossExposurePct: 5,
      positions: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          marketValue: 500_000,
          weightPct: 5,
        },
      ],
      cashLedger: [],
      positionLedger: [],
      appliedPlanIds: [],
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as PaperAccount);

    const snapshot = await service.importBrokerSnapshot({
      provider: 'manual',
      accountRef: 'raw-account-id-must-be-hashed',
      sourceRef: 'operator-import',
      asOf: '2026-05-22T23:59:00.000Z',
      currency: 'KRW',
      cash: 9_500_000,
      equity: 10_000_000,
      positions: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          marketValue: 500_000,
          weightPct: 5,
        },
      ],
    });

    expect(snapshot.brokerExecutionEnabled).toBe(false);
    expect(snapshot.liveTradingEnabled).toBe(false);
    expect(snapshot.accountRefHash).toMatch(/^sha256:/);
    expect(snapshot).not.toHaveProperty('accountRef');
    expect(snapshot.reconciliation.status).toBe('not_checked');

    const reconciled = await service.reconcileBrokerSnapshot(snapshot.id, {
      tolerance: 0.01,
      maxAgeMinutes: 120,
      notes: ['Unit test broker reconciliation.'],
    });

    expect(reconciled.status).toBe('matched');
    expect(reconciled.reconciliation).toEqual(
      expect.objectContaining({
        status: 'matched',
        paperAccountId: paperAccounts[0].id,
        cashMatched: true,
        equityMatched: true,
        positionsMatched: true,
        cashDiff: 0,
        equityDiff: 0,
      }),
    );
  });

  it('rejects broker snapshot imports that include credentials or order intent', async () => {
    await expect(
      service.importBrokerSnapshot({
        provider: 'manual',
        asOf: '2026-05-22T23:59:00.000Z',
        cash: 1_000_000,
        equity: 1_000_000,
        positions: [],
        brokerCredentials: { token: 'secret' },
      } as any),
    ).rejects.toThrow('Broker read-only snapshots cannot include');

    await expect(
      service.importBrokerSnapshot({
        provider: 'manual',
        asOf: '2026-05-22T23:59:00.000Z',
        cash: 1_000_000,
        equity: 1_000_000,
        positions: [],
        orders: [{ symbol: '005930' }],
      } as any),
    ).rejects.toThrow('Broker read-only snapshots cannot include');

    expect(brokerSnapshots).toHaveLength(0);
  });

  it('persists a blocked paper plan when risk approval is missing', async () => {
    const researchRun = await service.createResearchRun({
      objective: 'Blocked paper execution research run',
      strategyFamily: 'momentum',
      hypothesis: 'Missing risk approval should block paper execution.',
      datasetRefs: [
        {
          id: 'krx-daily-bars',
          source: 'sample',
          windowStart: '2025-01-01',
          windowEnd: '2026-05-22',
          availabilityTimestamp: '2026-05-22T23:50:00.000Z',
        },
      ],
      featureRefs: ['close_20d_return'],
      timestampLagRules: ['Signals use only data available before close.'],
      noLookaheadChecked: true,
      benchmark: 'KOSPI',
      costModel: '10bps fixed commission and tax estimate',
      slippageModel: '5bps notional slippage',
      validationWindow: {
        start: '2026-01-01',
        end: '2026-05-22',
      },
      backtestMetrics: {
        totalReturnPct: 8.2,
        benchmarkReturnPct: 3.1,
        maxDrawdownPct: 4.3,
        sharpeRatio: 1.1,
        turnoverPct: 22,
        tradeCount: 12,
      },
      artifactRefs: ['artifacts/research-runs/blocked-paper/report.md'],
      artifactHashes: {
        'artifacts/research-runs/blocked-paper/report.md': 'sha256:test',
      },
      knownFailureModes: ['Trend reversal can cause delayed exits.'],
    });
    const proposal = await service.createProposal({
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:00.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 10_000_000,
        grossExposurePct: 0,
      },
      orders: [],
    });

    const plan = await service.paperExecuteProposal(proposal.id);

    expect(plan.status).toBe('blocked');
    expect(plan.fills).toEqual([]);
    expect(plan.blockedReasons).toContain('Latest risk decision is REVIEW');
    expect(plan.endingCash).toBe(10_000_000);
    expect(plan.endingEquity).toBe(10_000_000);
    expect(plan.reconciliation.status).toBe('not_required');
    expect(plan.reconciliation.cashMatched).toBe(true);
    expect(paperAccounts).toHaveLength(0);
  });

  it('blocks aggregate same-symbol paper sells that exceed the account position', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Sell reservation budget',
      totalBudget: 10_000_000,
    });
    const researchRun = await service.runBaselineResearch({
      budgetEnvelopeId: budget.id,
    });
    const proposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:00.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 9_500_000,
        grossExposurePct: 5,
        positions: [
          {
            symbol: '005930',
            assetClass: 'domestic_stock',
            marketValue: 500_000,
            weightPct: 5,
          },
        ],
      },
      orders: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          side: 'SELL',
          orderType: 'MARKET',
          notional: 300_000,
          targetPositionPct: 2,
        },
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          side: 'SELL',
          orderType: 'MARKET',
          notional: 300_000,
          targetPositionPct: 0,
        },
      ],
    });

    const plan = await service.paperExecuteProposal(proposal.id, {
      idempotencyKey: 'paper-sell-overdraft',
      humanApprovalId: 'approval-paper-sell-overdraft',
    });

    expect(plan.status).toBe('blocked');
    expect(plan.fills).toEqual([]);
    expect(plan.blockedReasons).toContain(
      'Paper execution position check failed',
    );
    expect(paperAccounts).toHaveLength(0);
  });

  it('blocks paper execution when execution control is halted', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Halted budget',
      totalBudget: 10_000_000,
    });
    const researchRun = await service.runBaselineResearch({
      budgetEnvelopeId: budget.id,
    });
    const proposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
      researchRunId: researchRun.id,
      strategyId: 'momentum-v1',
      ruleId: 'long-only-breakout',
      generatedAt: '2026-05-22T23:59:00.000Z',
      marketDataTimestamp: '2026-05-22T23:55:00.000Z',
      portfolioSnapshot: {
        currency: 'KRW',
        equity: 10_000_000,
        cash: 10_000_000,
        grossExposurePct: 0,
      },
      orders: [
        {
          symbol: '005930',
          assetClass: 'domestic_stock',
          side: 'BUY',
          orderType: 'MARKET',
          notional: 500_000,
          targetPositionPct: 5,
        },
      ],
    });

    await service.evaluateProposal(proposal.id);
    await service.updateExecutionControlState({
      state: 'halted',
      actor: 'human',
      reason: 'Manual stop for test.',
    });

    const plan = await service.paperExecuteProposal(proposal.id);

    expect(plan.status).toBe('blocked');
    expect(plan.blockedReasons).toContain('Execution control state is halted');
    expect(plan.killSwitchSnapshot.tripped).toBe(true);
    expect(plan.killSwitchEvent).toEqual(
      expect.objectContaining({
        actor: 'human',
        tripped: true,
      }),
    );
    expect(paperAccounts).toHaveLength(0);
  });

  it('blocks proposal creation when research evidence is incomplete', async () => {
    const researchRun = await service.createResearchRun({
      objective: 'Incomplete run',
      strategyFamily: 'momentum',
      hypothesis: 'Missing no-lookahead proof should block advancement.',
      datasetRefs: [
        {
          id: 'krx-daily-bars',
          windowStart: '2025-01-01',
          windowEnd: '2026-05-22',
          availabilityTimestamp: '2026-05-22T23:50:00.000Z',
        },
      ],
      featureRefs: ['close_20d_return'],
      timestampLagRules: ['Signals use only data available before close.'],
      noLookaheadChecked: false,
      benchmark: 'KOSPI',
      costModel: '10bps fixed commission and tax estimate',
      slippageModel: '5bps notional slippage',
      validationWindow: {
        start: '2026-01-01',
        end: '2026-05-22',
      },
      backtestMetrics: {
        totalReturnPct: 8.2,
        benchmarkReturnPct: 3.1,
        maxDrawdownPct: 4.3,
        sharpeRatio: 1.1,
        turnoverPct: 22,
        tradeCount: 12,
      },
      artifactRefs: ['artifacts/research-runs/incomplete/report.md'],
      artifactHashes: {
        'artifacts/research-runs/incomplete/report.md': 'sha256:test',
      },
      knownFailureModes: ['Trend reversal can cause delayed exits.'],
    });

    expect(researchRun.status).toBe('blocked');
    expect(researchRun.advanceEligible).toBe(false);
    expect(researchRun.blockedReasons).toContain(
      'No-lookahead check must pass before proposal creation',
    );

    await expect(
      service.createProposal({
        researchRunId: researchRun.id,
        strategyId: 'momentum-v1',
        ruleId: 'long-only-breakout',
        generatedAt: '2026-05-22T23:59:00.000Z',
        marketDataTimestamp: '2026-05-22T23:55:00.000Z',
        portfolioSnapshot: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 10_000_000,
          grossExposurePct: 0,
        },
        orders: [],
      }),
    ).rejects.toThrow('is not proposal-ready');
  });

  it('runs a deterministic baseline backtest into a proposal-ready research run', async () => {
    const budget = await service.createBudgetEnvelope({
      name: 'Baseline budget',
      totalBudget: 10_000_000,
    });

    const researchRun = await service.runBaselineResearch({
      budgetEnvelopeId: budget.id,
      objective: 'Run built-in baseline before proposal',
      symbol: 'SAMPLE_MOMENTUM_BASKET',
      benchmark: 'SAMPLE_BENCHMARK',
    });

    expect(researchRun.budgetEnvelopeId).toBe(budget.id);
    expect(researchRun.status).toBe('proposal_ready');
    expect(researchRun.advanceEligible).toBe(true);
    expect(researchRun.noLookaheadChecked).toBe(true);
    expect(researchRun.backtestMetrics.tradeCount).toBeGreaterThan(0);
    expect(researchRun.artifactRefs).toEqual(
      expect.arrayContaining([
        expect.stringContaining('/run-input.json'),
        expect.stringContaining('/metrics.json'),
        expect.stringContaining('/report.md'),
      ]),
    );
    expect(researchRun.artifactHashes[researchRun.artifactRefs[0]]).toMatch(
      /^sha256:/,
    );
    expect(researchRun.brokerExecutionEnabled).toBe(false);
    expect(researchRun.liveTradingEnabled).toBe(false);
  });

  it('rejects proposal creation without research-run provenance', async () => {
    await expect(
      service.createProposal({
        strategyId: 'momentum-v1',
        ruleId: 'long-only-breakout',
        generatedAt: '2026-05-22T23:59:00.000Z',
        marketDataTimestamp: '2026-05-22T23:55:00.000Z',
        portfolioSnapshot: {
          currency: 'KRW',
          equity: 10_000_000,
          cash: 10_000_000,
          grossExposurePct: 0,
        },
        orders: [],
      } as any),
    ).rejects.toThrow('Proposal requires a researchRunId');
  });

  it('reports readiness blockers for paper and live execution', async () => {
    const status = await service.getStatus();

    expect(status.brokerExecutionEnabled).toBe(false);
    expect(status.liveTradingReady).toBe(false);
    expect(status.blockers).toContain(
      'No verified Toss read-only adapter schema or credentials',
    );
    expect(status.readiness).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'researchRunLedgerReady',
          ready: false,
        }),
        expect.objectContaining({
          key: 'riskGateReady',
          ready: true,
        }),
        expect.objectContaining({
          key: 'paperExecutionReady',
          ready: false,
        }),
        expect.objectContaining({
          key: 'paperSimulationLedgerReady',
          ready: true,
        }),
        expect.objectContaining({
          key: 'brokerSnapshotLedgerReady',
          ready: false,
        }),
        expect.objectContaining({
          key: 'executionControlReady',
          ready: true,
        }),
        expect.objectContaining({
          key: 'liveTradingReady',
          ready: false,
        }),
      ]),
    );
  });

  it('creates an observable autonomous run timeline', async () => {
    const run = await service.createRun('Research and allocate dry-run budget');

    expect(run.status).toBe('idle');
    expect(run.timeline[0]).toEqual(
      expect.objectContaining({
        stage: 'idle',
      }),
    );
    expect(run.nextAction).toContain('Attach budget envelope');
  });
});
