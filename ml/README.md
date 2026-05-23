# ML Baselines (V1)

## Roles

| Layer | Model | How you get it |
|-------|--------|----------------|
| **Numeric / structured alpha** | External LightGBM (`jc-builds/stockprediction-ai`) | `./scripts/download-external-baselines` |
| **Event / macro / risk text** | OpenAI LLM committee | API only — **no FinBERT** |
| **Fallback** | Heuristic scorer | Only when no promoted external model or inference fails |
| **Optional** | Local v1 LightGBM/sklearn | `./scripts/train-ml-baseline` (does not replace external unless you edit registry) |

## Setup

```bash
./scripts/setup-ml-venv.sh
./scripts/download-external-baselines
```

Download verifies SHA-256, scans text/json for suspicious content, and load-tests the LightGBM booster (text format only — no pickle).

## Alpha cycle

```bash
./scripts/run-alpha-cycle
```

Uses `ml/registry/model_registry.json` when `status: promoted` and artifacts exist under `artifacts/external-baselines/`.

## Full LEAN backtest (production)

Not the local simulator — see [docs/full-lean-backtest-setup.md](../docs/full-lean-backtest-setup.md).

```bash
./scripts/setup-lean-cli.sh
./scripts/setup-lean-workspace.sh   # interactive QC login
# download QC data (see doc)
./scripts/run-full-backtest.sh
```

## Layout

- `external/download_baselines.py` — Hugging Face download + registry promotion
- `features/jc_lgb_features.py` — 47-feature builder from `market_data_bars`
- `inference/predict_jc_external.py` — external booster scoring
- `security/verify_artifact.py` — allowlist/denylist + content scan
- `registry/external_baselines_catalog.json` — approved sources (tabular only)

See [docs/ml-external-baselines-research.md](../docs/ml-external-baselines-research.md).
