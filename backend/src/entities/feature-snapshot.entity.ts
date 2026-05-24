import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('feature_snapshots')
@Index(['symbol', 'asOf'])
export class FeatureSnapshot {
  @PrimaryColumn()
  id: string;

  @Column()
  symbol: string;

  @Column()
  asOf: string;

  @Column()
  dataAvailabilityTime: string;

  @Column({ nullable: true })
  availableAt?: string;

  @Column({ default: 'daily' })
  timeframe: 'daily' | 'hourly' | 'minute';

  @Column('json')
  features: Record<string, number | string | boolean | null>;

  @Column('json')
  sourceRefs: string[];

  @Column()
  inputHash: string;

  @Column({ default: 'v1' })
  featureVersion: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
