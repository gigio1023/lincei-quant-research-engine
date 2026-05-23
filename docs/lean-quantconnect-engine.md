# LEAN and QuantConnect Engine

## Role In This Project

LEAN is the trading engine. The control plane should not reimplement a full trading engine in NestJS. LEAN should own:

- algorithm lifecycle;
- universe selection;
- alpha generation;
- portfolio target construction;
- risk model application;
- execution model behavior;
- backtest, paper, and live runtime semantics.

The NestJS control plane owns policy, ledgers, approvals, broker credentials boundary, and operator visibility.

## Algorithm Framework Mapping

QuantConnect's Algorithm Framework is built around these strategy modules:

| LEAN model | Project role |
|---|---|
| `UniverseSelectionModel` | Select tradable assets for the current strategy |
| `AlphaModel` | Emit `Insight` objects from numeric and LLM alpha decisions |
| `PortfolioConstructionModel` | Convert insights into target weights or quantities |
| `RiskManagementModel` | Cut or liquidate targets that violate risk constraints |
| `ExecutionModel` | Convert adjusted targets into orders |

Official docs describe these as the core modules of Algorithm Framework: https://www.quantconnect.com/docs/v1/algorithm-framework/overview

## Required First Algorithm

Name: `aggressive_llm_momentum`

Purpose: prove the full executable path.

Model composition:

- Universe: liquid ETFs and highly liquid equities first; expand later.
- Numeric alpha: momentum, trend, volatility, liquidity, and drawdown features.
- LLM alpha: typed event/fundamental/macro decision overlay.
- Meta alpha: combine numeric and LLM scores into final `AlphaDecision`.
- Portfolio construction: top-k concentration with volatility targeting and caps.
- Risk management: max drawdown, exposure, single-name, volatility spike, and stale-data cuts.
- Execution: immediate execution for backtest/paper first; broker-aware execution later.

## Lean CLI Integration

Use Lean CLI for local backtests. The key command shape is:

```bash
lean backtest "aggressive_llm_momentum" --output ./results/backtest-001
```

Lean CLI local backtests run in Docker and write result files to an output directory. The orchestration layer should:

1. create a run directory;
2. write strategy parameters;
3. call `lean backtest`;
4. capture stdout/stderr;
5. hash source, config, input data, and result artifacts;
6. ingest the result into the control-plane research ledger.

Official docs: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-backtest

## QuantConnect MCP / Cloud Role

QuantConnect MCP can let agents update projects, write strategies, run backtests, and deploy strategies through QuantConnect APIs. Use it as an optional cloud accelerator, not as the only runtime.

Expected uses:

- remote syntax checks;
- cloud backtests with QuantConnect data;
- strategy iteration by Codex/Claude agents;
- cloud report retrieval;
- later live deployment experiments.

Official MCP repo/docs: https://github.com/QuantConnect/mcp-server

## Result Contract

Every LEAN run should export:

```ts
type LeanRunResult = {
  runId: string;
  projectName: string;
  algorithmVersion: string;
  parameters: Record<string, string | number | boolean>;
  startedAt: string;
  completedAt: string;
  status: "passed" | "failed";
  resultDirectory: string;
  sourceHash: string;
  configHash: string;
  dataManifestHash: string;
  statistics: Record<string, string | number>;
  equityCurveRef?: string;
  orderEventsRef?: string;
  logsRef?: string;
  blockerReasons: string[];
};
```

## Acceptance Criteria

- `lean backtest` runs from a repo command.
- The first algorithm produces at least one backtest result artifact.
- The backend can ingest a LEAN result as a research run.
- The dashboard shows LEAN run status, alpha decisions, portfolio targets, and blockers.
- Existing deterministic baseline is marked fallback-only.
