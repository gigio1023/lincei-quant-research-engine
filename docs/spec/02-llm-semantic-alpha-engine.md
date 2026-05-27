# LLM Semantic Alpha Engine

Status: active normative spec.

## Purpose

LLMs are not just report writers in this project. They are LLM-derived alpha engines that turn natural-language evidence into typed, point-in-time features and alpha judgments.

The LLM can influence whether the system wants exposure. It cannot directly place trades.

## Allowed LLM Responsibilities

- classify news, filings, transcripts, macro releases, and company events;
- extract catalyst strength, novelty, sentiment, uncertainty, and downside risk;
- compare a current event with numeric market state;
- generate bull and bear theses;
- identify weak evidence and abstain;
- flag crowded, contradictory, or fragile trades;
- recommend alpha direction, horizon, confidence, and max-position hint;
- review backtest failures and propose research hypotheses.
- read a strategy research corpus and convert articles or papers into testable hypotheses, feature definitions, and counter-theses.

## Forbidden LLM Responsibilities

- generating broker request payloads;
- seeing broker credentials or raw account identifiers;
- deciding final order quantity;
- bypassing risk gates;
- emitting non-replayable live-only decisions;
- selecting only winning backtests for storage;
- changing capital limits or live-trading scope.
- converting a research article, blog post, or Darwinex track-record observation directly into a trade without point-in-time feature generation, LEAN validation, and risk gates.

## Feature Contract

LLM outputs must be structured and replayable:

```ts
type LlmEventFeature = {
  symbol: string;
  eventId: string;
  eventTime: string;
  availableAt: string;
  processedAt: string;
  horizonHours: number;
  eventType: string;
  direction: "up" | "down" | "flat";
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
};
```

`eventTime` is when the underlying event happened. `availableAt` is when the strategy could have known it. `processedAt` is when our LLM feature engine created the feature. Backtests and replay must only consume records whose `availableAt` is not in the future relative to the simulated algorithm time.

## Alpha Decision Contract

The meta-alpha layer converts numeric features and LLM event features into a final alpha decision:

```ts
type AlphaDecision = {
  symbol: string;
  asOf: string;
  availableAt: string;
  horizonHours: number;
  direction: "up" | "down" | "flat";
  expectedReturnBps?: number;
  confidence: number;
  conviction: "low" | "medium" | "high";
  maxPositionPct?: number;
  sourceModels: string[];
  featureSnapshotHash: string;
  llmFeatureRefs: string[];
  numericFeatureRefs: string[];
  thesis?: string;
  counterThesis?: string;
  abstainReason?: string;
};
```

LEAN receives alpha decisions as custom data or Object Store artifacts and converts them into `Insight` objects.

## Runtime Pattern

Preferred pattern:

```text
raw text evidence -> LLM feature sidecar -> feature store/Object Store
                  -> LEAN reads point-in-time features -> Insights
```

Avoid calling external LLM APIs directly from LEAN backtests. Direct calls make replay, latency, credential custody, and lookahead control harder. If live scheduled LLM calls are ever introduced, they need their own spec change and must write the same feature records used by replay.

LLM-derived feature jobs should run in parallel across independent articles, filings, news events, symbols, or time windows when rate limits and cost caps allow it. Parallel LLM jobs must write structured feature records with input hashes, output hashes, prompt/model versions, abstain reasons, and evidence refs. Their outputs join the alpha loop as features only; they do not create portfolio targets or broker instructions.

## Bias Controls

LLM alpha can overfit history because modern models may know old market outcomes. Mitigations are mandatory:

- store `availableAt` and enforce point-in-time replay;
- store model and prompt versions;
- store source text snapshots or content hashes so revised articles, filings, macro releases, and transcripts do not silently rewrite historical evidence;
- compare numeric-only, LLM-only, and combined ablations;
- prefer post-model-training-period shadow trading evaluation;
- store failed and flat decisions, not only winners;
- avoid promoting LLM-only historical backtests without shadow trading artifacts.

When the LLM summarizes external investment research, the output must be labeled as a hypothesis candidate. It is not alpha evidence until the project has generated features, run the validation ladder, and recorded outcomes.

## Typed Models

Implement external JSON contracts with typed models:

- TypeScript DTOs/interfaces for backend APIs and ledgers;
- Pydantic models for Python services and offline processors;
- LEAN-compatible dataclasses or `TypedDict` where Pydantic is unsafe inside the QuantConnect algorithm runtime.

Raw `dict[str, Any]`, `Record<string, unknown>`, and `any` should stay at IO edges, provider payload capture, or fixtures.

## References

- QuantConnect Object Store: https://www.quantconnect.com/docs/v2/writing-algorithms/object-store
- QuantConnect Importing Data: https://www.quantconnect.com/docs/v2/writing-algorithms/importing-data/key-concepts
- Algorithm Framework overview: https://www.quantconnect.com/docs/v2/writing-algorithms/algorithm-framework/overview
