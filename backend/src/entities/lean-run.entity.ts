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
  status: 'passed' | 'failed';

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
