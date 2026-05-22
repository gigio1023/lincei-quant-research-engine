import { BadRequestException } from '@nestjs/common';
import {
  ImportBrokerFillRequest,
  ImportBrokerSnapshotRequest,
} from './control-plane.types';
import { AssetClass, PositionSnapshot } from '../risk-gate/risk-gate.types';

export interface TossReadOnlyRawSnapshot {
  accountRef: string;
  asOf: string;
  holdings: Record<string, unknown>;
}

export interface TossReadOnlyRawFills {
  accountRef: string;
  asOf: string;
  fills: Record<string, unknown>;
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

const FILL_FIELDS = {
  fillRef: ['fillId', 'executionId', 'tradeId', 'id', 'executionNo'],
  orderRef: ['orderId', 'orderNo', 'brokerOrderId', 'originalOrderId'],
  symbol: ['symbol', 'stockCode', 'ticker', 'code', 'isin'],
  side: ['side', 'orderSide', 'tradeSide', 'buySellType', 'transactionType'],
  quantity: ['quantity', 'filledQuantity', 'executedQuantity', 'qty'],
  fillPrice: ['fillPrice', 'executedPrice', 'price', 'averagePrice'],
  grossNotional: [
    'grossNotional',
    'executedAmount',
    'tradeAmount',
    'amount',
    'notional',
  ],
  fee: ['fee', 'commission', 'commissionAmount', 'totalFee'],
  feeCurrency: ['feeCurrency', 'currency'],
  currency: ['currency', 'settlementCurrency'],
  filledAt: ['filledAt', 'executedAt', 'tradeAt', 'timestamp', 'createdAt'],
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

export function mapTossReadOnlyFills(
  raw: TossReadOnlyRawFills,
): ImportBrokerFillRequest[] {
  return extractFills(raw.fills).map((fill, index) => ({
    provider: 'toss',
    sourceRef: `toss-read-only-fill-poll:${index}`,
    accountRef: raw.accountRef,
    ...fill,
    asOf: raw.asOf,
  }));
}

function extractFills(
  fillsResponse: Record<string, unknown>,
): Omit<ImportBrokerFillRequest, 'provider' | 'sourceRef' | 'accountRef'>[] {
  const items = readArray(fillsResponse, [
    'items',
    'fills',
    'executions',
    'trades',
    'orders',
    'result.items',
    'result.fills',
    'result.executions',
    'data.items',
    'data.fills',
  ]);

  return items.map((item, index) => {
    const record = asRecord(item);

    if (!record) {
      throw new BadRequestException(
        `Toss read-only fill item ${index} is not an object`,
      );
    }

    const symbol = readFirstString(record, FILL_FIELDS.symbol);
    const side = mapTossOrderSide(readFirstString(record, FILL_FIELDS.side));
    const quantity = readFirstFiniteNumber(record, FILL_FIELDS.quantity);
    const fillPrice = readFirstFiniteNumber(record, FILL_FIELDS.fillPrice);
    const fee = readFirstFiniteNumber(record, FILL_FIELDS.fee) ?? 0;
    const grossNotional =
      readFirstFiniteNumber(record, FILL_FIELDS.grossNotional) ??
      (quantity !== undefined && fillPrice !== undefined
        ? roundMoney(quantity * fillPrice)
        : undefined);
    const filledAt =
      readFirstString(record, FILL_FIELDS.filledAt) ?? new Date().toISOString();
    const fillRef =
      readFirstString(record, FILL_FIELDS.fillRef) ??
      `${symbol ?? 'unknown'}:${side ?? 'unknown'}:${filledAt}:${index}`;

    if (!symbol || !side || !quantity || !fillPrice || !grossNotional) {
      throw new BadRequestException(
        `Toss read-only fill item ${index} is missing symbol, side, quantity, price, or notional`,
      );
    }

    return {
      brokerOrderRef: readFirstString(record, FILL_FIELDS.orderRef),
      brokerFillRef: fillRef,
      symbol,
      side,
      quantity,
      fillPrice,
      grossNotional,
      fee,
      feeCurrency:
        readFirstString(record, FILL_FIELDS.feeCurrency) ??
        readFirstString(record, FILL_FIELDS.currency) ??
        'KRW',
      currency: readFirstString(record, FILL_FIELDS.currency) ?? 'KRW',
      filledAt,
    };
  });
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

function mapTossOrderSide(value: string | undefined): 'BUY' | 'SELL' | null {
  const normalized = value?.trim().toLowerCase() ?? '';

  if (['buy', 'bid', 'b', '매수'].includes(normalized)) {
    return 'BUY';
  }

  if (['sell', 'ask', 's', '매도'].includes(normalized)) {
    return 'SELL';
  }

  return null;
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
