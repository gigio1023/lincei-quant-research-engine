"""Score V1 feature snapshots with promoted tabular model (LightGBM or sklearn artifact)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from ml.shared.feature_schema import FEATURE_COLUMNS


def predict(model_path: Path, framework: str, snapshots: list[dict]) -> list[dict]:
    rows = []
    for snapshot in snapshots:
        features = snapshot.get("features", {})
        row = {column: float(features.get(column, 0.0)) for column in FEATURE_COLUMNS}
        row["symbol"] = snapshot["symbol"]
        rows.append(row)
    if not rows:
        return []
    frame = pd.DataFrame(rows)
    x = frame[list(FEATURE_COLUMNS)]

    if framework == "lightgbm" or str(model_path).endswith(".txt"):
        import lightgbm as lgb

        booster = lgb.Booster(model_file=str(model_path))
        raw = booster.predict(x)
    else:
        model = joblib.load(model_path)
        raw = model.predict(x)

    predictions: list[dict] = []
    for index, score in enumerate(raw):
        normalized = float(1 / (1 + pow(2.718281828, -10 * float(score))))
        predictions.append(
            {
                "symbol": frame.iloc[index]["symbol"],
                "rawScore": float(score),
                "score": normalized,
                "expectedReturnBps": float(score) * 10_000,
            }
        )
    return predictions


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    registry = payload.get("registry", {})
    framework = registry.get("framework", "lightgbm")
    model_path = Path(payload["modelPath"])
    result = predict(model_path, framework, payload.get("snapshots", []))
    json.dump({"predictions": result}, sys.stdout)
