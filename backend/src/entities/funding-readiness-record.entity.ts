import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { BrokerSnapshotProvider } from './broker-snapshot.entity';

export type FundingReadinessStatus = 'ready' | 'blocked';

export interface FundingReadinessSnapshot {
  expectedDepositAmount: number;
  actualBrokerCash?: number;
  actualBrokerEquity?: number;
  cashDiff?: number;
  equityDiff?: number;
  tolerance: number;
  maxAgeMinutes: number;
  ageMinutes?: number;
  brokerSnapshotAsOf?: string;
  brokerSnapshotReconciliationStatus?: string;
  cashSufficient: boolean;
  equitySufficient: boolean;
  currencyMatched: boolean;
  accountMatched: boolean;
  snapshotFresh: boolean;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  blockers: string[];
  notes: string[];
}

@Entity('funding_readiness_records')
@Index(['status', 'checkedAt'])
@Index(['brokerSnapshotId'])
@Index(['idempotencyKey'], { unique: true })
export class FundingReadinessRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'manual' })
  provider: BrokerSnapshotProvider;

  @Column({ nullable: true })
  idempotencyKey?: string;

  @Column({ nullable: true })
  brokerSnapshotId?: number;

  @Column({ nullable: true })
  accountRefHash?: string;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  expectedDepositAmount: number;

  @Column('float', { nullable: true })
  actualBrokerCash?: number;

  @Column('float', { nullable: true })
  actualBrokerEquity?: number;

  @Column('datetime')
  brokerSnapshotAsOf: Date;

  @Column({ nullable: true })
  brokerSnapshotReconciliationStatus?: string;

  @Column('float', { nullable: true })
  cashDiff?: number;

  @Column('float', { nullable: true })
  equityDiff?: number;

  @Column('float')
  snapshotAgeMinutes: number;

  @Column({ default: 'blocked' })
  status: FundingReadinessStatus;

  @Column('datetime')
  checkedAt: Date;

  @Column('float')
  tolerance: number;

  @Column()
  maxAgeMinutes: number;

  @Column('json')
  readinessSnapshot: FundingReadinessSnapshot;

  @Column('json')
  blockers: string[];

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
