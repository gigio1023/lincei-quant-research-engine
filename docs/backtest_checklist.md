# Backtest Checklist

Before trusting any result, verify:

- No future data enters the signal.
- Universe membership is point-in-time or bias is documented.
- Costs and slippage are nonzero unless explicitly justified.
- Turnover is reported.
- Benchmark is appropriate.
- The result survives simple parameter perturbation.
- Worst month and drawdown are inspected.
- News timestamps use ingestion time, not later publication summaries.
- LLM outputs are cached and auditable if used.

Final classifications:

- `rejected`
- `educational_only`
- `needs_more_validation`
- `paper_trading_candidate`
- `not_live_ready`
