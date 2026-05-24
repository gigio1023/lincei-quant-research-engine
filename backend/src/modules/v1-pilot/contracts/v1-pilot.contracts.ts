/** Cross-boundary DTOs for the LEAN validation path; legacy names remain for API compatibility. */
export type FeatureTimeframe = 'daily' | 'hourly' | 'minute';

export interface FeatureSnapshotContract {
  id: string;
  symbol: string;
  asOf: string;
  dataAvailabilityTime: string;
  availableAt?: string;
  timeframe: FeatureTimeframe;
  features: Record<string, number | string | boolean | null>;
  sourceRefs: string[];
  inputHash: string;
  featureVersion: string;
}

export type AlphaSource = 'numeric' | 'llm' | 'meta';
export type AlphaDirection = 'up' | 'down' | 'flat';
export type AlphaConviction = 'low' | 'medium' | 'high';

export interface AlphaDecisionContract {
  id: string;
  source: AlphaSource;
  symbol: string;
  asOf: string;
  availableAt?: string;
  horizonDays: number;
  horizonHours?: number;
  direction: AlphaDirection;
  expectedReturnBps?: number;
  confidence: number;
  conviction: AlphaConviction;
  maxPositionPct?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  featureSnapshotHash: string;
  sourceModels: string[];
  evidenceRefs: string[];
  llmFeatureRefs?: string[];
  numericFeatureRefs?: string[];
  promptVersion?: string;
  thesis?: string;
  counterThesis?: string;
  abstainReason?: string;
  inputHash: string;
  outputHash: string;
}

export interface LeanRunResultContract {
  runId: string;
  runtime?: 'local-lean' | 'quantconnect-cloud' | 'simulator';
  mode?: 'backtest' | 'paper' | 'live-shadow';
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt: string;
  status: 'passed' | 'failed' | 'blocked';
  resultDirectory: string;
  sourceHash: string;
  configHash: string;
  dataManifestHash: string;
  statistics: Record<string, string | number>;
  equityCurveRef?: string;
  insightsRef?: string;
  portfolioTargetsRef?: string;
  orderEventsRef?: string;
  fillsRef?: string;
  logsRef?: string;
  blockerReasons: string[];
}

export interface PortfolioTargetItemContract {
  symbol: string;
  targetWeight: number;
  targetQuantity?: number;
  sourceInsightIds: string[];
  riskAdjusted: boolean;
  riskNotes: string[];
}

export interface PortfolioTargetSnapshotContract {
  id: string;
  leanRunId: string;
  asOf: string;
  targets: PortfolioTargetItemContract[];
  grossExposurePct: number;
  maxSingleNamePct: number;
  targetHash: string;
}

export type ExecutionMode = 'paper' | 'live-shadow' | 'live';
export type ExecutionIntentSource =
  | 'lean-target'
  | 'manual-flatten'
  | 'risk-reduce';
export type OrderSide = 'buy' | 'sell';
export type OrderType = 'market' | 'limit';
export type TimeInForce = 'day' | 'gtc' | 'ioc';

export interface ExecutionIntentContract {
  id: string;
  mode: ExecutionMode;
  source: ExecutionIntentSource;
  portfolioTargetSnapshotId?: string;
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity?: number;
  notionalUsd?: number;
  limitPrice?: number;
  timeInForce: TimeInForce;
  maxSlippageBps: number;
  idempotencyKey: string;
  approvalRef: string;
  intentHash: string;
}

export type LivePilotPreflightStatus = 'ready' | 'blocked';
export type CredentialMode = 'external-secret' | 'local-dev-env' | 'missing';

export interface LivePilotPreflightContract {
  status: LivePilotPreflightStatus;
  checkedAt: string;
  maxPilotNotionalUsd: 10;
  broker: string;
  blockers: string[];
  requiredFlags: Record<string, boolean>;
  latestLeanRunId?: string;
  latestPaperPlanId?: number;
  latestBrokerSnapshotId?: number;
  openOrderRefs: string[];
  credentialMode: CredentialMode;
}

export const REQUIRED_FEATURE_KEYS = [
  'return_20d',
  'return_63d',
  'return_126d',
  'realized_vol_20d',
  'drawdown_63d',
  'price_vs_sma_200d',
  'dollar_volume_20d',
  'market_regime_score',
] as const;

export const MAX_LIVE_PILOT_NOTIONAL_USD = 10;
export const MAX_SINGLE_LIVE_ORDER_NOTIONAL_USD = 5;
