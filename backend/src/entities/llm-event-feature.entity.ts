import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('llm_event_features')
@Index(['symbol', 'availableAt', 'eventType'])
export class LlmEventFeature {
  @PrimaryColumn()
  id: string;

  @Column()
  symbol: string;

  @Column()
  eventId: string;

  @Column()
  eventTime: string;

  @Column()
  availableAt: string;

  @Column()
  processedAt: string;

  @Column('int')
  horizonHours: number;

  @Column()
  eventType: 'event' | 'macro' | 'risk';

  @Column()
  direction: 'up' | 'down' | 'flat';

  @Column('float')
  sentimentScore: number;

  @Column('float')
  catalystStrength: number;

  @Column('float')
  noveltyScore: number;

  @Column('float')
  uncertainty: number;

  @Column('float')
  downsideRisk: number;

  @Column('float')
  confidence: number;

  @Column('text')
  thesis: string;

  @Column('text')
  counterThesis: string;

  @Column('json')
  evidenceRefs: string[];

  @Column()
  model: string;

  @Column()
  promptVersion: string;

  @Column()
  inputHash: string;

  @Column()
  outputHash: string;

  @Column({ nullable: true })
  abstainReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
