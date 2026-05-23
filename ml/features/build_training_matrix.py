"""Build tabular (X, y) from SQLite market_data_bars or a reproducible synthetic set."""

from __future__ import annotations

import math
import sqlite3
from pathlib import Path

import numpy as np
import pandas as pd

from ml.shared.feature_schema import FEATURE_COLUMNS, HORIZON_DAYS, UNIVERSE


def _compute_row_features(closes: list[float], volumes: list[float]) -> dict[str, float] | None:
    if len(closes) < 30:
        return None
    latest = closes[-1]
    return_for = lambda lookback: (
        0.0
        if closes[max(0, len(closes) - 1 - lookback)] == 0
        else latest / closes[max(0, len(closes) - 1 - lookback)] - 1
    )
    daily_returns = [
        0.0 if closes[i - 1] == 0 else closes[i] / closes[i - 1] - 1
        for i in range(max(1, len(closes) - 21), len(closes))
    ]
    mean = sum(daily_returns) / max(len(daily_returns), 1)
    variance = sum((value - mean) ** 2 for value in daily_returns) / max(
        len(daily_returns), 1
    )
    sma200 = sum(closes[-200:]) / max(min(len(closes), 200), 1)
    peak = max(closes[-63:])
    drawdown = 0.0 if peak == 0 else latest / peak - 1
    dollar_volume = sum(
        closes[-i] * (volumes[-i] if i <= len(volumes) else 0.0) for i in range(1, 21)
    ) / max(min(len(closes), 20), 1)
    return {
        "return_20d": return_for(20),
        "return_63d": return_for(63),
        "return_126d": return_for(126),
        "realized_vol_20d": math.sqrt(variance * 252),
        "drawdown_63d": drawdown,
        "price_vs_sma_200d": latest / sma200 if sma200 else 1.0,
        "dollar_volume_20d": dollar_volume,
        "market_regime_score": 0.5 + return_for(63) * 2,
    }


def build_from_sqlite(database_path: Path) -> pd.DataFrame:
    conn = sqlite3.connect(database_path)
    rows: list[dict[str, float | str]] = []
    for symbol in UNIVERSE:
        cursor = conn.execute(
            """
            SELECT timestamp, close, COALESCE(volume, 0)
            FROM market_data_bars
            WHERE symbol = ?
            ORDER BY timestamp ASC
            """,
            (symbol,),
        )
        series = cursor.fetchall()
        if len(series) < HORIZON_DAYS + 130:
            continue
        closes = [float(item[1]) for item in series]
        volumes = [float(item[2]) for item in series]
        for index in range(130, len(closes) - HORIZON_DAYS):
            window_closes = closes[: index + 1]
            window_volumes = volumes[: index + 1]
            features = _compute_row_features(window_closes, window_volumes)
            if features is None:
                continue
            forward_base = closes[index]
            forward_end = closes[index + HORIZON_DAYS]
            label = 0.0 if forward_base == 0 else forward_end / forward_base - 1
            rows.append({"symbol": symbol, "label_forward_return_21d": label, **features})
    conn.close()
    return pd.DataFrame(rows)


def build_synthetic(seed: int = 42, rows_per_symbol: int = 400) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows: list[dict[str, float | str]] = []
    for symbol in UNIVERSE:
        for _ in range(rows_per_symbol):
            features = {
                key: float(rng.normal(0, 0.05) if "return" in key else rng.uniform(0.8, 1.2))
                for key in FEATURE_COLUMNS
            }
            label = (
                0.35 * features["return_63d"]
                + 0.2 * features["return_126d"]
                - 0.15 * features["realized_vol_20d"]
                + 0.1 * (features["price_vs_sma_200d"] - 1)
                + rng.normal(0, 0.02)
            )
            rows.append({"symbol": symbol, "label_forward_return_21d": label, **features})
    return pd.DataFrame(rows)


def load_training_frame(database_path: Path | None) -> tuple[pd.DataFrame, str]:
    if database_path and database_path.exists():
        frame = build_from_sqlite(database_path)
        if len(frame) >= 200:
            return frame, "sqlite-market_data_bars"
    return build_synthetic(), "synthetic-v1"
