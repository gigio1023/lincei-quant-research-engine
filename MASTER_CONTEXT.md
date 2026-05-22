# Master Context

This project combines four layers:

1. Quant substrate: local Python first, with future compatibility for QuantConnect/LEAN or another
   mature backtesting engine.
2. Agent workflow layer: Codex and Claude Code perform implementation, review, research planning,
   report writing, and skeptical audits.
3. News/event intelligence layer: LLMs extract structured events from timestamped market text, but
   outputs remain research context until validated out of sample.
4. Risk and governance layer: no live trading by default, no direct LLM trading, and no weakening of
   safety gates without explicit human approval.

## Initial Phase

Phase 1 is intentionally small:

- Baseline strategy configs.
- Backtest metrics.
- News/event schemas.
- Timestamp alignment tests.
- Skeptical review workflow.
- Durable experiment reports.

## Validation Standard

Every strategy must name its hypothesis, universe, signal, benchmark, cost assumptions, slippage
assumptions, risk limits, failure modes, and final classification.

Accepted classifications:

- `rejected`
- `educational_only`
- `needs_more_validation`
- `paper_trading_candidate`
- `not_live_ready`

No strategy should be called live-ready inside this repository's default scope.
