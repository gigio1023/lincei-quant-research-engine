import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  OrderSide,
  OrderType,
} from '../modules/risk-gate/risk-gate.types';
import type { BrokerSnapshotProvider } from './broker-snapshot.entity';

export type BrokerOrderExternalStatus =
  | 'submitted'
  | 'accepted'
  | 'open'
  | 'partially_filled'
  | 'filled'
  | 'pending_cancel'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'unknown';

export type BrokerOrderStatusRecordStatus =
  | 'imported'
  | 'matched'
  | 'mismatch'
  | 'unlinked';

export interface BrokerOrderStatusReconciliation {
  status: 'not_checked' | 'matched' | 'mismatch' | 'unlinked';
  checkedAt?: string;
  brokerOrderCommandId?: number;
  brokerOrderIntentId?: string;
  paperOrderPlanId?: number;
  sourcePaperOrderId?: string;
  symbolMatched: boolean;
  sideMatched: boolean;
  orderTypeMatched: boolean;
  notionalWithinPlan: boolean;
  quantityWithinPlan: boolean;
  commandDryRunOnly: boolean;
  brokerExternalStatus: BrokerOrderExternalStatus;
  expectedSymbol?: string;
  expectedSide?: OrderSide;
  expectedOrderType?: OrderType;
  expectedNotional?: number;
  expectedQuantity?: number;
  notionalDiff?: number;
  quantityDiff?: number;
  notes: string[];
}

@Entity('broker_order_status_records')
@Index(['provider', 'asOf'])
@Index(['externalStatus', 'asOf'])
@Index(['brokerOrderRefHash'], { unique: true })
@Index(['brokerOrderCommandId'])
@Index(['paperOrderPlanId'])
export class BrokerOrderStatusRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'manual' })
  provider: BrokerSnapshotProvider;

  @Column({ nullable: true })
  sourceRef?: string;

  @Column({ nullable: true })
  accountRefHash?: string;

  @Column()
  brokerOrderRefHash: string;

  @Column({ nullable: true })
  brokerOrderCommandId?: number;

  @Column({ nullable: true })
  brokerOrderIntentId?: string;

  @Column({ nullable: true })
  paperOrderPlanId?: number;

  @Column({ default: 'imported' })
  status: BrokerOrderStatusRecordStatus;

  @Column()
  externalStatus: BrokerOrderExternalStatus;

  @Column()
  symbol: string;

  @Column()
  side: OrderSide;

  @Column()
  orderType: OrderType;

  @Column('float', { nullable: true })
  requestedQuantity?: number;

  @Column('float', { nullable: true })
  filledQuantity?: number;

  @Column('float', { nullable: true })
  remainingQuantity?: number;

  @Column('float', { nullable: true })
  requestedNotional?: number;

  @Column('float', { nullable: true })
  averageFillPrice?: number;

  @Column('float', { nullable: true })
  limitPrice?: number;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('datetime', { nullable: true })
  submittedAt?: Date;

  @Column('datetime')
  asOf: Date;

  @Column('json')
  reconciliation: BrokerOrderStatusReconciliation;

  @Column('json')
  notes: string[];

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
