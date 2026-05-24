# LEAN Alpha Implementation

Status: archived and superseded. This file is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

## First Algorithm

Project name:

```text
aggressive_llm_momentum
```

Location:

```text
engines/lean/aggressive_llm_momentum
```

V1 universe:

```text
SPY, QQQ, IWM, TLT, GLD
```

This universe is intentionally small and liquid so the first implementation proves the engine loop instead of spending time on universe complexity.

## Algorithm Framework Models

Use LEAN Algorithm Framework:

- `ManualUniverseSelectionModel` or equivalent fixed universe model;
- `LinceiNumericAlphaModel`;
- `LinceiMetaAlphaModel` or a single alpha model that reads meta decisions;
- `AggressiveTopKPortfolioConstructionModel`;
- `LinceiRiskManagementModel`;
- `ImmediateExecutionModel` for backtest and paper V1.

## Numeric Alpha V1

Feature score:

```text
numeric_score =
  rank(return_63d)
+ rank(return_126d)
+ trend_bonus(price > sma_200d)
- volatility_penalty(realized_vol_20d)
- drawdown_penalty(drawdown_63d)
- liquidity_penalty(low dollar_volume_20d)
```

Decision mapping:

- score >= 0.65 -> `up`;
- score <= 0.35 -> `flat` for V1, not short;
- no shorting in V1;
- confidence should be calibrated from score distance and feature completeness.

## LLM Alpha V1

The LLM committee runs outside LEAN and writes validated `AlphaDecision` records. LEAN can consume the latest approved meta decisions from a JSON file generated before the backtest.

Do not call OpenAI from inside the LEAN algorithm in V1. This keeps backtests replayable and avoids network nondeterminism.

## Meta Alpha V1

Recommended combiner:

```text
final_score =
  0.50 * numeric_score
+ 0.25 * llm_event_score
+ 0.15 * llm_macro_score
+ 0.10 * llm_risk_adjustment
```

Conflict rule:

- numeric strong up + LLM flat -> reduce max position by 50%;
- numeric flat + LLM up -> require backtest or paper-only;
- risk reviewer high risk -> cap at 2% for live pilot;
- missing LLM -> numeric-only fast path allowed for backtest/paper, but live new exposure requires explicit policy.

## Portfolio Construction

V1 aggressive but capped:

- top 1 to 2 assets by meta score;
- max paper single-name target: configurable, default 35%;
- max live pilot notional: 10 USD total;
- volatility targeting for paper/backtest;
- no leverage;
- no margin;
- no shorting.

## Risk Model

Risk model must cut targets when:

- data is stale;
- drawdown breach occurs;
- volatility spike exceeds policy;
- target would exceed single-name cap;
- gross exposure exceeds cap;
- kill switch is tripped;
- broker reconciliation has mismatch.

## Required Scripts

```bash
./scripts/lean-backtest aggressive_llm_momentum
./scripts/import-lean-run latest
./scripts/run-alpha-cycle
./scripts/run-paper-cycle
```

Scripts should fail with useful messages when Lean CLI, Docker, data, or env prerequisites are missing.
