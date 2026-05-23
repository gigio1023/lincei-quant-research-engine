"""Score symbols with downloaded jc-builds/stockprediction-ai LightGBM booster."""

from __future__ import annotations

import json
from pathlib import Path

import lightgbm as lgb
import pandas as pd

from ml.features.jc_lgb_features import (
    JC_FEATURE_COLUMNS,
    build_feature_matrix,
    load_bars_frame,
)


def _regime_decision(log_return: float, row: pd.Series, config: dict) -> dict:
    regime_rule = config.get("regime_rule", {})
    live_split = config.get("splits", {}).get("live", {})
    bull_threshold = float(regime_rule.get("bull_threshold", -0.003))
    bear_threshold = float(live_split.get("bear_threshold", -0.00125))
    spy_over_ma_200 = float(row.get("spy_over_ma_200", 0.0))
    regime = "bull" if spy_over_ma_200 > 0 else "bear"
    threshold = bull_threshold if regime == "bull" else bear_threshold
    long_signal = log_return > threshold
    return {
        "score": 1.0 if long_signal else 0.0,
        "regime": regime,
        "threshold": threshold,
        "decision": "long" if long_signal else "cash",
    }


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
        decision = _regime_decision(log_return, frame.iloc[index], config)
        predictions.append(
            {
                "symbol": str(frame.iloc[index]["symbol"]),
                "rawScore": log_return,
                "score": decision["score"],
                "expectedReturnBps": log_return * 10_000,
                "regime": decision["regime"],
                "decisionThreshold": decision["threshold"],
                "decision": decision["decision"],
            },
        )
    return predictions
