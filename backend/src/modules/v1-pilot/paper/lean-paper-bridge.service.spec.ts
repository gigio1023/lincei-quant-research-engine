import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PaperOrderPlan } from '../../../entities/paper-order-plan.entity';
import { LeanPaperBridgeService } from './lean-paper-bridge.service';

describe('LeanPaperBridgeService', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lean-paper-bridge-'));
    writeAcceptedLeanArtifacts(tempDir);
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('reconciles an idempotent filled paper plan before returning', async () => {
    const existingPlan = {
      id: 7,
      status: 'filled',
      reconciliation: { status: 'pending' },
    } as PaperOrderPlan;
    const reconciledPlan = {
      ...existingPlan,
      status: 'reconciled',
      reconciliation: { status: 'matched' },
    } as PaperOrderPlan;
    const controlPlaneService = {
      reconcilePaperOrderPlan: jest.fn().mockResolvedValue(reconciledPlan),
    };
    const service = new LeanPaperBridgeService(
      controlPlaneService as never,
      {
        getLatestStrategyRun: jest.fn().mockResolvedValue({
          runId: tempDir.split('/').pop(),
          status: 'passed',
          resultDirectory: tempDir,
        }),
      } as never,
      {
        find: jest.fn().mockResolvedValue([
          {
            id: 11,
            leanRunId: tempDir.split('/').pop(),
            targets: [{ symbol: 'SPY', targetWeight: 0.35 }],
          },
        ]),
      } as never,
      {
        find: jest.fn().mockResolvedValue([existingPlan]),
      } as never,
    );

    const result = await service.runPaperCycle();

    expect(result).toBe(reconciledPlan);
    expect(controlPlaneService.reconcilePaperOrderPlan).toHaveBeenCalledWith(
      7,
      {
        notes: ['Auto-reconciled by V1 LEAN paper bridge.'],
      },
    );
  });

  it('maps QuantConnect Cloud string statistics into finite research metrics', async () => {
    writeJson(join(tempDir, 'statistics.json'), {
      'Total Orders': '1062',
      'Compounding Annual Return': '11.128%',
      Drawdown: '4.200%',
      'Sharpe Ratio': '0.424',
      'Sortino Ratio': '0.518',
      'Information Ratio': '-0.621',
      'Portfolio Turnover': '7.41%',
      'Start Equity': '100000',
      'End Equity': '123517.46',
      'Total Fees': '$1143.98',
      'Win Rate': '46%',
      'Profit-Loss Ratio': '2.01',
    });

    const filledPlan = {
      id: 12,
      status: 'filled',
      reconciliation: { status: 'pending' },
    } as PaperOrderPlan;
    const reconciledPlan = {
      ...filledPlan,
      status: 'reconciled',
      reconciliation: { status: 'matched' },
    } as PaperOrderPlan;
    const controlPlaneService = {
      listBudgetEnvelopes: jest
        .fn()
        .mockResolvedValue([{ id: 1, name: 'V1 LEAN Paper Budget (ETF)' }]),
      getPaperAccountState: jest.fn().mockResolvedValue({
        id: 2,
        budgetEnvelopeId: 1,
        currency: 'USD',
        cash: 10_000,
        equity: 10_000,
        grossExposurePct: 0,
        positions: [],
      }),
      listBrokerSnapshots: jest.fn().mockResolvedValue([{ id: 3 }]),
      createResearchRun: jest.fn().mockResolvedValue({ id: 4 }),
      createProposal: jest.fn().mockResolvedValue({ id: 5 }),
      evaluateProposal: jest.fn().mockResolvedValue({ decision: 'ALLOW' }),
      listPaperAccountEvents: jest
        .fn()
        .mockResolvedValue([{ eventHash: 'event-hash' }]),
      createOrderPlanApproval: jest.fn().mockResolvedValue({ id: 6 }),
      paperExecuteProposal: jest.fn().mockResolvedValue(filledPlan),
      reconcilePaperOrderPlan: jest.fn().mockResolvedValue(reconciledPlan),
    };
    const service = new LeanPaperBridgeService(
      controlPlaneService as never,
      {
        getLatestStrategyRun: jest.fn().mockResolvedValue({
          runId: tempDir.split('/').pop(),
          status: 'passed',
          resultDirectory: tempDir,
          startedAt: new Date('2026-05-25T07:10:18.000Z'),
          completedAt: new Date('2026-05-25T07:12:56.000Z'),
          statistics: JSON.parse(
            readFileSync(join(tempDir, 'statistics.json'), 'utf8'),
          ),
          configHash: 'config-hash',
        }),
      } as never,
      {
        find: jest.fn().mockResolvedValue([
          {
            id: 11,
            leanRunId: tempDir.split('/').pop(),
            asOf: '2025-12-31T16:00:00.000Z',
            targets: [
              { symbol: 'NVDA RHM8UTD8DT2D', targetWeight: 3.960799 },
              { symbol: 'VRT XBX55P02OU3P', targetWeight: 1.860466 },
            ],
            grossExposurePct: 5.821265,
          },
        ]),
      } as never,
      {
        find: jest.fn().mockResolvedValue([]),
      } as never,
    );

    const result = await service.runPaperReplay();

    expect(result).toBe(reconciledPlan);
    expect(controlPlaneService.createResearchRun).toHaveBeenCalledWith(
      expect.objectContaining({
        backtestMetrics: expect.objectContaining({
          totalReturnPct: 11.128,
          maxDrawdownPct: 4.2,
          sharpeRatio: 0.424,
          turnoverPct: 7.41,
          tradeCount: 1062,
          totalFees: 1143.98,
        }),
      }),
    );
    expect(controlPlaneService.createProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        portfolioSnapshot: expect.objectContaining({
          cash: 10_000,
          grossExposurePct: 0,
        }),
        orders: [
          expect.objectContaining({
            symbol: 'NVDA RHM8UTD8DT2D',
            notional: 4000,
            targetPositionPct: 40,
          }),
          expect.objectContaining({
            symbol: 'VRT XBX55P02OU3P',
            notional: 4000,
            targetPositionPct: 40,
          }),
        ],
      }),
    );
  });
});

