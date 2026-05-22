# Architecture

The repository is split into small modules so agents can modify one contract at a time.

## Planes

- `src/lincei_quant/data`: loaders and data quality checks.
- `src/lincei_quant/news`: timestamped news/event schemas and aggregation.
- `src/lincei_quant/llm`: provider boundaries; no provider is enabled by default.
- `src/lincei_quant/features`: point-in-time feature functions.
- `src/lincei_quant/backtest`: baseline engines and metrics.
- `src/lincei_quant/risk`: execution gates and risk rules.
- `src/lincei_quant/reporting`: markdown reports for human review.

## Design Rules

- Pydantic models define domain contracts.
- Loguru is configured once at CLI boundaries.
- Strategy logic should not load data directly.
- Backtests should return explicit metrics and limitations.
- Execution code must call risk gates before any paper/live path.

## Extension Path

1. Add a config under `configs/strategies/`.
2. Add or reuse feature functions.
3. Add a small backtest adapter.
4. Add tests for timestamp alignment and leakage.
5. Write a report under `reports/experiments/`.
