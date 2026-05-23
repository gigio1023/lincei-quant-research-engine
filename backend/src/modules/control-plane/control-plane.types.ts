import {
  BrokerSnapshot,
  BrokerSnapshotProvider,
} from '../../entities/broker-snapshot.entity';
import { BrokerFill } from '../../entities/broker-fill.entity';
import { ExecutionControlStateValue } from '../../entities/execution-control-state.entity';
import {
  BacktestMetrics,
  ResearchDatasetRef,
  ResearchWindow,
} from '../../entities/research-run.entity';
import type { InvestmentProposal } from '../../entities/investment-proposal.entity';
import type {
  MarketDataBar,
  MarketDataProvider,
} from '../../entities/market-data-bar.entity';
import type { ResearchRun } from '../../entities/research-run.entity';
import type { RiskEvaluation } from '../../entities/risk-evaluation.entity';
import {
  PortfolioSnapshot,
  ProposedOrder,
  RiskGateActor,
  RiskGateMode,
  RiskPolicy,
} from '../risk-gate/risk-gate.types';

export interface CreateBudgetEnvelopeRequest {
  name: string;
  currency?: string;
  totalBudget: number;
  cashReservePct?: number;
  mode?: RiskGateMode;
  allowedAssetClasses?: RiskPolicy['allowedAssetClasses'];
  policy?: Partial<RiskPolicy>;
  notes?: string;
}

export interface CreateInvestmentProposalRequest {
  budgetEnvelopeId?: number;
  researchRunId: number;
  strategyId: string;
  ruleId: string;
  actor?: RiskGateActor;
  generatedAt: string;
  marketDataTimestamp: string;
  portfolioSnapshot: PortfolioSnapshot;
  orders: ProposedOrder[];
  thesis?: string;
  evidenceRefs?: string[];
}

export interface CreateResearchRunRequest {
  budgetEnvelopeId?: number;
  objective: string;
  strategyFamily: string;
  hypothesis: string;
  datasetRefs: ResearchDatasetRef[];
  featureRefs: string[];
  timestampLagRules: string[];
  noLookaheadChecked: boolean;
  benchmark: string;
  costModel: string;
  slippageModel: string;
  modelName?: string;
  modelCategory?: string;
  trainingWindow?: ResearchWindow;
  validationWindow: ResearchWindow;
  backtestMetrics: BacktestMetrics;
  artifactRefs: string[];
  artifactHashes: Record<string, string>;
  knownFailureModes: string[];
}

export interface RunBaselineResearchRequest {
  budgetEnvelopeId?: number;
  objective?: string;
  strategyFamily?: string;
  datasetId?: string;
  symbol?: string;
  benchmark?: string;
  initialCapital?: number;
}

export interface ImportMarketDataBarInput {
  timestamp: string;
  availabilityTimestamp?: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number;
  volume?: number;
  notes?: string[];
}

export interface ImportMarketDataBarsRequest {
  datasetId: string;
  provider?: MarketDataProvider;
  sourceRef?: string;
  symbol: string;
  timeframe?: string;
  currency?: string;
  bars: ImportMarketDataBarInput[];
}

export interface MarketDataBarsImportResponse {
  datasetId: string;
  symbol: string;
  provider: MarketDataProvider;
  imported: number;
  replaced: number;
  bars: MarketDataBar[];
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
}

export interface RunRecoveryProposalRequest {
  paperAccountId?: number;
  budgetEnvelopeId?: number;
  objective?: string;
  maxPositions?: number;
}

export interface RunRecoveryProposalResponse {
  researchRun: ResearchRun;
  proposal: InvestmentProposal;
  riskEvaluation: RiskEvaluation;
}

export interface PaperExecuteProposalRequest {
  idempotencyKey?: string;
  expectedRiskEvaluationId?: number;
  humanApprovalId?: string;
  orderPlanApprovalId?: number;
}

export interface CreateOrderPlanApprovalRequest {
  approver: string;
  reason: string;
  idempotencyKey?: string;
  expectedRiskEvaluationId?: number;
  expectedPaperAccountEventHash: string;
  signerKeyRef?: string;
  expiresAt?: string;
  approvalSource?: 'human' | 'paper_auto';
  approvedByRunId?: number;
  approvedByScheduleId?: number;
  autoApprovalPolicyRef?: string;
}

