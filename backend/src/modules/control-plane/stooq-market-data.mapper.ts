import { BadRequestException } from '@nestjs/common';
import { ImportMarketDataBarInput } from './control-plane.types';

export function parseStooqDailyCsv(
  csv: string,
  symbol: string,
): ImportMarketDataBarInput[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new BadRequestException(`Stooq response for ${symbol} has no bars`);
  }

  const headers = lines[0]
    .split(',')
    .map((header) => header.trim().toLowerCase());
  const index = {
    date: headers.indexOf('date'),
    open: headers.indexOf('open'),
    high: headers.indexOf('high'),
    low: headers.indexOf('low'),
    close: headers.indexOf('close'),
    volume: headers.indexOf('volume'),
  };

  if (
    index.date < 0 ||
    index.open < 0 ||
    index.high < 0 ||
    index.low < 0 ||
    index.close < 0
  ) {
    throw new BadRequestException(
      `Stooq response for ${symbol} is missing Date/Open/High/Low/Close columns`,
    );
  }

  return lines.slice(1).map((line, rowIndex) => {
    const cells = line.split(',').map((cell) => cell.trim());
    const date = cells[index.date];
    const timestamp = new Date(`${date}T00:00:00.000Z`);
    const availabilityTimestamp = new Date(`${date}T22:00:00.000Z`);
    const open = parseRequiredNumber(
      cells[index.open],
      symbol,
      rowIndex,
      'open',
    );
    const high = parseRequiredNumber(
      cells[index.high],
      symbol,
      rowIndex,
      'high',
    );
    const low = parseRequiredNumber(cells[index.low], symbol, rowIndex, 'low');
    const close = parseRequiredNumber(
      cells[index.close],
      symbol,
      rowIndex,
      'close',
    );
    const volume =
      index.volume >= 0 && cells[index.volume]
        ? Number(cells[index.volume])
        : undefined;

    if (Number.isNaN(timestamp.getTime())) {
      throw new BadRequestException(
        `Stooq response for ${symbol} row ${rowIndex + 1} has invalid Date`,
      );
    }

    if (timestamp.getTime() > Date.now()) {
      throw new BadRequestException(
        `Stooq response for ${symbol} row ${rowIndex + 1} is future dated`,
      );
    }

    return {
      timestamp: timestamp.toISOString(),
      availabilityTimestamp: availabilityTimestamp.toISOString(),
      open,
      high,
      low,
      close,
      adjustedClose: close,
      volume: volume === undefined || Number.isNaN(volume) ? undefined : volume,
      notes: ['stooq:daily-csv'],
    };
  });
}

function parseRequiredNumber(
  value: string | undefined,
  symbol: string,
  rowIndex: number,
  field: string,
): number {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(
      `Stooq response for ${symbol} row ${rowIndex + 1} has invalid ${field}`,
    );
  }

  return parsed;
}
