# QuantConnect And LEAN Runtime

Status: active normative spec.

## Role Split

LEAN owns executable strategy semantics:

- universe selection;
- alpha model execution;
- `Insight` emission;
- portfolio target construction;
- risk management;
- execution behavior in backtest, paper, and later live modes;
- order and fill lifecycle inside the algorithm runtime.

The repo control plane owns orchestration and evidence:

- user intent and run manifests;
- LLM feature jobs and prompt/model versions;
- cloud/local run commands;
- result import;
- acceptance gates;
- paper/live-shadow ledgers;
- broker-boundary state;
- reconciliation and operator visibility.

## QuantConnect Cloud Is Promotion Runtime

Local LEAN is required, but it is not enough for promotion. Strategy promotion needs QuantConnect Cloud evidence when credentials and account tier allow it.

Local LEAN is valid for:

- syntax and runtime debugging;
- deterministic replay;
- custom-data parser checks;
- fast strategy smoke tests;
- unit tests around LEAN-adjacent modules;
- verifying that the repo can run in Linux ARM with Docker/Podman.

QuantConnect Cloud is required for:

- promotion backtests with platform data;
- cloud project compile checks;
- cloud backtest result import;
- paper or live-shadow deployment evidence;
- Research/Object Store workflows that rely on QuantConnect-managed environment behavior.

## Algorithm Framework Shape

Use QuantConnect's Algorithm Framework as the normal strategy structure:

| LEAN model                   | Project responsibility                                              |
| ---------------------------- | ------------------------------------------------------------------- |
| `UniverseSelectionModel`     | choose the tradable liquid universe                                 |
| `AlphaModel`                 | convert numeric and LLM alpha features into `Insight` objects       |
| `PortfolioConstructionModel` | convert insights into target weights under concentration rules      |
| `RiskManagementModel`        | clip or liquidate targets that violate risk policy                  |
| `ExecutionModel`             | translate adjusted targets into runtime orders in the selected mode |

The control plane must not reimplement these LEAN runtime responsibilities in NestJS.

## Research And Object Store

QuantConnect Research is the preferred place to prototype candidate features and inspect data availability. Research outputs that feed LEAN must become versioned artifacts, not notebook-only assumptions.

Use Object Store or a custom-data archive for:

- point-in-time LLM alpha features;
- model artifacts;
- feature manifests;
- strategy parameters;
- replay fixtures shared between Research, backtest, and paper/live-shadow modes.

Every artifact needs a version, source hash, creation time, and availability time when it can affect alpha.

## API, CLI, And MCP Usage

Use the LEAN CLI and QuantConnect API/MCP as platform automation, not as an opaque replacement for repo evidence.

Expected automation:

- push or synchronize the LEAN project;
- run cloud compile/backtest jobs;
- read backtest statistics, orders, charts, and insights through the QuantConnect REST API;
- upload/read Object Store artifacts;
- later start/stop paper or live-shadow deployments if the spec allows it.

Every cloud action must produce a local run record. The record must include command/API call, project id or name, backtest id if available, source hash, parameter hash, artifact refs, status, and blocker reasons.

Cloud command success is not strategy-promotion evidence by itself. Promotion requires imported result artifacts from QuantConnect API endpoints such as `/backtests/read`, `/backtests/read/insights`, and `/backtests/orders/read`, then the same local strategy-evidence acceptance gates.

## Required Run Contract

```ts
type LeanRunResult = {
  runId: string;
  runtime: "local-lean" | "quantconnect-cloud";
  mode: "backtest" | "paper" | "live-shadow";
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt?: string;
  status: "passed" | "failed" | "blocked";
  sourceHash: string;
  configHash: string;
  dataManifestHash?: string;
  statistics: Record<string, string | number>;
  insightsRef?: string;
  ordersRef?: string;
  fillsRef?: string;
  equityCurveRef?: string;
  logsRef?: string;
  blockerReasons: string[];
};
```

Simulator records may satisfy plumbing tests only. They must never be labeled as strategy promotion or broker readiness evidence.

## References

- Algorithm Framework overview: https://www.quantconnect.com/docs/v2/writing-algorithms/algorithm-framework/overview
- QuantConnect Research Environment: https://www.quantconnect.com/docs/v2/research-environment
- Object Store docs: https://www.quantconnect.com/docs/v2/writing-algorithms/object-store
- Importing data key concepts: https://www.quantconnect.com/docs/v2/writing-algorithms/importing-data/key-concepts
- QuantConnect API reference: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference
- Read Backtest statistics: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/backtest-statistics
- Read Backtest insights: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/insights
- Read Backtest orders: https://www.quantconnect.com/docs/v2/cloud-platform/api-reference/backtest-management/read-backtest/orders
- LEAN CLI cloud backtest: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-cloud-backtest
