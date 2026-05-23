import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type LivePilotReadinessStatus = 'ready' | 'blocked';

export interface LivePilotReadinessSnapshot {
  pilotBudgetAmount: number;
  maxPilotBudgetAmount: number;
  maxSingleOrderNotional: number;
  budgetEnvelopeId?: number;
  fundingReadinessId?: number;
  fundingReady: boolean;
  schemaMigrationReady: boolean;
  credentialCustodyReady: boolean;
  brokerSchemaVerified: boolean;
  brokerSandboxVerified: boolean;
  brokerReadOnlyReady: boolean;
  brokerFillPollingReady: boolean;
  brokerCancelReady: boolean;
  brokerFlattenReady: boolean;
  openOrderPollingReady: boolean;
  orderEndpointImplemented: false;
  brokerWriteEnabled: false;
  productionApprovalCustodyReady: false;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  blockers: string[];
  notes: string[];
}

@Entity('live_pilot_readiness_records')
@Index(['status', 'checkedAt'])
@Index(['fundingReadinessId'])
@Index(['idempotencyKey'], { unique: true })
export class LivePilotReadinessRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  idempotencyKey?: string;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column({ nullable: true })
  fundingReadinessId?: number;

  @Column({ default: 'KRW' })
  currency: string;

  @Column('float')
  pilotBudgetAmount: number;

  @Column('float')
  maxPilotBudgetAmount: number;

  @Column('float')
  maxSingleOrderNotional: number;

  @Column({ default: 'blocked' })
  status: LivePilotReadinessStatus;

  @Column('datetime')
  checkedAt: Date;

  @Column('json')
  readinessSnapshot: LivePilotReadinessSnapshot;

  @Column('json')
  blockers: string[];

  @Column('json')
  notes: string[];

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
