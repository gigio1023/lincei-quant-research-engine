import { writeFileSync } from 'fs';
import { join } from 'path';
import type { QuantConnectCloudRestImportRequest } from './lean-cloud-rest-importer';

type QuantConnectBacktestPayload = {
  completed?: boolean;
  status?: string;
  error?: string;
  backtestStart?: string;
  backtestEnd?: string;
  statistics?: Record<string, string | number>;
  runtimeStatistics?: Record<string, string | number>;
};

type NormalizedCloudInsight = {
  id: string;
  symbol: string;
  direction: string;
  periodDays: number;
  confidence: number;
  magnitude: number;
  sourceModel: string;
  generatedTime: string;
};

type NormalizedCloudOrderEvent = {
  id: string;
  symbol: string;
  status: string;
  direction: string;
  fillQuantity: number;
  fillPrice: number;
  orderFee: number;
  utcTime: string;
};

const SECONDS_PER_DAY = 86_400;
const QUANTCONNECT_SYMBOL_ID_PATTERN = /^[A-Z0-9]{8,}$/;

export type QuantConnectCloudArtifactPayload = {
  backtest: QuantConnectBacktestPayload;
  insights: Record<string, unknown>[];
  orders: Record<string, unknown>[];
};

export class QuantConnectCloudArtifactMapper {
  writeImportedArtifacts(
    input: QuantConnectCloudRestImportRequest,
    payload: QuantConnectCloudArtifactPayload,
  ): void {
    const normalizedInsights = payload.insights.map((insight, index) =>
      this.normalizeCloudInsight(insight, index),
    );
    const normalizedOrderEvents = this.normalizeCloudOrderEvents(
      payload.orders,
    );
    const normalizedFills = normalizedOrderEvents
      .filter((event) => event.status.toLowerCase().includes('filled'))
      .map((event) => ({
        id: `fill-${event.id}`,
        orderId: event.id,
        symbol: event.symbol,
        quantity: event.fillQuantity,
        price: event.fillPrice,
        fee: event.orderFee,
        filledAt: event.utcTime,
      }));
    const statistics = {
      ...(payload.backtest.statistics ?? {}),
      ...(payload.backtest.runtimeStatistics ?? {}),
      cloudProjectId: input.projectId ?? '',
      cloudBacktestId: input.cloudBacktestId!,
      cloudStatus: payload.backtest.status ?? 'Completed.',
      cloudImportedInsightCount: normalizedInsights.length,
      cloudImportedOrderCount: payload.orders.length,
      cloudImportedOrderEventCount: normalizedOrderEvents.length,
    };
    const derivedTargets = this.deriveTargetsFromCloudOrders(
      normalizedInsights,
      normalizedOrderEvents,
      statistics,
    );

    this.writeJson(join(input.resultDirectory, 'statistics.json'), statistics);
    this.writeJson(join(input.resultDirectory, 'insights.json'), {
      runId: input.runId,
      insights: normalizedInsights,
    });
    this.writeJson(join(input.resultDirectory, 'order_events.json'), {
      events: normalizedOrderEvents,
    });
    this.writeJson(join(input.resultDirectory, 'fills.json'), {
      fills: normalizedFills,
    });
    this.writeJson(join(input.resultDirectory, 'portfolio_targets.json'), {
      id: `targets-${input.runId}`,
      leanRunId: input.runId,
      asOf:
        payload.backtest.backtestEnd ??
        payload.backtest.backtestStart ??
        input.completedAt.toISOString(),
      targets: derivedTargets,
      ...this.targetExposure(derivedTargets),
      riskNotes: ['derived_from_quantconnect_cloud_net_fill_notional'],
    });
    this.writeJson(join(input.resultDirectory, 'data-monitor-report.json'), {
      'total-data-requests-count': 1,
      'failed-data-requests-count': 0,
      'failed-data-requests-percentage': 0,
      'failed-universe-data-requests-count': 0,
      'failed-universe-data-requests-percentage': 0,
      source: 'quantconnect-cloud-rest',
    });
  }

