# Alpha Model Design

Status: supporting design. The normative LLM alpha contract is [spec/02-llm-semantic-alpha-engine.md](spec/02-llm-semantic-alpha-engine.md).

## Mental Model

In this project, alpha means a forecast that can be converted into a LEAN `Insight`.

```text
features_t -> AlphaDecision_t,h -> LEAN Insight -> portfolio target
```

An alpha is not a trade. A trade happens only after portfolio construction, risk management, and execution.

## Alpha Output

Use a project-native decision record first:

```ts
type AlphaDecision = {
  symbol: string;
  asOf: string;
  availableAt: string;
  horizonHours: number;
  direction: "up" | "down" | "flat";
  expectedReturnBps?: number;
  confidence: number;
  conviction: "low" | "medium" | "high";
  maxPositionPct?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  sourceModels: string[];
  promptVersion?: string;
  evidenceRefs: string[];
  featureSnapshotHash: string;
  thesis?: string;
  counterThesis?: string;
  abstainReason?: string;
};
```

Then adapt it into LEAN:

| `AlphaDecision` | LEAN `Insight` |
|---|---|
| `symbol` | symbol |
| `direction` | `InsightDirection.Up/Down/Flat` |
| `horizonHours` | period |
| `expectedReturnBps` | magnitude |
| `confidence` | confidence |
| `maxPositionPct` | optional weight |

## Numeric Alpha

Numeric alpha should be deterministic, fast, and backtestable.

Feature families:

- returns: 1d, 5d, 20d, 60d, 120d, 252d;
- trend: moving-average distance, EMA slope, breakout distance;
- volatility: realized volatility, ATR, downside volatility, volatility percentile;
- drawdown: peak-to-trough, recovery strength, crash proximity;
- liquidity: dollar volume, turnover, spread proxy, volume shock;
- cross-section: sector-relative rank, market-relative rank, percentile rank;
- macro/regime: index trend, VIX proxy, rates, USD, breadth;
- fundamentals: valuation, growth, profitability, earnings revisions when available.

Initial numeric alpha:

```text
score =
  rank(60d momentum)
  + rank(120d momentum)
  + trend_filter(above 120d MA)
  - volatility_penalty
  - drawdown_penalty
```

This should be simple enough to debug and strong enough to establish the end-to-end engine.

## LLM Alpha

LLM alpha is allowed to be a first-class judgment source, not just a note generator.

LLM inputs:

- numeric feature snapshot;
- recent news and filings;
- earnings or guidance summaries;
- macro context;
- current positions;
- risk state and recent performance;
- known failure modes.

LLM output must be structured JSON matching the alpha decision schema. It must include:

- thesis;
- counter-thesis;
- confidence;
- horizon;
- evidence references;
- `availableAt` for point-in-time replay;
- model and prompt versions;
- abstain reason when evidence is weak.

LLM output must not include raw broker orders, credentials, or executable code.

## Meta Alpha

Meta alpha combines numeric and LLM decisions.

Recommended first implementation:

```text
final_score =
  0.45 * numeric_momentum_score
  + 0.20 * numeric_regime_score
  + 0.25 * llm_event_score
  + 0.10 * llm_fundamental_score
```

This fixed combiner is only the first implementation. Later versions can train a meta-model after enough labeled decisions exist.

## LLM vs ML Judgment

LLMs are now strong enough to serve as alpha judges for text-heavy decisions. They are especially useful for:

- event interpretation;
- news novelty;
- contradiction detection;
- bull/bear debate;
- portfolio-level risk narrative;
- identifying when numeric signals are stale or crowded.

Numeric and ML models remain stronger for:

- price-volume patterns;
- cross-sectional rank;
- volatility and covariance estimation;
- sizing;
- transaction-cost-aware decisions;
- repeatable backtests.

The project should not choose LLM-only or ML-only. Use LLM judgment as a first-class alpha source, then force its decision through LEAN and deterministic portfolio/risk layers.

## Validation

Each alpha source must be evaluated separately and together:

- hit rate by horizon;
- average return by score bucket;
- information coefficient;
- turnover;
- drawdown contribution;
- performance by market regime;
- calibration of confidence;
- ablation: numeric only, LLM only, combined;
- walk-forward and live-shadow performance.

## Promotion Rule

No alpha becomes promotion-capable until it has:

- schema-valid decisions;
- no-lookahead data proof;
- QuantConnect Cloud backtest when available, or local LEAN evidence with explicit blocker notes;
- out-of-sample or walk-forward evidence;
- paper/live-shadow evidence;
- documented failure modes;
- rollback path.
