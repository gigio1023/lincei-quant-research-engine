import {
  BadRequestException,
  Inject,
  Injectable,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  MarketDataIngestionRun,
  MarketDataIngestionRunStatus,
} from '../../entities/market-data-ingestion-run.entity';
import type { MarketDataProvider } from '../../entities/market-data-bar.entity';
import { ControlPlaneService } from './control-plane.service';
import {
  MarketDataIngestionPollRequest,
  MarketDataIngestionPollResponse,
  MarketDataIngestionStatus,
} from './control-plane.types';
import { MARKET_DATA_PROVIDER } from './market-data-provider.types';
import type { MarketDataProviderService } from './market-data-provider.types';

@Injectable()
export class MarketDataIngestionService {
  private running = false;
  private lastAttemptAt?: string;
  private lastPollAt?: string;
  private lastRunId?: number;
  private lastError?: string;

  constructor(
    @InjectRepository(MarketDataIngestionRun)
    private readonly ingestionRunRepository: Repository<MarketDataIngestionRun>,
    private readonly controlPlaneService: ControlPlaneService,
    @Optional()
    @Inject(MARKET_DATA_PROVIDER)
    private readonly provider: MarketDataProviderService,
  ) {}

  getStatus(): MarketDataIngestionStatus {
    const config = this.getConfig();

    return {
      enabled: config.enabled,
      provider: config.provider,
      datasetId: config.datasetId,
      symbols: config.symbols,
      benchmark: config.benchmark,
      timeframe: config.timeframe,
      currency: config.currency,
      lookbackDays: config.lookbackDays,
      cron: process.env.MARKET_DATA_INGESTION_CRON ?? '*/30 * * * *',
      running: this.running,
      lastAttemptAt: this.lastAttemptAt,
      lastPollAt: this.lastPollAt,
      lastRunId: this.lastRunId,
      lastError: this.lastError,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
    };
  }

  async listRuns(): Promise<MarketDataIngestionRun[]> {
    return this.ingestionRunRepository.find({ order: { updatedAt: 'DESC' } });
  }

  async poll(
    request: MarketDataIngestionPollRequest = {},
    trigger = 'manual',
  ): Promise<MarketDataIngestionPollResponse> {
    const config = this.resolveRequest(request);
    const startedAt = new Date();
    this.lastAttemptAt = startedAt.toISOString();

    if (!config.enabled && request.force !== true) {
      const run = await this.persistRun({
        trigger,
        status: 'skipped',
        config,
        imported: 0,
        replaced: 0,
        importedSymbols: [],
        failedSymbols: [],
        blockedReasons: ['Market data ingestion is disabled'],
      });
      return this.toResponse(run);
    }

    if (this.running) {
      const run = await this.persistRun({
        trigger,
        status: 'skipped',
        config,
        imported: 0,
        replaced: 0,
        importedSymbols: [],
        failedSymbols: [],
        blockedReasons: [
          'Previous market data ingestion poll is still running',
        ],
      });
      return this.toResponse(run);
    }

    this.running = true;

    try {
      if (!this.provider) {
        throw new BadRequestException('Market data provider is not registered');
      }

      const importedSymbols: string[] = [];
      const failedSymbols: string[] = [];
      const blockedReasons: string[] = [];
      let imported = 0;
      let replaced = 0;
      let latestAvailabilityTimestamp: string | undefined;

      for (const symbol of config.symbols) {
        try {
          const providerResponse = await this.provider.fetchBars({
            provider: config.provider,
            symbol,
            timeframe: config.timeframe,
            currency: config.currency,
            windowStart: config.windowStart,
            windowEnd: config.windowEnd,
          });
          const importResponse =
            await this.controlPlaneService.importMarketDataBars({
              datasetId: config.datasetId,
              provider: providerResponse.provider,
              sourceRef: providerResponse.sourceRef,
              symbol: providerResponse.symbol,
              timeframe: providerResponse.timeframe,
              currency: providerResponse.currency,
              bars: providerResponse.bars,
            });

          imported += importResponse.imported;
          replaced += importResponse.replaced;
          importedSymbols.push(symbol);
          for (const bar of importResponse.bars) {
            if (
              !latestAvailabilityTimestamp ||
              new Date(bar.availabilityTimestamp).getTime() >
                new Date(latestAvailabilityTimestamp).getTime()
            ) {
              latestAvailabilityTimestamp = bar.availabilityTimestamp;
            }
          }
        } catch (error) {
          failedSymbols.push(symbol);
          blockedReasons.push(
            error instanceof Error
              ? `${symbol}: ${error.message}`
              : `${symbol}: import failed`,
          );
        }
      }

      const status: MarketDataIngestionRunStatus =
        importedSymbols.length === config.symbols.length
          ? 'succeeded'
          : importedSymbols.length > 0
            ? 'partial'
            : 'failed';
      const run = await this.persistRun({
        trigger,
        status,
        config,
        imported,
        replaced,
        latestAvailabilityTimestamp,
        importedSymbols,
        failedSymbols,
        blockedReasons,
        error: status === 'failed' ? blockedReasons.join('; ') : undefined,
      });

      this.lastPollAt =
        run.updatedAt?.toISOString?.() ?? new Date().toISOString();
      this.lastRunId = run.id;
      this.lastError = run.error;
      return this.toResponse(run);
    } finally {
      this.running = false;
    }
  }

