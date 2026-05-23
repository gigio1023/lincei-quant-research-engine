import { ExecutionIntentContract } from '../contracts/v1-pilot.contracts';

export type BrokerSnapshotView = {
  cashUsd: number;
  equityUsd: number;
  positions: Array<{ symbol: string; quantity: number; marketValueUsd: number }>;
  snapshotHash: string;
};

export type BrokerOrderStatusView = {
  orderRefHash: string;
  symbol: string;
  status: 'open' | 'filled' | 'cancelled' | 'rejected';
  side: 'buy' | 'sell';
  notionalUsd?: number;
};

export type BrokerFillView = {
  fillRefHash: string;
  orderRefHash: string;
  symbol: string;
  quantity: number;
  price: number;
  filledAt: string;
};

export type OrderPreview = {
  allowed: boolean;
  estimatedNotionalUsd: number;
  blockers: string[];
};

export interface BrokerAdapter {
  getAccountSnapshot(): Promise<BrokerSnapshotView>;
  getOpenOrders(): Promise<BrokerOrderStatusView[]>;
  getFills(since: Date): Promise<BrokerFillView[]>;
  previewOrder(intent: ExecutionIntentContract): Promise<OrderPreview>;
  submitOrder(intent: ExecutionIntentContract): Promise<BrokerOrderStatusView>;
  cancelOrder(orderRefHash: string): Promise<BrokerOrderStatusView>;
  flatten(symbol: string): Promise<BrokerOrderStatusView>;
}
