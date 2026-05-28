import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { OrderSide } from '../modules/risk-gate/risk-gate.types';
import type { BrokerSnapshotProvider } from './broker-snapshot.entity';

export type BrokerFillStatus = 'imported' | 'matched' | 'mismatch';

export interface BrokerFillReconciliation {
  status: 'not_checked' | 'matched' | 'mismatch';
  checkedAt?: string;
  paperOrderPlanId?: number;
  paperFillId?: string;
  symbolMatched: boolean;
  sideMatched: boolean;
  quantityMatched: boolean;
  notionalMatched: boolean;
  feeMatched: boolean;
  brokerQuantity: number;
  brokerGrossNotional: number;
  brokerFee: number;
  expectedQuantity?: number;
  expectedGrossNotional?: number;
  expectedFee?: number;
  quantityDiff?: number;
  notionalDiff?: number;
  feeDiff?: number;
  tolerance: number;
  notes: string[];
}

@Entity('broker_fills')
@Index(['provider', 'filledAt'])
@Index(['brokerFillRefHash'], { unique: true })
export class BrokerFill {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'manual' })
  provider: BrokerSnapshotProvider;

  @Column({ nullable: true })
  sourceRef?: string;

  @Column({ nullable: true })
  accountRefHash?: string;

  @Column({ nullable: true })
  brokerOrderRefHash?: string;

  @Column()
  brokerFillRefHash: string;

  @Column({ default: 'imported' })
  status: BrokerFillStatus;

  @Column()
  symbol: string;

  @Column()
  side: OrderSide;

  @Column('float')
  quantity: number;

  @Column('float')
  fillPrice: number;

  @Column('float')
  grossNotional: number;

  @Column('float', { default: 0 })
  fee: number;

  @Column({ default: 'KRW' })
  feeCurrency: string;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('datetime')
  filledAt: Date;

  @Column('datetime')
  asOf: Date;

  @Column('json')
  reconciliation: BrokerFillReconciliation;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
