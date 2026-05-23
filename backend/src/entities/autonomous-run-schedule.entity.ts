import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { RiskGateMode } from '../modules/risk-gate/risk-gate.types';

@Entity('autonomous_run_schedules')
export class AutonomousRunSchedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  budgetEnvelopeId: number;

  @Column('text')
  objective: string;

  @Column({ default: 'dry_run' })
  mode: RiskGateMode;

  @Column({ default: 60 })
  cadenceMinutes: number;

  @Column('datetime')
  nextRunAt: Date;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: true })
  attemptPaperExecution: boolean;

  @Column({ default: false })
  autoPaperApprovalEnabled: boolean;

  @Column({ nullable: true })
  autoPaperApprover?: string | null;

  @Column('text', { nullable: true })
  autoPaperApprovalReason?: string | null;

  @Column({ nullable: true })
  autoPaperApprovalSignerKeyRef?: string | null;

  @Column({ nullable: true })
  autoPaperApprovalBudgetHash?: string | null;

  @Column({ nullable: true })
  lastRunId?: number | null;

  @Column({ nullable: true })
  lastCycleKey?: string | null;

  @Column('datetime', { nullable: true })
  lastTickAt?: Date | null;

  @Column({ nullable: true })
  leaseOwner?: string | null;

  @Column('datetime', { nullable: true })
  leaseExpiresAt?: Date | null;

  @Column('text', { nullable: true })
  lastError?: string | null;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
