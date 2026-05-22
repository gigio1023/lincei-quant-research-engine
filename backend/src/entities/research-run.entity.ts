import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type ResearchRunStatus =
  | 'created'
  | 'running'
  | 'blocked'
  | 'failed'
  | 'halted'
  | 'cancelled'
  | 'evidence_ready'
  | 'proposal_ready'
  | 'superseded';

export type ResearchRunPhase =
  | 'budget_bound'
  | 'data_bound'
  | 'features_built'
  | 'model_or_baseline_ready'
  | 'validated'
  | 'backtested'
  | 'artifacts_persisted'
  | 'proposal_linked';

export interface ResearchDatasetRef {
  id: string;
  provider?: string;
  source?: string;
  providerUri?: string;
  windowStart: string;
  windowEnd: string;
  availabilityTimestamp: string;
  marketDataTimestamp?: string;
  calendar?: string;
  timezone?: string;
  frequency?: string;
  universe?: string[];
  fields?: string[];
  adjustmentMode?: string;
}

export interface ResearchWindow {
  start: string;
  end: string;
}

export interface BacktestMetrics {
  startValue?: number;
  endValue?: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  excessReturnPct?: number;
  annualizedReturnPct?: number;
  volatilityPct?: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  informationRatio?: number;
  turnoverPct: number;
  grossExposurePct?: number;
  maxLeverage?: number;
  totalFees?: number;
  tradeCount: number;
  winRatePct?: number;
  profitFactor?: number;
}

@Entity('research_runs')
export class ResearchRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column()
  objective: string;

  @Column()
  strategyFamily: string;

  @Column('text')
  hypothesis: string;

  @Column({ default: 'created' })
  status: ResearchRunStatus;

  @Column({ default: 'budget_bound' })
  phase: ResearchRunPhase;

  @Column({ default: false })
  advanceEligible: boolean;

  @Column('json')
  blockedReasons: string[];

  @Column('json')
  datasetRefs: ResearchDatasetRef[];

  @Column('json')
  featureRefs: string[];

  @Column('json')
  timestampLagRules: string[];

  @Column({ default: false })
  noLookaheadChecked: boolean;

  @Column()
  benchmark: string;

  @Column()
  costModel: string;

  @Column()
  slippageModel: string;

  @Column({ nullable: true })
  modelName?: string;

  @Column({ default: 'baseline' })
  modelCategory: string;

  @Column('json', { nullable: true })
  trainingWindow?: ResearchWindow;

  @Column('json')
  validationWindow: ResearchWindow;

  @Column('json')
  backtestMetrics: BacktestMetrics;

  @Column('json')
  artifactRefs: string[];

  @Column('json')
  artifactHashes: Record<string, string>;

  @Column('json')
  knownFailureModes: string[];

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
