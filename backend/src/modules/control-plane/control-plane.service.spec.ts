import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BudgetEnvelope } from '../../entities/budget-envelope.entity';
import { InvestmentProposal } from '../../entities/investment-proposal.entity';
import { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import { RiskGateService } from '../risk-gate/risk-gate.service';
import { ControlPlaneService } from './control-plane.service';

describe('ControlPlaneService', () => {
  let service: ControlPlaneService;
  let budgets: BudgetEnvelope[];
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
    proposals = [];
    evaluations = [];
    runs = [];
    service = new ControlPlaneService(
      makeRepository(budgets) as any,
      makeRepository(proposals) as any,
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
    const proposal = await service.createProposal({
      budgetEnvelopeId: budget.id,
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
    expect(evaluations).toHaveLength(1);
    expect(proposals[0].status).toBe('evaluated');
  });

  it('reports readiness blockers for paper and live execution', async () => {
    const status = await service.getStatus();

    expect(status.brokerExecutionEnabled).toBe(false);
    expect(status.liveTradingReady).toBe(false);
    expect(status.blockers).toContain('No paper execution enclave');
    expect(status.readiness).toEqual(
      expect.arrayContaining([
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
