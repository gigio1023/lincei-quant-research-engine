# Dual Monetization And Operations

Status: active normative spec.

Last aligned: 2026-05-27.

## Purpose

The long-term product objective has two monetization tracks:

1. Self-funded capital allocation: run the system continuously, allocate the operator's own pre-funded capital only after promotion evidence, pre-trade risk checks, and reconciliation gates pass, and keep broker-write behavior bounded, typed, and reconcilable.
2. External-capital fee path: use the same validated signal and track record to pursue Darwinex/Zero capital allocation and performance fees when the strategy is compatible with Darwinex instruments, execution, and risk standardization.

This document approves the long-term direction. It does not approve immediate broker writes, exact capital limits, leverage, derivatives, or a specific broker adapter. Those still require a dedicated implementation spec before code can mutate a real account.

Self-funded capital allocation has priority over Darwinex/Zero work. Darwinex/Zero is a downstream monetization venue, not a blocker for building the operator's own validated capital-allocation loop.

## Primary Hypothesis

The project hypothesis is:

> A point-in-time parallel research pipeline that combines durable numeric baselines, ML features, and LLM-derived features can produce after-cost, benchmark-relative returns that survive QuantConnect Cloud validation, paper trading/shadow trading artifacts, reconciliation, and later self-funded capital execution.

This is a testable claim, not a product slogan. Every promotion review must be able to answer which part of the hypothesis passed or failed.

The Alpha Architect corpus review changes the near-term priority:

- first prove simple liquid trend-following, defensive allocation, momentum, and daily-return baselines;
- then test whether LLM-derived alpha improves those baselines;
- defer factor crowding, factor valuation, macro regime, and filing-language strategies until the project has broad data and vintage controls;
- defer Darwinex/Zero until self-funded capital deployment-grade evidence exists.

## Hypothesis Stack

| ID  | Hypothesis                                                                                                      | Required comparison                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| H1  | A simple numeric baseline has positive edge after costs on a liquid, testable universe.                         | Trend/momentum/defensive baseline vs benchmark, with drawdown, turnover, and slippage assumptions reported.              |
| H2  | LLM-derived alpha adds incremental edge beyond numeric/ML features.                                             | Numeric-only vs LLM-only vs combined ablations.                                                                          |
| H3  | Point-in-time and vintage-data controls remove false alpha caused by future information or restated data.       | Replay using `availableAt`, source hashes, and raw snapshot versions.                                                    |
| H4  | The combined alpha survives QuantConnect Cloud artifacts and current paper trading/shadow trading artifacts.    | Imported Cloud artifacts plus current paper trading/shadow trading records and reconciliation.                           |
| H5  | Parallel hypothesis/backtest search does not create multiple-testing bias.                                      | Complete run registry, failed/blocked/losing variants, parameter search space, and out-of-sample/shadow trading windows. |
| H6  | The strategy remains usable after operational costs, taxes, latency, missed fills, and reconciliation blockers. | Shadow trading dwell-time reports, execution-cost assumptions, tax-context notes, and failure-case logs.                 |
| H7  | The self-funded capital signal can later support Darwinex/Zero track-record monetization.                       | Self-funded capital deployment-grade evidence first; Darwinex/Zero instrument mapping and track-record proof second.     |

No hypothesis can be marked accepted from a single lucky backtest, a selected winning run, or a local simulator artifact.

## End-To-End Direction

```text
data and research artifacts
  -> point-in-time and vintage feature store
  -> parallel numeric/ML/LLM feature jobs and ablations
  -> LEAN Insights
  -> portfolio construction
  -> risk cuts
  -> paper trading/shadow trading execution artifacts
  -> reconciliation
  -> learning and promotion ledger
  -> self-funded capital broker-write candidate
  -> Darwinex/Zero track-record candidate
```

The core loop remains data -> alpha -> backtest -> portfolio sizing -> risk -> execution artifacts -> reconciliation -> learning. Dashboards, reports, and research notes support that loop; they do not replace it.

