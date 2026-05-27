# Full Implementation Plan

Status: active normative spec.

Last aligned: 2026-05-27.

## Purpose

This document turns the long-term spec into an implementation plan. It is not a promise that every phase is approved for immediate implementation. It defines the order, dependencies, acceptance criteria, and verification evidence needed to complete the self-funded-capital-first system.

The controlling rule is:

```text
build executable self-funded capital evidence first;
defer broker writes and Darwinex/Zero adapters until their explicit gates are met.
```

## Current Completion State

Implemented:

- Alpha Architect strategy research corpus stored with source attribution and hashes.
- Hypothesis registry ingestion from the strategy register.
- Durable `research_hypotheses` and `research_job_records` tables.
- Selected-run-bias check that blocks promotion when retained variants are missing.
- Hugging Face FOMC text evidence ingestion into point-in-time raw evidence.
- Numeric, LLM, and meta alpha decision storage paths.
- LEAN local/simulator runner and QuantConnect Cloud listing/import wrappers.
- Cloud insight/order pagination and artifact import.
- Paper replay separated from current paper trading/shadow trading artifacts.
- Read-only backtest-cycle dashboard and status API.

Not complete:

- P1 hypotheses are not yet converted into retained LEAN strategy variants.
- Simple trend, defensive, momentum, and daily-return baselines do not yet have complete promotion evidence.
- Broad point-in-time and vintage data stores are incomplete.
- Ablation and parameter sweep jobs are not yet recorded as first-class variant evidence.
- QuantConnect Cloud artifacts still depends on operator-provided project/backtest ids and credentials.
- Current paper trading/shadow trading, reconciliation, and broker-read-only evidence are incomplete.
- Broker-write and Darwinex/Zero adapters are not approved for implementation.

## Target End State

The complete system has one validated path:

```text
strategy research corpus
  -> hypothesis registry
  -> point-in-time and vintage data
  -> parallel feature, LLM, ablation, and backtest jobs
  -> QuantConnect Cloud import
  -> promotion ledger
  -> LEAN Insight
  -> portfolio targets
  -> deterministic risk cuts
  -> paper trading/shadow trading artifacts
  -> reconciliation
  -> broker-read-only proof
  -> user-approved broker-write spec
  -> self-funded capital allocation
  -> later Darwinex/Zero track-record path
```

The system is not complete until failed, blocked, flat, and winning variants are all retained and visible in promotion review.

## Workstream A: Research Factory And Variant Ledger

Goal: make every research and validation attempt durable, replayable, and bias-auditable.

Deliver:

- `ResearchJobRecord` creation for data ingest, feature generation, LLM-derived feature jobs, ablations, backtests, Cloud imports, and promotion checks.
- Job parent/child relationships from hypothesis to feature jobs to backtest variants.
- Idempotency keys for every job type named in [Parallel Research Pipeline](10-parallel-research-factory.md).
- Variant registry linking one hypothesis to many strategy versions, parameter hashes, data manifests, and outcomes.
- Search-space records that describe what was tried before seeing results.
- Cost records for LLM, data, QuantConnect, storage, and Oracle Cloud ARM usage.

Acceptance:

- Retrying any job preserves one canonical job record.
- A failed or blocked variant is queryable and cannot be silently overwritten by a later winning run.
- `./scripts/run-selected-run-bias-check` blocks when a promoted candidate has only winner artifacts.
- Promotion reports show attempted, passed, failed, blocked, and rejected variant counts.

Verification:

```bash
./scripts/build-hypothesis-registry
./scripts/run-selected-run-bias-check
cd backend && bun run test -- src/modules/v1-pilot/research/research-factory.service.spec.ts
```

## Workstream B: Data, Vintage, And Universe Foundation

Goal: ensure strategy replay uses only information available at decision time.

Deliver:

- Broad liquid ETF and U.S. equity research universe profiles separate from the current theme universe.
- Daily adjusted market bars with `timestamp`, `availabilityTimestamp`, data provider, adjustment mode, and hash.
- Vintage macro series storage for restatable economic data.
- Filing/news/macro text stores with `eventTime`, `publishedAt`, `retrievedAt`, `availableAt`, parser version, and content hash.
- Index membership and factor membership stores for crowding/index/rebalance hypotheses.
- Data-quality blockers for missing availability time, unknown vintage, insufficient history, stale source, and unlicensed data.

Acceptance:

- Every feature snapshot cites source refs and availability time.
- Unknown or revised-without-vintage data blocks promotion.
- Theme-universe, broad-universe, and ETF-only results are labeled separately.
- A backtest report can explain the data known at each decision timestamp.

Verification:

```bash
./scripts/prepare-lean-local-data --skip-market-data-ingest
./scripts/ingest-semantic-evidence --source hf-fomc-statements-minutes --limit 80
cd backend && bun run test -- src/modules/v1-pilot/alpha/huggingface-semantic-evidence-ingest.service.spec.ts
```

## Workstream C: Simple Self-Funded Capital Baselines

Goal: build boring baselines before relying on LLM-derived alpha.

Deliver:

