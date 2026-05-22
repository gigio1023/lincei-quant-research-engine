import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type OrderPlanApprovalStatus =
  | 'active'
  | 'consumed'
  | 'revoked'
  | 'expired';

export interface OrderPlanApprovalSnapshot {
  proposalId: number;
  riskEvaluationId: number;
  mode: 'paper';
  approver: string;
  reason: string;
  idempotencyKey: string;
  approvedOrderCount: number;
  approvedAt: string;
  expiresAt?: string;
  proposalHash: string;
  riskRequestHash: string;
}

@Entity('order_plan_approvals')
export class OrderPlanApproval {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proposalId: number;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column()
  riskEvaluationId: number;

  @Column()
  idempotencyKey: string;

  @Column({ default: 'paper' })
  mode: 'paper';

  @Column()
  approver: string;

  @Column('text')
  reason: string;

  @Column({ default: 'active' })
  status: OrderPlanApprovalStatus;

  @Column()
  proposalHash: string;

  @Column()
  riskRequestHash: string;

  @Column()
  approvalHash: string;

  @Column('json')
  approvalSnapshot: OrderPlanApprovalSnapshot;

  @Column('datetime')
  approvedAt: Date;

  @Column('datetime', { nullable: true })
  expiresAt?: Date;

  @Column('datetime', { nullable: true })
  consumedAt?: Date;

  @Column({ nullable: true })
  consumedByPaperOrderPlanId?: number;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