## Parallel Research Pipeline

The Oracle Cloud ARM control plane should coordinate a bounded parallel research pipeline:

```text
research articles || data ingest || feature jobs || LLM jobs || ablations || backtests || Cloud imports
```

Those jobs may run concurrently. They must write durable job records and output hashes. The final portfolio/risk/execution path must remain single-writer:

```text
promotion ledger -> portfolio targets -> risk cuts -> execution intent -> reconciliation -> pre-trade risk check
```

Parallelization is useful only when it improves validation quality. It must not create hidden winning-run selection, duplicate artifacts, or multiple competing account states.

## Oracle Cloud ARM Operations

The operator's Oracle Cloud ARM server is the preferred always-on control plane for low-cost continuous operation. Its responsibilities are:

- schedule evidence ingestion, feature generation, alpha cycles, shadow trading runs, imports, reconciliation, and alerts;
- schedule parallel hypothesis extraction, feature generation, ablation, and backtest jobs under resource and cost caps;
- maintain point-in-time raw evidence, feature snapshots, run manifests, and promotion ledgers;
- call QuantConnect Cloud or local LEAN commands when the platform and credentials allow it;
- run lightweight model scoring and LLM-derived feature jobs within configured cost limits;
- keep credentials in approved environment boundaries and never expose broker credentials to LLM prompts, frontend state, logs, or artifacts.

The Oracle server is not automatically the strategy execution venue. QuantConnect/LEAN remains the validation and strategy runtime. A future self-funded capital broker adapter may run on the Oracle server only after the broker-write implementation spec defines supported methods, capital caps, kill-switch behavior, reconciliation requirements, deployment controls, and rollback drills.

## Self-Funded Capital Track

Self-funded capital trading is a long-term goal. The required progression is:

1. Research and data collection with point-in-time and vintage controls.
2. Hypothesis registry with accepted, rejected, blocked, and deferred candidates.
3. Simple numeric baselines for liquid trend, defensive allocation, momentum, and daily-return features.
4. LLM-derived alpha ablations against those baselines.
5. QuantConnect Cloud backtest/import artifacts.
6. Current paper trading/shadow trading artifacts with reconciliation.
7. Broker-read-only reconciliation.
8. Broker-write implementation spec for the selected broker and account type.
9. Bounded initial live-money deployment with explicit maximum notional, loss limits, kill switch, cancel/flatten drills, and reconciliation fail-closed behavior.
10. Ongoing learning loop that keeps failed, flat, blocked, and winning decisions.

The system must not skip from a backtest to real orders. A green unit-test suite does not authorize self-funded capital deployment.

## Darwinex/Zero Track

Darwinex/Zero is a later monetization venue, not the research engine. The project should treat Darwinex/Zero as an external-capital track-record path:

- the repo generates and validates alpha signals;
- QuantConnect/LEAN supplies backtest and paper trading/shadow trading artifacts;
- a future Darwinex adapter maps approved signals to Darwinex/Zero-supported instruments and execution semantics;
- Darwinex/Zero creates a DARWIN or similar track record where Darwinex's Risk Engine may standardize or resize risk independently of the source strategy;
- performance fees are possible only when Darwinex/Zero or investor allocated capital produces profit under Darwinex rules.

Do not describe this as uploading the whole repo or QuantConnect project to Darwinex. The transferable object is the signal, execution behavior, and independently observed track record.

Before any Darwinex adapter is implemented, the project must verify:

- account type, jurisdiction, subscription, and terms;
- supported instruments and whether the quality-gated universe maps to cash stocks/ETFs, CFDs, futures, or another account type;
- MetaTrader 4/5 or API connectivity and whether the Oracle server can run the required execution bridge safely;
- spread, commission, swap, latency, market hours, and corporate-action behavior;
- Darwinex Risk Engine effects on sizing and VaR;
- how performance fees, high-water marks, DarwinIA allocations, investor allocations, and withdrawals are currently calculated.

