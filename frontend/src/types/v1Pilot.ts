export type V1SystemStageStatus = "ready" | "blocked" | "missing";

export interface V1SystemStage {
  key: string;
  label: string;
  status: V1SystemStageStatus;
  detail: string;
  blockers: string[];
  refs: string[];
}

export interface V1PilotPreflightStatus {
  status: "ready" | "blocked";
  checkedAt: string;
  maxPilotNotionalUsd: number;
  broker: string;
  blockers: string[];
  requiredFlags: Record<string, boolean>;
  latestLeanRunId?: string;
  latestPaperPlanId?: number;
  latestBrokerSnapshotId?: number;
  openOrderRefs: string[];
  credentialMode: "external-secret" | "local-dev-env" | "missing";
}

export interface V1PilotSystemStatus {
  checkedAt: string;
  verdict: V1SystemStageStatus;
  leanRun: {
    runId: string;
    status: string;
    projectName: string;
  } | null;
  alpha: {
    featureSnapshotCount: number;
    numericDecisionCount: number;
    llmDecisionCount: number;
    metaDecisionCount: number;
    latestFeatureAsOf?: string;
    latestAlphaAsOf?: string;
    mlModelStatus: string;
    mlModelName?: string;
    mlBlocker?: string;
  };
  research: {
    hypothesisCount: number;
    p1CandidateCount: number;
    outOfScopeCount: number;
    latestJobId?: string;
    latestJobStatus?: string;
    latestJobType?: string;
  };
  portfolioTarget: {
    id?: string;
    leanRunId?: string;
    targetCount: number;
    grossExposurePct?: number;
    maxSingleNamePct?: number;
  };
  paper: {
    planId?: number | string;
    status: string;
    reconciliationStatus?: string;
    fillCount: number;
    replayPlanId?: number | string;
    replayStatus?: string;
    replayReconciliationStatus?: string;
    replayFillCount?: number;
  };
  broker: {
    snapshotId?: number | string;
    provider?: string;
    snapshotStatus: string;
    snapshotReconciliationStatus?: string;
    orderStatusId?: number | string;
    openOrderCount: number;
    fillId?: number | string;
    fillReconciliationStatus?: string;
  };
  livePilot: {
    latestIntentId?: string;
    latestIntentStatus?: string;
    latestStatusRecordId?: number;
    realOrderSent: boolean;
  };
  preflight: V1PilotPreflightStatus;
  stages: V1SystemStage[];
  nextActions: string[];
}
