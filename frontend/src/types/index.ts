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
  quantity?: number;
  averagePrice?: number;
  costBasis?: number;
  unrealizedPnl?: number;
  realizedPnl?: number;
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

export type PaperOrderPlanId = number | string;

export type PaperOrderPlanMode = "paper";

export interface PaperExecuteProposalRequest {
  idempotencyKey?: string;
  expectedRiskEvaluationId?: number;
  humanApprovalId?: string;
  orderPlanApprovalId?: number;
}

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
  requiredCash?: number;
  reservedCash?: number;
  availableCash?: number;
  requiredSellNotionalBySymbol?: Record<string, number>;
  reservedSellNotionalBySymbol?: Record<string, number>;
  availableSellNotionalBySymbol?: Record<string, number>;
}

export interface PaperReservationHold {
  holdId: string;
  status: string;
  idempotencyKey: string;
  createdAt: string;
  consumedAt?: string;
  releasedAt?: string;
  cashAmount: number;
  sellNotionalBySymbol: Record<string, number>;
  availableCashAtHold: number;
  availableSellNotionalBySymbolAtHold: Record<string, number>;
  holdHash: string;
  notes: string[];
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

export interface PaperOrderFill {
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
  averagePriceBefore?: number;
  costBasisBefore?: number;
  costBasisAfter?: number;
  realizedPnl?: number;
  realizedPnlAfter?: number;
  status: string;
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
  quantityAfter?: number;
  positionNotionalAfter: number;
  averagePriceAfter?: number;
  costBasisAfter?: number;
  realizedPnl?: number;
}

export interface PaperOrderReconciliation {
  status: string;
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

export interface PaperOrderPlan {
  id: PaperOrderPlanId;
  proposalId: PaperOrderPlanId;
  researchRunId?: PaperOrderPlanId;
  budgetEnvelopeId?: PaperOrderPlanId;
  orderPlanApprovalId?: PaperOrderPlanId;
  riskEvaluationId?: PaperOrderPlanId;
  proposalHash: string;
  riskRequestHash?: string;
  planHash: string;
  idempotencyKey: string;
  status: string;
  mode: PaperOrderPlanMode;
  submittedAt: string;
  completedAt?: string;
  readinessSnapshot: PaperReadinessSnapshot;
  reservationHold?: PaperReservationHold;
  orders: PaperOrderSnapshot[];
  fills: PaperOrderFill[];
  portfolioBefore: PortfolioSnapshot;
  portfolioAfter: PortfolioSnapshot;
  cashLedger: PaperCashLedgerEntry[];
  positionLedger: PaperPositionLedgerEntry[];
  startingCash: number;
  endingCash: number;
  startingEquity: number;
  endingEquity: number;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  reconciliation: PaperOrderReconciliation;
  killSwitchSnapshot: PaperKillSwitchSnapshot;
  blockedReasons: string[];
  createdAt: string;
  updatedAt: string;
}

export type ExecutionControlStateValue =
  | "active"
  | "paused"
  | "reducing"
  | "halted";

export interface ExecutionControlState {
  id: number | string;
  state: ExecutionControlStateValue;
  actor: string;
  reason: string;
  createdAt: string;
}

export type PaperAccountStatus = "seeded" | "active" | "paused" | "archived";

export type PaperLedgerChange =
  | ({ kind: "cash"; id: string } & PaperCashLedgerEntry)
  | ({ kind: "position"; id: string } & PaperPositionLedgerEntry);

export interface PaperAccount {
  id: number | string;
  name: string;
  budgetEnvelopeId?: number | string;
  status: PaperAccountStatus;
  currency: string;
  cash: number;
  equity: number;
  grossExposurePct: number;
  positions: PositionSnapshot[];
  cashLedger: PaperCashLedgerEntry[];
  positionLedger: PaperPositionLedgerEntry[];
  appliedPlanIds: Array<number | string>;
  lastAppliedPlanId?: number | string;
  lastReconciledAt?: string;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
  updatedAt: string;
}

export type PaperAccountEventType =
  | "explicit_seed"
  | "account_promoted"
  | "account_archived"
  | "paper_order_plan"
  | "reconciliation";

export interface PaperAccountEventSnapshot {
  paperAccountId: number;
  budgetEnvelopeId?: number;
  eventType: PaperAccountEventType;
  sourceId?: number;
  idempotencyKey: string;
  actor: string;
  reason: string;
  sequence: number;
  currency: string;
  cashBefore: number;
  cashAfter: number;
  equityBefore: number;
  equityAfter: number;
  positionsBefore: PositionSnapshot[];
  positionsAfter: PositionSnapshot[];
  previousEventHash?: string;
  requestHash: string;
  recordedAt: string;
}

export interface PaperAccountEvent {
  id: number | string;
  paperAccountId: number | string;
  budgetEnvelopeId?: number | string;
  eventType: PaperAccountEventType;
  sourceId?: number | string;
  idempotencyKey: string;
  actor: string;
  reason: string;
  sequence: number;
  currency: string;
  cashBefore: number;
  cashAfter: number;
  equityBefore: number;
  equityAfter: number;
  cashDelta: number;
  equityDelta: number;
  previousEventHash?: string;
  requestHash: string;
  eventHash: string;
  eventSnapshot: PaperAccountEventSnapshot;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
}

export type OrderPlanApprovalStatus =
  | "active"
  | "consumed"
  | "revoked"
  | "expired";

export interface OrderPlanApprovalSnapshot {
  proposalId: number;
  riskEvaluationId: number;
  mode: "paper";
  approver: string;
  reason: string;
  idempotencyKey: string;
  approvedOrderCount: number;
  approvedAt: string;
  expiresAt?: string;
  proposalHash: string;
  riskRequestHash: string;
}

export interface OrderPlanApproval {
  id: number | string;
  proposalId: number | string;
  budgetEnvelopeId?: number | string;
  riskEvaluationId: number | string;
  idempotencyKey: string;
  mode: "paper";
  approver: string;
  reason: string;
  status: OrderPlanApprovalStatus;
  proposalHash: string;
  riskRequestHash: string;
  approvalHash: string;
  approvalSnapshot: OrderPlanApprovalSnapshot;
  approvedAt: string;
  expiresAt?: string;
  consumedAt?: string;
  consumedByPaperOrderPlanId?: number | string;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
  updatedAt: string;
}

export type BrokerSnapshotProvider = "manual" | "toss" | "simulated";

export type BrokerSnapshotStatus =
  | "imported"
  | "matched"
  | "mismatch"
  | "stale";

export interface BrokerSnapshotReconciliation {
  status: "not_checked" | "matched" | "mismatch" | "stale";
  checkedAt?: string;
  paperAccountId?: number | string;
  cashMatched: boolean;
  equityMatched: boolean;
  positionsMatched: boolean;
  expectedPaperCash?: number;
  actualBrokerCash: number;
  cashDiff?: number;
  expectedPaperEquity?: number;
  actualBrokerEquity: number;
  equityDiff?: number;
  expectedPaperPositions?: Record<string, number>;
  actualBrokerPositions: Record<string, number>;
  positionDiffs?: Record<string, number>;
  tolerance: number;
  maxAgeMinutes: number;
  notes: string[];
}

export interface BrokerSnapshot {
  id: number | string;
  provider: BrokerSnapshotProvider;
  sourceRef?: string;
  accountRefHash?: string;
  status: BrokerSnapshotStatus;
  currency: string;
  cash: number;
  equity: number;
  grossExposurePct: number;
  positions: PositionSnapshot[];
  asOf: string;
  reconciliation: BrokerSnapshotReconciliation;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
  updatedAt: string;
}

export type BrokerFillStatus = "imported" | "matched" | "mismatch";

export interface BrokerFillReconciliation {
  status: "not_checked" | "matched" | "mismatch";
  checkedAt?: string;
  paperOrderPlanId?: number | string;
  paperFillId?: string;
  symbolMatched: boolean;
  sideMatched: boolean;
  quantityMatched: boolean;
  notionalMatched: boolean;
  feeMatched: boolean;
  brokerQuantity: number;
  brokerGrossNotional: number;
  brokerFee: number;
  expectedQuantity?: number;
  expectedGrossNotional?: number;
  expectedFee?: number;
  quantityDiff?: number;
  notionalDiff?: number;
  feeDiff?: number;
  tolerance: number;
  notes: string[];
}

export interface BrokerFill {
  id: number | string;
  provider: BrokerSnapshotProvider;
  sourceRef?: string;
  accountRefHash?: string;
  brokerOrderRefHash?: string;
  brokerFillRefHash: string;
  status: BrokerFillStatus;
  symbol: string;
  side: OrderSide;
  quantity: number;
  fillPrice: number;
  grossNotional: number;
  fee: number;
  feeCurrency: string;
  currency: string;
  filledAt: string;
  asOf: string;
  reconciliation: BrokerFillReconciliation;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
  updatedAt: string;
}

export interface ReconcileBrokerFillRequest {
  paperOrderPlanId?: number | string;
  paperFillId?: string;
  tolerance?: number;
  notes?: string[];
}

export type BrokerAdapterProvider = "toss" | "manual" | "simulated";

export type BrokerAdapterCapabilityStatus =
  | "ready"
  | "configured"
  | "blocked"
  | "not_implemented";

export interface BrokerAdapterCapability {
  key:
    | "credentials"
    | "credentialCustody"
    | "openApiSchema"
    | "readOnlyAccountSnapshot"
    | "holdingsSnapshot"
    | "orderPreview"
    | "paperOrSandbox"
    | "orderPlacement"
    | "orderCancelReplace"
    | "fillPolling"
    | "reconciliation"
    | "killSwitch";
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

export interface BrokerReadOnlyPollResponse {
  status: BrokerAdapterReadOnlyPollStatus;
  snapshot?: BrokerSnapshot;
  fills?: BrokerFill[];
}

export type BrokerCredentialCustodyMode =
  | "missing"
  | "env"
  | "external_secret_ref";

export interface BrokerCredentialCustodyStatus {
  mode: BrokerCredentialCustodyMode;
  configured: boolean;
  productionReady: boolean;
  secretRef: string;
  detail: string;
}

export interface BrokerAdapterReadOnlyPollStatus {
  provider: "toss";
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
  lastSnapshotId?: number | string;
  lastFillPollAt?: string;
  lastBrokerFillIds?: Array<number | string>;
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

export interface ImportBrokerSnapshotRequest {
  provider?: BrokerSnapshotProvider;
  sourceRef?: string;
  accountRef?: string;
  asOf: string;
  currency?: string;
  cash: number;
  equity: number;
  grossExposurePct?: number;
  positions?: PositionSnapshot[];
}

export interface ReconcileBrokerSnapshotRequest {
  paperAccountId?: number;
  tolerance?: number;
  maxAgeMinutes?: number;
  notes?: string[];
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
  liveTradingGate: LiveTradingGateStatus;
  readiness: ControlPlaneReadinessItem[];
  blockers: string[];
}

export interface LiveTradingGateStatus {
  enabled: false;
  mode: "disabled";
  checkedAt: string;
  orderEndpointImplemented: false;
  brokerWriteEnabled: false;
  killSwitchReady: false;
  credentialCustodyRequired: true;
  blockers: string[];
  detail: string;
}

export type BudgetEnvelopeStatus = "draft" | "active" | "paused" | "archived";

export interface BudgetEnvelope {
  id: number | string;
  name: string;
  status: BudgetEnvelopeStatus;
  mode: RiskGateMode;
  currency: string;
  totalBudget: number;
  cashReservePct: number;
  allowedAssetClasses: AssetClass[];
  policy: RiskPolicy;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvestmentProposalStatus =
  | "generated"
  | "evaluated"
  | "rejected"
  | "needs_review"
  | "paper_ready"
  | "archived";

export interface InvestmentProposal {
  id: number | string;
  budgetEnvelopeId?: number | string;
  researchRunId?: number | string;
  strategyId: string;
  ruleId: string;
  actor: RiskGateActor;
  status: InvestmentProposalStatus;
  generatedAt: string;
  marketDataTimestamp: string;
  portfolioSnapshot: PortfolioSnapshot;
  orders: ProposedOrder[];
  thesis?: string;
  evidenceRefs?: string[];
  brokerExecutionEnabled: false;
  requiresHumanApproval: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RiskEvaluation {
  id: number | string;
  proposalId?: number | string;
  decision: RiskGateDecision;
  reasons: string[];
  requestSnapshot: RiskGateRequest;
  responseSnapshot: RiskGateResponse;
  brokerExecutionEnabled: false;
  requiresHumanApproval: boolean;
  evaluatedAt: string;
  createdAt: string;
}

export type AutonomousRunStatus =
  | "idle"
  | "researching"
  | "proposed"
  | "risk_checked"
  | "paper_ready"
  | "paused"
  | "halted"
  | "completed"
  | "failed";

export interface RunTimelineEvent {
  at: string;
  stage: AutonomousRunStatus;
  message: string;
}

export interface AutonomousRun {
  id: number | string;
  objective: string;
  status: AutonomousRunStatus;
  currentStage: string;
  budgetEnvelopeId?: number | string;
  scheduleId?: number | string;
  cycleKey?: string;
  researchRunId?: number | string;
  proposalId?: number | string;
  riskEvaluationId?: number | string;
  paperOrderPlanId?: number | string;
  timeline: RunTimelineEvent[];
  lastAction?: string;
  nextAction?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAutonomousRunRequest {
  objective: string;
  budgetEnvelopeId?: number;
}

export interface AdvanceAutonomousRunRequest {
  attemptPaperExecution?: boolean;
}

export interface AutonomousRunSchedule {
  id: number | string;
  budgetEnvelopeId: number | string;
  objective: string;
  mode: RiskGateMode;
  cadenceMinutes: number;
  nextRunAt: string;
  enabled: boolean;
  attemptPaperExecution: boolean;
  lastRunId?: number | string | null;
  lastCycleKey?: string | null;
  lastTickAt?: string | null;
  leaseOwner?: string | null;
  leaseExpiresAt?: string | null;
  lastError?: string | null;
  brokerExecutionEnabled: false;
  liveTradingEnabled: false;
  createdAt: string;
  updatedAt: string;
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

export type RunScheduleWorkerItemStatus = "ticked" | "skipped" | "failed";

export interface RunScheduleWorkerTickItem {
  scheduleId: number | string;
  status: RunScheduleWorkerItemStatus;
  runId?: number | string;
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

export interface RunBaselineResearchRequest {
  budgetEnvelopeId?: number;
  objective?: string;
  strategyFamily?: string;
  datasetId?: string;
  symbol?: string;
  benchmark?: string;
  initialCapital?: number;
}

export interface MarketDataBar {
  id: number | string;
  datasetId: string;
  provider: string;
  sourceRef?: string;
  symbol: string;
  timeframe: string;
  timestamp: string;
  availabilityTimestamp: string;
  currency: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjustedClose?: number;
  volume?: number;
  notes: string[];
  brokerExecutionEnabled?: false;
  liveTradingEnabled?: false;
  createdAt: string;
  updatedAt: string;
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
  provider?: string;
  sourceRef?: string;
  symbol: string;
  timeframe?: string;
  currency?: string;
  bars: ImportMarketDataBarInput[];
}

export interface MarketDataBarsImportResponse {
  datasetId: string;
  symbol: string;
  provider: string;
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