  private normalizeCloudInsight(
    insight: Record<string, unknown>,
    index: number,
  ): NormalizedCloudInsight {
    const symbol = this.symbolValue(insight.symbol) || 'UNKNOWN';
    const generatedTime = this.timestampValue(
      insight.generatedTimeUtc ??
        insight.generatedTime ??
        insight.closeTimeUtc ??
        new Date().toISOString(),
    );
    return {
      id: String(insight.id ?? `cloud-insight-${index}-${symbol}`),
      symbol,
      direction: this.directionName(insight.direction),
      periodDays: this.periodDaysValue(insight.periodDays ?? insight.period),
      confidence: Number(insight.confidence ?? 0.5) || 0.5,
      magnitude: Number(insight.magnitude ?? 0) || 0,
      sourceModel: String(insight.sourceModel ?? 'quantconnect-cloud'),
      generatedTime,
    };
  }

  private normalizeCloudOrderEvents(
    orders: Record<string, unknown>[],
  ): NormalizedCloudOrderEvent[] {
    return orders.flatMap((order, orderIndex) => {
      const orderEvents = Array.isArray(order.events) ? order.events : [];
      if (orderEvents.length === 0) {
        return [this.normalizeCloudOrderEvent(order, order, orderIndex, 0)];
      }
      return orderEvents.map((event, eventIndex) =>
        this.normalizeCloudOrderEvent(
          order,
          event as Record<string, unknown>,
          orderIndex,
          eventIndex,
        ),
      );
    });
  }

  private normalizeCloudOrderEvent(
    order: Record<string, unknown>,
    event: Record<string, unknown>,
    orderIndex: number,
    eventIndex: number,
  ): NormalizedCloudOrderEvent {
    const symbol =
      this.symbolValue(event.symbol) || this.symbolValue(order.symbol);
    const fillQuantity = Number(
      event.fillQuantity ?? event.quantity ?? order.quantity ?? 0,
    );
    const fillPrice = Number(event.fillPrice ?? order.price ?? 0);
    return {
      id: String(
        event.id ?? event.orderId ?? order.id ?? `${orderIndex}-${eventIndex}`,
      ),
      symbol: symbol || 'UNKNOWN',
      status: this.orderStatusName(event.status ?? order.status),
      direction: this.directionName(event.direction ?? order.direction),
      fillQuantity: Number.isFinite(fillQuantity) ? fillQuantity : 0,
      fillPrice: Number.isFinite(fillPrice) ? fillPrice : 0,
      orderFee: this.orderFeeValue(event.orderFee),
      utcTime: this.timestampValue(
        event.utcTime ??
          event.time ??
          order.lastFillTime ??
          order.lastUpdateTime ??
          order.time ??
          new Date().toISOString(),
      ),
    };
  }

  private deriveTargetsFromCloudOrders(
    insights: NormalizedCloudInsight[],
    orderEvents: NormalizedCloudOrderEvent[],
    statistics: Record<string, string | number>,
  ) {
    const endEquity = this.numericStat(statistics['End Equity']) || 100_000;
    const insightsBySymbol = new Map<string, string[]>();
    for (const insight of insights) {
      const refs = insightsBySymbol.get(insight.symbol) ?? [];
      refs.push(insight.id);
      insightsBySymbol.set(insight.symbol, refs);
    }
    const notionalBySymbol = new Map<string, number>();
    for (const event of orderEvents) {
      if (!event.status.toLowerCase().includes('filled')) {
        continue;
      }
      const signedNotional = this.signedFillQuantity(event) * event.fillPrice;
      notionalBySymbol.set(
        event.symbol,
        (notionalBySymbol.get(event.symbol) ?? 0) + signedNotional,
      );
    }
    return [...notionalBySymbol.entries()]
      .filter(([symbol]) => (insightsBySymbol.get(symbol) ?? []).length > 0)
      .filter(([, notional]) => Math.abs(notional / endEquity) > 0.00001)
      .map(([symbol, notional]) => ({
        symbol,
        targetWeight: Number((notional / endEquity).toFixed(6)),
        sourceInsightIds: insightsBySymbol.get(symbol) ?? [],
        riskAdjusted: true,
        riskNotes: ['derived_from_quantconnect_cloud_net_fill_notional'],
      }));
  }

