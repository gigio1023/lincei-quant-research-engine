# Lincei Quant Research Engine Specification

Status: active long-term specification.

Last aligned: 2026-05-27.

## Spec Authority

This file is the canonical index for the project specification. A contributor can understand the full active spec by reading this file first and then the documents linked in the "Required Reading" section.

Documents linked from this file are normative. Older dated handoffs, prompts, archived plans, and review notes are historical context only. They cannot override this spec.

Changing this file or a linked `docs/spec/` document changes the long-term project direction. Do not make that kind of change from inference alone. The 2026-05-27 direction change explicitly approves the long-term objective of own-capital allocation and Darwinex/Zero monetization. It does not approve immediate broker writes, exact capital limits, leverage, derivatives, or any broker adapter implementation. Those still require the dedicated specs and gates named below.

## Current Direction Lock

The long-term project goal is real capital allocation. There are now two approved monetization tracks:

1. Own-capital allocation: use the operator's own pre-funded capital only after the alpha, risk, execution, preflight, and reconciliation gates are strong enough.
2. Darwinex/Zero fee path: use the same validated trading signal and track record to pursue external-capital allocation and performance fees when instrument support and Darwinex rules permit it.

The current milestone is still not automatic production/live trading. The repository is being fixed around a QuantConnect Cloud and LEAN validation runtime for alpha research, cloud/local backtests, paper or live-shadow evidence, result import, reconciliation, and promotion review.

Real-money broker writes are long-term in scope but remain blocked in the current milestone. Any code path that can submit, cancel, replace, flatten, transfer, or mutate margin/account settings needs a dedicated user-approved broker-write implementation spec before implementation. Old `10 USD live pilot` language is superseded by this direction lock.

QuantConnect Cloud and LEAN are the strategy validation runtime. Local LEAN is still required for fast debugging, deterministic replay, custom-data checks, and smoke tests, but local sample-data or simulator results alone are not strategy-promotion evidence.

LLMs are first-class semantic alpha engines. They may read timestamped news, filings, macro context, numeric features, and portfolio state, then emit typed, replayable alpha/risk features. They must not generate broker payloads, choose final order quantities, access credentials, or create non-replayable live-only trade decisions.

## Product Goal

Build a personal, aggressive autonomous investment system that can earn its way toward capital allocation by combining:

1. LEAN / QuantConnect as the executable strategy, backtest, paper, and later live runtime;
2. LLM agents as semantic alpha engines for natural-language data, event interpretation, thesis/counter-thesis, and risk narrative;
3. deterministic portfolio, risk, execution, broker, and reconciliation boundaries so broker-write behavior only happens through typed, auditable contracts.

The repository is not a generic investment dashboard. Dashboards, reports, ledgers, and research-note stores exist to make the alpha and execution loop observable, testable, and controllable.

The project hypothesis is that a point-in-time alpha engine combining numeric/ML features with LLM semantic alpha features can improve after-cost, benchmark-relative returns enough to survive QuantConnect Cloud validation, current paper/live-shadow evidence, reconciliation, and later transfer to own-capital and Darwinex/Zero execution paths.

## Required Reading

Read these documents in order when implementing core behavior:

1. [Direction And Change Control](docs/spec/00-direction-and-change-control.md): locked product direction, approval rules, non-goals, and subscription posture.
2. [Terminology](terminology.md): canonical engineering and quant terms, platform terms, and banned AI-slop expressions.
3. [QuantConnect And LEAN Runtime](docs/spec/01-quantconnect-lean-runtime.md): role split between QuantConnect Cloud, local LEAN, Research, Object Store, API/CLI/MCP, and the repo control plane.
4. [LLM Semantic Alpha Engine](docs/spec/02-llm-semantic-alpha-engine.md): how LLMs participate inside alpha generation without touching broker order paths.
5. [Data Sources And Feature Store](docs/spec/03-data-sources-and-feature-store.md): news, filings, macro, market data, direct ingestion, custom data, and point-in-time feature requirements.
6. [Risk, Execution, And Broker Boundary](docs/spec/04-risk-execution-and-broker-boundary.md): portfolio construction, risk caps, paper/live-shadow mode, broker write blocking, and reconciliation.
7. [Testing And Verification Policy](docs/spec/05-testing-and-verification.md): narrow Detroit-style tests plus direct runnable verification.
8. [Implementation Roadmap](docs/spec/06-implementation-roadmap.md): current phase sequence and acceptance criteria.
9. [References](docs/spec/07-references.md): official docs and research references used by this spec.
10. [Quality-Gated Universe](docs/spec/08-quality-gated-universe.md): active universe policy, ETF redundancy rules, symbol caps, profiles, and exclusion rationale.
11. [Dual Monetization And Operations](docs/spec/09-dual-monetization-and-operations.md): own-capital allocation, Oracle Cloud ARM operations, Darwinex/Zero fee path, strategy hypothesis stack, and vintage-data requirements.

