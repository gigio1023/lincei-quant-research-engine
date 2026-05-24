/** Persisted LEAN backtest/import run with artifact paths and content hashes for replay audits. */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('lean_runs')
@Index(['projectName', 'completedAt'])
export class LeanRun {
  @PrimaryColumn()
  runId: string;

  @Column()
  projectName: string;

  @Column()
  algorithmVersion: string;

  @Column('json')
  parameters: Record<string, string | number | boolean>;

  @Column('datetime')
  startedAt: Date;

  @Column('datetime')
  completedAt: Date;

  @Column({ default: 'passed' })
  status: 'passed' | 'failed' | 'blocked';

  @Column({ default: 'local-lean' })
  runtime: 'local-lean' | 'quantconnect-cloud' | 'simulator';

  @Column({ default: 'backtest' })
  mode: 'backtest' | 'paper' | 'live-shadow';

  @Column({ nullable: true })
  cloudProjectId?: string;

  @Column({ nullable: true })
  cloudBacktestId?: string;

  @Column({ nullable: true })
  cloudUrl?: string;

  @Column({ default: false })
  promotionEligible: boolean;

  @Column()
  resultDirectory: string;

  @Column()
  sourceHash: string;

  @Column()
  configHash: string;

  @Column()
  dataManifestHash: string;

  @Column('json')
  statistics: Record<string, string | number>;

  @Column({ nullable: true })
  equityCurveRef?: string;

  @Column({ nullable: true })
  insightsRef?: string;

  @Column({ nullable: true })
  portfolioTargetsRef?: string;

  @Column({ nullable: true })
  orderEventsRef?: string;

  @Column({ nullable: true })
  fillsRef?: string;

  @Column({ nullable: true })
  logsRef?: string;

  @Column('json')
  blockerReasons: string[];

  @Column({ unique: true })
  importIdempotencyKey: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
