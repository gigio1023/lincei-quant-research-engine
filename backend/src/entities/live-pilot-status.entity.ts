/** Append-only preflight / pilot outcomes so operators can see blocked vs ready history. */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { LivePilotPreflightContract } from '../modules/v1-pilot/contracts/v1-pilot.contracts';

@Entity('live_pilot_status_records')
@Index(['status', 'checkedAt'])
export class LivePilotStatusRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  status: 'ready' | 'blocked';

  @Column('datetime')
  checkedAt: Date;

  @Column('json')
  preflight: LivePilotPreflightContract;

  @Column({ default: false })
  realOrderSent: boolean;

  @Column('json')
  blockers: string[];

  @Column({ nullable: true })
  latestLeanRunId?: string;

  @Column({ nullable: true })
  latestPaperPlanId?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
