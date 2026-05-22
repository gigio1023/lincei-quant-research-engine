# Lincei Quant Research Engine Specification

Status: draft canonical specification

## Purpose

This repository is an aggressive but risk-gated personal wealth-growth research
system. It is not a trading bot. It is not a broker integration. It is not a
place where an LLM is allowed to turn market text into orders.

The core product is a strategy factory:

1. generate many falsifiable hypotheses;
2. convert them into reproducible data, signal, portfolio, and backtest artifacts;
3. reject weak results quickly and durably;
4. promote only the few surviving ideas into stricter validation stages.

The system exists to answer one question repeatedly:

> Can this strategy survive realistic costs, timestamp discipline, benchmark
> comparison, risk controls, and out-of-sample skepticism well enough to deserve
> the next validation stage?

The default answer is no until evidence improves.

## Operating Definition Of Aggressive

Aggressive means:

- high research throughput;
- broad hypothesis generation;
- fast rejection of weak ideas;
- automation of data checks, feature generation, backtests, event extraction,
  reporting, and skeptical review;
- deliberate search for upside in liquid, long-only strategies;
- risk overlays that keep drawdowns and hidden concentration visible.

Aggressive does not mean:

- live real-money trading by default;
- broker credentials;
- direct order submission;
- LLM-to-order pipelines;
- leverage, margin, options, shorting, futures, HFT, or crypto derivatives in the
  initial scope;
- claiming alpha from one attractive backtest;
- hiding failed experiments or parameter searches.

## Personal Wealth Objective And Risk Budget

The target user is an aggressive growth and tactical allocation investor. The
goal is not to find attractive backtests in isolation. The goal is to identify
long-only, liquid, reproducible strategies that can plausibly improve net
long-term compounding versus configured aggressive benchmarks while keeping
drawdown, turnover, concentration, tax/friction, and implementation risk visible.

Every serious experiment must declare:

- primary benchmark;
- aggressive hurdle benchmark;
- maximum drawdown review threshold;
- maximum single-position, sector, and strategy-sleeve exposure;
- maximum turnover or rebalance frequency;
- cost and slippage stress assumptions;
- out-of-sample promotion hurdle;
- whether results are pre-tax or include an explicit tax-drag model.

Missing objective or risk-budget fields classify the run as
`educational_only`.

## Benchmark And Hurdle Policy

No aggressive-growth strategy may be promoted by beating only cash, 60/40, or a
weak equal-weight baseline.

Each strategy must include:

- a primary passive benchmark matching the asset class;
- an aggressive hurdle benchmark such as QQQ, VTI, or a configured growth
  benchmark;
- a same-universe naive baseline;
- a static aggressive allocation benchmark when tactical allocation is claimed;
- a cash/T-bill benchmark for defensive behavior only;
- benchmark-relative drawdown, volatility, and net return after costs.

If a strategy improves drawdown but materially underperforms the aggressive
hurdle, the report must label the tradeoff explicitly.

## Model Portfolio And Sleeve Governance

Strategy research does not imply a portfolio recommendation. A promoted
candidate must specify a hypothetical sleeve role before paper trading:

- core equity exposure;
- tactical growth sleeve;
- defensive/cash sleeve;
- event-research sleeve;
- maximum sleeve weight;
- correlation and overlap with existing sleeves;
- rebalance cadence;
- drawdown action table.

The model portfolio remains a research artifact. It must not connect to broker
accounts or place real-money orders.

## Non-Goals

- No live trading in this repository's default scope.
- No broker credentials, broker SDKs, or order submission paths.
- No LLM output directly controlling trades.
- No leverage, margin, options, shorting, futures, HFT, or crypto derivatives in
  the initial scope.
- No strategy promotion from a single good-looking backtest.
- No best-run-only optimization reports.
- No use of current index membership, current surviving tickers, or post-event
  explanations in historical decisions unless the bias is explicitly labeled.
- No dependency on QuantConnect Cloud, paid datasets, or proprietary feeds for
  the initial research loop.
- No claim that backtesting or paper trading proves live profitability.

## Product Shape

The repository should become a local, Python-first research operating system with
four durable layers.

### 1. Research Substrate

Owns configs, data manifests, feature generation, signal generation, portfolio
construction, backtests, metrics, and reports.

The substrate must be boring, deterministic, and reproducible before strategy
ideas become complex.

### 2. Event Intelligence

Uses LLMs to structure timestamped market text into validated event records.

LLMs produce hypotheses and features only. They do not produce validated alpha,
position targets, orders, or execution decisions.

### 3. Strategy Factory

Runs repeatable lanes for ETF allocation, equity ranking, event studies, and
regime/risk overlays.

The factory optimizes for evidence throughput, not narrative confidence.

### 4. External Validation Boundary

Uses mature engines such as QuantConnect LEAN as external validators only after
the repo-native artifact pipeline is stable.

LEAN is useful for execution realism, portfolio accounting, fees, fills,
slippage, orders, and independent event-driven backtesting. It is not the source
of research truth.

## Current Baseline

The current repository is intentionally small:

- strict Pydantic models for news items, event extractions, metrics, and
  backtest results;
- a minimal YAML-backed baseline config;
- a synthetic equal-weight backtest scaffold;
- basic performance metrics;
- a hard live-trading blocker;
- a markdown report renderer;
- tests for basic schema behavior, baseline backtest output, and live-mode
  rejection.

This is the correct starting point. The next work should expand contracts and
artifacts without turning the repo into a full trading engine too early.

## Context Separation And Decision Roles

Reviews and implementation should keep the following contexts separate:

- Growth Investor Context: asks whether the strategy can improve aggressive
  compounding after costs versus strong benchmarks.
