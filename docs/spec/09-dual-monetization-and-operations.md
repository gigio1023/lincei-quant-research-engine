# Dual Monetization And Operations

Status: active normative spec.

Last aligned: 2026-05-27.

## Purpose

The long-term product objective has two monetization tracks:

1. Own-capital allocation: run the system continuously, allocate the operator's own pre-funded capital only after evidence gates pass, and keep broker-write behavior bounded, typed, and reconcilable.
2. External-capital fee path: use the same validated signal and track record to pursue Darwinex/Zero capital allocation and performance fees when the strategy is compatible with Darwinex instruments, execution, and risk standardization.

This document approves the long-term direction. It does not approve immediate broker writes, exact capital limits, leverage, derivatives, or a specific broker adapter. Those still require a dedicated implementation spec before code can mutate a real account.

## Primary Hypothesis

The project hypothesis is:

> A point-in-time alpha engine that combines numeric/ML features with LLM semantic alpha features can produce after-cost, benchmark-relative returns that survive QuantConnect Cloud validation, paper/live-shadow evidence, reconciliation, and later transfer to own-capital and Darwinex/Zero execution paths.

This is a testable claim, not a product slogan. Every promotion review must be able to answer which part of the hypothesis passed or failed.

## Hypothesis Stack

| ID | Hypothesis | Required comparison |
| --- | --- | --- |
| H1 | The numeric/ML baseline has positive edge after costs on the quality-gated universe. | Baseline vs benchmark, with drawdown, turnover, and slippage assumptions reported. |
| H2 | LLM semantic alpha adds incremental edge beyond numeric/ML features. | Numeric-only vs LLM-only vs combined ablations. |
| H3 | Point-in-time and vintage-data controls remove false alpha caused by future information or restated data. | Replay using `availableAt`, source hashes, and raw snapshot versions. |
| H4 | The combined alpha survives QuantConnect Cloud evidence and current paper/live-shadow evidence. | Imported Cloud artifacts plus current paper/live-shadow records and reconciliation. |
| H5 | The strategy remains usable after operational costs, latency, missed fills, and reconciliation blockers. | Live-shadow dwell-time reports, execution-cost assumptions, and failure-case logs. |
| H6 | The same signal can be monetized through two separate paths: own-capital allocation and Darwinex/Zero track record. | Broker-specific adapter proof for own capital; Darwinex/Zero instrument mapping and track-record proof for fee path. |

No hypothesis can be marked accepted from a single lucky backtest, a selected winning run, or a local simulator artifact.

## End-To-End Direction

```text
data and research evidence
  -> point-in-time and vintage feature store
  -> numeric/ML alpha + LLM semantic alpha
  -> LEAN Insights
  -> portfolio construction
  -> risk cuts
  -> paper/live-shadow execution evidence
  -> reconciliation
  -> learning and promotion ledger
  -> own-capital broker-write candidate
  -> Darwinex/Zero track-record candidate
```

The core loop remains data -> alpha -> backtest -> portfolio sizing -> risk -> execution evidence -> reconciliation -> learning. Dashboards, reports, and research notes support that loop; they do not replace it.

## Oracle Cloud ARM Operations

The operator's Oracle Cloud ARM server is the preferred always-on control plane for low-cost continuous operation. Its responsibilities are:

- schedule evidence ingestion, feature generation, alpha cycles, live-shadow runs, imports, reconciliation, and alerts;
- maintain point-in-time raw evidence, feature snapshots, run manifests, and promotion ledgers;
- call QuantConnect Cloud or local LEAN commands when the platform and credentials allow it;
- run lightweight model scoring and LLM semantic feature jobs within configured cost limits;
- keep credentials in approved environment boundaries and never expose broker credentials to LLM prompts, frontend state, logs, or artifacts.

The Oracle server is not automatically the strategy execution venue. QuantConnect/LEAN remains the validation and strategy runtime. A future own-capital broker adapter may run on the Oracle server only after the broker-write implementation spec defines supported methods, capital caps, kill-switch behavior, reconciliation requirements, deployment controls, and rollback drills.

## Own-Capital Track

Own-capital trading is a long-term goal. The required progression is:

1. Research and data collection with point-in-time and vintage controls.
2. Numeric/ML baseline and LLM semantic alpha ablation evidence.
3. QuantConnect Cloud backtest/import evidence.
4. Current paper/live-shadow evidence with reconciliation.
5. Broker-write implementation spec for the selected broker and account type.
6. Bounded initial live-money deployment with explicit maximum notional, loss limits, kill switch, cancel/flatten drills, and reconciliation fail-closed behavior.
7. Ongoing learning loop that keeps failed, flat, blocked, and winning decisions.

The system must not skip from a backtest to real orders. A green unit-test suite does not authorize own-capital deployment.

## Darwinex/Zero Track

Darwinex/Zero is a later monetization venue, not the research engine. The project should treat Darwinex/Zero as an external-capital track-record path:

- the repo generates and validates alpha signals;
- QuantConnect/LEAN supplies backtest and paper/live-shadow evidence;
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

Research articles, papers, and practitioner notes are useful alpha idea sources, but they are not executable strategy evidence. The corpus must store:

- source URL and publisher;
- title, author, publication time, retrieval time, and parser version;
- content hash and license/usage notes;
- extracted hypothesis, instruments, rebalance schedule, feature definitions, expected horizon, and failure modes;
- whether the idea is a direct strategy candidate, a risk warning, or background context.

The LLM may use this corpus to propose hypotheses and counter-theses. It must not convert a research article directly into a broker order.

## Vintage Data And Restatements

For macro, fundamentals, filings, estimates, index membership, and any source that can be revised, corrected, or restated, the system must preserve vintage data:

- never overwrite a raw record in place when the source changes;
- store each retrieved version with `retrievedAt`, `availableAt`, source hash, parser version, and prior-version reference when known;
- report whether a backtest used originally available data, later-restated data, or a mixed source;
- block promotion when the evidence path cannot distinguish original availability from restated values.

This applies to LLM semantic evidence too. If the text was edited after publication, the replay should know which version the system could have read at the time.

## Promotion Gates

The minimum long-term promotion ladder is:

```text
unit/schema tests
  -> direct local LEAN smoke or focused backtest
  -> QuantConnect Cloud backtest/import
  -> paper cycle or live-shadow current evidence
  -> reconciliation
  -> learning/promotion review
  -> own-capital or Darwinex adapter-specific preflight
```

Every promotion decision must report:

- data vintage and point-in-time status;
- benchmark-relative and absolute returns;
- after-cost assumptions;
- drawdown, volatility, turnover, liquidity, and slippage;
- elapsed validation time and out-of-sample/live-shadow period;
- unit-test evidence separately from direct execution evidence;
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
