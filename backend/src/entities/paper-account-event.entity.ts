import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PortfolioSnapshot } from '../modules/risk-gate/risk-gate.types';

export type PaperAccountEventType =
  | 'explicit_seed'
  | 'account_promoted'
  | 'account_archived'
  | 'paper_order_plan'
  | 'reconciliation';

export interface PaperAccountEventSnapshot {
  paperAccountId: number;
  budgetEnvelopeId?: number;
  eventType: PaperAccountEventType;
  sourceId?: number;
  idempotencyKey: string;
  actor: string;
  reason: string;
  sequence: number;
  currency: string;
  cashBefore: number;
  cashAfter: number;
  equityBefore: number;
  equityAfter: number;
  positionsBefore: PortfolioSnapshot['positions'];
  positionsAfter: PortfolioSnapshot['positions'];
  previousEventHash?: string;
  requestHash: string;
  recordedAt: string;
}

@Index(
  'IDX_paper_account_event_account_sequence',
  ['paperAccountId', 'sequence'],
  {
    unique: true,
  },
)
@Index('IDX_paper_account_event_idempotency_key', ['idempotencyKey'], {
  unique: true,
})
@Entity('paper_account_events')
export class PaperAccountEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  paperAccountId: number;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column()
  eventType: PaperAccountEventType;

  @Column({ nullable: true })
  sourceId?: number;

  @Column()
  idempotencyKey: string;

  @Column()
  actor: string;

  @Column('text')
  reason: string;

  @Column()
  sequence: number;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  cashBefore: number;

  @Column('float')
  cashAfter: number;

  @Column('float')
  equityBefore: number;

  @Column('float')
  equityAfter: number;

  @Column('float')
  cashDelta: number;

  @Column('float')
  equityDelta: number;

  @Column({ nullable: true })
  previousEventHash?: string;

  @Column()
  requestHash: string;

  @Column()
  eventHash: string;

  @Column('json')
  eventSnapshot: PaperAccountEventSnapshot;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
