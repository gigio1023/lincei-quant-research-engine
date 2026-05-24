import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('raw_evidence_records')
@Index(['sourceType', 'availableAt'])
export class RawEvidenceRecord {
  @PrimaryColumn()
  id: string;

  @Column()
  sourceType: 'news' | 'filing' | 'macro' | 'manual';

  @Column({ nullable: true })
  symbol?: string;

  @Column()
  sourceUrl: string;

  @Column()
  title: string;

  @Column('text')
  content: string;

  @Column()
  eventTime: string;

  @Column()
  publishedAt: string;

  @Column()
  retrievedAt: string;

  @Column()
  availableAt: string;

  @Column()
  parserVersion: string;

  @Column()
  contentHash: string;

  @Column('json')
  metadata: Record<string, string | number | boolean | null>;

  @Column({ default: 'parsed' })
  status: 'parsed' | 'blocked' | 'failed';

  @Column('json')
  blockerReasons: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
