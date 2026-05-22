import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

export type MarketDataProvider =
  | 'manual'
  | 'toss'
  | 'quantconnect'
  | 'yahoo'
  | 'stooq'
  | 'krx'
  | 'other';

@Entity('market_data_bars')
@Unique(['datasetId', 'symbol', 'timeframe', 'timestamp'])
export class MarketDataBar {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  @Index()
  datasetId: string;

  @Column({ default: 'manual' })
  provider: MarketDataProvider;

  @Column({ nullable: true })
  sourceRef?: string;

  @Column()
  @Index()
  symbol: string;

  @Column({ default: '1d' })
  timeframe: string;

  @Column()
  timestamp: string;

  @Column()
  availabilityTimestamp: string;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  open: number;

  @Column('float')
  high: number;

  @Column('float')
  low: number;

  @Column('float')
  close: number;

  @Column('float', { nullable: true })
  adjustedClose?: number;

  @Column('float', { nullable: true })
  volume?: number;

  @Column('json')
  notes: string[];

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
