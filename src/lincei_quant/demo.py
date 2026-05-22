from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
from loguru import logger

from lincei_quant.backtest.baseline import run_equal_weight_baseline
from lincei_quant.config import BacktestConfig
from lincei_quant.logging import configure_logging
from lincei_quant.reporting.markdown import render_backtest_report


def main() -> None:
    configure_logging(Path("reports/experiments/demo.log"))
    dates = pd.bdate_range("2024-01-01", periods=260)
    rng = np.random.default_rng(7)
    returns = rng.normal(loc=0.00035, scale=0.01, size=(len(dates), 3))
    prices = pd.DataFrame(
        100 * (1 + returns).cumprod(axis=0),
        index=dates,
        columns=["SPY", "QQQ", "TLT"],
    )
    config = BacktestConfig(strategy_name="demo_equal_weight", tickers=["SPY", "QQQ", "TLT"])
    result = run_equal_weight_baseline(prices, config)
    out = Path("reports/experiments/demo_equal_weight.md")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(render_backtest_report(result))
    logger.success(f"wrote {out}")


if __name__ == "__main__":
    main()
