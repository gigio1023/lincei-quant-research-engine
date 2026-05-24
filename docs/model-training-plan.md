# Model Training Plan

Status: supporting design. The active roadmap is [spec/06-implementation-roadmap.md](spec/06-implementation-roadmap.md).

## Training Philosophy

Training is useful, but it should not block the first executable LEAN + LLM system. Build the full model slots now, then train models behind those slots.

Training must answer:

- what target is predicted;
- what features were available at prediction time;
- what market regime was used for validation;
- whether the model improves over numeric-only and LLM-only baselines;
- whether confidence is calibrated enough to affect position sizing.

## Model Families

### Numeric ML Alpha

Primary target:

- next 5d / 20d forward excess return versus benchmark;
- top-quantile classification for cross-sectional winners;
- volatility-adjusted return.

Recommended models:

- LightGBM / XGBoost / CatBoost ranker or regressor;
- logistic/ridge baseline;
- random forest baseline;
- small MLP or TabTransformer only after tree baselines are beaten.

Why: structured daily financial data is tabular and noisy. Gradient boosted trees are strong, fast, interpretable enough, and feasible on small GPUs or CPU.

### Regime Model

Targets:

- risk-on / risk-off;
- high-volatility / normal-volatility;
- trend / chop;
- liquidity stress.

Recommended models:

- logistic regression;
- gradient boosted trees;
- hidden Markov model or simple state machine as baseline.

### LLM Feature Model

Purpose: convert text into structured features.

Outputs:

- event sentiment;
- novelty;
- relevance;
- macro risk;
- earnings surprise;
- contradiction flags;
- confidence and abstain reason.

Training options:

- no training first: use hosted frontier models with strict JSON schema;
- later: distill common tasks into a small classifier;
- optional QLoRA for financial sentiment extraction only if labeled data exists.

### Meta Alpha

Purpose: combine numeric and LLM signals.

First implementation:

- fixed weighted combiner;
- threshold and abstain rules;
- manual calibration.

Later:

- logistic/LightGBM meta model;
- target: next-horizon positive excess return or risk-adjusted bucket;
- features: numeric score, LLM score, confidence, volatility, regime, disagreement flags.

## Validation

Use walk-forward validation, not random splits.

Minimum scheme:

```text
train:      past N years
validation: next period
test:       later untouched period
roll forward and repeat
```

Controls:

- purge overlapping label windows;
- embargo after train window when labels overlap;
- record all failed runs;
- compare against buy-and-hold, cash, numeric-only, LLM-only, and equal-weight baselines;
- measure turnover and costs;
- report performance by regime.

Key metrics:

- Sharpe, Sortino, Calmar;
- max drawdown;
- hit rate;
- information coefficient;
- return by score decile;
- turnover;
- fees and slippage;
- live-shadow degradation;
- calibration curve for confidence.

## Hardware Plans

### RTX 3070 8GB

Best for:

- LightGBM/XGBoost GPU training if configured;
- small PyTorch models;
- small sentence embedding batches;
- QLoRA on small 3B to 7B models only with aggressive quantization and short context.

Avoid:

- full LLM fine-tuning;
- large time-series transformers;
- huge batch embedding jobs.

Recommended defaults:

- train tabular models on CPU/GPU;
- use hosted LLMs for committee judgment;
- cache embeddings;
- batch text jobs overnight.

### T4 16GB

Best for:

- larger embedding batches;
- QLoRA on 7B class models for classification/extraction;
- small transformer/time-series experiments;
- parallel backtest support if CPU is adequate.

Recommended defaults:

- train LightGBM/CatBoost first;
- fine-tune only small financial sentiment/event classifiers;
- keep LLM committee on hosted models until local model quality is proven.

### TPU v5e

Best for:

- JAX/TPU-friendly transformer or MLP training;
- larger batched embedding or sequence experiments;
- repeated model sweeps when pipeline is stable.

Use only after:

- dataset pipeline is reproducible;
- labels and validation are stable;
- CPU/GPU baselines are logged;
- training job can export artifacts back to the model registry.

## Model Registry Contract

Every trained model must register:

```ts
type ModelArtifact = {
  modelId: string;
  modelFamily: "numeric_alpha" | "regime" | "llm_feature" | "meta_alpha";
  version: string;
  trainedAt: string;
  trainingWindow: { start: string; end: string };
  validationWindow: { start: string; end: string };
  testWindow?: { start: string; end: string };
  featureSchemaHash: string;
  labelDefinitionHash: string;
  artifactRef: string;
  artifactHash: string;
  metrics: Record<string, number>;
  approvedFor: "research" | "paper" | "live_shadow" | "future_live_candidate";
};
```

## Promotion Rule

No trained model may affect real capital under the active spec. A future live-money spec would need at least:

- it beats numeric rule baseline after costs;
- it survives walk-forward validation;
- it has paper/live-shadow evidence;
- it has calibration evidence;
- it has failure-mode docs;
- rollback to the previous model is tested.
