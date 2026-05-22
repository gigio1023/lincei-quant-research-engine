import { BadRequestException } from '@nestjs/common';
import { ImportBrokerSnapshotRequest } from './control-plane.types';
import { AssetClass, PositionSnapshot } from '../risk-gate/risk-gate.types';

export interface TossReadOnlyRawSnapshot {
  accountRef: string;
  asOf: string;
  holdings: Record<string, unknown>;
}

const POSITION_FIELDS = {
  symbol: ['symbol', 'stockCode', 'ticker', 'code', 'isin'],
  name: ['name', 'stockName', 'displayName'],
  marketValue: [
    'marketValue',
    'evaluationAmount',
    'evaluatedAmount',
    'amount',
    'balance',
    'assetAmount',
  ],
  assetClass: ['assetClass', 'productType', 'market'],
};

export function mapTossReadOnlySnapshot(
  snapshot: TossReadOnlyRawSnapshot,
): ImportBrokerSnapshotRequest {
  const cash = readFirstFiniteNumber(snapshot.holdings, [
    'cash',
    'cashBalance',
    'withdrawableAmount',
    'availableCash',
    'krwCash',
  ]);
  const positions = extractPositions(snapshot.holdings);
  const positionsValue = positions.reduce(
    (total, position) => total + Math.abs(position.marketValue),
    0,
  );
  const equity =
    readFirstFiniteNumber(snapshot.holdings, [
      'equity',
      'totalEquity',
      'totalEvaluationAmount',
      'totalEvaluatedAmount',
      'assetTotalAmount',
      'totalAssetAmount',
    ]) ?? cash + positionsValue;

  if (!Number.isFinite(cash) || cash < 0) {
    throw new BadRequestException(
      'Toss read-only holdings response is missing cash',
    );
  }

  if (!Number.isFinite(equity) || equity < 0) {
    throw new BadRequestException(
      'Toss read-only holdings response is missing equity',
    );
  }

  return {
    provider: 'toss',
    sourceRef: 'toss-read-only-poll',
    accountRef: snapshot.accountRef,
    asOf: snapshot.asOf,
    currency: 'KRW',
    cash,
    equity,
    positions: positions.map((position) => ({
      ...position,
      weightPct:
        position.weightPct ??
        (equity === 0 ? 0 : roundMoney((position.marketValue / equity) * 100)),
    })),
  };
}

function extractPositions(
  holdings: Record<string, unknown>,
): PositionSnapshot[] {
  const items = readArray(holdings, [
    'items',
    'holdings',
    'positions',
    'stocks',
    'result.items',
    'result.holdings',
    'data.items',
  ]);

  return items
    .map((item): PositionSnapshot | null => {
      const record = asRecord(item);

      if (!record) {
        return null;
      }

      const symbol =
        readFirstString(record, POSITION_FIELDS.symbol) ??
        readFirstString(record, POSITION_FIELDS.name);
      const marketValue = readFirstFiniteNumber(
        record,
        POSITION_FIELDS.marketValue,
      );

      if (!symbol || marketValue === undefined || marketValue <= 0) {
        return null;
      }

      return {
        symbol,
        assetClass: mapTossAssetClass(
          readFirstString(record, POSITION_FIELDS.assetClass),
        ),
        marketValue,
        weightPct: undefined,
      };
    })
    .filter((position): position is PositionSnapshot => Boolean(position));
}

function mapTossAssetClass(value: string | undefined): AssetClass {
  const normalized = value?.toLowerCase() ?? '';

  if (normalized.includes('foreign') || normalized.includes('us')) {
    return 'foreign_stock';
  }

  if (normalized.includes('etf')) {
    return 'domestic_etf';
  }

  return 'domestic_stock';
}

function readFirstFiniteNumber(
  record: Record<string, unknown>,
  keys: string[],
): number | undefined {
  for (const key of keys) {
    const value = readPath(record, key);
    const numberValue =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value.replaceAll(',', ''))
          : Number.NaN;

    if (Number.isFinite(numberValue)) {
      return roundMoney(numberValue);
    }
  }

  return undefined;
}

function readFirstString(
  record: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = readPath(record, key);

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function readArray(record: Record<string, unknown>, keys: string[]): unknown[] {
  for (const key of keys) {
    const value = readPath(record, key);

    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
}

function readPath(record: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (current, part) => asRecord(current)?.[part] ?? undefined,
      record,
    );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}