export interface SeedPaperAccountRequest {
  budgetEnvelopeId?: number;
  name?: string;
  currency?: string;
  cash: number;
  equity?: number;
  grossExposurePct?: number;
  positions?: PortfolioSnapshot['positions'];
  actor: string;
  reason: string;
  idempotencyKey?: string;
}

export interface PromotePaperAccountRequest {
  actor: string;
  reason: string;
  idempotencyKey?: string;
  expectedEventHash?: string;
  expectedCurrentActiveAccountId?: number;
}

export interface ReconcilePaperOrderPlanRequest {
  tolerance?: number;
  notes?: string[];
}

export interface ImportBrokerSnapshotRequest {
  provider?: BrokerSnapshotProvider;
  sourceRef?: string;
  accountRef?: string;
  asOf: string;
  currency?: string;
  cash: number;
  equity: number;
  grossExposurePct?: number;
  positions?: PortfolioSnapshot['positions'];
}

export interface ImportBrokerFillRequest {
  provider?: BrokerSnapshotProvider;
  sourceRef?: string;
  accountRef?: string;
  brokerOrderRef?: string;
  brokerFillRef: string;
  symbol: string;
  side: ProposedOrder['side'];
  quantity: number;
  fillPrice: number;
  grossNotional?: number;
  fee?: number;
  feeCurrency?: string;
  currency?: string;
  filledAt: string;
  asOf?: string;
}

export interface ReconcileBrokerFillRequest {
  paperOrderPlanId?: number;
  paperFillId?: string;
  tolerance?: number;
  notes?: string[];
}

export interface ReconcileBrokerSnapshotRequest {
  paperAccountId?: number;
  tolerance?: number;
  maxAgeMinutes?: number;
  notes?: string[];
}

export type BrokerAdapterProvider = 'toss' | 'manual' | 'simulated';

export type BrokerAdapterCapabilityStatus =
  | 'ready'
  | 'configured'
  | 'blocked'
  | 'not_implemented';

export interface BrokerAdapterCapability {
  key:
    | 'credentials'
    | 'credentialCustody'
    | 'openApiSchema'
    | 'readOnlyAccountSnapshot'
    | 'holdingsSnapshot'
    | 'orderPreview'
    | 'paperOrSandbox'
    | 'orderPlacement'
    | 'orderCancelReplace'
    | 'fillPolling'
    | 'reconciliation'
    | 'killSwitch';
  status: BrokerAdapterCapabilityStatus;
  detail: string;
}

export interface BrokerAdapterStatus {
  provider: BrokerAdapterProvider;
  configured: boolean;
  readOnlyEnabled: boolean;
  paperTradingEnabled: boolean;
  liveTradingEnabled: false;
  baseUrl?: string;
  authMethod: string;
  credentialRef: string;
  credentialCustody: BrokerCredentialCustodyStatus;
  schemaVerified: boolean;
  sandboxVerified: boolean;
  lastVerifiedAt?: string;
  readOnlyPoll: BrokerAdapterReadOnlyPollStatus;
  capabilities: BrokerAdapterCapability[];
  blockers: string[];
  brokerExecutionEnabled: false;
}

export type BrokerCredentialCustodyMode =
  | 'missing'
  | 'env'
  | 'external_secret_ref';

export interface BrokerCredentialCustodyStatus {
  mode: BrokerCredentialCustodyMode;
  configured: boolean;
  productionReady: boolean;
  secretRef: string;
  detail: string;
}

export interface BrokerAdapterReadOnlyPollStatus {
  provider: 'toss';
  enabled: boolean;
  configured: boolean;
  schemaVerified: boolean;
  fillPollingEnabled?: boolean;
  fillSchemaVerified?: boolean;
  fillPathConfigured?: boolean;
  canPoll: boolean;
  canPollFills?: boolean;
  baseUrl: string;
  accountRef: string;
  allowedEndpoints: string[];
  cron: string;
  running: boolean;
  lastAttemptAt?: string;
  lastPollAt?: string;
  lastSnapshotId?: number;
  lastFillPollAt?: string;
  lastBrokerFillIds?: number[];
  lastFillCount?: number;
  lastReconciliationStatus?: string;
  lastReconciledAt?: string;
  lastReconciliationError?: string;
  lastFillReconciliationStatus?: string;
  lastFillReconciledAt?: string;
  lastError?: string;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
}

