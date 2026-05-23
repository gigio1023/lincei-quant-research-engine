import { AutonomousRun } from '../../entities/autonomous-run.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { BrokerSnapshot } from '../../entities/broker-snapshot.entity';
import { ExecutionControlState } from '../../entities/execution-control-state.entity';
import { MarketDataIngestionRun } from '../../entities/market-data-ingestion-run.entity';
import { PaperOrderPlan } from '../../entities/paper-order-plan.entity';
import { buildControlPlaneActionTimeline } from './control-plane-action-timeline.presenter';

describe('buildControlPlaneActionTimeline', () => {
  it('sorts cross-ledger events and keeps broker/live execution disabled', () => {
    const events = buildControlPlaneActionTimeline({
      budgets: [],
      executionControlStates: [
        {
          id: 1,
          state: 'halted',
          actor: 'operator',
          reason: 'Emergency stop',
          createdAt: new Date('2026-05-23T09:00:00.000Z'),
        } as ExecutionControlState,
      ],
      runSchedules: [],
      runs: [
        {
          id: 7,
          status: 'failed',
          objective: 'Autonomous allocation',
          nextAction: 'Inspect the failed run timeline and fix the blocker',
          error: 'Risk data stale',
          updatedAt: new Date('2026-05-23T09:05:00.000Z'),
          createdAt: new Date('2026-05-23T09:01:00.000Z'),
          timeline: [
            {
              at: '2026-05-23T09:04:00.000Z',
              stage: 'failed',
              message: 'Run failed because risk data is stale.',
            },
          ],
        } as AutonomousRun,
      ],
      researchRuns: [],
      proposals: [],
      riskEvaluations: [],
      orderPlanApprovals: [],
      paperAccountEvents: [],
      paperOrderPlans: [
        {
          id: 11,
          status: 'reconciliation_failed',
          submittedAt: new Date('2026-05-23T08:30:00.000Z'),
          updatedAt: new Date('2026-05-23T08:35:00.000Z'),
          orders: [],
          fills: [],
          reconciliation: {
            status: 'mismatch',
            notes: ['Paper cash did not match simulated fills.'],
          },
          blockedReasons: [],
        } as PaperOrderPlan,
      ],
      paperReservationHolds: [],
      brokerSnapshots: [
        {
          id: 3,
          provider: 'manual',
          cash: 9_000_000,
          equity: 9_500_000,
          asOf: new Date('2026-05-23T09:03:00.000Z'),
          reconciliation: {
            status: 'mismatch',
            notes: ['Broker cash differs from paper cash.'],
          },
        } as BrokerSnapshot,
      ],
      brokerFills: [
        {
          id: 4,
          symbol: '005930',
          side: 'BUY',
          quantity: 1,
          grossNotional: 100_000,
          filledAt: new Date('2026-05-23T09:02:00.000Z'),
          reconciliation: {
            status: 'matched',
            notes: ['Broker fill matched paper fill evidence.'],
          },
        } as BrokerFill,
      ],
      marketDataIngestionRuns: [
        {
          id: 2,
          provider: 'stooq',
          datasetId: 'daily',
          status: 'succeeded',
          imported: 12,
          updatedAt: new Date('2026-05-23T08:00:00.000Z'),
          createdAt: new Date('2026-05-23T07:59:00.000Z'),
          blockedReasons: [],
        } as MarketDataIngestionRun,
      ],
    });

    expect(events.map((event) => event.id).slice(0, 4)).toEqual([
      'autonomous_run:7',
      'autonomous_run:7:timeline:0',
      'broker_snapshot:3',
      'broker_fill:4',
    ]);
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'execution_control:1',
          severity: 'blocked',
          blocker: 'Execution control is halted',
        }),
        expect.objectContaining({
          id: 'broker_snapshot:3',
          severity: 'blocked',
          blocker: 'Broker cash differs from paper cash.',
        }),
        expect.objectContaining({
          id: 'market_data_ingestion:2',
          severity: 'ready',
        }),
      ]),
    );
    expect(
      events.every(
        (event) =>
          event.brokerExecutionEnabled === false &&
          event.liveTradingEnabled === false,
      ),
    ).toBe(true);
  });

  it('applies a bounded limit', () => {
    const events = buildControlPlaneActionTimeline({
      budgets: [],
      executionControlStates: [
        {
          id: 1,
          state: 'active',
          actor: 'system',
          reason: 'Default state',
          createdAt: new Date('2026-05-23T09:00:00.000Z'),
        } as ExecutionControlState,
      ],
      runSchedules: [],
      runs: [],
      researchRuns: [],
      proposals: [],
      riskEvaluations: [],
      orderPlanApprovals: [],
      paperAccountEvents: [],
      paperOrderPlans: [],
      paperReservationHolds: [],
      brokerSnapshots: [],
      brokerFills: [],
      limit: 1,
    });

    expect(events).toHaveLength(1);
  });
});