- Risk Governor Context: asks whether drawdown, concentration, turnover,
  leverage, execution, and data risks are visible and bounded.
- Event/LLM Research Context: asks whether timestamped evidence and LLM outputs
  are grounded, audited, and still separated from trade-signal authority.
- LEAN Execution-Validation Context: asks whether an external engine reproduces
  mechanics, accounting, fills, fees, slippage, and portfolio behavior without
  becoming the source of research truth.
- Agent Operator Context: asks whether Codex, Claude Code, and any parallel
  worker have clear file ownership, prompt ownership, artifact ownership, and
  handoff records.

No single context can promote a strategy alone. A report may say a strategy is
interesting only after the growth, risk, data/timestamp, and artifact checks are
all explicit. Codex and Claude Code are research and engineering tools, not
alpha authorities.

## Strategy Factory Pipeline

Every strategy lane follows the same pipeline.

```text
hypothesis
  -> data manifest
  -> loaded data
  -> data quality checks
  -> point-in-time features
  -> signal observations
  -> long-only portfolio targets
  -> pre-backtest risk gate
  -> backtest with benchmark, costs, slippage, turnover
  -> metrics and diagnostics
  -> skeptical risk review
  -> durable artifacts and report
  -> decision classification
```

News and LLM artifacts remain separate until validated:

```text
NewsItem
  -> TimestampedEvidence
  -> EntityResolution
  -> LLMExtractionCandidate
  -> GroundedEventExtraction
  -> LLM audit / hallucination review / memorization review
  -> EventFeatureObservation
  -> TradeSignalValidationReport
  -> SignalObservation
```

Default event-derived trading impact is false until out-of-sample validation
shows value beyond non-LLM baselines.

`EventExtraction` proves only that an extraction matched a schema. It must not
approve a trade signal. Signal authority belongs to later validation artifacts
such as `TradeSignalValidationReport` and `SignalPromotionDecision`.

## First Strategy Lanes

### Lane 1: ETF Tactical Momentum

Purpose: establish the first serious long-only, liquid, benchmarkable strategy
family.

Hypothesis: broad ETFs with positive absolute momentum and stronger relative
momentum can improve risk-adjusted returns versus passive buy-and-hold by
avoiding prolonged downtrends and rotating toward stronger asset classes.

Initial universe:

- SPY or VTI for US equities;
- QQQ for growth and large-cap technology exposure;
- IWM for small caps;
- EFA or VXUS for international equities;
- TLT or IEF for Treasuries;
- GLD for gold;
- SHY, BIL, or another cash/T-bill proxy for defense.

Initial variants:

- 6-month and 12-month total-return momentum;
- absolute momentum filter versus cash/T-bill proxy;
- top 1, top 2, and top 3 ETF selection;
- monthly rebalance;
- volatility targeting as a reported diagnostic first, not leveraged exposure;
- optional regime overlay from Lane 4.

Required benchmarks:

- SPY buy-and-hold;
- 60/40 proxy;
- equal-weight ETF universe;
- cash/T-bill proxy.

Required controls:

- long-only;
- no leverage;
- monthly or slower rebalance initially;
- explicit cost and slippage assumptions;
- max concentration per ETF;
- turnover cap;
- drawdown review;
- parameter perturbation across lookback windows and top-N values.

Primary risks:

- ETF survivorship and inception-date bias;
- overfitting lookback windows;
- momentum crash behavior;
- false safety from defensive assets during inflationary drawdowns;
- hidden dependence on current ETF availability.

Initial classification target: `needs_more_validation`.

No ETF tactical strategy becomes `paper_trading_candidate` without multiple
market regimes, cost sensitivity, and parameter robustness.

### Lane 2: Equity Top-K Relative Strength

Purpose: test higher-upside personal wealth-growth ideas while keeping execution
simple and risk-limited.

Hypothesis: a diversified basket of liquid equities with strong relative strength
can outperform broad benchmarks, but only if survivorship, turnover,
concentration, and drawdowns are controlled.

Initial universe policy:

- static educational universe is allowed for scaffolding only;
- point-in-time index constituents are required before serious claims;
- liquidity floor by price and dollar volume;
- penny stocks and illiquid names excluded;
- universe-bias disclosure required in every report.

Initial variants:

- top-K by 6-month or 12-month momentum;
- skip most recent month to reduce short-term reversal effects;
- sector concentration limits;
- equal weight versus volatility-scaled weight;
- monthly rebalance;
- optional market regime filter from Lane 4.

Required benchmarks:

- SPY;
- equal-weight universe;
- sector-neutral benchmark if sector constraints are used;
- momentum ETF proxy where relevant.

Required controls:

- max single-name weight;
- max sector exposure;
- liquidity filter;
- turnover and estimated cost report;
- delisting/survivorship handling plan before any serious conclusion.

Primary risks:

- survivorship bias;
- current-winner hindsight;
- excessive turnover;
- concentration in one macro theme;
- large drawdown despite attractive CAGR;
- parameter fishing across lookbacks, K values, and rebalance schedules.

Initial classification target: `educational_only` until point-in-time universe
handling exists.

### Lane 3: News Event Reaction Study

Purpose: make news and event analysis a first-class research component without
allowing it to trade directly.

Hypothesis: structured event features derived from timestamped market text may
help explain or forecast short-horizon price reactions, but LLM extraction must
be treated as untrusted until validated out of sample.

Initial event types:

- earnings surprise;
- guidance change;
- analyst upgrade or downgrade;
- regulatory action;
- product launch or failure;
- M&A announcement;
- management change;
- litigation;
- macro release for ETF-level studies.

Event pipeline requirements:

- preserve source, publication time, ingestion time, URL/source id, and raw text
  where permitted;