export interface BrokerReadOnlyPollResponse {
  status: BrokerAdapterReadOnlyPollStatus;
  snapshot?: BrokerSnapshot;
  fills?: BrokerFill[];
}

export interface UpdateExecutionControlRequest {
  state: ExecutionControlStateValue;
  actor?: string;
  reason: string;
}

export interface CreateAutonomousRunScheduleRequest {
  budgetEnvelopeId: number;
  objective: string;
  mode?: RiskGateMode;
  cadenceMinutes?: number;
  nextRunAt?: string;
  enabled?: boolean;
  attemptPaperExecution?: boolean;
  autoPaperApprovalEnabled?: boolean;
  autoPaperApprover?: string;
  autoPaperApprovalReason?: string;
  autoPaperApprovalSignerKeyRef?: string;
  researchDatasetId?: string;
  researchSymbol?: string;
  researchBenchmark?: string;
  researchMaxDataAgeMinutes?: number;
}

export interface TickAutonomousRunScheduleRequest {
  actor?: string;
  force?: boolean;
  leaseOwner?: string;
  leaseTtlSeconds?: number;
  attemptPaperExecution?: boolean;
}

export type RunScheduleWorkerItemStatus = 'ticked' | 'skipped' | 'failed';

export interface RunScheduleWorkerTickItem {
  scheduleId: number;
  status: RunScheduleWorkerItemStatus;
  runId?: number;
  message?: string;
}

export interface RunScheduleWorkerTickResult {
  trigger: string;
  workerId: string;
  enabled: boolean;
  startedAt: string;
  completedAt: string;
  scanned: number;
  ticked: number;
  failed: number;
  skipped: number;
  message?: string;
  items: RunScheduleWorkerTickItem[];
}

export interface RunScheduleWorkerStatus {
  enabled: boolean;
  cron: string;
  workerId: string;
  maxSchedulesPerTick: number;
  leaseTtlSeconds: number;
  lastTickAt?: string;
  lastResult?: RunScheduleWorkerTickResult;
  currentTime: string;
}

export interface CreateAutonomousRunRequest {
  objective: string;
  budgetEnvelopeId?: number;
}

export interface AdvanceAutonomousRunRequest {
  attemptPaperExecution?: boolean;
}

export interface ControlPlaneStatus {
  brokerExecutionEnabled: false;
  liveTradingReady: false;
  liveTradingGate: LiveTradingGateStatus;
  actionStatus: ControlPlaneActionStatus;
  readiness: Array<{
    key: string;
    ready: boolean;
    detail: string;
  }>;
  blockers: string[];
}

export interface LiveTradingGateStatus {
  enabled: false;
  mode: 'disabled';
  checkedAt: string;
  orderEndpointImplemented: false;
  brokerWriteEnabled: false;
  killSwitchReady: false;
  credentialCustodyRequired: true;
  blockers: string[];
  detail: string;
}

export type ControlPlaneActionVerdict = 'ready' | 'attention' | 'blocked';

export interface ControlPlaneActionStatus {
  checkedAt: string;
  verdict: ControlPlaneActionVerdict;
  latestAction: {
    stage: string;
    status: string;
    id?: number;
    detail: string;
    updatedAt?: string;
  };
  paper: {
    planId?: number;
    status: string;
    reconciliationStatus?: string;
    fillCount: number;
    detail: string;
  };
  brokerSnapshot: {
    snapshotId?: number;
    status: string;
    reconciliationStatus?: string;
    asOf?: string;
    detail: string;
  };
  brokerFill: {
    fillId?: number;
    status: string;
    reconciliationStatus?: string;
    paperOrderPlanId?: number;
    paperFillId?: string;
    checkedAt?: string;
    detail: string;
  };
  blocker?: string;
  nextSafeAction: string;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
}
