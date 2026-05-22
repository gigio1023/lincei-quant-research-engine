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
