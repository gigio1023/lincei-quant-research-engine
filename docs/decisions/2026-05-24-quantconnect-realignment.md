# QuantConnect Realignment Notes

Status: decision record. The active normative rules are in [../../SPEC.md](../../SPEC.md) and `docs/spec/`.

Generated: 2026-05-24 07:07:20 UTC

## Summary

The project should be realigned from "local LEAN backtest runner" toward a QuantConnect-first autonomous alpha system. Local LEAN remains useful for fast debugging, deterministic replay, unit tests, and custom-data checks, but it should not be treated as final strategy validation artifacts. The promotion path should rely on QuantConnect Research, cloud backtests, paper/live deployment, and reconciliation.

## Core Judgment

QuantConnect is not just `lean backtest`. It is a managed quant platform around the open-source LEAN engine: Research notebooks, cloud backtests, optimization, Object Store, paper/live deployment, broker integrations, results, reports, and APIs/MCP for automation.

LEAN should own the execution runtime semantics:

- universe selection;
- alpha model execution;
- `Insight` emission;
- portfolio target construction;
- risk adjustment;
- execution behavior;
- order and fill lifecycle in backtest, paper, and live modes.

The repo should own the control plane around that runtime:

- alpha evidence and model/prompt versions;
- policy gates and approvals;
- run manifests and result imports;
- broker truth and reconciliation;
- operator dashboard and kill switch;
- LLM orchestration for research and structured alpha judgment.

## Correct Role Split

```text
QuantConnect Research
  -> feature / model / candidate alpha discovery
  -> Object Store or versioned alpha artifacts

LEAN / QuantConnect Cloud
  -> AlphaModel emits Insight
  -> PortfolioConstruction creates targets
  -> RiskManagement clips targets
  -> Execution submits orders in backtest/paper/live

Repo Control Plane
  -> imports QC run results
  -> stores evidence, manifests, approvals
  -> checks policy gates
  -> tracks broker truth / reconciliation
  -> exposes kill switch and operator surface

LLM Agents
  -> research review, event interpretation, model critique
  -> typed alpha/risk judgments only
  -> never direct broker credentials or order payloads
```

## What Local Testing Is Good For

- Unit tests for portfolio, risk, feature, and schema logic.
- Deterministic LEAN replay and fast syntax/runtime debugging.
- Custom data timestamp checks.
- Broker mock and failure-injection tests.
- Local Docker smoke tests.

Local testing is not enough for strategy promotion because data completeness, dataset licensing, Security Master access, cloud/live data differences, brokerage behavior, and operational uptime all affect real results.

## Current Repo Assessment

Good direction:

- `engines/lean/aggressive_llm_momentum` already follows the LEAN Algorithm Framework direction.
- LEAN does not call OpenAI directly, preserving backtest determinism.
- Backend acceptance gates already reject some misleading evidence such as simulator-only runs, zero insights/orders, and failed data requests.

Gaps and risks:

- Some docs still describe LEAN as missing, while code now has a LEAN skeleton.
- Static `meta_decisions.json` must not be interpreted as historical LLM alpha validation.
- QuantConnect cloud backtest/paper/live should become first-class, not optional polish.
- Toss should not be forced into QuantConnect as a native broker. If Toss remains the target, LEAN should generate targets and the backend broker adapter should own write/reconcile.
- LLM must not generate broker payloads, decide final order quantity, or access credentials.

## Product Goal Restatement

"Aggressive autonomous wealth growth" should initially mean:

- daily/hourly/swing strategies, not HFT;
- concentrated top-k exposure under hard caps;
- liquid ETFs and large caps first;
- no margin, options, futures, shorts, or unrestricted leverage in the current validation scope;
- small capital sleeves that can be scaled only after evidence;
- fail-closed automation with kill-switch and reconciliation gates.

## Proposed Roadmap

1. Update docs to reflect current reality: LEAN skeleton exists, but QuantConnect cloud validation is incomplete.
2. Add first-class commands for `lean cloud push`, `lean cloud backtest`, cloud result import, and later paper/live deployment.
3. Run full-universe validation in QuantConnect Cloud first; resolve local Security Master/data-download access only after a concrete blocker justifies the cost.
4. Stabilize numeric-only cloud backtests before LLM overlay.
5. Convert LLM alpha from static snapshot to point-in-time replay records keyed by `symbol`, `asOf`, `availableAt`, `modelVersion`, and `evidenceHash`.
6. Use QuantConnect paper live with real-time data before real-money broker writes.
7. Treat first real-money canary as a submit/cancel/fill/reconcile drill, not as performance proof.

## Things Not To Do

- Do not treat simulator, synthetic features, or local sample data as strategy validation artifacts.
- Do not call static LLM overlay backtests "LLM historical alpha".
- Do not build more dashboard surface ahead of the engine and validation loop.
- Do not let LLMs touch broker credentials, account identifiers, or raw order payloads.
- Do not interpret a small live order as production readiness.
