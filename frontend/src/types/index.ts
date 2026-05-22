export interface Report {
  id: number;
  title: string;
  content: string;
  summary: string;
  marketData?: Record<string, unknown>;
  newsAnalysis?: { processedCount?: number };
  investmentRecommendations?: Record<string, unknown>;
  reportType: "morning" | "evening";
  createdAt: string;
  updatedAt: string;
}

export interface ReportsResponse {
  reports: Report[];
  total: number;
  page: number;
  limit: number;
}

export type RiskGateMode = "dry_run" | "paper" | "broker_read_only" | "live";

export type RiskGateDecision = "ALLOW" | "REVIEW" | "DENY";

export type RiskGateActor = "strategy" | "llm" | "human" | "scheduler";

export type ExecutionIntent =
  | "evaluate_only"
  | "place_order"
  | "cancel_order"
  | "rebalance";

export type AssetClass =
  | "cash"
  | "domestic_stock"
  | "foreign_stock"
  | "domestic_etf"
  | "foreign_etf"
  | "crypto"
  | "crypto_derivative"
  | "option"
  | "future"
  | "unknown";

export type OrderSide = "BUY" | "SELL" | "SHORT";

export type OrderType = "MARKET" | "LIMIT";

export interface RiskPolicy {
  maxGrossExposurePct: number;
  maxSinglePositionPct: number;
  maxOrderNotional: number;
  maxDailyLossPct: number;
  maxDrawdownPct: number;
  maxDataAgeMinutes: number;
  allowedAssetClasses: AssetClass[];
  allowLiveTrading: boolean;
  requireHumanApproval: boolean;
}

export interface PositionSnapshot {
  symbol: string;
  assetClass: AssetClass;
  marketValue: number;
  weightPct: number;
}

export interface PortfolioSnapshot {
  currency: string;
  equity: number;
  cash: number;
  grossExposurePct: number;
  dailyPnlPct?: number;
  drawdownPct?: number;
  positions?: PositionSnapshot[];
}

export interface ProposedOrder {
  symbol: string;
  assetClass: AssetClass;
  side: OrderSide;
  orderType: OrderType;
  notional: number;
  quantity?: number;
  price?: number;
  targetPositionPct?: number;
  leverage?: number;
}

export interface RiskGateRequest {
  mode: RiskGateMode;
  actor: RiskGateActor;
  researchRunId?: number;
  strategyId?: string;
  ruleId?: string;
  generatedAt: string;
  marketDataTimestamp?: string;
  portfolio: PortfolioSnapshot;
  orders: ProposedOrder[];
  policy?: Partial<RiskPolicy>;
  evidenceRefs?: string[];
  humanApprovalId?: string;
  executionIntent?: ExecutionIntent;
  brokerCredentials?: unknown;
  accountId?: string;
}

export interface RiskGateResponse {
  decision: RiskGateDecision;
  evaluatedAt: string;
  mode: RiskGateMode;
  brokerExecutionEnabled: false;
  requiresHumanApproval: boolean;
  reasons: string[];
  policy: RiskPolicy;
  approvedOrderCount: number;
}

export interface RiskGateStatus {
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  defaultPolicy: RiskPolicy;
}

export interface ControlPlaneReadinessItem {
  key: string;
  ready: boolean;
  detail: string;
}

export interface ControlPlaneStatus {
  brokerExecutionEnabled: false;
  liveTradingReady: false;
  readiness: ControlPlaneReadinessItem[];
  blockers: string[];
}

export interface ResearchRunWindow {
  start: string;
  end: string;
}

export type ResearchRunWindowValue = ResearchRunWindow | string;

export interface ResearchRunBacktestMetrics {
  startValue?: number;
  endValue?: number;
  totalReturnPct: number;
  benchmarkReturnPct: number;
  excessReturnPct?: number;
  annualizedReturnPct?: number;
  volatilityPct?: number;
  maxDrawdownPct: number;
  sharpeRatio: number;
  sortinoRatio?: number;
  calmarRatio?: number;
  informationRatio?: number;
  turnoverPct: number;
  grossExposurePct?: number;
  maxLeverage?: number;
  totalFees?: number;
  tradeCount: number;
  winRatePct?: number;
  profitFactor?: number;
}

export interface ResearchDatasetRef {
  id: string;
  provider?: string;
  source?: string;
  providerUri?: string;
  windowStart: string;
  windowEnd: string;
  availabilityTimestamp: string;
  marketDataTimestamp?: string;
  calendar?: string;
  timezone?: string;
  frequency?: string;
  universe?: string[];
  fields?: string[];
  adjustmentMode?: string;
}

export interface ResearchRun {
  id: number | string;
  budgetEnvelopeId?: number | string;
  objective: string;
  strategyFamily: string;
  hypothesis: string;
  status: string;
  phase?: string;
  advanceEligible?: boolean;
  blockedReasons?: string[];
  datasetRefs: ResearchDatasetRef[];
  featureRefs: string[];
  timestampLagRules?: string[];
  noLookaheadChecked?: boolean;
  benchmark: string;
  costModel: string;
  slippageModel: string;
  modelName?: string;
  modelCategory?: string;
  trainingWindow?: ResearchRunWindowValue;
  validationWindow: ResearchRunWindowValue;
  backtestMetrics: ResearchRunBacktestMetrics;
  artifactRefs: string[];
  artifactHashes?: Record<string, string>;
  knownFailureModes: string[];
  brokerExecutionEnabled?: false;
  liveTradingEnabled?: false;
  createdAt: string;
  updatedAt: string;
}

export type ControlPlaneGateStatus =
  | "partial"
  | "started"
  | "missing"
  | "blocked";

export interface SafetyGate {
  name: string;
  status: ControlPlaneGateStatus;
  notes: string;
}

export interface ControlPlaneStage {
  phase: string;
  title: string;
  status: ControlPlaneGateStatus;
  description: string;
}
