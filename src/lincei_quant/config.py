from __future__ import annotations

from pathlib import Path

import yaml
from pydantic import Field

from lincei_quant.models import StrictModel


class BacktestConfig(StrictModel):
    strategy_name: str
    tickers: list[str] = Field(min_length=1)
    benchmark: str = "SPY"
    rebalance: str = "monthly"
    annual_cost_bps: float = Field(default=10.0, ge=0.0)
    slippage_bps: float = Field(default=5.0, ge=0.0)
    risk_free_rate: float = 0.0


def load_backtest_config(path: Path) -> BacktestConfig:
    """Load a YAML config into a validated backtest contract."""
    data = yaml.safe_load(path.read_text()) or {}
    return BacktestConfig.model_validate(data)
