"""Normalize LEAN History results to a pandas DataFrame with close/volume columns."""

from typing import Any

import pandas as pd
from AlgorithmImports import Resolution, Symbol


def history_frame(
    algorithm: Any,
    symbol: Symbol,
    bar_count: int,
    resolution: Resolution = Resolution.Daily,
) -> pd.DataFrame | None:
    history = algorithm.History(symbol, bar_count, resolution)
    if history is None:
        return None

    if hasattr(history, "empty"):
        if history.empty:
            return None
        return history

    rows: list[dict[str, float]] = []
    for bar in history:
        rows.append(
            {
                "close": float(bar.Close),
                "volume": float(getattr(bar, "Volume", 0.0) or 0.0),
            },
        )
    if not rows:
        return None
    return pd.DataFrame(rows)


def insight_direction_label(direction: object) -> str:
    label = getattr(direction, "name", None)
    if label:
        return str(label).lower()
    text = str(direction)
    if "." in text:
        text = text.rsplit(".", 1)[-1]
    return text.lower()
