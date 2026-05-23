import { MarketDataIngestionRun } from '../../entities/market-data-ingestion-run.entity';
import { ControlPlaneService } from './control-plane.service';
import { MarketDataIngestionService } from './market-data-ingestion.service';
import { MarketDataProviderService } from './market-data-provider.types';

describe('MarketDataIngestionService', () => {
  const originalEnv = process.env;
  let runs: MarketDataIngestionRun[];
  let importMarketDataBars: jest.Mock;
  let provider: jest.Mocked<MarketDataProviderService>;

  const makeRepository = <T extends { id?: number; updatedAt?: Date }>(
    items: T[],
  ) => ({
    create: jest.fn((value: Partial<T>) => value as T),
    save: jest.fn(async (value: T) => {
      if (!value.id) {
        value.id = items.length + 1;
        value.updatedAt = new Date('2026-05-23T00:00:00.000Z');
        items.push(value);
      }
      return value;
    }),
    find: jest.fn(async () => [...items].reverse()),
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T00:00:00.000Z'));
    process.env = { ...originalEnv };
    delete process.env.MARKET_DATA_INGESTION_ENABLED;
    delete process.env.MARKET_DATA_INGESTION_SYMBOLS;
    runs = [];
    importMarketDataBars = jest.fn(async (request) => ({
      datasetId: request.datasetId,
      symbol: request.symbol,
      provider: request.provider,
      imported: request.bars.length,
      replaced: 0,
      bars: request.bars.map((bar, index) => ({
        id: index + 1,
        ...bar,
        availabilityTimestamp: bar.availabilityTimestamp ?? bar.timestamp,
      })),
      brokerExecutionEnabled: false,
      liveTradingEnabled: false,
    }));
    provider = {
      fetchBars: jest.fn(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.useRealTimers();
  });

  it('stays disabled by default and records a skipped run without provider calls', async () => {
    const service = new MarketDataIngestionService(
      makeRepository(runs) as any,
      {
        importMarketDataBars,
        hashObject: jest.fn(() => 'sha256:skipped'),
      } as unknown as ControlPlaneService,
      provider,
    );

    const result = await service.poll();

    expect(result.status).toBe('skipped');
    expect(result.blockedReasons).toEqual([
      'Market data ingestion is disabled',
    ]);
    expect(result.brokerExecutionEnabled).toBe(false);
    expect(result.liveTradingEnabled).toBe(false);
    expect(provider.fetchBars).not.toHaveBeenCalled();
    expect(importMarketDataBars).not.toHaveBeenCalled();
    expect(runs[0]).toEqual(
      expect.objectContaining({
        status: 'skipped',
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  });

  it('imports configured symbols and benchmark when explicitly enabled', async () => {
    process.env.MARKET_DATA_INGESTION_ENABLED = 'true';
    process.env.MARKET_DATA_INGESTION_SYMBOLS = '005930, 000660';
    process.env.MARKET_DATA_INGESTION_BENCHMARK = 'KOSPI200';
    provider.fetchBars.mockImplementation(async (request) => ({
      provider: 'stooq',
      sourceRef: `stooq:${request.symbol}`,
      symbol: request.symbol,
      timeframe: request.timeframe,
      currency: request.currency,
      bars: [
        {
          timestamp: '2026-05-22T00:00:00.000Z',
          availabilityTimestamp: '2026-05-22T00:00:00.000Z',
          open: 100,
          high: 101,
          low: 99,
          close: 100,
        },
      ],
    }));
    const service = new MarketDataIngestionService(
      makeRepository(runs) as any,
      {
        importMarketDataBars,
        hashObject: jest.fn(() => 'sha256:enabled'),
      } as unknown as ControlPlaneService,
      provider,
    );

    const result = await service.poll();

    expect(provider.fetchBars).toHaveBeenCalledTimes(3);
    expect(
      provider.fetchBars.mock.calls.map(([request]) => request.symbol),
    ).toEqual(['005930', '000660', 'KOSPI200']);
    expect(importMarketDataBars).toHaveBeenCalledTimes(3);
    expect(result).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        imported: 3,
        replaced: 0,
        importedSymbols: ['005930', '000660', 'KOSPI200'],
        failedSymbols: [],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      }),
    );
  });
});
