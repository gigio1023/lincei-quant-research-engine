import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
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
  approvalSource?: 'human' | 'paper_auto' | 'recovery_auto';
  approvedByRunId?: number;
  approvedByScheduleId?: number;
  autoApprovalPolicyRef?: string;
  approver: string;
  reason: string;
  idempotencyKey: string;
  approvedOrderCount: number;
  approvedAt: string;
  expiresAt?: string;
  proposalHash: string;
  riskRequestHash: string;
  paperAccountId: number;
  paperAccountEventHash: string;
  paperAccountEventSequence: number;
  custodyMode: 'local_hash_signature';
  signerKeyRef: string;
  canonicalPayloadHash: string;
  signature: string;
}

@Index(
  'IDX_order_plan_approval_proposal_idempotency',
  ['proposalId', 'idempotencyKey'],
  {
    unique: true,
  },
)
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

  @Column({ default: 'human' })
  approvalSource: 'human' | 'paper_auto' | 'recovery_auto';

  @Column({ nullable: true })
  approvedByRunId?: number;

  @Column({ nullable: true })
  approvedByScheduleId?: number;

  @Column({ nullable: true })
  autoApprovalPolicyRef?: string;

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
  paperAccountId: number;

  @Column()
  paperAccountEventHash: string;

  @Column()
  paperAccountEventSequence: number;

  @Column({ default: 'local_hash_signature' })
  custodyMode: 'local_hash_signature';

  @Column({ default: 'local-paper-approval-key-v1' })
  signerKeyRef: string;

  @Column()
  canonicalPayloadHash: string;

  @Column()
  signature: string;

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