- normalize timestamps to UTC;
- map entities to tickers with confidence;
- validate strict Pydantic JSON;
- include bull, bear, and neutral interpretations;
- require a reason not to trade immediately;
- keep `should_affect_trading_signal` false by default;
- convert events into research features only after timestamp checks.

Research questions:

- Does event category predict abnormal return over 1, 5, or 20 trading days?
- Does materiality or novelty score add information beyond price momentum?
- Do LLM-extracted events improve an existing baseline after costs?
- Are reactions different by regime, sector, liquidity, or prior trend?

Required benchmarks and controls:

- same-ticker momentum baseline;
- sector ETF reaction;
- market-adjusted abnormal return;
- randomized timestamp or shuffled-label control;
- publication time must precede signal time;
- ingestion time must be recorded separately;
- no post-event summary leakage;
- prompts, outputs, model config, and validation errors must be cached;
- no direct trade decisions from LLM text.

Primary risks:

- timestamp leakage;
- LLM historical memorization;
- event selection bias;
- source licensing limits;
- ambiguous ticker/entity mapping;
- news already priced before ingestion.

Initial classification target: `needs_more_validation` for studies and
`not_live_ready` for any signal using LLM-derived features.

### Lane 4: Regime And Risk Overlay

Purpose: create a common risk layer that can reduce exposure during hostile
conditions without becoming a curve-fit panic switch.

Hypothesis: simple, transparent regime filters may improve drawdown behavior for
long-only strategies.

Candidate signals:

- market index above or below long moving average;
- realized volatility percentile;
- drawdown state;
- Treasury or credit proxy trend if data is available;
- breadth proxy if universe data supports it;
- macro/news event stress flags as research-only inputs.

Overlay actions:

- allow full risk;
- reduce gross exposure;
- move to defensive ETF or cash proxy;
- block new entries while allowing existing holdings to decay;
- increase required signal threshold.

Required controls:

- test overlay alone and attached to each strategy lane;
- compare against simple buy-and-hold and simple momentum;
- report missed rebound cost;
- avoid tuning to one crisis;
- define fixed rules before the test period.

Primary risks:

- false de-risking before rallies;
- overfit crash avoidance;
- excessive cash drag;
- regime signal lag;
- combining many weak filters into a narrative.

Initial classification target: `needs_more_validation`. The overlay is a risk
control candidate, not alpha by itself.

### Lane 5: Sector And Theme ETF Rotation

Purpose: test aggressive but liquid tactical allocation across sectors,
industries, and broad themes without single-name concentration.

Hypothesis: sector and theme leadership may persist long enough for monthly or
slower long-only rotation to improve aggressive benchmark-relative returns, but
theme crowding, ETF overlap, expense ratios, and momentum crashes can erase the
edge.

Initial universe:

- SPY or VTI for broad US equity exposure;
- QQQ for growth and large-cap technology exposure;
- liquid sector ETFs;
- selected high-liquidity theme ETFs only when inception dates, expense ratios,
  holdings overlap, and liquidity are documented;
- Treasury/cash proxy for defense.

Required benchmarks:

- SPY or VTI;
- QQQ or configured growth benchmark;
- equal-weight sector ETF universe;
- static aggressive allocation;
- cash/T-bill proxy for defensive behavior only.

Required controls:

- ETF liquidity and inception-date checks;
- maximum sector/theme exposure;
- holdings overlap disclosure where available;
- expense ratio report;
- monthly or slower rebalance initially;
- turnover cap;
- drawdown review;
- parameter perturbation across lookback windows and top-N values.

Primary risks:

- theme ETF hindsight and survivorship;
- expensive or illiquid theme products;
- hidden concentration in the same mega-cap equities;
- buying crowded themes near peaks;
- underperforming QQQ while claiming aggressive growth.

Initial classification target: `needs_more_validation`.

### Lane 6: Quality/Growth Momentum Equity Basket

Purpose: test higher-upside long-only equity selection using momentum plus
non-price quality or growth filters.

Hypothesis: combining relative strength with point-in-time quality or growth
features may improve persistence and reduce junk-momentum exposure versus a
momentum-only basket.

Candidate features:

- relative strength;
- earnings or revenue growth where point-in-time data exists;
- profitability;
- analyst revision data if licensed;
- volatility and liquidity filters;
- sector neutrality or sector caps.

Required benchmarks:

- SPY or VTI;
- QQQ or configured growth benchmark;
- equal-weight eligible universe;
- momentum-only baseline;
- sector-neutral baseline where applicable.

Required controls:

- point-in-time fundamentals before serious claims;
- survivorship and delisting handling plan;
- maximum single-name and sector exposure;
- turnover and tax/friction disclosure;
- parameter perturbation across lookback windows, K values, and filter
  thresholds.

Primary risks:

- data licensing and point-in-time gaps;
- current-winner hindsight;
- overfitting combined filters;
- concentrated exposure to one macro theme;
- attractive CAGR with unacceptable drawdown.

Initial classification target: `educational_only` until point-in-time
fundamentals and survivorship handling exist.

## Target Architecture

The repository remains Python-first. Module boundaries must stay explicit.

```text
src/lincei_quant/
  models.py              # Pydantic domain contracts and shared enums
  config.py              # YAML -> validated experiment/config models
  logging.py             # Loguru setup at CLI/batch boundaries
  data/                  # loaders, manifests, quality checks, point-in-time rules
  news/                  # timestamped news ingestion and event extraction validation
  llm/                   # provider protocol, prompt/audit cache, no provider by default
  features/              # point-in-time feature transforms only
  signals/               # feature panel -> signal scores / target intents
  portfolio/             # long-only construction, sizing, benchmark exposure
  backtest/              # deterministic research engine and metrics
  risk/                  # gates, concentration, turnover, drawdown, classification
  reporting/             # markdown and machine-readable reports
  cli.py                 # thin CLI; no trade/order/broker/live commands

configs/
  data/
  strategies/
  experiments/
  llm/

artifacts/
  data/
  features/
  signals/
  events/
  llm/
  backtests/<run_id>/
  logs/

reports/
  experiments/
  templates/

scripts/
  run_demo.py
  smoke_*.py
```

