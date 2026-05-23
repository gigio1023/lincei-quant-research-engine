"""
Train tabular alpha baseline: LightGBM when available, else sklearn HistGradientBoosting.

QuantConnect community alphas commonly use gradient boosted trees on momentum/vol features.
Target: 21-day forward return. Heuristic scoring is not written to registry from this script.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error

from ml.features.build_training_matrix import load_training_frame
from ml.shared.feature_schema import FEATURE_COLUMNS

MODEL_NAME = "tabular-forward-return-21d-v1"
PROMOTE_MIN_DIRECTIONAL_ACCURACY = 0.52

try:
    import lightgbm as lgb

    LIGHTGBM_AVAILABLE = True
except OSError:
    LIGHTGBM_AVAILABLE = False


def walk_forward_score(frame: pd.DataFrame, folds: int = 3) -> dict[str, float]:
    frame = frame.sort_values(by=["symbol"]).reset_index(drop=True)
    fold_size = max(len(frame) // (folds + 1), 50)
    accuracies: list[float] = []
    mses: list[float] = []
    for fold in range(folds):
        train_end = fold_size * (fold + 1)
        val_end = min(train_end + fold_size, len(frame))
        if val_end <= train_end + 10:
            continue
        train = frame.iloc[:train_end]
        val = frame.iloc[train_end:val_end]
        model, _ = _fit_model(train)
        predictions = _predict(model, val[list(FEATURE_COLUMNS)])
        labels = val["label_forward_return_21d"].to_numpy()
        mses.append(float(mean_squared_error(labels, predictions)))
        accuracies.append(_directional_accuracy(labels, predictions))
    return {
        "mse": float(np.mean(mses)) if mses else 1.0,
        "directionalAccuracy": float(np.mean(accuracies)) if accuracies else 0.0,
        "walkForwardFolds": float(len(accuracies)),
    }


def _directional_accuracy(labels: np.ndarray, predictions: np.ndarray) -> float:
    label_sign = np.sign(labels)
    pred_sign = np.sign(predictions)
    mask = label_sign != 0
    if not mask.any():
        return 0.5
    return float((label_sign[mask] == pred_sign[mask]).mean())


def _fit_model(train: pd.DataFrame) -> tuple[object, str]:
    x = train[list(FEATURE_COLUMNS)]
    y = train["label_forward_return_21d"]
    if LIGHTGBM_AVAILABLE:
        model = lgb.LGBMRegressor(
            objective="regression",
            n_estimators=120,
            learning_rate=0.05,
            num_leaves=31,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
        ).fit(x, y)
        return model, "lightgbm"
    model = HistGradientBoostingRegressor(
        max_depth=6,
        learning_rate=0.06,
        max_iter=180,
        random_state=42,
    ).fit(x, y)
    return model, "sklearn-hist-gradient-boosting"


def _predict(model: object, features: pd.DataFrame) -> np.ndarray:
    if LIGHTGBM_AVAILABLE and hasattr(model, "predict"):
        return np.asarray(model.predict(features))
    return np.asarray(model.predict(features))


def _save_model(model: object, framework: str, artifact_dir: Path) -> Path:
    if framework == "lightgbm":
        path = artifact_dir / "model.txt"
        model.booster_.save_model(str(path))
        return path
    path = artifact_dir / "model.joblib"
    joblib.dump(model, path)
    return path


def train_and_register(
    repo_root: Path,
    database_path: Path | None = None,
    force_promote: bool = False,
) -> dict[str, object]:
    frame, data_source = load_training_frame(database_path)
    metrics = walk_forward_score(frame)
    final_model, framework = _fit_model(frame)

    artifact_dir = repo_root / "artifacts/model-registry/tabular-alpha-v1"
    artifact_dir.mkdir(parents=True, exist_ok=True)
    model_path = _save_model(final_model, framework, artifact_dir)
    model_hash = f"sha256:{hashlib.sha256(model_path.read_bytes()).hexdigest()}"

    promoted = force_promote or metrics["directionalAccuracy"] >= PROMOTE_MIN_DIRECTIONAL_ACCURACY
    registry = {
        "modelName": MODEL_NAME,
        "modelType": "lightgbm" if framework == "lightgbm" else "sklearn-hgb",
        "framework": framework,
        "status": "promoted" if promoted else "not_promoted",
        "featureVersion": "v1",
        "featureColumns": list(FEATURE_COLUMNS),
        "target": "label_forward_return_21d",
        "horizonDays": 21,
        "artifactPath": str(model_path.relative_to(repo_root)),
        "modelHash": model_hash,
        "dataSource": data_source,
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "validation": metrics,
        "promotionThreshold": {"directionalAccuracy": PROMOTE_MIN_DIRECTIONAL_ACCURACY},
        "notes": (
            "Default structured alpha model (gradient boosted trees). "
            "Matches QuantConnect-style tabular ML; heuristic is fallback only."
        ),
    }

    registry_path = repo_root / "ml/registry/model_registry.json"
    registry_path.write_text(json.dumps(registry, indent=2), encoding="utf-8")
    (artifact_dir / "training_metrics.json").write_text(
        json.dumps(registry, indent=2), encoding="utf-8"
    )
    return registry


if __name__ == "__main__":
    import os

    root = Path(__file__).resolve().parents[2]
    db = Path(os.environ.get("DATABASE_PATH", root / "backend/data/investment.db"))
    result = train_and_register(
        root,
        database_path=db if db.exists() else None,
        force_promote=os.environ.get("ML_FORCE_PROMOTE") == "true",
    )
    print(json.dumps(result, indent=2))
