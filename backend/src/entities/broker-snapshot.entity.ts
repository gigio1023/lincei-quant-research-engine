import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { PositionSnapshot } from '../modules/risk-gate/risk-gate.types';

export type BrokerSnapshotProvider = 'manual' | 'toss' | 'simulated';

export type BrokerSnapshotStatus =
  | 'imported'
  | 'matched'
  | 'mismatch'
  | 'stale';

export interface BrokerSnapshotReconciliation {
  status: 'not_checked' | 'matched' | 'mismatch' | 'stale';
  checkedAt?: string;
  paperAccountId?: number;
  cashMatched: boolean;
  equityMatched: boolean;
  positionsMatched: boolean;
  expectedPaperCash?: number;
  actualBrokerCash: number;
  cashDiff?: number;
  expectedPaperEquity?: number;
  actualBrokerEquity: number;
  equityDiff?: number;
  expectedPaperPositions?: Record<string, number>;
  actualBrokerPositions: Record<string, number>;
  positionDiffs?: Record<string, number>;
  tolerance: number;
  maxAgeMinutes: number;
  notes: string[];
}

@Entity('broker_snapshots')
export class BrokerSnapshot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'manual' })
  provider: BrokerSnapshotProvider;

  @Column({ nullable: true })
  sourceRef?: string;

  @Column({ nullable: true })
  accountRefHash?: string;

  @Column({ default: 'imported' })
  status: BrokerSnapshotStatus;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  cash: number;

  @Column('float')
  equity: number;

  @Column('float', { default: 0 })
  grossExposurePct: number;

  @Column('json')
  positions: PositionSnapshot[];

  @Column('datetime')
  asOf: Date;

  @Column('json')
  reconciliation: BrokerSnapshotReconciliation;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