Do not add deep LEAN integration until repo-native backtest artifacts, data
manifests, and no-lookahead tests are stable.

### Module Ownership

`data` loads local, synthetic, and approved external data. It validates schema,
timezone, adjustment mode, source license, freshness, and point-in-time status.
It must not compute alpha.

`features` transforms already-available data into point-in-time features. Every
feature declares input columns, lookback, availability lag, output columns, and
timestamp semantics.

`signals` converts features or validated event aggregates into scores, ranks, or
target intents. It must not load data, call LLMs, or perform portfolio
accounting.

`portfolio` converts signal intents into long-only weights under max weight,
cash, rebalance, concentration, and turnover constraints.

`backtest` simulates research returns, costs, slippage, turnover, benchmark
comparison, exposure, and drawdown. It must not call LLMs or brokers.

`risk` owns hard gates and review classification. Any path toward paper or live
execution must go through risk, and live remains blocked by default.

`reporting` renders durable markdown and JSON artifacts with assumptions,
limitations, failed checks, and human review status.

`llm` defines provider boundaries and audit records. No provider is enabled by
default. LLM output is always validated before entering feature storage.

## Domain Contracts

Pydantic contracts are used for configs, manifests, event records, decisions, and
boundary artifacts. They are not used to validate every price row.

Existing contracts remain:

- `StrictModel`;
- `NewsItem`;
- `EntityMention`;
- `EventExtraction`;
- `PerformanceMetrics`;
- `BacktestResult`.

Add contracts incrementally:

- `DataManifest`: snapshot id, source, license, timezone, adjustment policy,
  point-in-time status, hash manifest, freshness, known biases.
- `TimestampedEvidence`: source id, source type, URL or local pointer,
  publication timestamp, ingestion timestamp, market availability timestamp,
  extraction timestamp, raw-text hash, and license status.
- `EvidenceSpan`: source id, character offsets or paragraph ids, quoted text
  where permitted, claim id, and confidence.
- `EntityResolutionRecord`: source entity, candidate tickers, chosen ticker,
  confidence, exchange, ambiguity notes, and rejection reason if unresolved.
- `UniverseConfig`: tickers or selection rule, benchmark, membership policy,
  liquidity floor, survivorship-bias note.
- `CostConfig`: annual cost bps, slippage bps, fee model, liquidity assumption,
  explicit waiver flag.
- `FeatureSpec`: name, inputs, lookback, availability lag, timestamp policy,
  output path.
- `EventFeatureObservation`: as-of timestamp, ticker, event id, feature name,
  value, availability timestamp, and evidence ids.
- `SignalObservation`: as-of timestamp, ticker, signal name, score, direction,
  evidence ids.
- `TradeSignalValidationReport`: event or signal ids, non-LLM baseline,
  shuffled-label control, delayed-signal control, out-of-sample result,
  leakage review, and promotion recommendation.
- `SignalPromotionDecision`: decision id, approving reviewer, allowed downstream
  use, failed gates, and classification.
- `TargetWeight`: as-of timestamp, ticker, target weight, reason, constraints
  applied.
- `PortfolioConfig`: construction method, rebalance cadence, max position
  weight, cash policy, sector cap.
- `RiskLimits`: long-only, max gross exposure, leverage, max position weight,
  max turnover, drawdown review threshold, blocked asset classes.
- `ExperimentConfig`: data, universe, features, signal, portfolio, backtest,
  risk, reporting.
- `RunManifest`: run id, config hash, git commit, data hashes, code version,
  started/finished timestamps, command, environment.
- `RiskReview`: classification, failed checks, warnings, reviewer notes.
- `ExtractionRunManifest`: prompt id, source ids, model/provider, schema
  version, retry policy, accepted outputs, rejected variants, and timestamps.
- `GroundedEventExtraction`: extracted event with required evidence spans,
  unsupported-claim flags, abstention reason, and timestamp availability.
- `HallucinationReview`: unsupported claims, missing evidence, contradiction
  flags, abstentions, and reviewer notes.
- `MemorizationRiskReview`: future-outcome labels, famous post-event narratives,
  benchmark-result contamination, repeated test-set exposure, and decision.
- `LLMAuditRecord`: provider, model, prompt template version, model config,
  input hashes, output hash, extraction timestamp, validation errors, retry
  count, rejected variants, reviewer, and contamination flags.
- `AgentResearchRecord`: agent/tool name, model, prompt id, source files,
  output artifact, reviewer role, and allowed downstream use.
- `LeanRunManifest`: LEAN-specific engine, command, data, model, output, and
  constraint metadata.

## Config Shape

The current flat baseline config is acceptable for the demo. Real experiments
should move toward nested configs.

```yaml
experiment:
  name: etf_tactical_momentum_v0
  run_id: auto
data:
  source: local_csv
  manifest: configs/data/etf_prices.yaml
universe:
  tickers: [SPY, QQQ, IWM, EFA, TLT, GLD, BIL]
  benchmark: SPY
  membership_policy: static_etf_universe_with_inception_bias_disclosed
strategy:
  type: etf_tactical_momentum
  momentum_windows: [126, 252]
  skip_recent_days: 0
  top_n: 3
  rebalance: monthly
portfolio:
  construction: equal_weight_top_n
  max_position_weight: 0.40
  cash_proxy: BIL
costs:
  annual_cost_bps: 10
  slippage_bps: 5
risk:
  long_only: true
  leverage: 1.0
  allow_margin: false
  allow_shorting: false
  allow_derivatives: false
  max_turnover: 12.0
reporting:
  output_dir: reports/experiments
```

