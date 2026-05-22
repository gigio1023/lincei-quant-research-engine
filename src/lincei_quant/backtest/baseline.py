from __future__ import annotations

from datetime import datetime

import pandas as pd
from loguru import logger

from lincei_quant.backtest.metrics import performance_metrics
from lincei_quant.config import BacktestConfig
from lincei_quant.models import BacktestResult


def equal_weight_returns(prices: pd.DataFrame, tickers: list[str]) -> pd.Series:
    """Compute simple equal-weight daily returns from adjusted close prices."""
    missing = sorted(set(tickers) - set(prices.columns))
    if missing:
        raise ValueError(f"missing price columns: {missing}")
    returns = prices[tickers].pct_change().dropna(how="all")
    return returns.mean(axis=1)


def run_equal_weight_baseline(prices: pd.DataFrame, config: BacktestConfig) -> BacktestResult:
    """Run a compact baseline; replace with a richer engine after contracts stabilize."""
    logger.bind(strategy=config.strategy_name).info("running equal-weight baseline")
    strategy_returns = equal_weight_returns(prices, config.tickers)
    drag = (config.annual_cost_bps + config.slippage_bps) / 10_000 / 252
    net_returns = strategy_returns - drag
    metrics = performance_metrics(
        net_returns,
        risk_free_rate=config.risk_free_rate,
        turnover=1.0 if config.rebalance == "monthly" else 0.25,
        trade_count=len(config.tickers),
    )
    return BacktestResult(
        strategy_name=config.strategy_name,
        benchmark=config.benchmark,
        start=_as_datetime(net_returns.index.min()),
        end=_as_datetime(net_returns.index.max()),
        metrics=metrics,
        limitations=[
            "synthetic/simple baseline engine",
            "no corporate actions, taxes, or liquidity model",
            "not a trading recommendation",
        ],
    )


def _as_datetime(value: object) -> datetime:
    return pd.Timestamp(value).to_pydatetime()
