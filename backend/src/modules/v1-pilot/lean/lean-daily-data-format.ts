import { MarketDataBar } from '../../../entities/market-data-bar.entity';

export function toLeanDailyCsv(bars: MarketDataBar[]): string {
  return `${bars
    .map((bar) =>
      [
        `${leanDate(bar.timestamp)} 00:00`,
        leanPrice(bar.open),
        leanPrice(bar.high),
        leanPrice(bar.low),
        leanPrice(bar.adjustedClose ?? bar.close),
        Math.max(0, Math.round(bar.volume ?? 0)),
      ].join(','),
    )
    .join('\n')}\n`;
}

export function leanDate(timestamp: string): string {
  return new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, '');
}

export function parseLeanDailyCsv(
  csv: string,
  datasetId: string,
  symbol: string,
  zipPath: string,
): Partial<MarketDataBar>[] {
  return csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [dateTime, open, high, low, close, volume] = line.split(',');
      const date = dateTime.slice(0, 8);
      const timestamp = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00.000Z`;
      const closePrice = Number(close) / 10_000;
      return {
        datasetId,
        provider: 'quantconnect',
        sourceRef: `lean-local:${zipPath}`,
        symbol,
        timeframe: '1d',
        timestamp,
        availabilityTimestamp: timestamp,
        currency: 'USD',
        open: Number(open) / 10_000,
        high: Number(high) / 10_000,
        low: Number(low) / 10_000,
        close: closePrice,
        adjustedClose: closePrice,
        volume: Number(volume),
        notes: ['lean-local-daily'],
        brokerExecutionEnabled: false,
        liveTradingEnabled: false,
      };
    });
}

function leanPrice(value: number): number {
  return Math.round(value * 10_000);
}
