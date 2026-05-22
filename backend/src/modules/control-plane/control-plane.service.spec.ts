import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { ResearchRun } from '../../entities/research-run.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import { ControlPlaneService } from './control-plane.service';

describe('ControlPlaneService', () => {
  let service: ControlPlaneService;
  let budgets: BudgetEnvelope[];
  let researchRuns: ResearchRun[];
  let proposals: InvestmentProposal[];
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
    researchRuns = [];
    proposals = [];
    evaluations = [];
    runs = [];
    service = new ControlPlaneService(
      makeRepository(budgets) as any,
      makeRepository(proposals) as any,
      makeRepository(researchRuns) as any,
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
    expect(status.blockers).toContain('No paper execution enclave');
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
