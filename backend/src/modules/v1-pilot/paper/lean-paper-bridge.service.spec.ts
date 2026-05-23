import { mkdtempSync, rmSync, writeFileSync } from 'fs';
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
        getLatestRun: jest.fn().mockResolvedValue({
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
