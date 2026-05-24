# External ML Baselines Research

Status: supporting research note. External baselines are degraded scaffolding until promoted by the active validation policy.

## Scope

- **Structured (numeric) alpha:** download a free pretrained **LightGBM** booster (QuantConnect-style tabular ML).
- **Text / sentiment / macro:** hosted LLM semantic-alpha engine first. No FinBERT or other local NLP models until the point-in-time feature pipeline and validation evidence justify them.

QuantConnect does not ship a public pretrained model zoo; community practice is gradient boosting on OHLCV features inside LEAN, or loading your own Object Store artifact. This repo uses a vetted Hugging Face LightGBM text booster as the default numeric baseline.

## Selected tabular baseline

### `jc-builds/stockprediction-ai` (primary)

| Item | Detail |
|------|--------|
| Type | LightGBM regressor, `boosters/live.txt` + `config.json` |
| Format | Text booster only — **no pickle** (`lgb.Booster(model_file=...)`) |
| Features | 47 OHLCV / regime / cross-section columns (earnings fields neutral when unknown) |
| Caveat | Trained on ~150 US names; the initial ETF universe is `SPY, QQQ, IWM, TLT, GLD` — baseline signal only |

## Rejected (security)

| Artifact | Reason |
|----------|--------|
| `.pkl` / `joblib` from unknown HF authors | Arbitrary code execution on load |
| FinBERT / local transformers NLP | Out of scope — LLM handles text |
| Binaries (`.exe`, `.dll`, `.so`) | Not allowed |

## Security (`ml/security/verify_artifact.py`)

1. Allowlist: `.txt`, `.json` for tabular baseline
2. Denylist: `.pkl`, `.pickle`, `.pt`, `.exe`, …
3. Content scan on text/json for `exec`, `eval`, `__import__`, etc.
4. SHA-256 recorded in `ml/registry/external_artifact_manifest.json`
5. Load test: LightGBM must parse the booster

## Commands

```bash
./scripts/setup-ml-venv.sh
./scripts/download-external-baselines
./scripts/run-alpha-cycle
```

Optional local training: `./scripts/train-ml-baseline` (does not replace external baseline unless you change registry manually).

## References

- [jc-builds/stockprediction-ai](https://huggingface.co/jc-builds/stockprediction-ai)
- [QuantConnect Gradient Boosting research](https://www.quantconnect.com/research/15270/gradient-boosting-model/)
- [QuantConnect LightGBM forum](https://www.quantconnect.com/forum/discussion/10138/lightgbm-light-gradient-boosted-machine-python/)