Unknown fields should fail validation. Risk waivers should be explicit and
rare.

## Artifact Layout

Each run must be reproducible without chat history.

```text
artifacts/backtests/<run_id>/
  config.yaml
  run_manifest.json
  data_manifest.json
  features.parquet
  signals.parquet
  target_weights.parquet
  equity_curve.csv
  benchmark_curve.csv
  orders_or_rebalances.csv
  exposure.csv
  monthly_returns.csv
  metrics.json
  risk_review.json
  stdout.log
  report.md
```

Reports under `reports/experiments/` are human-facing summaries. Artifacts under
`artifacts/` are machine-readable evidence.

Failed experiments are kept. A rejected run with clean evidence is useful output.

Event and LLM research runs must add event-specific artifacts:

```text
artifacts/events/<run_id>/
  run_manifest.json
  news_items.jsonl
  source_evidence.jsonl
  entity_resolution.jsonl
  event_extractions.jsonl
  llm_audit_records.jsonl
  hallucination_reviews.jsonl
  memorization_reviews.jsonl
  validation_errors.jsonl
  event_features.parquet
  signal_validation_report.json
```

Every accepted research run must have a unique `run_id` and an immutable run
directory. `run_manifest.json` must include agent/tool name, branch, git commit,
command, config hash, data hashes, prompt ids, approval ids where relevant, and
timestamps. Reports are summaries; manifests, metrics, and validation records
are the source-of-truth evidence.

## Metrics And Reports

Every strategy report must include:

- hypothesis;
- economic intuition;
- personal wealth objective and risk budget;
- universe definition;
- data source and manifest;
- timestamp and point-in-time assumptions;
- signal definition;
- holding period;
- portfolio construction;
- benchmark;
- aggressive hurdle benchmark;
- cost and slippage assumptions;
- tax/friction assumption or explicit pre-tax label;
- CAGR;
- annualized volatility;
- Sharpe or other risk-adjusted metric;
- max drawdown;
- worst month or worst rolling period;
- turnover;
- trade count or rebalance count;
- exposure over time;
- concentration;
- benchmark-relative return;
- cost and slippage sensitivity;
- parameter robustness;
- regime breakdown where applicable;
- failed checks;
- limitations;
- decision classification.

High CAGR is not enough. A strategy is interesting only if it survives costs,
reasonable perturbations, risk review, and benchmark comparison.

## Decision Classifications

`rejected`: the hypothesis fails, has unacceptable bias, cannot beat a simple
benchmark, depends on leakage, has excessive drawdown/turnover, or cannot be made
reproducible.

`educational_only`: the experiment is useful for scaffolding or learning but
depends on synthetic data, biased universe membership, incomplete costs, or
insufficient market realism.

`needs_more_validation`: early evidence is promising but missing point-in-time
data, broader regimes, parameter robustness, better execution assumptions, or
out-of-sample validation.

`paper_trading_candidate`: allowed only after reproducible backtest, benchmark
comparison, nonzero costs/slippage, position limits, drawdown response, logging
plan, alerting plan, kill-switch design, and human approval note.

`not_live_ready`: useful in research or paper preparation but fails live-design
requirements. This should be common. The default repo scope should never call a
strategy live-ready.

## QuantConnect LEAN Boundary

LEAN is an external validation engine, not the source of research truth.

This repository remains canonical for:

- hypotheses;
- data manifests;
- timestamp rules;
- LLM audit logs;
- risk policy;
- reports;
- final classification.

A LEAN backtest may validate execution mechanics, portfolio accounting,
fee/slippage/fill assumptions, and event-driven behavior. It must not be treated
as proof of alpha.

LEAN has a broad capability surface: local and cloud backtests, research
notebooks, optimization, report generation, object storage, custom data,
universe selection, Algorithm Framework modules, reality models, and live
trading integrations. This project intentionally adopts only a narrow,
local-only validation slice at first.

Local availability is a hard gate. A LEAN run is not available merely because
`/Users/naem1023/git/Lean` or `/Users/naem1023/git/lean-cli` exists. Before
Level 1, record:

- `lean` command path and version;
- Docker daemon version and platform;
- pinned engine image tag and digest;
- whether the image runs on the local architecture;
- data folder path;
- whether `dotnet` is installed;
- whether the command can run without cloud login, provider credentials, paid
  data, or broker configuration.

Source-build workflows require `dotnet` and remain deferred unless a separate
source-build task approves them.

### Integration Levels

Level 0, Concepts Only: use LEAN terminology for reality models, fills,
slippage, fees, data normalization, universe selection, benchmark, and portfolio
accounting. No LEAN execution.

Level 1, External Backtest Smoke Test: after local availability preflight, run
one pinned local LEAN backtest on synthetic or sample data. Long-only, cash
account, no leverage, no broker credentials.

Level 2, Subprocess Adapter: repo-native Python generates audited
signals/data/configs, calls `lean backtest` as a subprocess, captures artifacts,
and parses results into repo-native reports.

Level 3, Strategy Skeleton Generator: generate minimal `QCAlgorithm` templates
only after static validators reject forbidden APIs and the run manifest is
complete.

Level 4, Deep LEAN Engine Integration: deferred. Source builds, custom data
providers, custom transaction handlers, and engine modifications require a
separate design review.

Default adoption path: Level 0 -> Level 1 -> Level 2. Do not jump to Level 3 or
Level 4 for early research.

### LEAN Adapter Shape

