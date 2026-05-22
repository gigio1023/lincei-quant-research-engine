import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import {
  OrderSide,
  OrderType,
  PortfolioSnapshot,
  ProposedOrder,
} from '../modules/risk-gate/risk-gate.types';

export type PaperOrderPlanStatus =
  | 'blocked'
  | 'planned'
  | 'simulating'
  | 'partially_filled'
  | 'filled'
  | 'reconciled'
  | 'reconciliation_failed'
  | 'failed'
  | 'killed';

export interface PaperReadinessSnapshot {
  budgetActive: boolean;
  latestRiskAllow: boolean;
  riskMatchesProposal: boolean;
  paperEngineEnabled: boolean;
  brokerExecutionDisabled: boolean;
  liveTradingDisabled: boolean;
  explicitPaperAccountActive: boolean;
  killSwitchArmed: boolean;
  killSwitchTripped: boolean;
  cashSufficient: boolean;
  positionsSufficient: boolean;
  noDuplicatePlan: boolean;
}

export interface PaperOrderSnapshot {
  paperOrderId: string;
  proposalOrderIndex: number;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  requestedNotional: number;
  requestedQuantity?: number;
  requestedPrice?: number;
  targetPositionPct?: number;
  marketDataTimestamp: string;
  feeModelRef: string;
  slippageModelRef: string;
  sourceOrder: ProposedOrder;
}

export interface PaperFill {
  paperFillId: string;
  paperOrderId: string;
  timestamp: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  fillPrice: number;
  grossNotional: number;
  requestedNotional: number;
  filledNotional: number;
  fee: number;
  feeCurrency: string;
  slippage: number;
  netCashDelta: number;
  positionDelta: number;
  status: 'filled' | 'rejected';
  rejectionReason?: string;
}

export interface PaperCashLedgerEntry {
  paperCashEventId: string;
  paperFillId: string;
  timestamp: string;
  currency: string;
  amount: number;
  balanceAfter: number;
  reason: string;
}

export interface PaperPositionLedgerEntry {
  paperPositionEventId: string;
  paperFillId: string;
  timestamp: string;
  symbol: string;
  quantityDelta: number;
  notionalDelta: number;
  positionNotionalAfter: number;
}

export interface PaperReconciliation {
  status: 'not_required' | 'pending' | 'matched' | 'mismatch';
  reconciledAt?: string;
  cashMatched: boolean;
  positionsMatched: boolean;
  expectedCash: number;
  actualCash?: number;
  cashDiff?: number;
  expectedPositions: Record<string, number>;
  actualPositions?: Record<string, number>;
  positionDiffs?: Record<string, number>;
  tolerance: number;
  notes: string[];
}

export interface PaperKillSwitchSnapshot {
  armed: boolean;
  tripped: boolean;
  checkedAt: string;
  reason?: string;
}

export interface PaperKillSwitchEvent {
  armed: boolean;
  tripped: boolean;
  reason: string;
  actor: string;
  timestamp: string;
}

@Index(
  'IDX_paper_order_plan_proposal_id_idempotency_key',
  ['proposalId', 'idempotencyKey'],
  { unique: true },
)
@Entity('paper_order_plans')
export class PaperOrderPlan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  proposalId: number;

  @Column({ nullable: true })
  researchRunId?: number;

  @Column({ nullable: true })
  budgetEnvelopeId?: number;

  @Column({ nullable: true })
  paperAccountId?: number;

  @Column({ nullable: true })
  orderPlanApprovalId?: number;

  @Column({ nullable: true })
  riskEvaluationId?: number;

  @Column()
  proposalHash: string;

  @Column({ nullable: true })
  riskRequestHash?: string;

  @Column()
  planHash: string;

  @Column()
  idempotencyKey: string;

  @Column({ default: 'blocked' })
  status: PaperOrderPlanStatus;

  @Column({ default: 'paper' })
  mode: 'paper';

  @Column('datetime')
  submittedAt: Date;

  @Column('datetime', { nullable: true })
  completedAt?: Date;

  @Column('json')
  readinessSnapshot: PaperReadinessSnapshot;

  @Column('json')
  orders: PaperOrderSnapshot[];

  @Column('json')
  fills: PaperFill[];

  @Column('json')
  portfolioBefore: PortfolioSnapshot;

  @Column('json')
  portfolioAfter: PortfolioSnapshot;

  @Column('json')
  cashLedger: PaperCashLedgerEntry[];

  @Column('json')
  positionLedger: PaperPositionLedgerEntry[];

  @Column('float')
  startingCash: number;

  @Column('float')
  endingCash: number;

  @Column('float')
  startingEquity: number;

  @Column('float')
  endingEquity: number;

  @Column({ default: false })
  brokerExecutionEnabled: boolean;

  @Column({ default: false })
  liveTradingEnabled: boolean;

  @Column('json')
  reconciliation: PaperReconciliation;

  @Column('json')
  killSwitchSnapshot: PaperKillSwitchSnapshot;

  @Column('json', { nullable: true })
  killSwitchEvent?: PaperKillSwitchEvent;

  @Column('json')
  blockedReasons: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
