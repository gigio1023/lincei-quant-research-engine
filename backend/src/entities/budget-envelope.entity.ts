import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  AssetClass,
  RiskGateMode,
  RiskPolicy,
} from '../modules/risk-gate/risk-gate.types';

export type BudgetEnvelopeStatus = 'draft' | 'active' | 'paused' | 'archived';

@Entity('budget_envelopes')
export class BudgetEnvelope {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ default: 'draft' })
  status: BudgetEnvelopeStatus;

  @Column({ default: 'dry_run' })
  mode: RiskGateMode;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  totalBudget: number;

  @Column('float', { default: 20 })
  cashReservePct: number;

  @Column('json')
  allowedAssetClasses: AssetClass[];

  @Column('json')
  policy: RiskPolicy;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @Column('text', { nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