- Liquid ETF trend-following baseline.
- Defensive allocation or low-volatility baseline.
- Momentum baseline with skip-month and volatility-conditioned variants.
- Daily-return numeric feature baseline.
- Benchmark configuration for each baseline.
- Cost, slippage, turnover, liquidity, and tax-context assumptions.
- Variant job records for numeric-only baseline runs.

Acceptance:

- Each P1 baseline has a hypothesis id, data manifest, source hash, parameter hash, and retained result.
- Each baseline can pass or fail independently; rejection is recorded as evidence.
- Local simulator evidence cannot satisfy promotion.
- Baseline promotion requires local LEAN or QuantConnect Cloud artifacts plus multiple-testing bias review.

Verification:

```bash
./scripts/run-local-strategy-smoke
./scripts/run-full-backtest.sh --skip-alpha-cycle --skip-market-data-ingest --no-download-data
./scripts/import-lean-run latest
./scripts/run-selected-run-bias-check
```

## Workstream D: LLM Semantic Alpha And Ablations

Goal: make LLM output a typed feature source, not a trade allocator.

Deliver:

- Filing, news, macro, and research-derived text ingestion with point-in-time availability.
- LLM-derived feature schema validation and abstain records.
- Prompt/model version registry.
- Object Store/custom-data export for LEAN replay.
- Numeric-only, LLM-only, and combined ablation variants.
- Bull/bear review outputs as risk flags, not final order quantities.

Acceptance:

- LLM prompts never include broker credentials or raw account identifiers.
- LLM output never includes broker order payloads or final order quantities.
- LEAN rejects stale or future semantic features.
- Combined alpha must beat or justify itself against numeric-only baselines after costs.

Verification:

```bash
./scripts/ingest-semantic-evidence --source hf-fomc-statements-minutes --limit 80
./scripts/run-alpha-cycle
./scripts/qc-object-store-sync <key> artifacts/llm-features/latest.json
```

## Workstream E: LEAN And QuantConnect Cloud Promotion Evidence

Goal: make Cloud-imported artifacts the main promotion evidence when access allows it.

Deliver:

- Strategy package verification before Cloud push.
- Cloud backtest list/import by `projectId` and `backtestId`.
- Parallel Cloud artifact imports by endpoint/page.
- Imported statistics, insights, orders, fills, logs, charts, and equity curves.
- Cloud artifacts acceptance policy by runtime, status, promotion eligibility, data manifest, and blocker reasons.

Acceptance:

- Cloud command success alone is not promotion evidence.
- Promotion evidence requires imported Cloud artifacts tied to project/backtest ids.
- Cloud import preserves Cloud ids and artifact hashes.
- Missing credentials, account tier, data entitlement, or project id becomes blocked evidence.

Verification:

```bash
./scripts/verify-lean-cloud-package aggressive_llm_momentum
./scripts/list-cloud-projects
./scripts/list-cloud-backtests --project-id <project-id> --limit 10
./scripts/import-cloud-backtest --project-id <project-id> --backtest-id <backtest-id>
```

## Workstream F: Portfolio, Risk, Paper, Live-Shadow, And Learning

Goal: prove a candidate can move from alpha to current execution evidence without broker writes.

Deliver:

- LEAN Insight to portfolio target import.
- Deterministic risk cuts with max notional, gross exposure, single-name cap, stale-data block, and kill-switch state.
- Paper order plan creation from accepted targets.
- Paper fills and reconciliation.
- Current shadow trading records using live data without broker writes.
- Outcome labels by horizon.
- Promotion/rejection ledger that joins hypothesis, data, alpha, backtest, paper trading/shadow trading, reconciliation, and multiple-testing bias evidence.

Acceptance:

- Portfolio/risk/execution-like stages are single-writer.
- Unknown, stale, or mismatched state blocks advancement.
- Historical paper replay is not treated as broker-write pre-trade risk checks.
- Promotion requires current paper trading/shadow trading artifacts, not only historical replay.

Verification:

```bash
./scripts/run-paper-cycle
./scripts/run-paper-replay
./scripts/run-live-shadow
./scripts/run-learning-loop
./scripts/live-preflight
```

## Workstream G: Oracle Cloud ARM Continuous Operation

Goal: make the research/evidence loop run continuously with bounded costs and explicit blockers.

Deliver:

- Oracle Cloud ARM deployment runbook.
- Scheduler for corpus refresh, data ingest, feature generation, LLM jobs, ablations, Cloud imports, paper trading/shadow trading, reconciliation, and alerts.
- Job concurrency caps by platform and provider.
- Cost caps for LLM, QuantConnect, data, storage, and compute.
- Health checks for stale data, failed jobs, missing credentials, Cloud blockers, and reconciliation mismatches.
- Run reports suitable for reviewing overnight work.

Acceptance:

- Missed schedules and stale inputs create blocked evidence.
- Parallel research jobs do not mutate execution-like ledgers.
- The always-on control plane cannot submit broker writes before the broker-write spec is approved.

Verification:

```bash
./scripts/live-preflight
cd backend && bun run build
cd backend && bun run test
```

