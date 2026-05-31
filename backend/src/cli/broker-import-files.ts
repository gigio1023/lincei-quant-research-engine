import { readFileSync } from 'fs';
import { extname } from 'path';
import type {
  ImportBrokerFillRequest,
  ImportBrokerSnapshotRequest,
} from '../modules/control-plane/control-plane.types';
import type {
  AssetClass,
  OrderSide,
  PositionSnapshot,
} from '../modules/risk-gate/risk-gate.types';

type ImportRow = Record<string, unknown>;

export function readBrokerSnapshotImportFile(
  filePath: string,
): ImportBrokerSnapshotRequest {
  const text = readFileSync(filePath, 'utf8');
  const format = fileFormat(filePath);

  if (format === 'json') {
    return parseSnapshotJson(text, filePath);
  }

  return parseSnapshotCsv(text, filePath);
}

export function readBrokerFillImportFile(
  filePath: string,
): ImportBrokerFillRequest[] {
  const text = readFileSync(filePath, 'utf8');
  const format = fileFormat(filePath);

  if (format === 'json') {
    return parseFillJson(text, filePath);
  }

  return parseFillCsv(text, filePath);
}

export function parseSnapshotCsv(
  text: string,
  sourceRef: string,
): ImportBrokerSnapshotRequest {
  const rows = parseCsv(text);
  if (rows.length === 0) {
    throw new Error('Broker snapshot CSV contains no data rows.');
  }

  const first = rows[0];
  const equity = requiredNumber(first, ['equity', 'net_liquidation']);
  const positions = rows
    .filter((row) => optionalString(row, ['symbol', 'ticker']))
    .map((row) => parsePosition(row, equity));

  return {
    provider: parseProvider(first),
    sourceRef: optionalString(first, ['sourceRef', 'source_ref']) ?? sourceRef,
    accountRef: optionalString(first, ['accountRef', 'account_ref']),
    asOf: requiredString(first, ['asOf', 'as_of', 'timestamp']),
    currency: optionalString(first, ['currency']) ?? 'KRW',
    cash: requiredNumber(first, ['cash', 'cash_balance']),
    equity,
    grossExposurePct: optionalNumber(first, [
      'grossExposurePct',
      'gross_exposure_pct',
    ]),
    positions,
  };
}

export function parseFillCsv(
  text: string,
  sourceRef: string,
): ImportBrokerFillRequest[] {
  return parseCsv(text).map((row) => parseFillRow(row, sourceRef));
}

function parseSnapshotJson(
  text: string,
  sourceRef: string,
): ImportBrokerSnapshotRequest {
  const value = JSON.parse(text) as unknown;
  if (!isRecord(value)) {
    throw new Error('Broker snapshot JSON must be an object.');
  }
  const equity = requiredNumber(value, ['equity', 'net_liquidation']);
  const positionsValue = value.positions;
  const positions =
    positionsValue === undefined
      ? undefined
      : parseJsonPositions(positionsValue, equity);

  return {
    provider: parseProvider(value),
    sourceRef: optionalString(value, ['sourceRef', 'source_ref']) ?? sourceRef,
    accountRef: optionalString(value, ['accountRef', 'account_ref']),
    asOf: requiredString(value, ['asOf', 'as_of', 'timestamp']),
    currency: optionalString(value, ['currency']) ?? 'KRW',
    cash: requiredNumber(value, ['cash', 'cash_balance']),
    equity,
    grossExposurePct: optionalNumber(value, [
      'grossExposurePct',
      'gross_exposure_pct',
    ]),
    positions,
  };
}

function parseFillJson(
  text: string,
  sourceRef: string,
): ImportBrokerFillRequest[] {
  const value = JSON.parse(text) as unknown;
  const fills =
    isRecord(value) && Array.isArray(value.fills) ? value.fills : value;
  if (!Array.isArray(fills)) {
    throw new Error(
      'Broker fills JSON must be an array or { "fills": [...] }.',
    );
  }
  return fills.map((fill) => {
    if (!isRecord(fill)) {
      throw new Error('Broker fill JSON entries must be objects.');
    }
    return parseFillRow(fill, sourceRef);
  });
}

function parseFillRow(
  row: ImportRow,
  sourceRef: string,
): ImportBrokerFillRequest {
  return {
    provider: parseProvider(row),
    sourceRef: optionalString(row, ['sourceRef', 'source_ref']) ?? sourceRef,
    accountRef: optionalString(row, ['accountRef', 'account_ref']),
    brokerOrderRef: optionalString(row, ['brokerOrderRef', 'broker_order_ref']),
    brokerFillRef: requiredString(row, ['brokerFillRef', 'broker_fill_ref']),
    symbol: requiredString(row, ['symbol', 'ticker']).toUpperCase(),
    side: parseSide(requiredString(row, ['side'])),
    quantity: requiredNumber(row, ['quantity', 'qty']),
    fillPrice: requiredNumber(row, ['fillPrice', 'fill_price', 'price']),
    grossNotional: optionalNumber(row, ['grossNotional', 'gross_notional']),
    fee: optionalNumber(row, ['fee']),
    feeCurrency: optionalString(row, ['feeCurrency', 'fee_currency']),
    currency: optionalString(row, ['currency']) ?? 'KRW',
    filledAt: requiredString(row, ['filledAt', 'filled_at', 'timestamp']),
    asOf: optionalString(row, ['asOf', 'as_of']),
  };
}

