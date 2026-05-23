# ML Training Baseline (V1)

Structured alpha defaults to a **LightGBM** regressor on V1 tabular features — the same family QuantConnect community alphas commonly use for cross-sectional ETF/stock signals (gradient boosted trees on momentum, vol, liquidity).

LLM alpha remains OpenAI API-only. Heuristic scoring is **degraded fallback** when no promoted model exists or Python inference fails.

## Setup

```bash
python3 -m venv .venv-ml
source .venv-ml/bin/activate
pip install -r ml/requirements.txt
```

## Train and promote

```bash
./scripts/train-ml-baseline
# or: ML_FORCE_PROMOTE=true ./scripts/train-ml-baseline
```

Reads `backend/data/investment.db` `market_data_bars` when enough history exists; otherwise trains on reproducible synthetic data for plumbing. Promotion requires walk-forward directional accuracy ≥ 0.52 (configurable in `train_lightgbm_baseline.py`).

Artifacts:

- `artifacts/model-registry/lightgbm-v1/model.txt`
- `ml/registry/model_registry.json` — `status: promoted | not_promoted`

## Inference

`run-alpha-cycle` loads the promoted model via `ml/inference/predict.py` and writes `engines/lean/aggressive_llm_momentum/input/ml_predictions.json` for LEAN replay.

## Layout

- `shared/feature_schema.py` — column order aligned with NestJS `FeatureSnapshot`
- `features/build_training_matrix.py` — SQLite bars → labels
- `training/train_lightgbm_baseline.py` — walk-forward validation + registry update
- `inference/predict.py` — batch scoring for alpha cycle
