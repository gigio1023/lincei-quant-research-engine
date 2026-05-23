"""Train a lightweight baseline model when ML dependencies are available."""

from __future__ import annotations

import json
from pathlib import Path


def train_baseline(feature_export: Path, registry_path: Path) -> dict[str, str | float]:
    registry_path.parent.mkdir(parents=True, exist_ok=True)
    result = {
        "modelName": "v1-baseline-stub",
        "validationSharpe": 0.0,
        "featureExport": str(feature_export),
        "status": "not_promoted",
    }
    registry_path.write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    train_baseline(
        Path("artifacts/model-registry/feature-export.json"),
        Path("ml/registry/model_registry.json"),
    )
