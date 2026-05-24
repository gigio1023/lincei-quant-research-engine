# Outcome And Scope

Status: archived and superseded. This file is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

## Target Outcome

The V1 branch is complete only when the repository can run a full autonomous investment cycle:

1. generate or ingest market and news inputs;
2. build timestamped feature snapshots;
3. produce numeric alpha decisions;
4. produce OpenAI-backed LLM alpha decisions;
5. combine them into meta alpha decisions;
6. run a LEAN backtest using those decisions or an equivalent deterministic replay;
7. export LEAN insights, portfolio targets, order events, fills, and statistics;
8. ingest those outputs into the NestJS control plane;
9. run a paper execution cycle against the existing paper account ledger;
10. run broker read-only checks;
11. run live preflight;
12. submit a real-money order of at most 10 USD only if all live gates pass;
13. poll order/fill status and reconcile final account state.

## Current Baseline

The repository already has useful control-plane infrastructure:

- budget envelope and risk gate records;
- research and proposal ledgers;
- market-data bar import;
- paper account, approval, paper execution, and reconciliation ledgers;
- kill switch and execution-control state;
- read-only broker snapshot, fill, order-status, and broker-command dry-run records;
- React operational dashboard.

The core missing work is the executable trading brain:

- no repo-owned LEAN workspace;
- no `lean backtest` orchestration;
- no production LEAN Algorithm Framework models;
- no OpenAI-backed typed LLM alpha committee;
- no meta-alpha to LEAN insight adapter;
- no broker write adapter that can pass live preflight.

## V1 Definition Of Done

V1 is done when all of these are true:

- `./scripts/lean-backtest aggressive_llm_momentum` succeeds locally or fails with an actionable environment error.
- LEAN result artifacts are stored under `artifacts/lean-runs/<runId>/`.
- Backend can import and list LEAN run results.
- Backend can store feature snapshots, alpha decisions, portfolio targets, execution intents, and live-pilot status.
- A paper cycle can run from imported target to filled paper plan.
- Live preflight blocks unsafe execution with explicit reasons.
- A 10 USD live pilot path exists behind hard gates.
- Real broker write calls are impossible unless explicit env flags and schema verification pass.
- Tests cover success and blocked/failure cases.

## Non-Goals For V1

- high-frequency trading;
- margin, leverage, futures, options, shorting, or derivatives;
- unrestricted autonomous broker writes;
- LLM-generated broker payloads;
- UI redesign;
- model fine-tuning as a blocker for V1;
- pretending a broker is integrated when only a mock exists.

## External Blockers

If the broker does not provide usable write credentials, schema, sandbox, or fractional/minimum-order support, the code must still complete backtest and paper execution. In that case, live pilot status must be `blocked` with a precise reason instead of faking a live order.
