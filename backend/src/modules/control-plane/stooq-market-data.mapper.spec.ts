import { BadRequestException } from '@nestjs/common';
import { parseStooqDailyCsv } from './stooq-market-data.mapper';

describe('parseStooqDailyCsv', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-05-23T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('maps Stooq daily CSV rows into market data bar inputs', () => {
    const bars = parseStooqDailyCsv(
      [
        'Date,Open,High,Low,Close,Volume',
        '2026-05-20,100,103,99,102,12345',
        '2026-05-21,102,105,101,104,23456',
      ].join('\n'),
      '005930',
    );

    expect(bars).toEqual([
      expect.objectContaining({
        timestamp: '2026-05-20T00:00:00.000Z',
        availabilityTimestamp: '2026-05-20T00:00:00.000Z',
        open: 100,
        high: 103,
        low: 99,
        close: 102,
        adjustedClose: 102,
        volume: 12345,
        notes: ['stooq:daily-csv'],
      }),
      expect.objectContaining({
        timestamp: '2026-05-21T00:00:00.000Z',
        close: 104,
        volume: 23456,
      }),
    ]);
  });

  it('rejects malformed or future-dated Stooq bars', () => {
    expect(() =>
      parseStooqDailyCsv('Date,Open,High,Low,Close\n2026-06-01,1,2,1,2', 'ABC'),
    ).toThrow(BadRequestException);
    expect(() =>
      parseStooqDailyCsv('Date,Open,High,Low,Close\n2026-05-20,x,2,1,2', 'ABC'),
    ).toThrow(BadRequestException);
  });
});
