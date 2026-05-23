import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MarketDataProvider } from './market-data-bar.entity';

export type MarketDataIngestionRunStatus =
  | 'skipped'
  | 'running'
  | 'succeeded'
  | 'partial'
  | 'failed';

@Entity('market_data_ingestion_runs')
export class MarketDataIngestionRun {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'manual' })
  trigger: string;

  @Column()
  status: MarketDataIngestionRunStatus;

  @Column({ default: 'stooq' })
  provider: MarketDataProvider;

  @Column()
  @Index()
  datasetId: string;

  @Column('json')
  symbols: string[];

  @Column({ default: '1d' })
  timeframe: string;

  @Column({ default: 'KRW' })
  currency: string;

  @Column()
  windowStart: string;

  @Column()
  windowEnd: string;

  @Column()
  requestHash: string;

  @Column({ default: 0 })
  imported: number;

  @Column({ default: 0 })
  replaced: number;

  @Column({ nullable: true })
  latestAvailabilityTimestamp?: string;

  @Column('json')
  importedSymbols: string[];

  @Column('json')
  failedSymbols: string[];

  @Column('json')
  blockedReasons: string[];

  @Column({ nullable: true })
  error?: string;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
