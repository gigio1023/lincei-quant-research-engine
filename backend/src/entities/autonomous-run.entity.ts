import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type AutonomousRunStatus =
  | 'idle'
  | 'researching'
  | 'proposed'
  | 'risk_checked'
  | 'paper_ready'
  | 'paused'
  | 'halted'
  | 'completed'
  | 'failed';

export interface RunTimelineEvent {
  at: string;
  stage: AutonomousRunStatus;
  message: string;
}

@Entity('autonomous_runs')
export class AutonomousRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  objective: string;

  @Column({ default: 'idle' })
  status: AutonomousRunStatus;

  @Column({ default: 'budget_defined' })
  currentStage: string;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column({ nullable: true })
  proposalId?: number;

  @Column('json')
  timeline: RunTimelineEvent[];

  @Column('text', { nullable: true })
  lastAction?: string;

  @Column('text', { nullable: true })
  nextAction?: string;

  @Column('text', { nullable: true })
  error?: string;

  @Column('datetime', { nullable: true })
  startedAt?: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