function writeAcceptedLeanArtifacts(directory: string): void {
  const runId = directory.split('/').pop() ?? 'lean-paper-bridge';
  writeJson(join(directory, 'insights.json'), {
    runId,
    insights: [{ id: 'i1', symbol: 'SPY' }],
  });
  writeJson(join(directory, 'portfolio_targets.json'), {
    id: 'targets-test',
    leanRunId: runId,
    asOf: '2026-05-24T00:00:00.000Z',
    targets: [{ symbol: 'SPY', targetWeight: 0.35, sourceInsightIds: ['i1'] }],
    grossExposurePct: 0.35,
    maxSingleNamePct: 0.35,
    riskNotes: [],
  });
  writeJson(join(directory, 'order_events.json'), {
    events: [{ id: '1', status: 'Filled', fillQuantity: 1, fillPrice: 100 }],
  });
  writeJson(join(directory, 'fills.json'), {
    fills: [{ id: 'f1', orderId: '1', quantity: 1, price: 100 }],
  });
  writeJson(join(directory, 'statistics.json'), {
    'Total Orders': 1,
    'End Equity': 100500,
  });
  writeJson(join(directory, 'data-monitor-report.json'), {
    'total-data-requests-count': 5,
    'failed-data-requests-count': 0,
    'failed-universe-data-requests-count': 0,
  });
  writeJson(join(directory, 'config.json'), {
    projectName: 'aggressive_llm_momentum',
    algorithmVersion: 'v1',
    parameters: {
      'run-id': runId,
      'validation-mode': 'historical-research',
      'uses-static-meta-overlay': false,
      'uses-static-ml-predictions': false,
    },
  });
}

function writeJson(path: string, payload: unknown): void {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
