"""Route inference to external JC LightGBM or legacy local v1 feature model."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import pandas as pd

from ml.inference.predict_jc_external import predict_jc
from ml.security.verify_artifact import sha256_file
from ml.shared.feature_schema import FEATURE_COLUMNS

LOCAL_ONLY_SOURCE = "local-train"
JOBlib_SUFFIXES = (".joblib", ".pkl", ".pickle")


def verify_model_hash(model_path: Path, expected_hash: str) -> None:
    if not expected_hash:
        raise ValueError("Registry missing modelHash")
    if not expected_hash.startswith("sha256:"):
        raise ValueError(f"Invalid modelHash format: {expected_hash}")
    actual_hash = f"sha256:{sha256_file(model_path)}"
    if actual_hash != expected_hash:
        raise ValueError(f"Model hash mismatch: expected {expected_hash}, got {actual_hash}")


def _is_joblib_artifact(model_path: Path) -> bool:
    return model_path.suffix.lower() in JOBlib_SUFFIXES


def predict_v1_local(
    model_path: Path,
    framework: str,
    snapshots: list[dict],
    source: str | None = None,
) -> list[dict]:
    if source == "external-download" and _is_joblib_artifact(model_path):
        raise ValueError("External-download models cannot use joblib/pickle artifacts")

    rows = []
    for snapshot in snapshots:
        features = snapshot.get("features", {})
        row = {column: float(features.get(column, 0.0)) for column in FEATURE_COLUMNS}
        row["symbol"] = snapshot["symbol"]
        rows.append(row)
    if not rows:
        return []
    frame = pd.DataFrame(rows)
    feature_matrix = frame[list(FEATURE_COLUMNS)]

    if framework == "lightgbm" or str(model_path).endswith(".txt"):
        import lightgbm as lgb

        booster = lgb.Booster(model_file=str(model_path))
        raw = booster.predict(feature_matrix)
    elif source == "external-download":
        raise ValueError("External-download models require LightGBM text booster format")
    elif _is_joblib_artifact(model_path):
        if source not in (LOCAL_ONLY_SOURCE, None):
            raise ValueError(
                f"joblib/pickle artifacts are local-only (source={source!r}); "
                "external-download models are not allowed.",
            )
        model = joblib.load(model_path)
        raw = model.predict(feature_matrix)
    else:
        raise ValueError(f"Unsupported artifact format: {model_path}")

    predictions: list[dict] = []
    for index, score in enumerate(raw):
        normalized = float(1 / (1 + pow(2.718281828, -10 * float(score))))
        predictions.append(
            {
                "symbol": frame.iloc[index]["symbol"],
                "rawScore": float(score),
                "score": normalized,
                "expectedReturnBps": float(score) * 10_000,
            },
        )
    return predictions


if __name__ == "__main__":
    payload = json.load(sys.stdin)
    registry = payload.get("registry", {})
    framework = registry.get("framework", "lightgbm")
    model_path = Path(payload["modelPath"])
    source = registry.get("source")

    verify_model_hash(model_path, registry.get("modelHash", ""))

    if framework == "jc-stockprediction-lgb":
        config_path = Path(payload["configPath"])
        database_path = Path(payload["databasePath"])
        dataset_id = payload.get("datasetId", "v1-lean-universe")
        symbols = payload.get("symbols", [])
        result = predict_jc(model_path, config_path, database_path, dataset_id, symbols)
    else:
        result = predict_v1_local(model_path, framework, payload.get("snapshots", []), source=source)

    json.dump({"predictions": result}, sys.stdout)
