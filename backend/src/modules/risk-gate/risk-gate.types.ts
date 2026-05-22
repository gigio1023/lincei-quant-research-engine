export type RiskGateMode = 'dry_run' | 'paper' | 'broker_read_only' | 'live';

export type RiskGateDecision = 'ALLOW' | 'REVIEW' | 'DENY';

export type RiskGateActor = 'strategy' | 'llm' | 'human' | 'scheduler';

export type ExecutionIntent =
  | 'evaluate_only'
  | 'place_order'
  | 'cancel_order'
  | 'rebalance';

export type AssetClass =
  | 'cash'
  | 'domestic_stock'
  | 'foreign_stock'
  | 'domestic_etf'
  | 'foreign_etf'
  | 'crypto'
  | 'crypto_derivative'
  | 'option'
  | 'future'
  | 'unknown';

export type OrderSide = 'BUY' | 'SELL' | 'SHORT';

export type OrderType = 'MARKET' | 'LIMIT';

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
  strategyId?: string;
  ruleId?: string;
  generatedAt: string;
  marketDataTimestamp?: string;
  portfolio: PortfolioSnapshot;
  orders: ProposedOrder[];
  policy?: Partial<RiskPolicy>;
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
