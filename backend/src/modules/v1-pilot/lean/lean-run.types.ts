/** Artifact shapes shared by simulator, importer, and paper bridge; keep aligned with SPEC.md and docs/spec/. */
export type LeanRunStatus = 'passed' | 'failed' | 'blocked';
export type LeanRunRuntime = 'local-lean' | 'quantconnect-cloud' | 'simulator';
export type LeanRunMode = 'backtest' | 'paper' | 'live-shadow';

export type LeanRunResult = {
  runId: string;
  runtime?: LeanRunRuntime;
  mode?: LeanRunMode;
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt: string;
  status: LeanRunStatus;
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
};

export type LeanLocalSimulatorRequest = {
  runId?: string;
  projectName?: string;
  parameters?: Record<string, string | number | boolean>;
  metaDecisionsPath?: string;
  workspaceRoot?: string;
  resultRoot?: string;
};

export type LeanInsightArtifact = {
  id: string;
  symbol: string;
  direction: string;
  periodDays: number;
  confidence: number;
  magnitude: number;
  sourceModel: string;
  generatedTime: string;
  finalScore?: number;
  conflictNotes?: string[];
  metaDecisionId?: string | null;
};

export type LeanPortfolioTargetArtifact = {
  symbol: string;
  targetWeight: number;
  sourceInsightIds: string[];
  riskAdjusted: boolean;
  riskNotes: string[];
};

export type LeanPortfolioTargetsPayload = {
  id: string;
  leanRunId: string;
  asOf: string;
  targets: LeanPortfolioTargetArtifact[];
  grossExposurePct: number;
  maxSingleNamePct: number;
  riskNotes: string[];
  targetHash?: string;
};

export type LeanOrderEventArtifact = {
  id: string;
  symbol: string;
  status: string;
  direction: string;
  fillQuantity: number;
  fillPrice: number;
  orderFee: number;
  utcTime: string;
};

export type LeanFillArtifact = {
  id: string;
  orderId: string;
  symbol: string;
  quantity: number;
  price: number;
  fee: number;
  filledAt: string;
};
