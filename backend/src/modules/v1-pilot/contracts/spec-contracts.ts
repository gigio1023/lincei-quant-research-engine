import {
  AlphaDecisionContract,
  FeatureSnapshotContract,
} from './v1-pilot.contracts';

export type EvidenceStatus = 'passed' | 'failed' | 'blocked';
export type LeanRuntime = 'local-lean' | 'quantconnect-cloud' | 'simulator';
export type LeanExecutionMode = 'backtest' | 'paper' | 'live-shadow';
export type SemanticEventType = 'event' | 'macro' | 'risk';

export interface CanonicalFeatureSnapshotContract
  extends FeatureSnapshotContract {
  availableAt: string;
}

export interface LlmEventFeatureContract {
  id: string;
  symbol: string;
  eventId: string;
  eventTime: string;
  availableAt: string;
  processedAt: string;
  horizonHours: number;
  eventType: SemanticEventType;
  direction: 'up' | 'down' | 'flat';
  sentimentScore: number;
  catalystStrength: number;
  noveltyScore: number;
  uncertainty: number;
  downsideRisk: number;
  confidence: number;
  thesis: string;
  counterThesis: string;
  evidenceRefs: string[];
  model: string;
  promptVersion: string;
  inputHash: string;
  outputHash: string;
  abstainReason?: string;
}

export interface CanonicalAlphaDecisionContract extends AlphaDecisionContract {
  availableAt: string;
  horizonHours: number;
  llmFeatureRefs: string[];
  numericFeatureRefs: string[];
  promptVersion?: string;
}

export interface CanonicalLeanRunResultContract {
  runId: string;
  runtime: LeanRuntime;
  mode: LeanExecutionMode;
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt?: string;
  status: EvidenceStatus;
  sourceHash: string;
  configHash: string;
  dataManifestHash?: string;
  statistics: Record<string, string | number>;
  insightsRef?: string;
  ordersRef?: string;
  fillsRef?: string;
  equityCurveRef?: string;
  logsRef?: string;
  blockerReasons: string[];
}

export interface LiveShadowRecordContract {
  id: string;
  leanRunId?: string;
  portfolioTargetSnapshotId?: string;
  asOf: string;
  status: 'recorded' | 'blocked';
  proposedTargets: unknown[];
  riskAdjustedTargets: unknown[];
  wouldHaveTraded: unknown[];
  reconciliation: Record<string, unknown>;
  blockerReasons: string[];
  evidenceRefs: string[];
  recordHash: string;
}

export interface PromotionDecisionContract {
  id: string;
  scope: 'alpha' | 'strategy' | 'prompt' | 'model';
  targetRef: string;
  decidedAt: string;
  status: 'accepted' | 'rejected' | 'blocked';
  evidenceRefs: string[];
  blockerReasons: string[];
  metrics: Record<string, string | number | boolean | null>;
  decisionHash: string;
}

export function featureAvailableAt(
  snapshot: Pick<FeatureSnapshotContract, 'dataAvailabilityTime'> & {
    availableAt?: string;
  },
): string {
  return snapshot.availableAt ?? snapshot.dataAvailabilityTime;
}

export function alphaHorizonHours(
  decision: Pick<AlphaDecisionContract, 'horizonDays'> & {
    horizonHours?: number;
  },
): number {
  return decision.horizonHours ?? decision.horizonDays * 24;
}
