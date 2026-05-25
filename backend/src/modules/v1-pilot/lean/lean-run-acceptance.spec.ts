import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  assertLeanRunArtifactsAccepted,
  assessLeanRunArtifacts,
} from './lean-run-acceptance';

describe('lean run acceptance', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lean-acceptance-'));
    const runId = tempDir.split('/').pop() ?? 'lean-acceptance';
    writeArtifactSet(tempDir, {
      runId,
      insights: [{ id: 'i1', symbol: 'SPY' }],
      targets: [
        { symbol: 'SPY', targetWeight: 0.35, sourceInsightIds: ['i1'] },
      ],
      events: [{ id: '1', status: 'Filled', fillQuantity: 1, fillPrice: 100 }],
      fills: [{ id: 'f1', orderId: '1', quantity: 1, price: 100 }],
      statistics: { 'Total Orders': 1, 'End Equity': 100500 },
      dataMonitorReport: {
        'total-data-requests-count': 5,
        'failed-data-requests-count': 0,
        'failed-universe-data-requests-count': 0,
      },
      config: {
        projectName: 'aggressive_llm_momentum',
        algorithmVersion: 'v1',
        parameters: {
          'run-id': runId,
          'validation-mode': 'historical-research',
          'uses-static-meta-overlay': false,
          'uses-static-ml-predictions': false,
        },
      },
    });
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('accepts a non-empty historical LEAN artifact set', () => {
    const report = assertLeanRunArtifactsAccepted(tempDir, 'strategy-backtest');
    expect(report.metrics.totalOrders).toBe(1);
    expect(report.blockers).toEqual([]);
  });

  it('keeps empty placeholders importable for schema mode only', () => {
    const runId = tempDir.split('/').pop() ?? 'lean-acceptance';
    writeArtifactSet(tempDir, {
      runId,
      insights: [],
      targets: [],
      events: [],
      fills: [],
      statistics: { 'Total Orders': 0, 'End Equity': 100000 },
      dataMonitorReport: {
        'total-data-requests-count': 5,
        'failed-data-requests-count': 0,
        'failed-universe-data-requests-count': 0,
      },
      config: { parameters: { 'run-id': runId, hydrated: true } },
      riskNotes: ['hydrated_from_lean_summary_only'],
    });

    expect(assessLeanRunArtifacts(tempDir, 'schema-import').passed).toBe(true);
    const strict = assessLeanRunArtifacts(tempDir, 'strategy-backtest');
    expect(strict.passed).toBe(false);
    expect(strict.blockers).toEqual(
      expect.arrayContaining([
        'No LEAN insights were exported.',
        'Portfolio targets are hydration-only placeholders.',
        'LEAN statistics report zero total orders.',
      ]),
    );
  });

  it('rejects flow validation and static overlays as strategy evidence', () => {
    const runId = tempDir.split('/').pop() ?? 'lean-acceptance';
    writeArtifactSet(tempDir, {
      runId,
      insights: [{ id: 'i1', symbol: 'SPY' }],
      targets: [
        { symbol: 'SPY', targetWeight: 0.35, sourceInsightIds: ['i1'] },
      ],
      events: [{ id: '1', status: 'Filled', fillQuantity: 1, fillPrice: 100 }],
      fills: [{ id: 'f1', orderId: '1', quantity: 1, price: 100 }],
      statistics: { 'Total Orders': '1', 'End Equity': '100,500' },
      dataMonitorReport: {
        'total-data-requests-count': 5,
        'failed-data-requests-count': 0,
        'failed-universe-data-requests-count': 0,
      },
      config: {
        projectName: 'aggressive_llm_momentum',
        algorithmVersion: 'v1',
        parameters: {
          'run-id': runId,
          'validation-mode': 'flow-validation',
          'uses-static-meta-overlay': true,
          'uses-static-ml-predictions': true,
        },
      },
    });

    const report = assessLeanRunArtifacts(tempDir, 'strategy-backtest');
    expect(report.blockers).toEqual(
      expect.arrayContaining([
        'Run is flow-validation only, not strategy evidence.',
        'Run used a static meta/LLM overlay.',
        'Run used static ML predictions.',
      ]),
    );
  });

  it('requires an explicit historical validation mode for strategy evidence', () => {
    const runId = tempDir.split('/').pop() ?? 'lean-acceptance';
    writeArtifactSet(tempDir, {
      runId,
      insights: [{ id: 'i1', symbol: 'SPY' }],
      targets: [
        { symbol: 'SPY', targetWeight: 0.35, sourceInsightIds: ['i1'] },
      ],
      events: [{ id: '1', status: 'Filled', fillQuantity: 1, fillPrice: 100 }],
      fills: [{ id: 'f1', orderId: '1', quantity: 1, price: 100 }],
      statistics: { 'Total Orders': 1, 'End Equity': 100500 },
      dataMonitorReport: {
        'total-data-requests-count': 5,
        'failed-data-requests-count': 0,
        'failed-universe-data-requests-count': 0,
      },
      config: {
        projectName: 'aggressive_llm_momentum',
        algorithmVersion: 'v1',
        parameters: { 'run-id': runId },
      },
    });

    const report = assessLeanRunArtifacts(tempDir, 'strategy-backtest');
    expect(report.blockers).toContain(
      'Run validation mode is "missing"; historical-research required for strategy evidence.',
    );
  });

  it('rejects strategy evidence with failed LEAN data requests', () => {
    const runId = tempDir.split('/').pop() ?? 'lean-acceptance';
    writeArtifactSet(tempDir, {
      runId,
      insights: [{ id: 'i1', symbol: 'SPY' }],
      targets: [
        { symbol: 'SPY', targetWeight: 0.35, sourceInsightIds: ['i1'] },
      ],
      events: [{ id: '1', status: 'Filled', fillQuantity: 1, fillPrice: 100 }],
      fills: [{ id: 'f1', orderId: '1', quantity: 1, price: 100 }],
      statistics: { 'Total Orders': 1, 'End Equity': 100500 },
      dataMonitorReport: {
        'total-data-requests-count': 9,
        'failed-data-requests-count': 4,
        'failed-universe-data-requests-count': 0,
      },
      config: {
        projectName: 'aggressive_llm_momentum',
        algorithmVersion: 'v1',
        parameters: {
          'run-id': runId,
          'validation-mode': 'historical-research',
          'uses-static-meta-overlay': false,
          'uses-static-ml-predictions': false,
        },
      },
    });

    const report = assessLeanRunArtifacts(tempDir, 'strategy-backtest');
    expect(report.blockers).toContainEqual(
      expect.stringContaining('LEAN data monitor reports 4 failed data requests'),
    );
  });
});

