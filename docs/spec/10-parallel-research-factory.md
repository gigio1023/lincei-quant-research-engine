# Parallel Research Factory

Status: active normative spec.

Last aligned: 2026-05-27.

## Purpose

This project should always consider maximum safe parallelization. The goal is not parallelism for its own sake. The goal is to evaluate more hypotheses, data sources, feature sets, model variants, and backtests under the same evidence rules before risking own capital.

Parallelization is allowed and encouraged in research and evidence generation. It is not allowed to create multiple unsynchronized execution truths.

## Core Rule

Parallel before promotion. Single writer after promotion.

```text
parallel:
  corpus ingest
  hypothesis extraction
  data ingest
  feature generation
  LLM semantic feature jobs
  numeric/LLM/combined ablations
  parameter sweeps
  local and Cloud backtest attempts
  Cloud artifact page imports

single writer:
  promotion decision
  portfolio target consolidation
  risk cuts
  paper/live-shadow execution intent
  reconciliation
  broker-write preflight
```

If a path can mutate a paper account, live-shadow ledger, broker snapshot, or future real account, it must pass through the single canonical state and risk gate.

## Parallel Job Contract

Every parallel job must be idempotent and replayable:

```ts
type ResearchJobRecord = {
  jobId: string;
  runId: string;
  parentJobId?: string;
  jobType:
    | "corpus-ingest"
    | "hypothesis-extraction"
    | "data-ingest"
    | "feature-generation"
    | "llm-semantic-feature"
    | "ablation"
    | "backtest"
    | "cloud-import"
    | "promotion-check";
  partitionKey: string;
  inputRefs: string[];
  inputHash: string;
  outputRefs: string[];
  outputHash?: string;
  startedAt: string;
  completedAt?: string;
  status: "passed" | "failed" | "blocked";
  retryOf?: string;
  costRef?: string;
  blockerReasons: string[];
};
```

Partition keys should make the independent unit explicit: article id, symbol, source, time window, hypothesis id, strategy variant, backtest id, or Cloud page range.

## Idempotency Requirements

Parallel jobs must not create duplicate evidence when retried.

Required keys:

- corpus ingest: source URL plus content hash;
- hypothesis extraction: source content hash plus prompt/model version;
- data ingest: source, symbol or asset id, event time, retrieved time, and content hash;
- feature generation: feature type, symbol, `asOf`, `availableAt`, input hash, and model version;
- LLM semantic feature: evidence refs, prompt version, model, and input hash;
- ablation: hypothesis id, strategy version, data manifest, parameter hash, and variant name;
- backtest: source hash, config hash, data manifest hash, and parameter hash;
- Cloud import: project id, backtest id, endpoint, page range, and response hash.

Unknown idempotency state is blocked state.

## Runnable Ledger Commands

The current implementation exposes the first durable research-factory path:

```bash
./scripts/build-hypothesis-registry
./scripts/run-selected-run-bias-check
```

`build-hypothesis-registry` converts the stored Alpha Architect corpus and strategy register into `research_hypotheses` plus `research_job_records`. `run-selected-run-bias-check` records a `promotion-check` job and blocks promotion until enough ablation/backtest/Cloud-import variants, including rejected or blocked variants, are retained.

## Allowed Parallel Work

### Research Corpus And Hypothesis Extraction

Research articles can be crawled, stored, hashed, and summarized in parallel. The output must be a hypothesis candidate, not a trade instruction.

The Alpha Architect corpus is the initial stored source library. The first own-capital backlog should prefer:

- liquid trend-following and defensive allocation;
- momentum, skip-month, volatility-conditioned, and daily-return features;
- factor crowding, factor valuation, and macro regime features;
- filing/news/LLM semantic alpha only after numeric baselines are stable.

### Data And Feature Generation

Market, news, filing, macro, and research-derived data jobs should run independently by source, symbol, and time window. Feature jobs should be parallel by symbol and feature family when they do not mutate shared state.

Feature outputs must include `availableAt`, input hashes, source refs, parser/model versions, and vintage status where relevant.

### LLM Semantic Feature Jobs

LLM jobs can run in parallel across articles, filings, news events, symbols, or time windows. They must respect:

- rate limits;
- cost limits;
- prompt/model versioning;
- abstain records;
- deterministic parsing of structured output;
- no broker credentials or raw account identifiers in prompts;
- no final order quantities.

### Ablations And Backtests

Numeric-only, LLM-only, combined, trend baseline, momentum baseline, and parameter variants should run in parallel. This is the main way to avoid overfitting one attractive story.

All variants must be recorded. Failed and losing variants are not noise; they are selected-run-bias protection.

### Cloud Artifact Imports

QuantConnect Cloud insights, orders, fills, charts, logs, and statistics may be fetched in parallel by endpoint and page range. Local persistence must be idempotent and tied to the Cloud project id and backtest id.

## Single-Writer Work

The following stages must have one canonical writer per account/evidence mode:

- promotion decision for a strategy version;
- portfolio target consolidation;
- risk cuts;
- paper/live-shadow execution intent;
- reconciliation state;
- broker-write preflight verdict;
- future real broker submit/cancel/replace/flatten methods.

Multiple jobs may propose alpha. Only one consolidated target set may advance to risk and execution evidence for a given account, timestamp, and strategy version.

## Selected-Run-Bias Control

Parallel backtests make selected-run bias easier. The project must counteract that by storing:

- every attempted variant;
- parameter ranges and search space;
- failed, blocked, and rejected runs;
- the reason a variant was promoted;
- whether the promoted run was selected after seeing the results;
- out-of-sample and live-shadow windows.

Promotion must block when only the winning run is available.

## Cost And Resource Control

Parallelism must be bounded:

- max concurrent LLM jobs;
- max concurrent Cloud/API calls;
- max local CPU/RAM jobs on Apple Silicon, Linux ARM64, or Oracle Cloud ARM;
- daily/monthly LLM cost caps;
- QuantConnect data-download cost blockers;
- retry budget and backoff policy.

The Oracle Cloud ARM server is a good always-on scheduler for lightweight jobs. It is not a substitute for explicit Cloud evidence or broker-write approval.

## Acceptance Criteria

A parallel research implementation is acceptable when:

- each job has a durable job record;
- retries are idempotent;
- output hashes and input hashes are recorded;
- failed/blocked/losing variants are preserved;
- selected-run-bias checks are possible;
- execution-like paths remain single-writer and fail closed;
- final reports separate parallel research evidence from paper/live-shadow and broker-readiness evidence.
