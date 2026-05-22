# Risk Policy

This repository defaults to research mode.

## Blocked By Default

- Live real-money trading.
- Broker order submission.
- Direct LLM-to-order pipelines.
- Leverage, margin, options, short selling, HFT, and crypto derivatives.
- Strategy optimization that reports only the best run.

## Required Before Paper Trading

- Reproducible backtest report.
- Benchmark comparison.
- Nonzero transaction cost and slippage assumptions.
- Position-size limits.
- Drawdown response.
- Logging and alerting plan.
- Kill-switch design.
- Human approval note.

## Required Before Any Live Design

Live trading is not part of this scaffold. A future live design must be handled as a separate
architecture decision with broker constraints, tax/compliance review, capital limits, and manual
approval.
