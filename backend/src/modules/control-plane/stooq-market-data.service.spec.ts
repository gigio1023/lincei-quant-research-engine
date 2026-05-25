import { StooqMarketDataService } from './stooq-market-data.service';

describe('StooqMarketDataService', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('uses Stooq US suffix and optional API key for USD equities', () => {
    process.env.STOOQ_API_KEY = 'test-key';
    const service = new StooqMarketDataService();

    const url = service.buildUrl('https://stooq.com/q/d/l/', {
      provider: 'stooq',
      symbol: 'SMH',
      timeframe: '1d',
      currency: 'USD',
      windowStart: '2024-01-01T00:00:00.000Z',
      windowEnd: '2024-01-10T00:00:00.000Z',
    });

    expect(url).toContain('s=smh.us');
    expect(url).toContain('apikey=test-key');
  });

  it('keeps non-USD symbols unchanged', () => {
    const service = new StooqMarketDataService();

    const url = service.buildUrl('https://stooq.com/q/d/l/', {
      provider: 'stooq',
      symbol: '005930',
      timeframe: '1d',
      currency: 'KRW',
      windowStart: '2024-01-01T00:00:00.000Z',
      windowEnd: '2024-01-10T00:00:00.000Z',
    });

    expect(url).toContain('s=005930');
    expect(url).not.toContain('005930.us');
  });

  it('reports the interactive Stooq API key blocker before CSV parsing', async () => {
    const service = new StooqMarketDataService(async () =>
      [
        'Get your apikey:',
        '1. Open https://stooq.com/q/d/?s=smh.us&get_apikey',
      ].join('\n'),
    );

    await expect(
      service.fetchBars({
        provider: 'stooq',
        symbol: 'SMH',
        timeframe: '1d',
        currency: 'USD',
        windowStart: '2024-01-01T00:00:00.000Z',
        windowEnd: '2024-01-10T00:00:00.000Z',
      }),
    ).rejects.toThrow('STOOQ_API_KEY');
  });
});
