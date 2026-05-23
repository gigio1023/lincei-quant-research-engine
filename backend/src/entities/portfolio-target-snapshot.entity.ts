import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PortfolioTargetItemContract } from '../modules/v1-pilot/contracts/v1-pilot.contracts';

@Entity('portfolio_target_snapshots')
@Index(['leanRunId', 'asOf'])
export class PortfolioTargetSnapshot {
  @PrimaryColumn()
  id: string;

  @Column()
  leanRunId: string;

  @Column()
  asOf: string;

  @Column('json')
  targets: PortfolioTargetItemContract[];

  @Column('float')
  grossExposurePct: number;

  @Column('float')
  maxSingleNamePct: number;

  @Column()
  targetHash: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
