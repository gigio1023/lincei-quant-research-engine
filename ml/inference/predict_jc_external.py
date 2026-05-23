"""Score symbols with downloaded jc-builds/stockprediction-ai LightGBM booster."""

from __future__ import annotations

import json
import math
from pathlib import Path

import lightgbm as lgb
import pandas as pd

from ml.features.jc_lgb_features import (
    JC_FEATURE_COLUMNS,
    build_feature_matrix,
    load_bars_frame,
)


def _sigmoid_score(log_return: float) -> float:
    return float(1.0 / (1.0 + math.exp(-80.0 * log_return)))


def predict_jc(
    model_path: Path,
    config_path: Path,
    database_path: Path,
    dataset_id: str,
    symbols: list[str],
) -> list[dict]:
    config = json.loads(config_path.read_text(encoding="utf-8"))
    feature_columns: list[str] = config["feature_columns"]
    if feature_columns != list(JC_FEATURE_COLUMNS):
        feature_columns = list(JC_FEATURE_COLUMNS)

    bar_frames = load_bars_frame(database_path, dataset_id, symbols)
    frame = build_feature_matrix(bar_frames, symbols)
    if frame.empty:
        return []

    booster = lgb.Booster(model_file=str(model_path))
    matrix = frame[feature_columns].astype(float)
    raw_predictions = booster.predict(matrix)

    predictions: list[dict] = []
    for index, raw in enumerate(raw_predictions):
        log_return = float(raw)
        predictions.append(
            {
                "symbol": str(frame.iloc[index]["symbol"]),
                "rawScore": log_return,
                "score": _sigmoid_score(log_return),
                "expectedReturnBps": log_return * 10_000,
            },
        )
    return predictions
