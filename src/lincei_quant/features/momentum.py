from __future__ import annotations

import pandas as pd


def trailing_return(prices: pd.DataFrame, window: int) -> pd.DataFrame:
    """Compute trailing percentage return without peeking forward."""
    if window <= 0:
        raise ValueError("window must be positive")
    return prices / prices.shift(window) - 1.0
