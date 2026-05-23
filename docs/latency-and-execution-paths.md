# Latency and Execution Paths

## Strategy Fit

This project is not an HFT or market-making system. LLMs and Lean backtests introduce seconds-to-minutes of latency, which is appropriate for aggressive swing, daily, hourly, and selective intraday strategies.

| Strategy type | Typical latency budget | Fit |
|---|---:|---|
| HFT / market making | microseconds to milliseconds | No |
| tick scalping | milliseconds to 1s | No |
| 1m to 15m intraday | 5s to 60s | Limited |
| hourly / 4h rebalance | 30s to 5m | Good |
| daily / swing | minutes to hours | Best |
| risk-off / stop | seconds | Good through fast path |

## Fast Path

Purpose: execute already-validated rules quickly.

No LLM calls.

Typical actions:

- stop-loss;
- volatility spike de-risk;
- max drawdown cut;
- stale data halt;
- existing numeric alpha continuation;
- broker cancel/flatten emergency.

Expected latency:

```text
feature refresh:      0.5s to 5s
LEAN/rule decision:   <1s to 5s
risk gate:            <1s
broker order/cancel:  broker dependent, often <1s to 3s
```

Target: 5 to 30 seconds end to end for non-HFT actions.

## Slow Path

Purpose: high-context alpha decisions.

Uses LLM committee plus numeric features.

Typical actions:

- new position;
- large position increase;
- event-driven entry;
- strategy variant selection;
- trade abstention after conflicting signals.

Expected latency:

```text
data retrieval:       5s to 30s
feature snapshot:     1s to 10s
parallel LLM roles:   10s to 90s
final trader:         5s to 30s
meta alpha + risk:    <5s
optional Lean check:  10s to several minutes
```

Target: 1 to 5 minutes for routine slow-path decisions.

## Research Path

Purpose: model creation, training, backtest sweeps, and promotion review.

Expected latency:

```text
data build:            minutes to hours
model training:        minutes to hours
Lean backtest sweep:   minutes to hours
LLM review:            minutes
promotion decision:    seconds after evidence exists
```

Target: not latency-sensitive. Optimize for correctness, provenance, and reproducibility.

## Path Selection

Use fast path when:

- the action reduces risk;
- the alpha rule is already validated;
- the market window is short;
- LLM evidence is not needed.

Use slow path when:

- capital exposure increases;
- the decision depends on news, filings, macro, or conflicting evidence;
- the model wants to override a numeric signal;
- the trade is concentrated.

Use research path when:

- a new strategy is generated;
- a model is retrained;
- parameters change materially;
- live promotion is requested.

## Observability

Record latency for every decision:

- data retrieval latency;
- LLM role latency;
- Lean run latency;
- risk gate latency;
- broker submit/cancel latency;
- total decision latency;
- path type: fast, slow, or research.

The dashboard should show latency because stale decisions are a trading risk.
