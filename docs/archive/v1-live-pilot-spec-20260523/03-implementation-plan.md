# Implementation Plan

Status: archived and superseded. This file is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

## Build Strategy

Implement V1 as one branch and one integrated system. Do not stop after a planning or Phase 1 slice. Internally, work can be parallelized, but the PR must prove the complete loop up to live preflight and, when external broker gates exist, the 10 USD pilot command.

## Workstream A: LEAN Runtime

Deliver:

- `engines/lean/aggressive_llm_momentum`;
- LEAN Python algorithm using Algorithm Framework;
- fixed liquid ETF universe for V1;
- numeric alpha model;
- meta-alpha adapter;
- aggressive top-k portfolio construction;
- drawdown/exposure/stale-data risk model;
- immediate execution for backtest;
- artifact exporter.

Acceptance:

- `./scripts/lean-backtest aggressive_llm_momentum` runs.
- Backtest result artifacts include statistics, orders, fills, insights, targets, and logs.
- Failed backtests produce actionable error output.

## Workstream B: Alpha Decisions

Deliver:

- feature snapshot builder;
- numeric alpha decision writer;
- OpenAI-backed LLM committee;
- strict JSON schema validation;
- meta-alpha combiner;
- decision replay support.

Acceptance:

- LLM output is rejected if schema-invalid, stale, or missing evidence.
- Numeric-only, LLM-only, and meta decisions are stored separately.
- Meta alpha can run without broker access.

## Workstream C: Backend Ingestion

Deliver:

- `LeanRun` persistence;
- `FeatureSnapshot` persistence;
- `AlphaDecision` persistence;
- `PortfolioTargetSnapshot` persistence;
- `ExecutionIntent` persistence;
- APIs for import/list/latest.

Acceptance:

- Duplicate imports are idempotent.
- Missing artifacts are rejected.
- Hashes are stored for source, config, input, and output artifacts.

## Workstream D: Paper Execution Bridge

Deliver:

- bridge from LEAN portfolio targets to existing proposal/order-plan flow;
- paper execution command;
- reconciliation against paper account event ledger;
- kill-switch and reducing-mode compatibility.

Acceptance:

- `./scripts/run-paper-cycle` can create a paper plan from latest LEAN target.
- Duplicate paper execution is blocked or replayed idempotently.
- Kill switch blocks new exposure.

## Workstream E: Broker Adapter And Live Pilot

Deliver:

- provider-neutral `BrokerAdapter` interface;
- Toss implementation only after schema verification;
- mock/sandbox implementation for tests;
- live preflight service;
- 10 USD pilot command;
- cancel/flatten path;
- open-order/fill polling and reconciliation.

Acceptance:

- `./scripts/live-preflight` returns `ready` or explicit blockers.
- `./scripts/live-pilot-10usd --confirm-real-money` cannot run without all gates.
- Broker credentials never reach LLM, frontend, logs, or artifacts.

## Workstream F: Training Baseline

Deliver:

- `ml/` package;
- feature export;
- label builder for forward returns;
- LightGBM or XGBoost baseline if dependencies are acceptable;
- model registry with hashes;
- walk-forward validation report.

Acceptance:

- Training is reproducible on T4 16GB or RTX 3070 8GB.
- Training is not required for the first live pilot unless explicitly promoted.
- Model promotion requires validation evidence.

## Workstream G: Minimal Dashboard Update

Deliver only what is necessary to operate V1:

- latest LEAN run status;
- latest alpha decisions;
- paper cycle status;
- live preflight blockers;
- kill switch state;
- latest broker reconciliation.

Do not redesign the UI. Do not add marketing surfaces.

## Suggested Order For Composer 2.5

1. Create branch.
2. Add LEAN workspace and script.
3. Add backend `LeanRun` import.
4. Add feature and alpha schemas.
5. Add OpenAI LLM alpha committee.
6. Add meta alpha export to LEAN.
7. Add paper bridge.
8. Add live preflight and broker adapter interface.
9. Add 10 USD command behind hard gates.
10. Add tests and docs.
