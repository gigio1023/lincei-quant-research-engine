import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('execution_intents')
@Index(['mode', 'symbol'])
@Index(['idempotencyKey'], { unique: true })
export class ExecutionIntent {
  @PrimaryColumn()
  id: string;

  @Column()
  mode: 'paper' | 'live';

  @Column()
  source: 'lean-target' | 'manual-flatten' | 'risk-reduce';

  @Column({ nullable: true })
  portfolioTargetSnapshotId?: string;

  @Column()
  symbol: string;

  @Column()
  side: 'buy' | 'sell';

  @Column()
  orderType: 'market' | 'limit';

  @Column('float', { nullable: true })
  quantity?: number;

  @Column('float', { nullable: true })
  notionalUsd?: number;

  @Column('float', { nullable: true })
  limitPrice?: number;

  @Column({ default: 'day' })
  timeInForce: 'day' | 'gtc' | 'ioc';

  @Column('int')
  maxSlippageBps: number;

  @Column()
  idempotencyKey: string;

  @Column()
  approvalRef: string;

  @Column()
  intentHash: string;

  @Column({ default: 'planned' })
  status: 'planned' | 'submitted' | 'filled' | 'blocked' | 'cancelled';

  @Column('json')
  blockers: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
