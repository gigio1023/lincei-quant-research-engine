# LEAN And QuantConnect Engine

Status: supporting design. The normative runtime spec is [spec/01-quantconnect-lean-runtime.md](spec/01-quantconnect-lean-runtime.md).

## Role In This Project

LEAN is the strategy runtime. The control plane should not reimplement a full trading engine in NestJS.

LEAN owns:

- algorithm lifecycle;
- universe selection;
- alpha generation;
- `Insight` emission;
- portfolio target construction;
- risk model application;
- execution behavior in backtest, paper, and future approved modes.

The NestJS control plane owns:

- orchestration;
- policy and ledgers;
- LLM feature jobs;
- run manifests and result import;
- broker credential boundary;
- reconciliation;
- operator visibility.

## QuantConnect Cloud Posture

QuantConnect Cloud is not optional polish. It is the preferred promotion runtime when credentials, account tier, and dataset access allow it.

Local LEAN is still required for:

- fast debugging;
- deterministic replay;
- custom-data checks;
- Docker/Podman smoke tests;
- Linux ARM portability checks.

Local simulator and sample-data results prove plumbing only. They must not be described as strategy promotion evidence.

## Algorithm Framework Mapping

Use QuantConnect's Algorithm Framework as the normal strategy boundary:

| LEAN model                   | Project role                                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| `UniverseSelectionModel`     | Select tradable assets for the current strategy                   |
| `AlphaModel`                 | Emit `Insight` objects from numeric and LLM alpha decisions       |
| `PortfolioConstructionModel` | Convert insights into target weights or quantities                |
| `RiskManagementModel`        | Cut or liquidate targets that violate risk constraints            |
| `ExecutionModel`             | Convert adjusted targets into runtime orders in the selected mode |

Official docs: https://www.quantconnect.com/docs/v2/writing-algorithms/algorithm-framework/overview

## Required First Algorithm

Name: `aggressive_llm_momentum`

Purpose: prove the executable alpha-validation path.

Model composition:

- Universe: liquid ETFs and highly liquid equities first; expand later.
- Numeric alpha: momentum, trend, volatility, liquidity, and drawdown features.
- LLM alpha: point-in-time event, filing, macro, and risk features.
- Meta alpha: combine numeric and LLM signals into final `AlphaDecision`.
- Portfolio construction: top-k concentration with volatility targeting and caps.
- Risk management: max drawdown, exposure, single-name, volatility spike, and stale-data cuts.
- Execution: backtest/paper/live-shadow only under the active spec.

## Lean CLI Integration

Use Lean CLI for local runs. The repo wrapper should own paths and metadata:

```bash
./scripts/lean-backtest aggressive_llm_momentum
./scripts/import-lean-run latest
./scripts/qc-cloud-backtest aggressive_llm_momentum --push
./scripts/qc-object-store-sync lincei/llm-features/latest.json
./scripts/run-local-strategy-smoke
./scripts/run-paper-replay
./scripts/run-live-shadow
./scripts/run-learning-loop
```

The orchestration layer should:

1. create a run directory;
2. write strategy parameters;
3. call Lean CLI or record a blocked status;
4. capture stdout/stderr;
5. hash source, config, input data, and result artifacts;
6. ingest the result into the control-plane research ledger;
7. label simulator or flow-validation runs as plumbing evidence only.

Official docs: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-backtest

## QuantConnect API / CLI / MCP Role

Use QuantConnect API, CLI, and MCP to automate platform workflows:

- project sync or push;
- cloud compile checks;
- cloud backtests with QuantConnect data;
- result/statistics/order/insight retrieval;
- Object Store artifact upload/read;
- paper or live-shadow deployment when spec-approved.

Every cloud action must create a local evidence record with source hash, parameter hash, cloud ids, artifact refs, status, and blockers.

Current repo wrappers record QuantConnect Cloud credential, paid-tier, project-lock, dataset, and REST result-import blockers as `blocked` evidence instead of treating policy/account access as a crash.

Official docs:

- API reference: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference
- Read Backtest statistics: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/backtest-statistics
- Read Backtest insights: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/insights
- Read Backtest orders: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/orders
- Cloud backtest CLI: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-cloud-backtest
- MCP server: https://github.com/QuantConnect/mcp-server

## Acceptance Criteria

- local LEAN run works from a repo command or records an actionable blocker;
- QuantConnect Cloud backtest/import is first-class when account access allows it;
- result artifacts are hashed and imported;
- simulator evidence is visibly separated from strategy evidence;
- dashboard and ledgers show run status, alpha decisions, portfolio targets, risk cuts, and blockers.