## Workstream H: Broker-Read-Only Reconciliation

Goal: observe real account state before any account mutation exists.

Deliver:

- User-approved broker candidate for read-only work.
- Account, cash, buying power, position, open-order, fill, fee, and tax-lot read models.
- Append-only broker snapshot and fill ledgers.
- Reconciliation against paper trading/shadow trading expected state.
- Credential custody checks and hashed account refs.

Acceptance:

- No submit, cancel, replace, flatten, transfer, margin, or account-setting write method exists.
- Unknown broker read state is blocked.
- Broker credentials never enter LLM prompts, frontend state, logs, or research artifacts.
- Reconciliation mismatch blocks broker-write pre-trade risk check status.

Verification:

```bash
./scripts/live-preflight
cd backend && bun run test -- src/modules/control-plane
```

## Workstream I: Broker-Write Implementation Spec

Goal: define the exact account-mutation boundary before implementing self-funded capital trading.

Deliver:

- User-approved broker, account, asset classes, market hours, and order types.
- Exact allowed write methods.
- Maximum notional, gross exposure, single-name exposure, daily loss, drawdown, and turnover limits.
- Kill switch, cancel, flatten, and rollback drills.
- Broker schema verification.
- Preflight failure cases for unknown, stale, mismatched, unsupported, and over-cap state.
- Deployment and incident runbooks.

Acceptance:

- This workstream is not approved by this document alone.
- Implementation starts only after explicit user approval of the broker-write spec.
- Every write-like method has at least one fail-closed test.
- LLMs cannot see credentials, raw broker identifiers, or final order payloads.

Verification:

```bash
./scripts/live-preflight
cd backend && bun run test -- <broker-write-spec-tests>
```

## Workstream J: Self-Funded Capital Allocation

Goal: trade the operator's own pre-funded capital only after evidence gates pass.

Deliver:

- Self-funded capital broker adapter implemented under the approved broker-write spec.
- Pre-trade risk check and post-trade reconciliation.
- Real fills imported and matched.
- Capital allocation reports.
- Strategy retirement and de-risking rules.
- Tax-context reporting for the operator.

Acceptance:

- Orders are never submitted from LLM output directly.
- Broker writes require ready pre-trade risk check, current paper trading/shadow trading artifacts, and matched broker-read-only state.
- Fill mismatches or open-order unknowns block new exposure.
- Capital scaling requires explicit approval and updated limits.

Verification:

```bash
./scripts/live-preflight
./scripts/run-learning-loop
```

Additional broker-write commands must be named only in the future approved broker-write spec.

## Workstream K: Darwinex/Zero Track-Record Path

Goal: use self-funded capital deployment-grade signals to pursue later external-capital performance fees.

Deliver:

- Darwinex/Zero account, subscription, jurisdiction, and terms verification.
- Instrument mapping from approved self-funded capital strategy to Darwinex/Zero-supported instruments.
- MetaTrader or approved API bridge design.
- Execution/reconciliation records separate from QuantConnect evidence.
- Darwinex Risk Engine reports separate from our portfolio target sizing.
- Performance-fee evidence import based on allocated-capital profit.

Acceptance:

- Self-funded capital deployment-grade strategy validation artifacts exist first.
- Darwinex/Zero is not treated as a backtest provider.
- The system reports our signal, Darwinex/Zero execution, Darwinex risk standardization, and fee evidence separately.
- Performance-fee claims come from Darwinex/Zero records, not simulated returns.

Verification:

```bash
./scripts/run-learning-loop
```

Future Darwinex/Zero commands require a separate approved adapter spec.

## Parallelization Map

Parallelize:

- research corpus ingestion by source/page/article;
- hypothesis extraction by document;
- market/news/filing/macro ingest by source, symbol, and time window;
- feature generation by feature family, symbol, and window;
- LLM-derived features by event/symbol/window under cost caps;
- numeric/LLM/combined ablations by hypothesis and parameter hash;
- local backtests by strategy variant where platform resources allow;
- QuantConnect Cloud imports by endpoint/page range.

Keep single-writer:

- promotion decision;
- portfolio target consolidation;
- risk cuts;
- paper trading/shadow trading execution intent;
- reconciliation;
- broker-read-only account truth per provider/account;
- broker-write pre-trade risk check;
- future broker writes.

## Definition Of Done For The Full Spec

The full long-term spec is implemented only when:

- P1 baselines and LLM-derived alpha variants are represented as retained variant evidence.
- Point-in-time and vintage data blockers are enforced.
- QuantConnect Cloud imports produce accepted or blocked promotion evidence.
- Current paper trading/shadow trading artifacts and reconciliation exist for promoted candidates.
- Selected-run-bias review can inspect winning, losing, failed, and blocked variants.
- Oracle Cloud ARM can run the non-broker loop continuously with cost and stale-data controls.
- Broker-read-only reconciliation is implemented and matched.
- A separate broker-write implementation spec is approved and implemented.
- Self-funded capital fills are reconciled before any Darwinex/Zero adapter is prioritized.

Until all of these are true, reports must say which rung of the evidence ladder is complete and which exact blocker remains.
