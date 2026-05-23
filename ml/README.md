# ML Training Baseline (V1)

Reproducible feature export and baseline model training for the autonomous pilot.

## Layout

- `features/export_features.py` — export feature snapshots from market bars
- `training/train_baseline.py` — LightGBM/XGBoost baseline when optional deps are installed
- `registry/model_registry.json` — promoted model metadata with hashes

Training is optional for the first live pilot. Promotion requires walk-forward validation evidence.
