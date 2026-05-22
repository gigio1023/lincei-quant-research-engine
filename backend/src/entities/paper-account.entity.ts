import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PositionSnapshot } from '../modules/risk-gate/risk-gate.types';
import {
  PaperCashLedgerEntry,
  PaperPositionLedgerEntry,
} from './paper-order-plan.entity';

export type PaperAccountStatus = 'seeded' | 'active' | 'paused' | 'archived';

@Entity('paper_accounts')
export class PaperAccount {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'Default paper account' })
  name: string;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column({ default: 'active' })
  status: PaperAccountStatus;

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

  @Column('json')
  cashLedger: PaperCashLedgerEntry[];

  @Column('json')
  positionLedger: PaperPositionLedgerEntry[];

  @Column('json')
  appliedPlanIds: number[];

  @Column({ nullable: true })
  lastAppliedPlanId?: number;

  @Column('datetime', { nullable: true })
  lastReconciledAt?: Date;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
