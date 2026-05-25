import { Injectable } from '@nestjs/common';
import { resolve } from 'path';
import { MarketDataIngestionService } from '../../control-plane/market-data-ingestion.service';
import { LeanDailyDataExportService } from './lean-daily-data-export.service';
import { resolveUniverseSelection } from '../universe/universe-manifest';
import { UniverseSelectionReport } from '../universe/universe-manifest.types';

export interface LeanLocalDataPreparationOptions {
  ingestUniverseBars?: boolean;
  datasetId?: string;
}

export interface LeanLocalDataPreparationResult {
  status: 'ready' | 'blocked';
  repoRoot: string;
  datasetId: string;
  requiredDataSymbols: string[];
  universeSelection: UniverseSelectionReport;
  blockers: string[];
  steps: Record<string, unknown>;
}

@Injectable()
export class LeanDataPreparationService {
  constructor(
    private readonly marketDataIngestionService: MarketDataIngestionService,
    private readonly leanDailyDataExportService: LeanDailyDataExportService,
  ) {}

  /**
   * Prepares local LEAN daily data without invoking LEAN. Unknown provider or
   * entitlement state remains blocked so full backtests cannot silently run on
   * incomplete bars, map files, or factor files.
   */
  async prepareLocalDailyData(
    options: LeanLocalDataPreparationOptions = {},
  ): Promise<LeanLocalDataPreparationResult> {
    const repoRoot = resolve(process.cwd(), '..');
    const datasetId = options.datasetId ?? 'v1-lean-universe';
    const universeSelection = resolveUniverseSelection();
    const universeSymbols = universeSelection.activeSymbols;
    const benchmarkSymbol = universeSelection.benchmarkSymbols[0] ?? 'SPY';
    const requiredDataSymbols = uniqueSymbols([
      ...universeSymbols,
      benchmarkSymbol,
    ]);
    const steps: Record<string, unknown> = {};
    const blockers: string[] = [];

    if (options.ingestUniverseBars !== false) {
      steps.marketDataIngestion = await this.marketDataIngestionService.poll(
        {
          force: true,
          datasetId,
          symbols: universeSymbols,
          benchmark: benchmarkSymbol,
          provider: 'stooq',
          timeframe: '1d',
          currency: 'USD',
          windowStart: new Date('2019-01-01T00:00:00.000Z').toISOString(),
          windowEnd: new Date().toISOString(),
        },
        'v1-lean-local-data-preparation',
      );
      this.collectIngestionBlockers(steps.marketDataIngestion, blockers);
    }

    try {
      steps.leanDailyDataExport =
        await this.leanDailyDataExportService.exportMissingDailyEquityData({
          repoRoot,
          datasetId,
          symbols: requiredDataSymbols,
        });
    } catch (error) {
      blockers.push(
        error instanceof Error
          ? error.message
          : 'local LEAN daily export failed',
      );
      steps.leanDailyDataExport = {
        status: 'blocked',
        reason: blockers[blockers.length - 1],
      };
    }

    try {
      steps.leanDailyDataHydration =
        await this.leanDailyDataExportService.hydrateMarketDataFromLeanDailyData(
          {
            repoRoot,
            datasetId,
            symbols: requiredDataSymbols,
          },
        );
    } catch (error) {
      blockers.push(
        error instanceof Error
          ? error.message
          : 'local LEAN daily hydration failed',
      );
      steps.leanDailyDataHydration = {
        status: 'blocked',
        reason: blockers[blockers.length - 1],
      };
    }

    const coverage =
      await this.leanDailyDataExportService.inspectDailyEquityData({
        repoRoot,
        datasetId,
        symbols: requiredDataSymbols,
      });
    steps.leanDailyDataCoverage = coverage;
    blockers.push(...coverage.blockers);

    return {
      status: blockers.length > 0 ? 'blocked' : 'ready',
      repoRoot,
      datasetId,
      requiredDataSymbols,
      universeSelection,
      blockers: [...new Set(blockers)],
      steps,
    };
  }

  private collectIngestionBlockers(step: unknown, blockers: string[]): void {
    if (!step || typeof step !== 'object') {
      return;
    }
    const ingestion = step as {
      status?: string;
      blockedReasons?: string[];
      failedSymbols?: string[];
    };
    if (ingestion.status === 'succeeded') {
      return;
    }
    blockers.push(
      ...(ingestion.blockedReasons?.length
        ? ingestion.blockedReasons
        : [
            `Market data ingestion status is ${ingestion.status ?? 'unknown'} for ${ingestion.failedSymbols?.join(', ') ?? 'unknown symbols'}.`,
          ]),
    );
  }
}

function uniqueSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))];
}
