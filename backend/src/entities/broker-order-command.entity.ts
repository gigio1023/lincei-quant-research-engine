import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BrokerSnapshotProvider } from './broker-snapshot.entity';
import { OrderSide, OrderType } from '../modules/risk-gate/risk-gate.types';

export type BrokerOrderCommandType =
  | 'submit_order_plan'
  | 'cancel_open_orders'
  | 'flatten_positions';

export type BrokerOrderCommandStatus = 'blocked' | 'dry_run_planned';

export type BrokerOrderCommandSourceType = 'paper_order_plan' | 'emergency';

export interface BrokerOrderCommandReadinessSnapshot {
  livePilotReadinessId?: number;
  livePilotReady: boolean;
  brokerSchemaVerified: boolean;
  brokerSandboxVerified: boolean;
  brokerReadOnlyReady: boolean;
  brokerFillPollingReady: boolean;
  brokerCancelReady: boolean;
  brokerFlattenReady: boolean;
  openOrderPollingReady: boolean;
  signedPaperApprovalReady: boolean;
  orderEndpointImplemented: false;
  brokerWriteEnabled: false;
  dryRunOnly: true;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  blockers: string[];
}

export interface BrokerOrderIntent {
  brokerOrderIntentId: string;
  sourcePaperOrderId?: string;
  proposalOrderIndex?: number;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  requestedNotional: number;
  requestedQuantity?: number;
  requestedPrice?: number;
  status: 'blocked';
  blockedReason: string;
}

export interface BrokerEmergencyAction {
  actionId: string;
  actionType: 'cancel_open_orders' | 'flatten_positions';
  status: 'blocked';
  blockedReason: string;
}

@Entity('broker_order_commands')
@Index(['commandType', 'createdAt'])
@Index(['paperOrderPlanId'])
@Index(['livePilotReadinessId'])
@Index(['idempotencyKey'], { unique: true })
export class BrokerOrderCommand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  idempotencyKey?: string;

  @Column({ default: 'toss' })
  provider: BrokerSnapshotProvider;

  @Column()
  commandType: BrokerOrderCommandType;

  @Column({ default: 'blocked' })
  status: BrokerOrderCommandStatus;

  @Column({ default: 'dry_run' })
  mode: 'dry_run';

  @Column()
  sourceType: BrokerOrderCommandSourceType;

  @Column({ nullable: true })
  proposalId?: number;

  @Column({ nullable: true })
  paperOrderPlanId?: number;

  @Column({ nullable: true })
  orderPlanApprovalId?: number;

  @Column({ nullable: true })
  livePilotReadinessId?: number;

  @Column('datetime')
  checkedAt: Date;

  @Column()
  commandHash: string;

  @Column('json')
  readinessSnapshot: BrokerOrderCommandReadinessSnapshot;

  @Column('json')
  orderIntents: BrokerOrderIntent[];

  @Column('json')
  emergencyActions: BrokerEmergencyAction[];

  @Column('json')
  blockedReasons: string[];

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
