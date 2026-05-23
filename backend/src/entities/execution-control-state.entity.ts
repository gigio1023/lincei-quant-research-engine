import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export type ExecutionControlStateValue =
  | 'active'
  | 'paused'
  | 'reducing'
  | 'halted';

@Entity('execution_control_states')
export class ExecutionControlState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: 'active' })
  state: ExecutionControlStateValue;

  @Column({ default: 'system' })
  actor: string;

  @Column('text')
  reason: string;

  @CreateDateColumn()
  createdAt: Date;
}