```text
research config
  -> data manifest
  -> signal artifacts
  -> LEAN project template
  -> lean backtest
  -> raw LEAN artifacts
  -> parsed risk report
```

Required components when LEAN integration begins:

- `LeanRunManifest`;
- `LeanConstraintValidator`;
- `LeanRunner`;
- `LeanResultParser`;
- `LeanReportBridge`.

The adapter must not:

- import broker SDKs;
- store broker credentials;
- submit orders;
- deploy cloud or live jobs;
- auto-run optimization;
- mutate source data during a run;
- allow LLM-generated LEAN code to bypass validation.

Allowed LEAN commands after preflight:

- `lean backtest <project> --output <artifacts path> --image <pinned image>
  --no-update --data-provider-historical Local --lean-config <generated config>`;
- `lean data generate` only for synthetic Equity Daily/Hour smoke data, with the
  random seed recorded;
- `lean logs --backtest` for artifact inspection;
- `lean report --backtest-results` only as a secondary artifact, never canonical.

Deferred LEAN capabilities:

- `lean research`;
- professional/PDF report workflows beyond secondary local HTML artifacts;
- `lean build` and source `Launcher` workflows;
- `lean optimize` and `lean cloud optimize`;
- paid/provider data workflows;
- Algorithm Framework optimizers beyond simple equal-weight or explicit weights;
- Object Store as any hidden research state.

Generate a minimal LEAN config. Do not copy LEAN `Launcher/config.json`
wholesale. Required config properties include `environment: backtesting`,
`live-mode: false`, local file-system data feed, backtesting setup/result/real
time/transaction handlers, local data folder, and
`force-exchange-always-open: false`. Forbidden config properties include any
`live-*` environment, API tokens, account ids, refresh tokens, private keys,
wallet addresses, broker credentials, live URLs, and brokerage transaction
handlers.

Level 1 templates may use only long-only equity/ETF subscriptions, daily/hour
resolution, explicit benchmark, explicit cash, explicit start/end dates, and
nonnegative target weights within repo risk limits. Direct order APIs such as
`MarketOrder`, `LimitOrder`, `StopMarketOrder`, `StopLimitOrder`,
`MarketOnOpen`, `MarketOnClose`, `Combo*`, `OptionExercise`, `Liquidate`,
`SubmitOrderRequest`, order update/cancel APIs, and live-mode branches are
forbidden. `set_holdings` is allowed only when static validation proves
`0 <= weight <= max_position_weight` and gross exposure is `<= 1.0` in a
backtest-only config.

LEAN Algorithm Framework is useful as a reference for separation of universe,
alpha, portfolio construction, risk management, and execution. In this repo,
early use is limited to simple long-only modules that keep generated insights,
targets, and risk adjustments inspectable. Mean-variance, Black-Litterman, risk
parity, max-Sharpe, and other optimizer-driven construction models are deferred
until an overfitting-control design exists.

## Forbidden Commands, Configs, And APIs

Forbidden CLI commands:

- all `lean live *`;
- all `lean cloud *` unless explicitly approved as a cloud-dependency task;
- all `lean private-cloud *`;
- `lean project-delete`;
- `lean library add` and `lean library remove` during research runs;
- all `lean object-store *` as hidden state;
- `lean report --live-results`;
- `lean optimize` and `lean cloud optimize` until an overfitting-control design
  exists;
- `lean data download`;
- `--download-data`, `--data-purchase-limit`, and all provider credential flags
  across any LEAN command;
- `--update` in reproducible runs unless the image digest is re-recorded.

Forbidden LEAN config states:

- any environment with `live-mode: true`;
- any `live-*` environment;
- copied wholesale `Launcher/config.json`;
- brokerage credentials or API secrets;
- account ids, refresh tokens, private keys, wallet addresses, or FIX routing
  credentials;
- `force-exchange-always-open: true`;
- tick/second resolution unless explicitly approved for a non-HFT fixture.

Forbidden algorithm patterns:

- `AddOption`, `add_option`, `AddOptionContract`, `AddFutureOption`;
- `AddFuture`, `add_future`, `AddCryptoFuture`;
- `AddCrypto`, `add_crypto` unless spot crypto research is separately approved;
- negative `SetHoldings` or `set_holdings`;
- `Sell`, `Short`, negative portfolio targets, or target weights below zero;
- target weights above 1.0 gross exposure;
- `SetBrokerageModel` or `set_brokerage_model` for live broker behavior unless a
  paper gate explicitly approves it;
- margin account configuration;
- leverage above 1.0;
- order submission outside backtest simulation.

## Data Policy

Every dataset must declare:

- source;
- license;
- whether local storage is allowed;
- whether redistribution is allowed;
- whether LLM processing is allowed;
- point-in-time availability;
- survivorship-bias risk;
- timestamp semantics;
- timezone and exchange calendar;
- corporate action adjustment mode;
- snapshot id;
- file hashes.

Synthetic data is allowed for smoke tests and CI. It cannot support claims about
strategy profitability.

Paid/provider data downloaded through LEAN, QuantConnect, Polygon, broker feeds,
or similar sources may be restricted to specific licensed uses. Unclear
licensing is blocked until documented.

## Bias Controls

Required controls:

- no future data in signals;
- signal timestamp must precede order/rebalance timestamp;
- news/event timestamp must represent market availability, not retrospective
  article summary;
- universe membership must be point-in-time or labeled biased;
- corporate action and data normalization policy must be declared;
- benchmark must match universe, asset class, and holding period;
- failed experiments and rejected variants must be logged;
- parameter sweeps must report the full search space, not only the best run;
- LLM-generated ideas are hypotheses, not validated alpha.

