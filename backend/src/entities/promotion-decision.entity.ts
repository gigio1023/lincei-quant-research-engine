import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('promotion_decisions')
@Index(['scope', 'status', 'decidedAt'])
export class PromotionDecision {
  @PrimaryColumn()
  id: string;

  @Column()
  scope: 'alpha' | 'strategy' | 'prompt' | 'model';

  @Column()
  targetRef: string;

  @Column()
  decidedAt: string;

  @Column()
  status: 'accepted' | 'rejected' | 'blocked';

  @Column('json')
  evidenceRefs: string[];

  @Column('json')
  blockerReasons: string[];

  @Column('json')
  metrics: Record<string, string | number | boolean | null>;

  @Column()
  decisionHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
