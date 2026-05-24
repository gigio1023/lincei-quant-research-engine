# System Architecture

Status: archived and superseded. This file is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

## Core Runtime Flow

```text
Data Ingestion
  -> Feature Store
  -> Numeric Alpha
  -> LLM Alpha Committee
  -> Meta Alpha
  -> LEAN Algorithm Framework
  -> Portfolio Targets
  -> Risk Management
  -> Paper/Broker Execution
  -> Reconciliation
  -> Review And Learning
```

## Runtime Ownership

| Layer | Owner | V1 responsibility |
|---|---|---|
| Market data | Backend + LEAN local data | Provide OHLCV bars with availability timestamps |
| News data | Backend + LLM input builder | Provide evidence snippets and hashes |
| Feature store | Backend/Python jobs | Persist deterministic feature snapshots |
| Numeric alpha | Python/LEAN | Emit fast, reproducible alpha scores |
| LLM alpha | NestJS OpenAI service | Emit structured alpha decisions with evidence |
| Meta alpha | Backend + LEAN adapter | Combine alpha sources into final decisions |
| LEAN | `engines/lean` | Run backtests and generate insights/targets/orders |
| Control plane | NestJS | Store evidence, policy, execution intents, reconciliation |
| Broker adapter | Backend isolated package/module | Submit/cancel/poll only after live preflight |
| Dashboard | React | Observe only; do not become the primary implementation |

## Target Directory Shape

```text
engines/
  lean/
    aggressive_llm_momentum/
      main.py
      config.json
      alpha/
      portfolio/
      risk/
      export/
scripts/
  lean-backtest
  import-lean-run
  run-alpha-cycle
  run-paper-cycle
  live-preflight
  live-pilot-10usd
backend/src/modules/
  alpha/
  lean-runs/
  broker-adapter/
  live-pilot/
ml/
  features/
  training/
  registry/
artifacts/
  lean-runs/
  alpha-decisions/
  model-registry/
```

If existing module boundaries make different names easier, keep the same responsibilities and document the final paths in the PR.

## LEAN Boundary

LEAN owns strategy semantics:

- universe selection;
- alpha model outputs as `Insight`;
- portfolio construction;
- risk model adjustment;
- execution model behavior in backtest/paper contexts.

The NestJS control plane owns:

- policy and gates;
- API and durable ledgers;
- OpenAI orchestration;
- broker credential boundary;
- live-pilot preflight;
- reconciliation evidence.

## Broker Boundary

Broker write code must be isolated:

- no LLM imports;
- no prompt text;
- no frontend credentials;
- no arbitrary order payload accepted from a caller;
- only approved execution intents or signed order plans;
- idempotent submit/cancel/flatten operations.

## Fast, Slow, And Research Paths

Fast path:

- numeric alpha only;
- no LLM call;
- used for stops, de-risking, stale data, flatten, and kill-switch handling.

Slow path:

- numeric alpha plus LLM committee;
- used for new exposure, concentration increases, and event-driven decisions.

Research path:

- backtests, feature export, training, walk-forward validation, and model promotion.
