# Contracts And Schemas

All cross-boundary data must be typed, validated, hashable, and replayable.

## Feature Snapshot

```ts
type FeatureSnapshot = {
  id: string;
  symbol: string;
  asOf: string;
  dataAvailabilityTime: string;
  timeframe: "daily" | "hourly" | "minute";
  features: Record<string, number | string | boolean | null>;
  sourceRefs: string[];
  inputHash: string;
  featureVersion: string;
};
```

Required V1 feature keys:

- `return_20d`
- `return_63d`
- `return_126d`
- `realized_vol_20d`
- `drawdown_63d`
- `price_vs_sma_200d`
- `dollar_volume_20d`
- `market_regime_score`

## Alpha Decision

```ts
type AlphaDecision = {
  id: string;
  source: "numeric" | "llm" | "meta";
  symbol: string;
  asOf: string;
  horizonDays: number;
  direction: "up" | "down" | "flat";
  expectedReturnBps?: number;
  confidence: number;
  conviction: "low" | "medium" | "high";
  maxPositionPct?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  featureSnapshotHash: string;
  sourceModels: string[];
  evidenceRefs: string[];
  thesis?: string;
  counterThesis?: string;
  abstainReason?: string;
  inputHash: string;
  outputHash: string;
};
```

Validation rules:

- `confidence` must be between 0 and 1.
- `direction !== "flat"` requires `thesis`, `counterThesis`, and at least one evidence ref.
- `maxPositionPct` must not exceed live policy.
- stale feature snapshots must be rejected.

## LEAN Run Result

```ts
type LeanRunResult = {
  runId: string;
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt: string;
  status: "passed" | "failed";
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
```

## Portfolio Target Snapshot

```ts
type PortfolioTargetSnapshot = {
  id: string;
  leanRunId: string;
  asOf: string;
  targets: Array<{
    symbol: string;
    targetWeight: number;
    targetQuantity?: number;
    sourceInsightIds: string[];
    riskAdjusted: boolean;
    riskNotes: string[];
  }>;
  grossExposurePct: number;
  maxSingleNamePct: number;
  targetHash: string;
};
```

## Execution Intent

```ts
type ExecutionIntent = {
  id: string;
  mode: "paper" | "live";
  source: "lean-target" | "manual-flatten" | "risk-reduce";
  portfolioTargetSnapshotId?: string;
  symbol: string;
  side: "buy" | "sell";
  orderType: "market" | "limit";
  quantity?: number;
  notionalUsd?: number;
  limitPrice?: number;
  timeInForce: "day" | "gtc" | "ioc";
  maxSlippageBps: number;
  idempotencyKey: string;
  approvalRef: string;
  intentHash: string;
};
```

## Live Pilot Preflight

```ts
type LivePilotPreflight = {
  status: "ready" | "blocked";
  checkedAt: string;
  maxPilotNotionalUsd: 10;
  broker: string;
  blockers: string[];
  requiredFlags: Record<string, boolean>;
  latestLeanRunId?: string;
  latestPaperPlanId?: number;
  latestBrokerSnapshotId?: number;
  openOrderRefs: string[];
  credentialMode: "external-secret" | "local-dev-env" | "missing";
};
```

Live preflight must fail closed. Unknown state means `blocked`.

