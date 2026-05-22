from __future__ import annotations

from lincei_quant.models import BacktestResult


def render_backtest_report(result: BacktestResult) -> str:
    """Render a compact markdown report for human and agent review."""
    m = result.metrics
    limitations = "\n".join(f"- {item}" for item in result.limitations)
    return f"""# Backtest Report: {result.strategy_name}

## Summary

- Benchmark: {result.benchmark}
- Period: {result.start.date()} to {result.end.date()}
- Classification: {result.classification}

## Metrics

- CAGR: {m.cagr:.2%}
- Annualized volatility: {m.annualized_volatility:.2%}
- Sharpe: {m.sharpe:.2f}
- Max drawdown: {m.max_drawdown:.2%}
- Turnover estimate: {m.turnover:.2f}
- Trade count estimate: {m.trade_count}

## Limitations

{limitations}
"""