LEAN can faithfully backtest contaminated inputs. It does not automatically
prevent look-ahead bias, survivorship bias, LLM historical memorization,
cherry-picking, or overfitting.

## Validation Gates

Required tests before strategy claims:

- schema validation rejects unknown fields and invalid risk settings;
- timestamp alignment prevents features/signals from consuming unavailable data;
- news timing distinguishes publication, ingestion, and event dates;
- event research records publication time, ingestion time, market availability
  time, extraction time, and feature availability time;
- known future-leak fixtures fail;
- costs and slippage are nonzero by default or explicitly waived;
- benchmark comparison exists for every report;
- aggressive hurdle benchmark exists for every serious growth claim;
- live mode, leverage, shorting, derivatives, margin, and broker credentials are
  blocked;
- portfolio constraints reject negative weights and overweight positions;
- artifact completeness checks require manifest, config, hashes, metrics, review,
  and report;
- deterministic runs reproduce metrics from the same seed/config/data;
- LLM audit checks prove event extraction is cached, validated, and never traded
  directly.
- grounded-evidence checks reject unsupported material event claims;
- hallucination and memorization reviews exist for LLM-derived event features;
- LLM-derived labels do not encode known future outcomes, famous post-event
  narratives, or benchmark results;
- LLM prompt iterations and rejected variants are archived when they influence a
  research feature;
- every serious strategy defines train, validation, and protected test periods
  or a walk-forward protocol;
- protected test periods are not repeatedly queried during LLM-assisted
  iteration;
- parameter sweeps record the full grid/search space, rejected runs, and the
  selected rule before final test evaluation;
- promotion requires out-of-sample or walk-forward evidence, not only in-sample
  robustness.

Required tests before LEAN integration claims:

- CLI/source availability test;
- local synthetic-data smoke test;
- pinned Docker image reproducibility test;
- LEAN run-manifest completeness test;
- LEAN data-manifest completeness test;
- forbidden command scanner test;
- forbidden API/static AST scanner test;
- no-live-config test;
- result parser test;
- cost/slippage/fill disclosure test;
- report classification test.

Default failed-gate classification:

- `rejected` for leakage, invalid data, missing reproducibility, or benchmark
  failure;
- `educational_only` for synthetic data, biased universe scaffolds, or
  incomplete market realism;
- `not_live_ready` only for strategies that remain research-useful but fail
  paper/live readiness gates.

## CLI Scope

A thin CLI can be added after contracts stabilize.

Allowed commands:

```text
lincei-quant validate-config <config.yaml>
lincei-quant run-backtest <experiment.yaml>
lincei-quant validate-events <events.jsonl>
lincei-quant render-report <run_id>
lincei-quant review-run <run_id>
```

Forbidden default commands:

- `trade`;
- `order`;
- `broker`;
- `live`;
- `deploy`;
- credential management.

Keep `scripts/` as smoke/demo wrappers. Durable behavior belongs in package
modules plus CLI.

## Paper-Trading Gate

A strategy can be labeled `paper_trading_candidate` only after:

- reproducible repo-native backtest exists;
- independent LEAN backtest exists or the reason for skipping LEAN is documented;
- benchmark comparison is included;
- nonzero transaction costs and slippage are modeled;
- turnover, concentration, max drawdown, worst month, exposure, and trade count
  are reported;
- universe is point-in-time or survivorship bias is explicitly documented;
- event/news timestamps use tradable availability time;
- LLM prompts, outputs, edits, and rejected variants are archived;
- run manifests and data manifests are complete;
- human approval note exists;
- logging, monitoring, alerting, and kill-switch design exist.

Any strategy using LLM-derived event features requires a completed
`TradeSignalValidationReport`. `EventExtraction` alone can never justify
`paper_trading_candidate`.

Paper trading is still not live trading. Passing paper gates does not authorize
broker credentials or real-money deployment.

## Roadmap

### Phase 0: Specification And Guardrails

Deliverables:

- `SPEC.md`;
- strategy lane definitions;
- personal wealth objective and risk budget;
- benchmark and hurdle policy;
- context precedence and parallel agent workflow contract;
- decision classification policy;
- report expectations;
- explicit no-live-trading boundary.

Exit criteria:

- agents can tell whether a proposed change is research, paper-trading
  preparation, or forbidden live execution;
- every lane has a hypothesis, benchmark, aggressive hurdle, risks, and first
  validation plan.

### Phase 1: Research Substrate

Deliverables:

- expanded Pydantic contracts;
- nested experiment configs;
- `DataManifest`;
- local CSV and synthetic loaders;
- data quality tests;
- run manifest and artifact writer;
- stronger baseline reports;
- no-lookahead and timestamp tests.

Exit criteria:

- demo reports are reproducible;
- costs, slippage, turnover, benchmark, drawdown, and limitations appear in
  reports;
- live-trading gates reject execution paths.

### Phase 2: ETF Tactical Momentum

Deliverables:

- ETF universe config;
- momentum feature functions;
- monthly rebalance backtest;
- benchmark comparison;
- parameter perturbation report;
- risk overlay compatibility.

Exit criteria:

- at least one complete report is classified honestly;
- weak results are recorded;
- no conclusion depends on one optimized lookback.

### Phase 3: Equity Top-K Relative Strength

Deliverables:

- equity universe abstraction;
- liquidity and concentration controls;
- top-K strategy config;
- survivorship-bias disclosure;
- turnover/cost sensitivity.

Exit criteria:

- static-universe results remain `educational_only`;
- no serious claim is made until point-in-time universe handling exists.

### Phase 4: News Event Reaction Research

Deliverables:

- timestamped event fixtures;
- LLM extraction audit records;
- grounded evidence, hallucination, and memorization reviews;
- event validation reports;
- abnormal return study;
- shuffled-label and delayed-signal controls.