function writeArtifactSet(
  directory: string,
  input: {
    runId: string;
    insights: unknown[];
    targets: unknown[];
    events: unknown[];
    fills: unknown[];
    statistics: Record<string, string | number>;
    dataMonitorReport?: Record<string, number>;
    config: Record<string, unknown>;
    riskNotes?: string[];
  },
): void {
  writeJson(join(directory, 'insights.json'), {
    runId: input.runId,
    insights: input.insights,
  });
  writeJson(join(directory, 'portfolio_targets.json'), {
    id: 'targets-test',
    leanRunId: input.runId,
    asOf: '2026-05-24T00:00:00.000Z',
    targets: input.targets,
    grossExposurePct: input.targets.length ? 0.35 : 0,
    maxSingleNamePct: input.targets.length ? 0.35 : 0,
    riskNotes: input.riskNotes ?? [],
  });
  writeJson(join(directory, 'order_events.json'), { events: input.events });
  writeJson(join(directory, 'fills.json'), { fills: input.fills });
  writeJson(join(directory, 'statistics.json'), input.statistics);
  if (input.dataMonitorReport) {
    writeJson(
      join(directory, 'data-monitor-report.json'),
      input.dataMonitorReport,
    );
  }
  writeJson(join(directory, 'config.json'), input.config);
}

function writeJson(path: string, payload: unknown): void {
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
