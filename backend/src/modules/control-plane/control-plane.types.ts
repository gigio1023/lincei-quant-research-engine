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
