/** In-memory broker for tests and plumbing verification — not production execution. */
import { Injectable } from '@nestjs/common';
import { ExecutionIntentContract } from '../contracts/v1-pilot.contracts';
import {
  BrokerAdapter,
  BrokerFillView,
  BrokerOrderStatusView,
  BrokerSnapshotView,
  OrderPreview,
} from './broker-adapter.interface';
import { hashString } from '../../../shared/hash.util';

@Injectable()
export class MockBrokerAdapter implements BrokerAdapter {
  private readonly orders = new Map<string, BrokerOrderStatusView>();

  async getAccountSnapshot(): Promise<BrokerSnapshotView> {
    return {
      cashUsd: 10,
      equityUsd: 10,
      positions: [],
      snapshotHash: hashString('mock-snapshot'),
    };
  }

  async getOpenOrders(): Promise<BrokerOrderStatusView[]> {
    return [...this.orders.values()].filter((order) => order.status === 'open');
  }

  async getFills(_since: Date): Promise<BrokerFillView[]> {
    return [];
  }

  async previewOrder(intent: ExecutionIntentContract): Promise<OrderPreview> {
    const notional = intent.notionalUsd ?? 0;
    return {
      allowed: notional <= 10,
      estimatedNotionalUsd: notional,
      blockers: notional > 10 ? ['Notional exceeds 10 USD pilot cap.'] : [],
    };
  }

  async submitOrder(intent: ExecutionIntentContract): Promise<BrokerOrderStatusView> {
    const orderRefHash = hashString(intent.idempotencyKey);
    const status: BrokerOrderStatusView = {
      orderRefHash,
      symbol: intent.symbol,
      status: 'filled',
      side: intent.side,
      notionalUsd: intent.notionalUsd,
    };
    this.orders.set(orderRefHash, status);
    return status;
  }

  async cancelOrder(orderRefHash: string): Promise<BrokerOrderStatusView> {
    const existing = this.orders.get(orderRefHash);
    if (!existing) {
      return {
        orderRefHash,
        symbol: 'UNKNOWN',
        status: 'cancelled',
        side: 'buy',
      };
    }
    existing.status = 'cancelled';
    this.orders.set(orderRefHash, existing);
    return existing;
  }

  async flatten(symbol: string): Promise<BrokerOrderStatusView> {
    return {
      orderRefHash: hashString(`flatten:${symbol}`),
      symbol,
      status: 'filled',
      side: 'sell',
      notionalUsd: 0,
    };
  }
}
