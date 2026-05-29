import { mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { QuantConnectCloudArtifactMapper } from './lean-cloud-artifact-mapper';

describe('QuantConnectCloudArtifactMapper', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'lean-cloud-artifact-mapper-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('derives net target weights from signed filled quantities', () => {
    const mapper = new QuantConnectCloudArtifactMapper();

    mapper.writeImportedArtifacts(
      {
        resultDirectory: tempDir,
        runId: 'qc-import-test',
        cloudBacktestId: 'cloud-backtest-id',
        projectId: 32097697,
        completedAt: new Date('2026-05-29T00:00:00Z'),
      },
      {
        backtest: {
          status: 'Completed.',
          backtestStart: '2024-01-01T00:00:00Z',
          backtestEnd: '2024-01-31T00:00:00Z',
          statistics: { 'End Equity': '100000' },
        },
        insights: [
          {
            id: 'i-nvda',
            symbol: 'NVDA RHM8UTD8DT2D',
            direction: 0,
            period: 1814400,
            generatedTime: 1711569600,
          },
        ],
        orders: [
          {
            id: 'buy-nvda',
            symbol: 'NVDA RHM8UTD8DT2D',
            events: [
              {
                id: 'buy-nvda-fill',
                status: 3,
                direction: 0,
                fillQuantity: 10,
                fillPrice: 100,
                utcTime: 1711656000,
              },
            ],
          },
          {
            id: 'sell-nvda',
            symbol: 'NVDA RHM8UTD8DT2D',
            events: [
              {
                id: 'sell-nvda-fill',
                status: 3,
                direction: 1,
                fillQuantity: -4,
                fillPrice: 100,
                utcTime: 1711742400,
              },
            ],
          },
        ],
      },
    );

    const targets = JSON.parse(
      readFileSync(join(tempDir, 'portfolio_targets.json'), 'utf8'),
    ) as {
      targets: { symbol: string; targetWeight: number }[];
      grossExposurePct: number;
      maxSingleNamePct: number;
    };
    const insights = JSON.parse(
      readFileSync(join(tempDir, 'insights.json'), 'utf8'),
    ) as {
      insights: { symbol: string; periodDays: number; generatedTime: string }[];
    };
    const events = JSON.parse(
      readFileSync(join(tempDir, 'order_events.json'), 'utf8'),
    ) as {
      events: { symbol: string; utcTime: string }[];
    };

    expect(targets.targets).toEqual([
      expect.objectContaining({ symbol: 'NVDA', targetWeight: 0.006 }),
    ]);
    expect(targets.grossExposurePct).toBe(0.006);
    expect(targets.maxSingleNamePct).toBe(0.006);
    expect(insights.insights[0]).toMatchObject({
      symbol: 'NVDA',
      periodDays: 21,
      generatedTime: '2024-03-27T20:00:00.000Z',
    });
    expect(events.events[0]).toMatchObject({
      symbol: 'NVDA',
      utcTime: '2024-03-28T20:00:00.000Z',
    });
  });
});