function parseJsonPositions(
  value: unknown,
  equity: number,
): PositionSnapshot[] {
  if (!Array.isArray(value)) {
    throw new Error('Broker snapshot JSON positions must be an array.');
  }
  return value.map((position) => {
    if (!isRecord(position)) {
      throw new Error('Broker snapshot JSON positions must contain objects.');
    }
    return parsePosition(position, equity);
  });
}

function parseCsv(text: string): ImportRow[] {
  const records = parseCsvRecords(text.trim());
  if (records.length === 0) {
    return [];
  }
  const headers = records[0].map((header) => header.trim());
  return records
    .slice(1)
    .filter((record) => record.some((value) => value.trim()))
    .map((record) =>
      Object.fromEntries(
        headers.map((header, index) => [header, record[index]?.trim() ?? '']),
      ),
    );
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      record.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        index += 1;
      }
      record.push(field);
      records.push(record);
      record = [];
      field = '';
      continue;
    }

    field += char;
  }

  record.push(field);
  records.push(record);
  return records;
}

function parsePosition(row: ImportRow, equity: number): PositionSnapshot {
  const marketValue = requiredNumber(row, ['marketValue', 'market_value']);
  return {
    symbol: requiredString(row, ['symbol', 'ticker']).toUpperCase(),
    assetClass: parseAssetClass(
      optionalString(row, ['assetClass', 'asset_class']),
    ),
    quantity: optionalNumber(row, ['quantity', 'qty']),
    averagePrice: optionalNumber(row, ['averagePrice', 'average_price']),
    costBasis: optionalNumber(row, ['costBasis', 'cost_basis']),
    unrealizedPnl: optionalNumber(row, ['unrealizedPnl', 'unrealized_pnl']),
    realizedPnl: optionalNumber(row, ['realizedPnl', 'realized_pnl']),
    marketValue,
    weightPct:
      optionalNumber(row, ['weightPct', 'weight_pct']) ??
      (equity > 0 ? marketValue / equity : 0),
  };
}

function parseProvider(row: ImportRow): 'manual' | 'simulated' | undefined {
  const provider = optionalString(row, ['provider']);
  if (!provider) {
    return undefined;
  }
  assertManualFileProvider(provider);
  if (provider === 'manual' || provider === 'simulated') {
    return provider;
  }
  return undefined;
}

function assertManualFileProvider(provider: unknown): void {
  if (
    provider === undefined ||
    provider === 'manual' ||
    provider === 'simulated'
  ) {
    return;
  }
  throw new Error(
    'Manual broker file import only accepts provider manual or simulated.',
  );
}

function parseSide(value: string): OrderSide {
  const normalized = value.toUpperCase();
  if (normalized === 'BUY' || normalized === 'SELL' || normalized === 'SHORT') {
    return normalized;
  }
  throw new Error(`Unsupported broker fill side: ${value}`);
}

function parseAssetClass(value: string | undefined): AssetClass {
  if (!value) {
    return 'unknown';
  }
  const allowed = new Set<AssetClass>([
    'cash',
    'domestic_stock',
    'foreign_stock',
    'domestic_etf',
    'foreign_etf',
    'crypto',
    'crypto_derivative',
    'option',
    'future',
    'unknown',
  ]);
  if (allowed.has(value as AssetClass)) {
    return value as AssetClass;
  }
  throw new Error(`Unsupported broker snapshot assetClass: ${value}`);
}

function requiredString(row: ImportRow, names: string[]): string {
  const value = optionalString(row, names);
  if (!value) {
    throw new Error(`Missing required broker import column: ${names[0]}`);
  }
  return value;
}

function optionalString(row: ImportRow, names: string[]): string | undefined {
  for (const name of names) {
    const value = row[name];
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (typeof value !== 'string') {
      throw new Error(`Broker import column ${name} must be a string.`);
    }
    if (value.trim() !== '') {
      return value.trim();
    }
  }
  return undefined;
}

function requiredNumber(row: ImportRow, names: string[]): number {
  const value = optionalNumber(row, names);
  if (value === undefined) {
    throw new Error(`Missing required broker import column: ${names[0]}`);
  }
  return value;
}

function optionalNumber(row: ImportRow, names: string[]): number | undefined {
  for (const name of names) {
    const raw = row[name];
    if (raw === undefined || raw === null || raw === '') {
      continue;
    }
    if (typeof raw === 'number') {
      if (Number.isFinite(raw)) {
        return raw;
      }
      throw new Error(`Invalid numeric broker import value: ${raw}`);
    }
    if (typeof raw !== 'string') {
      throw new Error(`Broker import column ${name} must be numeric.`);
    }
    const parsed = Number(raw.replaceAll(',', ''));
    if (!Number.isFinite(parsed)) {
      throw new Error(`Invalid numeric broker import value: ${raw}`);
    }
    return parsed;
  }
  return undefined;
}

function fileFormat(filePath: string): 'csv' | 'json' {
  const extension = extname(filePath).toLowerCase();
  if (extension === '.json') {
    return 'json';
  }
  if (extension === '.csv') {
    return 'csv';
  }
  throw new Error('Broker import file must be .csv or .json.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
