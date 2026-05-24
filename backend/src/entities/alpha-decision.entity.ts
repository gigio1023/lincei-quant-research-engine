import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('alpha_decisions')
@Index(['symbol', 'asOf', 'source'])
export class AlphaDecision {
  @PrimaryColumn()
  id: string;

  @Column()
  source: 'numeric' | 'llm' | 'meta';

  @Column()
  symbol: string;

  @Column()
  asOf: string;

  @Column({ nullable: true })
  availableAt?: string;

  @Column('int')
  horizonDays: number;

  @Column('int', { nullable: true })
  horizonHours?: number;

  @Column()
  direction: 'up' | 'down' | 'flat';

  @Column('float', { nullable: true })
  expectedReturnBps?: number;

  @Column('float')
  confidence: number;

  @Column()
  conviction: 'low' | 'medium' | 'high';

  @Column('float', { nullable: true })
  maxPositionPct?: number;

  @Column('float', { nullable: true })
  stopLossPct?: number;

  @Column('float', { nullable: true })
  takeProfitPct?: number;

  @Column()
  featureSnapshotHash: string;

  @Column('json')
  sourceModels: string[];

  @Column('json')
  evidenceRefs: string[];

  @Column('json', { nullable: true })
  llmFeatureRefs?: string[];

  @Column('json', { nullable: true })
  numericFeatureRefs?: string[];

  @Column({ nullable: true })
  promptVersion?: string;

  @Column({ nullable: true })
  thesis?: string;

  @Column({ nullable: true })
  counterThesis?: string;

  @Column({ nullable: true })
  abstainReason?: string;

  @Column()
  inputHash: string;

  @Column()
  outputHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
