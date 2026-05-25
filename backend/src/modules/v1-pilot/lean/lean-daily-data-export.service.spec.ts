import { existsSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LeanDailyDataExportService } from './lean-daily-data-export.service';

describe('LeanDailyDataExportService', () => {
  let repoRoot: string;

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'lean-data-export-'));
  });

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true });
  });

  it('repairs missing map and factor files when an existing daily zip has DB bars', async () => {
    const dataRoot = join(repoRoot, 'engines/lean/data/equity/usa');
    mkdirSync(join(dataRoot, 'daily'), { recursive: true });
    writeFileSync(join(dataRoot, 'daily', 'spy.zip'), 'placeholder');
    const service = new LeanDailyDataExportService(repositoryWithBars(2));

    const result = await service.exportMissingDailyEquityData({
      repoRoot,
      datasetId: 'v1-lean-universe',
      symbols: ['SPY'],
    });

    expect(result.exported).toEqual(['SPY:2']);
    expect(existsSync(join(dataRoot, 'map_files/spy.csv'))).toBe(true);
    expect(existsSync(join(dataRoot, 'factor_files/spy.csv'))).toBe(true);
  });

  it('reports missing local files and unavailable DB bars as a data blocker', async () => {
    const service = new LeanDailyDataExportService(repositoryWithBars(0));

    await expect(
      service.exportMissingDailyEquityData({
        repoRoot,
        datasetId: 'v1-lean-universe',
        symbols: ['SMH'],
      }),
    ).rejects.toThrow('LEAN daily export requires at least 2');
  });

  it('classifies ready, exportable, and missing local LEAN data', async () => {
    const dataRoot = join(repoRoot, 'engines/lean/data/equity/usa');
    mkdirSync(join(dataRoot, 'daily'), { recursive: true });
    mkdirSync(join(dataRoot, 'map_files'), { recursive: true });
    mkdirSync(join(dataRoot, 'factor_files'), { recursive: true });
    writeFileSync(join(dataRoot, 'daily', 'spy.zip'), 'placeholder');
    writeFileSync(join(dataRoot, 'map_files', 'spy.csv'), '20200101,spy,S\n');
    writeFileSync(
      join(dataRoot, 'factor_files', 'spy.csv'),
      '20200101,1,1,1\n',
    );
    const service = new LeanDailyDataExportService(
      repositoryWithCounts({ QQQ: 10 }),
    );

    const result = await service.inspectDailyEquityData({
      repoRoot,
      datasetId: 'v1-lean-universe',
      symbols: ['SPY', 'QQQ', 'SMH'],
    });

    expect(result.readySymbols).toEqual(['SPY']);
    expect(result.exportableSymbols).toEqual(['QQQ']);
    expect(result.missingSymbols).toEqual(['SMH']);
  });
});

function repositoryWithBars(count: number) {
  return {
    find: jest.fn().mockResolvedValue(
      Array.from({ length: count }, (_, index) => ({
        timestamp: `2024-01-0${index + 1}T00:00:00.000Z`,
        open: 100 + index,
        high: 101 + index,
        low: 99 + index,
        close: 100.5 + index,
        adjustedClose: 100.5 + index,
        volume: 1000 + index,
      })),
    ),
    count: jest.fn().mockResolvedValue(count),
  } as never;
}

function repositoryWithCounts(counts: Record<string, number>) {
  return {
    find: jest.fn(),
    count: jest.fn(({ where }: { where: { symbol: string } }) =>
      Promise.resolve(counts[where.symbol] ?? 0),
    ),
  } as never;
}