  private signedFillQuantity(event: NormalizedCloudOrderEvent): number {
    if (event.fillQuantity < 0) {
      return event.fillQuantity;
    }
    if (event.direction === 'sell') {
      return -Math.abs(event.fillQuantity);
    }
    return event.fillQuantity;
  }

  private targetExposure(targets: { targetWeight: number }[]): {
    grossExposurePct: number;
    maxSingleNamePct: number;
  } {
    const weights = targets.map((target) => Math.abs(target.targetWeight));
    return {
      grossExposurePct: Number(
        weights.reduce((sum, weight) => sum + weight, 0).toFixed(6),
      ),
      maxSingleNamePct: Number(Math.max(0, ...weights).toFixed(6)),
    };
  }

  private symbolValue(value: unknown): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return this.normalizeSymbol(value);
    }
    if (typeof value === 'object') {
      const candidate = value as { value?: unknown; Value?: unknown };
      return this.normalizeSymbol(
        String(candidate.value ?? candidate.Value ?? ''),
      );
    }
    return this.normalizeSymbol(String(value));
  }

  private normalizeSymbol(symbol: string): string {
    const tokens = symbol.trim().split(/\s+/);
    if (
      tokens.length === 2 &&
      QUANTCONNECT_SYMBOL_ID_PATTERN.test(tokens[1] ?? '')
    ) {
      return tokens[0] ?? symbol.trim();
    }
    return symbol.trim();
  }

  private orderStatusName(value: unknown): string {
    const status = Number(value);
    if (Number.isFinite(status)) {
      return (
        (
          {
            0: 'New',
            1: 'Submitted',
            2: 'PartiallyFilled',
            3: 'Filled',
            5: 'Canceled',
            6: 'None',
            7: 'Invalid',
            8: 'CancelPending',
            9: 'UpdateSubmitted',
          } as Record<number, string>
        )[status] ?? String(value)
      );
    }
    return String(value ?? 'Unknown');
  }

  private directionName(value: unknown): string {
    const direction = Number(value);
    if (Number.isFinite(direction)) {
      return direction === 1 ? 'sell' : direction === 2 ? 'flat' : 'buy';
    }
    const raw = String(value ?? '').toLowerCase();
    if (raw.includes('down') || raw.includes('sell')) {
      return 'sell';
    }
    if (raw.includes('flat') || raw.includes('hold')) {
      return 'flat';
    }
    return 'buy';
  }

  private orderFeeValue(value: unknown): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (value && typeof value === 'object') {
      const candidate = value as { value?: unknown; amount?: unknown };
      return Number(candidate.value ?? candidate.amount ?? 0) || 0;
    }
    return 0;
  }

  private numericStat(value: string | number | undefined): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0;
    }
    if (typeof value !== 'string') {
      return 0;
    }
    const parsed = Number(value.replace(/[%$,]/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private periodDaysValue(value: unknown): number {
    const raw = Number(value ?? 1);
    if (!Number.isFinite(raw) || raw <= 0) {
      return 1;
    }
    return Number((raw > 365 ? raw / SECONDS_PER_DAY : raw).toFixed(6));
  }

  private timestampValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    const raw = String(value ?? '').trim();
    const numeric = Number(raw);
    if (Number.isFinite(numeric) && raw !== '') {
      const milliseconds = numeric < 10_000_000_000 ? numeric * 1000 : numeric;
      return new Date(milliseconds).toISOString();
    }
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return new Date().toISOString();
  }

  private writeJson(path: string, payload: unknown): void {
    writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  }
}
