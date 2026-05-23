"""Export V1 feature snapshots for offline training."""

from __future__ import annotations

import json
from pathlib import Path

REQUIRED_KEYS = [
    "return_20d",
    "return_63d",
    "return_126d",
    "realized_vol_20d",
    "drawdown_63d",
    "price_vs_sma_200d",
    "dollar_volume_20d",
    "market_regime_score",
]


def export_placeholder(output_path: Path) -> None:
    payload = {
        "featureVersion": "v1",
        "snapshots": [
            {
                "symbol": symbol,
                "features": {key: 0.0 for key in REQUIRED_KEYS},
            }
            for symbol in ("SPY", "QQQ", "IWM", "TLT", "GLD")
        ],
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


if __name__ == "__main__":
    export_placeholder(Path("artifacts/model-registry/feature-export.json"))