Exit criteria:

- events cannot be consumed before availability time;
- LLM output remains research context;
- any predictive claim beats non-LLM baselines out of sample.

### Phase 5: Regime/Risk Overlay

Deliverables:

- simple transparent regime filters;
- overlay interface shared by ETF and equity lanes;
- drawdown and missed-rebound analysis;
- stress-period reporting.

Exit criteria:

- overlay improves drawdown behavior without destroying benchmark-relative
  return;
- results survive simple parameter perturbation.

### Phase 6: LEAN External Validation

Deliverables:

- LEAN local availability preflight;
- Level 1 LEAN smoke test;
- `LeanRunManifest`;
- generated minimal backtest-only LEAN config;
- forbidden command/API scanner;
- subprocess runner;
- result parser;
- report bridge.

Exit criteria:

- LEAN validates a repo-native strategy without becoming the source of truth;
- every LEAN result has a manifest;
- no live/cloud/broker path exists.

### Phase 7: Paper-Trading Readiness Review

Deliverables:

- paper-trading candidate checklist;
- logging and alerting plan;
- kill-switch design;
- human approval note format;
- dry-run portfolio state model.

Exit criteria:

- candidate remains `paper_trading_candidate` or `not_live_ready`;
- no broker integration is added;
- no live execution path exists.

## Context Precedence

`SPEC.md` is the canonical contract. `AGENTS.md` and `CLAUDE.md` are short agent
adapters. `MASTER_CONTEXT.md` is compact handoff context. `PROJECT_CONTEXT.md`
is mission framing.

If any document conflicts with `SPEC.md`, follow `SPEC.md` and update or
disclose the drift in the same PR.

## Parallel Agent Workflow Contract

Each agent task must declare:

- objective;
- branch or worktree;
- files intended to touch;
- artifacts intended to create;
- reviewer role;
- allowed command surface.

Only one agent owns a `run_id`, report path, config path, or `prompt_id` at a
time. Agents must not overwrite another agent's artifacts unless the user
explicitly authorizes consolidation.

Handoffs must name changed files, commands run, artifacts produced, known
failures, and the next safe action.

## Agent-Generated Prompt Contract

Prompts that influence research must be versioned artifacts with:

- `prompt_id`;
- purpose;
- source inputs;
- model config;
- expected schema;
- validation rules;
- allowed downstream use.

Prompt outputs are untrusted until validated and linked through
`LLMAuditRecord`. Agent-generated prompts may propose hypotheses, extraction
schemas, and review questions. They must not produce orders, position targets,
signal-promotion approval, or execution approval.

## Autonomous Execution Boundary

Agents may run local tests, lint, deterministic smoke demos, and explicitly
requested backtests.

Agents must get human approval before paid data access, cloud execution,
optimization sweeps, long-running batch runs, recurring jobs, paper-trading
loops, broker-related setup, or any command that changes accepted research
state.

## PR And CI Contract

Every PR must include scope, risk classification, changed modules, generated
artifacts, commands run, and known limitations.

Minimum local checks:

- `ruff check .`;
- `pytest`;
- `git diff --check`.

Strategy PRs must include artifact completeness and no-lookahead evidence. LEAN
PRs must include forbidden command/API scanner results. No PR may introduce
broker credentials, live commands, live config, hidden paid data dependencies,
or unreviewed autonomous execution paths.

## Agent Operating Rules

Agents working in this repo must:

- start from a hypothesis, not a trade;
- keep strategy, data, features, signals, portfolio, risk, execution, and
  reporting separate;
- preserve failed experiments;
- disclose look-ahead, survivorship, timestamp, and overfitting risks;
- reject unclear data licensing;
- avoid current-universe historical claims;
- treat LLM output as untrusted until validated;
- keep live trading out of scope unless a separate approved design exists;
- prefer small tested modules over broad rewrites.

## Implementation Sequence

1. Add this `SPEC.md`.
2. Align `PROJECT_CONTEXT.md`, `MASTER_CONTEXT.md`, `README.md`, and docs with
   this spec where they drift.
3. Expand config and domain contracts without changing demo behavior.
4. Add `DataManifest`, local CSV/synthetic loaders, and data quality tests.
5. Add `signals/` and `portfolio/`; move equal-weight behavior out of the
   backtest module and into reusable signal/portfolio boundaries.
6. Strengthen backtest outputs: benchmark metrics, exposure, turnover, drawdown
   table, monthly returns, and cost sensitivity.
7. Add run manifest and artifact writer.
8. Expand reporting into skeptical review format.
9. Add timestamped news/event cache and fixtures.
10. Add LLM provider implementation only after audit records and validation tests
    exist.
11. Implement ETF tactical momentum v0.
12. Implement equity top-K relative strength v0 as `educational_only`.
13. Implement news event reaction study v0.
14. Implement transparent regime/risk overlay v0.
15. Implement sector/theme ETF rotation v0.
16. Implement quality/growth momentum equity basket v0 as `educational_only`.
17. Add LEAN subprocess smoke test and parser only after native artifacts are
    reproducible.

## Design Warnings

A good-looking backtest is not evidence of investability.

The two biggest early dangers are survivorship bias in equity research and
timestamp leakage in news research. The third is overfitting through repeated
LLM-assisted iteration. The system must preserve failed experiments because
hidden failures are part of the real parameter search.

Do not build a full event-driven engine before two or three simple strategies
expose real pressure.

Do not add deep LEAN integration, optimization sweeps, ML models, agent swarms,
broker APIs, or paper trading before data manifests, no-lookahead tests, and
report artifacts are boringly reliable.

The first durable win is not finding alpha. It is building a factory that can
reject bad alpha claims quickly, reproducibly, and without weakening risk gates.
