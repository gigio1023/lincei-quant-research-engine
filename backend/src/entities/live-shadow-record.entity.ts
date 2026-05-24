import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('live_shadow_records')
@Index(['asOf', 'status'])
export class LiveShadowRecord {
  @PrimaryColumn()
  id: string;

  @Column({ nullable: true })
  leanRunId?: string;

  @Column({ nullable: true })
  portfolioTargetSnapshotId?: string;

  @Column()
  asOf: string;

  @Column({ default: 'live-shadow' })
  mode: 'live-shadow';

  @Column({ default: 'historical_target_replay' })
  evidenceMode: 'historical_target_replay' | 'current_live_shadow';

  @Column()
  status: 'recorded' | 'blocked';

  @Column('json')
  proposedTargets: unknown[];

  @Column('json')
  riskAdjustedTargets: unknown[];

  @Column('json')
  wouldHaveTraded: unknown[];

  @Column('json')
  reconciliation: Record<string, unknown>;

  @Column('json')
  blockerReasons: string[];

  @Column('json')
  evidenceRefs: string[];

  @Column()
  recordHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
