import { BrokerSnapshotProvider } from '../../entities/broker-snapshot.entity';
import { ExecutionControlStateValue } from '../../entities/execution-control-state.entity';
import {
  BacktestMetrics,
  ResearchDatasetRef,
  ResearchWindow,
} from '../../entities/research-run.entity';
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

export interface UpdateExecutionControlRequest {
  state: ExecutionControlStateValue;
  actor?: string;
  reason: string;
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
