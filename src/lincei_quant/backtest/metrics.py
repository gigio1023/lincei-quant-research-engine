from __future__ import annotations

import math

import pandas as pd

from lincei_quant.models import PerformanceMetrics

TRADING_DAYS = 252


def equity_curve(returns: pd.Series) -> pd.Series:
    """Convert period returns into a normalized equity curve."""
    clean = returns.fillna(0.0)
    return (1.0 + clean).cumprod()


def max_drawdown(equity: pd.Series) -> float:
    peak = equity.cummax()
    drawdown = equity / peak - 1.0
    return float(drawdown.min())


def performance_metrics(
    returns: pd.Series,
    *,
    risk_free_rate: float = 0.0,
    turnover: float = 0.0,
    trade_count: int = 0,
) -> PerformanceMetrics:
    if returns.empty:
        raise ValueError("returns must not be empty")
    eq = equity_curve(returns)
    years = max(len(returns) / TRADING_DAYS, 1 / TRADING_DAYS)
    cagr = float(eq.iloc[-1] ** (1 / years) - 1)
    vol = float(returns.std(ddof=0) * math.sqrt(TRADING_DAYS))
    excess = returns.mean() * TRADING_DAYS - risk_free_rate
    sharpe = float(excess / vol) if vol else 0.0
    return PerformanceMetrics(
        cagr=cagr,
        annualized_volatility=vol,
        sharpe=sharpe,
        max_drawdown=max_drawdown(eq),
        turnover=turnover,
        trade_count=trade_count,
    )