  private async persistRun(input: {
    trigger: string;
    status: MarketDataIngestionRunStatus;
    config: ResolvedIngestionConfig;
    imported: number;
    replaced: number;
    latestAvailabilityTimestamp?: string;
    importedSymbols: string[];
    failedSymbols: string[];
    blockedReasons: string[];
    error?: string;
  }) {
    return this.ingestionRunRepository.save(
      this.ingestionRunRepository.create({
        trigger: input.trigger,
        status: input.status,
        provider: input.config.provider,
        datasetId: input.config.datasetId,
        symbols: input.config.symbols,
        timeframe: input.config.timeframe,
        currency: input.config.currency,
        windowStart: input.config.windowStart,
        windowEnd: input.config.windowEnd,
        requestHash: this.controlPlaneService.hashObject({
          provider: input.config.provider,
          datasetId: input.config.datasetId,
          symbols: input.config.symbols,
          timeframe: input.config.timeframe,
          currency: input.config.currency,
          windowStart: input.config.windowStart,
          windowEnd: input.config.windowEnd,
        }),
        imported: input.imported,
        replaced: input.replaced,
        latestAvailabilityTimestamp: input.latestAvailabilityTimestamp,
        importedSymbols: input.importedSymbols,
        failedSymbols: input.failedSymbols,
        blockedReasons: input.blockedReasons,
        error: input.error,
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  }

  private toResponse(
    run: MarketDataIngestionRun,
  ): MarketDataIngestionPollResponse {
    return {
      run,
      status: run.status,
      imported: run.imported,
      replaced: run.replaced,
      importedSymbols: run.importedSymbols,
      failedSymbols: run.failedSymbols,
      blockedReasons: run.blockedReasons,
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
    };
  }

  private resolveRequest(
    request: MarketDataIngestionPollRequest,
  ): ResolvedIngestionConfig {
    const base = this.getConfig();
    const symbols = [
      ...(request.symbols?.length ? request.symbols : base.symbols),
      request.benchmark ?? base.benchmark,
    ]
      .map((symbol) => symbol?.trim().toUpperCase())
      .filter((symbol): symbol is string => Boolean(symbol));
    const uniqueSymbols = [...new Set(symbols)];

    if (!uniqueSymbols.length) {
      throw new BadRequestException(
        'Market data ingestion requires at least one symbol or benchmark',
      );
    }

    return {
      ...base,
      datasetId: request.datasetId?.trim() || base.datasetId,
      provider: request.provider ?? base.provider,
      symbols: uniqueSymbols,
      benchmark: request.benchmark?.trim().toUpperCase() || base.benchmark,
      timeframe: request.timeframe ?? base.timeframe,
      currency: request.currency ?? base.currency,
      windowStart: request.windowStart
        ? this.parseRequestDate(request.windowStart, 'windowStart')
        : base.windowStart,
      windowEnd: request.windowEnd
        ? this.parseRequestDate(request.windowEnd, 'windowEnd')
        : base.windowEnd,
    };
  }

  private getConfig(): ResolvedIngestionConfig {
    const lookbackDays = this.parsePositiveInteger(
      process.env.MARKET_DATA_INGESTION_LOOKBACK_DAYS,
      30,
    );
    const windowEnd = new Date();
    const windowStart = new Date(
      windowEnd.getTime() - lookbackDays * 24 * 60 * 60_000,
    );
    const symbols = this.parseSymbols(
      process.env.MARKET_DATA_INGESTION_SYMBOLS,
    );
    const benchmark =
      process.env.MARKET_DATA_INGESTION_BENCHMARK?.trim().toUpperCase() ??
      'KOSPI200';

    return {
      enabled: process.env.MARKET_DATA_INGESTION_ENABLED === 'true',
      provider:
        (process.env.MARKET_DATA_INGESTION_PROVIDER as MarketDataProvider) ??
        'stooq',
      datasetId:
        process.env.MARKET_DATA_INGESTION_DATASET_ID ?? 'scheduled-daily-bars',
      symbols,
      benchmark,
      timeframe: process.env.MARKET_DATA_INGESTION_TIMEFRAME ?? '1d',
      currency: process.env.MARKET_DATA_INGESTION_CURRENCY ?? 'KRW',
      lookbackDays,
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
    };
  }

  private parseSymbols(value: string | undefined): string[] {
    return (value ?? '')
      .split(',')
      .map((symbol) => symbol.trim().toUpperCase())
      .filter(Boolean);
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    if (!value) {
      return fallback;
    }

    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private parseRequestDate(value: string, field: string): string {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(
        `Market data ingestion ${field} is invalid`,
      );
    }

    return date.toISOString();
  }
}

interface ResolvedIngestionConfig {
  enabled: boolean;
  provider: MarketDataProvider;
  datasetId: string;
  symbols: string[];
  benchmark: string;
  timeframe: string;
  currency: string;
  lookbackDays: number;
  windowStart: string;
  windowEnd: string;
}
