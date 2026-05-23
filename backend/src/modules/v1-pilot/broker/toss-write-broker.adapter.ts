import { Injectable } from '@nestjs/common';
import { ExecutionIntentContract } from '../contracts/v1-pilot.contracts';
import {
  BrokerAdapter,
  BrokerFillView,
  BrokerOrderStatusView,
  BrokerSnapshotView,
  OrderPreview,
} from './broker-adapter.interface';

@Injectable()
export class TossWriteBrokerAdapter implements BrokerAdapter {
  private blocked(reason: string): never {
    throw new Error(
      `Toss write adapter blocked: ${reason}. Complete schema verification before live writes.`,
    );
  }

  async getAccountSnapshot(): Promise<BrokerSnapshotView> {
    this.blocked('read path not enabled for write adapter in V1');
  }

  async getOpenOrders(): Promise<BrokerOrderStatusView[]> {
    this.blocked('open-order polling not verified');
  }

  async getFills(): Promise<BrokerFillView[]> {
    this.blocked('fill polling not verified');
  }

  async previewOrder(_intent: ExecutionIntentContract): Promise<OrderPreview> {
    this.blocked('order preview not verified');
  }

  async submitOrder(_intent: ExecutionIntentContract): Promise<BrokerOrderStatusView> {
    this.blocked('order create schema not verified');
  }

  async cancelOrder(): Promise<BrokerOrderStatusView> {
    this.blocked('cancel schema not verified');
  }

  async flatten(): Promise<BrokerOrderStatusView> {
    this.blocked('flatten path not verified');
  }
}
