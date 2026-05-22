import {
  BrokerSnapshot,
  BrokerSnapshotProvider,
} from '../../entities/broker-snapshot.entity';
import { ExecutionControlStateValue } from '../../entities/execution-control-state.entity';
import {
  BacktestMetrics,
  ResearchDatasetRef,
  ResearchWindow,
} from '../../entities/research-run.entity';
import type { InvestmentProposal } from '../../entities/investment-proposal.entity';
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
  symbol?: string;
  benchmark?: string;
  initialCapital?: number;
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
  expiresAt?: string;
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
  schemaVerified: boolean;
  sandboxVerified: boolean;
  lastVerifiedAt?: string;
  readOnlyPoll: BrokerAdapterReadOnlyPollStatus;
  capabilities: BrokerAdapterCapability[];
  blockers: string[];
  brokerExecutionEnabled: false;
}

export interface BrokerAdapterReadOnlyPollStatus {
  provider: 'toss';
  enabled: boolean;
  configured: boolean;
  schemaVerified: boolean;
  canPoll: boolean;
  baseUrl: string;
  accountRef: string;
  allowedEndpoints: string[];
  cron: string;
  running: boolean;
  lastAttemptAt?: string;
  lastPollAt?: string;
  lastSnapshotId?: number;
  lastError?: string;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
}

export interface BrokerReadOnlyPollResponse {
  status: BrokerAdapterReadOnlyPollStatus;
  snapshot?: BrokerSnapshot;
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
  readiness: Array<{
    key: string;
    ready: boolean;
    detail: string;
  }>;
  blockers: string[];
}
