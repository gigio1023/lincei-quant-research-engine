from __future__ import annotations

import pandas as pd

from lincei_quant.backtest.baseline import run_equal_weight_baseline
from lincei_quant.config import BacktestConfig


def test_equal_weight_baseline_returns_metrics() -> None:
    dates = pd.bdate_range("2024-01-01", periods=5)
    prices = pd.DataFrame(
        {"SPY": [100, 101, 102, 101, 103], "QQQ": [50, 51, 51, 52, 53]},
        index=dates,
    )
    config = BacktestConfig(strategy_name="unit", tickers=["SPY", "QQQ"])
    result = run_equal_weight_baseline(prices, config)
    assert result.metrics.trade_count == 2
    assert result.classification == "not_live_ready"