Supporting project docs may provide runbooks and implementation detail, but they must be interpreted through the active spec:

- [LEAN and QuantConnect Engine](docs/lean-quantconnect-engine.md)
- [Alpha Model Design](docs/alpha-model-design.md)
- [LLM Alpha Committee](docs/llm-alpha-committee.md)
- [Implementation Roadmap](docs/implementation-roadmap.md)
- [Research References](docs/research-references.md)
- [QuantConnect Realignment Decision](docs/decisions/2026-05-24-quantconnect-realignment.md)

The old [V1 Autonomous Live Pilot Working Spec](docs/archive/v1-live-pilot-spec-20260523/README.md) is superseded for live-money scope. Use it only as historical implementation context unless the active spec links to a specific contract.

## System Shape

```text
Market/news/filing/macro data
  -> point-in-time feature snapshots
  -> numeric alpha + LLM semantic alpha
  -> quality-gated universe profile
  -> meta alpha combiner
  -> LEAN AlphaModel Insights
  -> portfolio construction
  -> risk model cuts
  -> paper/live-shadow execution evidence
  -> result import + reconciliation
  -> learning loop
  -> own-capital broker-write candidate or Darwinex/Zero track-record candidate
```

The control plane orchestrates and records evidence. LEAN owns the strategy runtime. LLMs produce semantic alpha features and risk judgments. Broker write paths remain blocked until a user-approved broker-write implementation spec exists.

## Core Contracts

Every alpha source must produce typed output rather than free-form trade text:

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
  eventType?: string;
  catalystStrength?: number;
  downsideRisk?: number;
  sourceModels: string[];
  promptVersion?: string;
  featureSnapshotHash: string;
  evidenceRefs: string[];
  thesis?: string;
  counterThesis?: string;
  abstainReason?: string;
};
```

LEAN converts approved alpha decisions into `Insight` objects. Portfolio construction and risk models determine final target weights. LLMs may influence confidence, direction, horizon, catalyst strength, and risk flags, but they do not own final order quantity.

## Required Modes

Fast path:

- numeric and precomputed alpha only;
- no fresh LLM calls;
- used for stop-loss, stale-data blocks, de-risking, and validated rule execution;
- expected latency: seconds.

Slow path:

- numeric features plus LLM semantic alpha;
- uses recent news, filings, macro context, portfolio state, and bull/bear review;
- used for new positions, concentration changes, strategy selection, and event-driven trades;
- expected latency: one to several minutes.

Research path:

- strategy creation, model training, walk-forward validation, cloud backtests, and failure review;
- expected latency: minutes to hours.

## Verification Summary

Testing is important, but unit tests are not the project goal. This is a non-production research engine where the fastest valid feedback often comes from running the implementation directly.

Use focused Detroit-style tests for pure behavior, schemas, policy gates, timestamp/lookahead checks, idempotency, and fail-closed cases. Runtime claims require direct commands and artifacts: LEAN backtests, cloud backtests when available, alpha replay, paper/live-shadow cycles, preflight checks, and result imports.

Final reports must separate unit-test evidence from direct-execution evidence.

## Non-Goals

- automatic production/live trading in the current milestone;
- real broker writes without a separate user-approved broker-write implementation spec;
- HFT, market making, tick scalping, unrestricted margin, options, futures, shorts, or derivatives;
- LLM free text directly placing broker orders;
- local simulator, local sample data, or static fixtures treated as promotion evidence;
- hidden backtest selection or only storing winning runs;
- broker credentials in frontend, LLM prompts, logs, or research artifacts;
- Darwinex/Zero performance-fee claims without a compatible account, mapped instruments, observed track record, and allocated-capital profit under Darwinex rules;
- UI polish that delays the alpha, backtest, paper/live-shadow, and reconciliation loop.

## Real-Money Readiness

Current verdict: long-term goal, not ready for broker writes.

Before any broker-write implementation spec can be approved, the repository must have:

- point-in-time alpha decisions with no-lookahead evidence;
- QuantConnect Cloud backtest/import evidence;
- paper or live-shadow performance evidence;
- stable alpha, portfolio target, risk cut, execution intent, order, fill, and reconciliation schemas;
- explicit capital limits and kill-switch behavior;
- broker write adapter design reviewed separately;
- fail-closed preflight and reconciliation tests;
- user approval for the broker-write implementation spec.

Before any Darwinex/Zero implementation spec can be approved, the repository must additionally have:

- instrument mapping between the quality-gated universe and Darwinex/Zero-supported instruments;
- a signal execution bridge design for the selected Darwinex/Zero account and platform;
- evidence that Darwinex Risk Engine behavior and fees are understood and reported separately from our portfolio target;
- track-record import or reconciliation design for DARWIN, DarwinIA, investor allocation, and performance-fee evidence.
