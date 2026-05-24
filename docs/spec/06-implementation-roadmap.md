# Implementation Roadmap

Status: active normative spec.

## Phase 1: Spec Alignment And Evidence Hygiene

Deliver:

- active spec split under `docs/spec/`;
- old live-pilot scope marked superseded;
- docs updated to say local simulator and sample-data runs prove plumbing only;
- validation reports distinguish direct execution from unit tests.

Acceptance:

- `SPEC.md` is enough to find the full active spec;
- no active doc requires a real-money pilot in the current milestone;
- future spec changes require explicit user approval.

## Phase 2: QuantConnect Cloud Backtest Loop

Deliver:

- repo command for cloud project sync or push;
- cloud compile/backtest command;
- cloud result importer;
- run manifest with source/config/data hashes;
- blocker reporting for account tier, credentials, and dataset licensing.

Acceptance:

- cloud backtest can run when account access allows it;
- blocked cloud backtests produce actionable status;
- imported cloud results are stored separately from local/simulator results.

## Phase 3: Numeric Alpha Baseline

Deliver:

- deterministic feature snapshots;
- numeric alpha model;
- LEAN `AlphaModel` integration;
- top-k portfolio construction;
- stale-data and exposure risk cuts.

Acceptance:

- local LEAN backtest runs with numeric alpha;
- cloud backtest/import runs when available;
- benchmark comparison and risk cuts are visible;
- simulator-only runs cannot pass promotion gates.

## Phase 4: LLM Semantic Feature Feed

Deliver:

- raw text ingestion for selected news/filing/macro sources;
- LLM feature schema and validator;
- point-in-time archive with `availableAt`;
- Object Store or custom-data export;
- replay fixture for LEAN.

Acceptance:

- LLM features can be generated without broker access;
- LEAN can consume timestamped LLM features;
- stale/future LLM features are rejected;
- numeric-only, LLM-only, and combined ablations can be compared.

## Phase 5: Meta Alpha And Insight Adapter

Deliver:

- meta-alpha combiner;
- disagreement and abstain rules;
- final `AlphaDecision` store;
- LEAN Insight adapter;
- run-level feature and prompt/model version manifests.

Acceptance:

- combined alpha emits LEAN Insights;
- decisions are replayable by symbol and horizon;
- every decision has evidence refs and hashes.

## Phase 6: Paper And Live-Shadow Loop

Deliver:

- paper order bridge from LEAN targets;
- paper reconciliation;
- live-shadow mode that records proposed trades without broker writes;
- preflight status that remains blocked for live-money writes.

Acceptance:

- one full paper cycle runs from alpha decision to fill ledger;
- live-shadow produces would-have-traded evidence;
- kill switch and reconciliation mismatches block new exposure.

## Phase 7: Learning Loop

Deliver:

- result labels by horizon;
- feature/decision outcome joins;
- model and prompt performance tracking;
- failure review workflow;
- promotion/rejection ledger.

Acceptance:

- alpha versions can be compared;
- failed decisions are retained;
- promotion decisions require cloud/paper/live-shadow evidence.

## Deferred: Live-Money Spec

Live-money execution is deferred. A future spec must define:

- broker choice and credentials boundary;
- exact supported write methods;
- maximum notional and loss limits;
- cancel/flatten drills;
- reconciliation failure handling;
- legal/tax/operator assumptions;
- user approval text for enabling writes.