## Strategy Research Corpus

Research articles, papers, and practitioner notes are useful alpha idea sources, but they are not executable strategy validation artifacts. The corpus must store:

- source URL and publisher;
- title, author, publication time, retrieval time, and parser version;
- content hash and license/usage notes;
- extracted hypothesis, instruments, rebalance schedule, feature definitions, expected horizon, and failure modes;
- whether the idea is a direct strategy candidate, a risk warning, or background context.

The LLM may use this corpus to propose hypotheses and counter-theses. It must not convert a research article directly into a broker order.

The initial stored corpus is `references/alphaarchitect/`. Its strategy register identifies the first self-funded capital backlog:

- liquid trend-following and defensive allocation;
- momentum, skip-month, volatility-conditioned, and daily-return features;
- factor crowding, factor valuation, and macro regime features after broad data/vintage support exists;
- filing/news/LLM-derived alpha after numeric baselines are stable.

## Vintage Data And Restatements

For macro, fundamentals, filings, estimates, index membership, and any source that can be revised, corrected, or restated, the system must preserve vintage data:

- never overwrite a raw record in place when the source changes;
- store each retrieved version with `retrievedAt`, `availableAt`, source hash, parser version, and prior-version reference when known;
- report whether a backtest used originally available data, later-restated data, or a mixed source;
- block promotion when the provenance path cannot distinguish original availability from restated values.

This applies to LLM text evidence too. If the text was edited after publication, the replay should know which version the system could have read at the time.

## Promotion Gates

The minimum long-term promotion ladder is:

```text
unit/schema tests
  -> direct local LEAN smoke or focused backtest
  -> QuantConnect Cloud backtest/import
  -> paper cycle or shadow trading current artifacts
  -> reconciliation
  -> learning/promotion review
  -> self-funded capital or Darwinex adapter-specific pre-trade risk check
```

Every promotion decision must report:

- hypothesis id, research refs, and strategy variant;
- data vintage and point-in-time status;
- attempted variants, failed runs, and multiple-testing bias status;
- benchmark-relative and absolute returns;
- after-cost assumptions;
- drawdown, volatility, turnover, liquidity, and slippage;
- elapsed validation time and out-of-sample/shadow trading period;
- unit-test evidence separately from direct execution artifacts;
- exact blockers for missing credentials, platform tier, data license, broker support, Darwinex support, or reconciliation mismatch.

## Non-Goals

- immediate production trading from this spec alone;
- LLM-generated broker payloads or final order quantities;
- hidden selection of only winning backtests;
- Darwinex/Zero claims without a real compatible account, instrument mapping, and observed track record;
- performance-fee claims without actual allocated-capital profit under Darwinex rules;
- leverage, margin, derivatives, shorts, or new asset classes unless a future spec explicitly approves them.

## References

- Darwinex Zero DARWIN overview: https://www.darwinexzero.com/docs/en/what-is-a-darwin
- Darwinex Zero Risk Engine: https://www.darwinexzero.com/docs/en/risk-engine
- Darwinex Zero performance fees: https://www.darwinexzero.com/docs/performance-fees
- Darwinex Zero pricing: https://www.darwinexzero.com/docs/en/pricing
- Darwinex Zero trading accounts and assets: https://www.darwinexzero.com/docs/en/trading-accounts-assets
- Alpha Architect research blog: https://alphaarchitect.com/blog/
- Alpha Architect factor research article: https://alphaarchitect.com/factor-strategies/
- Alpha Architect stored corpus: ../../references/alphaarchitect/README.md
- Alpha Architect strategy register: ../../references/alphaarchitect/strategy-register.md
- Self-funded capital corpus review: ../own-capital-alphaarchitect-corpus-review.md
- Parallel research pipeline spec: 10-parallel-research-factory.md
