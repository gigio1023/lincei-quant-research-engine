import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ResearchJobType =
  | 'corpus-ingest'
  | 'hypothesis-extraction'
  | 'data-ingest'
  | 'feature-generation'
  | 'llm-semantic-feature'
  | 'ablation'
  | 'backtest'
  | 'cloud-import'
  | 'promotion-check';

export type ResearchJobStatus = 'passed' | 'failed' | 'blocked';

@Entity('research_job_records')
@Index(['runId', 'status'])
@Index(['jobType', 'partitionKey'])
export class ResearchJobRecord {
  @PrimaryColumn()
  jobId: string;

  @Column()
  runId: string;

  @Column({ nullable: true })
  parentJobId?: string;

  @Column()
  jobType: ResearchJobType;

  @Column()
  partitionKey: string;

  @Column('json')
  inputRefs: string[];

  @Column()
  inputHash: string;

  @Column('json')
  outputRefs: string[];

  @Column({ nullable: true })
  outputHash?: string;

  @Column()
  startedAt: string;

  @Column({ nullable: true })
  completedAt?: string;

  @Column()
  status: ResearchJobStatus;

  @Column({ nullable: true })
  retryOf?: string;

  @Column({ nullable: true })
  costRef?: string;

  @Column('json')
  blockerReasons: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
