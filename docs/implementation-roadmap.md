# Implementation Roadmap

## Principle

Build the execution engine first. Supporting ledgers and dashboards matter only when they observe a working alpha-to-order loop.

## Phase 1: LEAN Runtime Skeleton

Deliver:

- local LEAN workspace under the repo;
- `aggressive_llm_momentum` project;
- repo command to run `lean backtest`;
- deterministic sample data path;
- result directory convention;
- backend endpoint or worker to ingest LEAN result metadata.

Acceptance:

- a local backtest runs from a documented command;
- result artifacts are hashed;
- backend stores the run as research evidence;
- deterministic baseline is no longer the primary engine.

## Phase 2: Numeric Alpha + Portfolio Construction

Deliver:

- numeric feature snapshot generator;
- LEAN `AlphaModel` that reads numeric scores;
- custom top-k volatility-target portfolio construction model;
- risk model for drawdown, exposure, and stale data;
- backtest report ingestion.

Acceptance:

- backtest compares numeric alpha versus benchmark;
- portfolio targets are stored;
- risk cuts are visible;
- dashboard shows alpha, targets, and backtest metrics.

## Phase 3: LLM Alpha Committee

Deliver:

- structured LLM role prompts;
- strict JSON schema validation;
- alpha decision store;
- evidence refs and input hashes;
- latency tracking;
- abstain and counter-thesis enforcement.

Acceptance:

- LLM committee emits valid `LlmAlphaDecision`;
- invalid or stale decisions are rejected;
- LLM output can be replayed into Lean without broker access;
- ablation can compare numeric-only and LLM-only decisions.

## Phase 4: Meta Alpha

Deliver:

- fixed meta-alpha combiner;
- Lean Insight adapter;
- score thresholds;
- confidence-to-weight rules;
- disagreement and abstain rules.

Acceptance:

- combined alpha creates LEAN insights;
- backtest records numeric, LLM, and meta contributions;
- final decisions are auditable by symbol and horizon.

## Phase 5: Training Pipeline

Deliver:

- label builder;
- feature dataset exporter;
- LightGBM/XGBoost training job;
- model registry;
- walk-forward validation reports;
- meta-alpha training hook.

Acceptance:

- at least one trained numeric alpha model is reproducible;
- model artifacts are versioned and hashed;
- model cannot be promoted without validation evidence.

## Phase 6: Paper Execution

Deliver:

- LEAN paper output connected to existing paper order ledgers;
- target-to-order-plan bridge;
- reconciliation between LEAN fills and control-plane paper account;
- schedule runner for fast and slow paths.

Acceptance:

- one full paper cycle runs from alpha decision to fill ledger;
- duplicate order protection is tested;
- kill switch blocks new exposure.

## Phase 7: Broker Adapter

Deliver:

- provider-neutral broker adapter interface;
- Toss or another broker implementation after schema verification;
- submit, cancel, flatten, open-order polling, fill polling;
- emergency fast-path controls;
- read-only and write-mode separation.

Acceptance:

- broker credentials never reach LLM/frontend;
- sandbox or tiny-pilot order can be submitted and reconciled;
- cancel/flatten drill is tested before live promotion.

## Phase 8: Autonomous Operation

Deliver:

- fast-path scheduler;
- slow-path LLM committee scheduler;
- research-path training/backtest scheduler;
- model promotion workflow;
- operator dashboard focused on alpha, risk, execution, latency, and blockers.

Acceptance:

- system can choose between fast, slow, and research paths;
- every decision is traceable;
- live mode remains disabled unless all readiness gates are green.
