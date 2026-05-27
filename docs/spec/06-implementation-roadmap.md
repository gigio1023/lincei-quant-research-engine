# Implementation Roadmap

Status: active normative spec.

Last aligned: 2026-05-27.

## Roadmap Principle

The roadmap is ordered around the core functional loop:

```text
data -> alpha -> LEAN Insight -> portfolio target -> risk -> execution evidence -> reconciliation -> learning -> monetization candidate
```

The long-term monetization tracks are own-capital allocation and Darwinex/Zero performance-fee eligibility. Neither track can bypass the evidence ladder.

## Phase 1: Direction And Evidence Hygiene

Deliver:

- active spec split under `docs/spec/`;
- dual monetization direction documented as own-capital allocation plus Darwinex/Zero fee path;
- old live-pilot scope marked superseded;
- docs updated to say local simulator and sample-data runs prove plumbing only;
- validation reports distinguish direct execution from unit tests.

Acceptance:

- `SPEC.md` is enough to find the full active spec;
- current milestone does not enable real broker writes;
- future broker-write, capital-limit, leverage, derivatives, Darwinex adapter, and testing-policy changes require explicit user approval.

## Phase 2: Data, Vintage, And Research Corpus

Deliver:

- point-in-time raw evidence archive with `eventTime`, `publishedAt`, `retrievedAt`, `availableAt`, source hash, and parser version;
- vintage-data versioning for revised macro, fundamental, filing, estimate, index membership, and edited text sources;
- strategy research corpus for articles, papers, and practitioner notes;
- hypothesis registry that links research notes to feature definitions, symbols, horizons, and failure modes;
- Hugging Face FOMC macro evidence ingestion as the first no-key semantic source.

Acceptance:

- replay can prove what the strategy could know at decision time;
- restated or unknown-vintage sources cannot pass promotion silently;
- research notes create testable hypotheses, not direct trade instructions.

## Phase 3: Numeric/ML Alpha Baseline

Deliver:

- deterministic feature snapshots;
- quality-gated universe manifest and profile loader;
- local LEAN daily data preparation and coverage blocker reporting;
- promoted gradient-boosted tabular baseline where available;
- LEAN `AlphaModel` integration;
- top-k portfolio construction with symbol/sleeve caps;
- stale-data, universe-policy, and exposure risk cuts.

Acceptance:

- local LEAN backtest runs with numeric/ML alpha;
- cloud backtest/import runs when available;
- benchmark comparison and risk cuts are visible;
- universe-selection report is exported with every run;
- simulator-only runs cannot pass promotion gates.

## Phase 4: LLM Semantic Alpha Feed

Deliver:

- raw text ingestion for selected news, filing, macro, and research sources;
- LLM feature schema and validator;
- point-in-time archive with `availableAt`;
- Object Store or custom-data export;
- replay fixture for LEAN;
- numeric-only, LLM-only, and combined ablation support.

Acceptance:

- LLM features can be generated without broker access;
- LEAN can consume timestamped LLM features;
- stale/future LLM features are rejected;
- LLM-derived research hypotheses are labeled separately from executable alpha evidence.

## Phase 5: Meta Alpha And Insight Adapter

Deliver:

- meta-alpha combiner;
- disagreement and abstain rules;
- final `AlphaDecision` store;
- LEAN Insight adapter;
- run-level feature, prompt, model, data-vintage, and parameter manifests.

Acceptance:

- combined alpha emits LEAN Insights;
- decisions are replayable by symbol and horizon;
- every decision has evidence refs and hashes;
- baseline, LLM, and combined variants can be compared without selected-run bias.

## Phase 6: QuantConnect Cloud Promotion Loop

Deliver:

- repo command for cloud project sync or push;
- cloud compile/backtest command;
- cloud result importer;
- manual Web IDE cloud result importer by project id and backtest id;
- run manifest with source/config/data hashes;
- blocker reporting for account tier, credentials, and dataset licensing.

Acceptance:

- cloud backtest can run when account access allows it;
- blocked cloud backtests produce actionable status;
- imported cloud results are stored separately from local/simulator results;
- paginated insights and orders are imported before a cloud run can become promotion evidence;
- a successful cloud CLI command is still blocked until real cloud result artifacts are imported and pass strategy-evidence acceptance.

## Phase 7: Paper, Live-Shadow, And Learning Loop

Deliver:

- paper order bridge from LEAN targets;
- paper reconciliation;
- live-shadow mode that records proposed trades without broker writes;
- result labels by horizon;
- feature/decision outcome joins;
- model and prompt performance tracking;
- failure review workflow;
- promotion/rejection ledger.

Acceptance:

- one full paper cycle runs from alpha decision to fill ledger;
- live-shadow produces current would-have-traded evidence;
- historical paper replay is separated from current readiness;
- kill switch and reconciliation mismatches block new exposure;
- promotion decisions require Cloud plus current paper/live-shadow evidence.

## Phase 8: Oracle Cloud ARM Always-On Control Plane

Deliver:

- deployment runbook for Oracle Cloud ARM;
- scheduled ingestion, alpha cycle, import, paper/live-shadow, reconciliation, and alert jobs;
- credential boundary checks;
- cost controls for LLM, QuantConnect, data providers, and storage;
- health checks and failure reports.

Acceptance:

- the system can run continuously without broad manual babysitting;
- missed schedules, stale data, failed imports, and reconciliation mismatches create blocked evidence and alerts;
- Oracle Cloud ARM does not introduce broker writes before the broker-write implementation spec.

## Phase 9: Own-Capital Broker-Write Spec And Adapter

Deliver:

- user-approved broker choice and account assumptions;
- exact allowed write methods;
- maximum notional, loss limits, position caps, and kill-switch behavior;
- cancel/flatten drills;
- broker credential boundary;
- broker schema verification;
- reconciliation failure handling;
- deployment and rollback runbook.

Acceptance:

- preflight fails closed for unknown, stale, mismatched, or unsupported state;
- paper/live-shadow evidence maps to broker-specific order semantics;
- at least one blocked/failure case is tested for every write-like method;
- no LLM, frontend, log, or research artifact sees broker credentials or raw account identifiers.

This phase approves implementation only when the user explicitly approves the broker-write spec. It is not approved by earlier phases alone.

## Phase 10: Darwinex/Zero Track-Record Path

Deliver:

- Darwinex/Zero account, jurisdiction, subscription, and terms verification;
- instrument mapping between the quality-gated universe and Darwinex/Zero-supported instruments;
- MetaTrader 4/5 or API bridge design for the Oracle control plane;
- signal-to-order mapping that respects our risk gates and Darwinex execution semantics;
- Darwinex Risk Engine reporting separate from our portfolio targets;
- track-record import or reconciliation;
- performance-fee evidence import when allocated-capital profit exists.

Acceptance:

- the project can show which signal was executed, through which Darwinex/Zero instrument, under which costs and market hours;
- Darwinex sizing/risk standardization is reported separately from our intended target;
- performance-fee claims come from Darwinex/Zero evidence, not from QuantConnect backtests;
- adapter write permissions are approved separately from own-capital broker writes.

## Phase 11: Operational Review And Capital Scaling

Deliver:

- recurring promotion review;
- drawdown and risk-budget reports;
- strategy retirement rules;
- tax-context reporting for the operator;
- capital allocation changes with explicit approvals.

Acceptance:

- failed, flat, blocked, and winning decisions are retained;
- scaling decisions cite evidence, not informal judgment;
- changes to capital limits, leverage, derivatives, shorts, or asset classes require explicit user approval and spec updates.
