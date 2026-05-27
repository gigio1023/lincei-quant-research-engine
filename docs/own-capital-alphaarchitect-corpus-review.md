# Own-Capital Architecture Review From Alpha Architect Corpus

Status: supporting review.

Last aligned: 2026-05-27.

## Scope

This review treats own-capital allocation as the first monetization priority. Darwinex/Zero remains a later track-record path. The immediate question is whether the current project architecture can produce a strategy that is robust enough for the operator's own pre-funded capital.

Source corpus:

- [Alpha Architect corpus index](../references/alphaarchitect/index.json)
- [Alpha Architect corpus README](../references/alphaarchitect/README.md)
- [Alpha Architect strategy register](../references/alphaarchitect/strategy-register.md)

The corpus contains 40 Alpha Architect blog articles retrieved from the public blog listing on 2026-05-27 and stored in-repository with source attribution per user-provided permission.

## Main Verdict

The architecture is directionally right but currently biased toward a best-case validation story:

```text
LLM/text evidence exists
  -> QuantConnect Cloud import exists
  -> paper replay exists
  -> dashboard explains the loop
```

That is not enough for own-capital allocation. The missing part is a boring, repeatable research-production ladder:

```text
strategy hypothesis
  -> point-in-time data contract
  -> simple baseline
  -> ablations
  -> broad cost/slippage/tax assumptions
  -> Cloud backtest
  -> current paper/live-shadow
  -> broker-read-only reconciliation
  -> broker-write spec
```

The project should now prioritize durable own-capital baselines over more surfaces. Darwinex/Zero should wait until the own-capital path can generate an independently defensible track record.

## What The Corpus Says

The 40 articles cluster into five practical themes.

| Theme | Relevant corpus rows | Own-capital implication |
| --- | --- | --- |
| Trend following and defensive allocation | 8, 11, 19, 21 | Start with simple liquid trend/defensive baselines. They are easier to validate, trade, and reconcile than complex semantic alpha. |
| Momentum and short-term return structure | 6, 10, 12, 17, 35 | Momentum needs volatility, skip-month, stock-specific, and news/LLM ablations before being trusted. |
| Factor crowding, factor valuation, anomaly demand | 2, 13, 18, 30, 33, 34, 38 | Alpha may come from demand pressure and factor timing, but this needs broad universe data and factor membership history. |
| Text and AI-derived signals | 20, 23, 35, 36 | This supports the LLM semantic alpha direction, but only as typed point-in-time features with live-shadow evaluation. |
| Frictions, turnover, leverage, broker quality, taxes | 4, 22, 31, 32, 37, 39 | Own-capital returns can disappear after costs, tax, leverage decay, broker failures, and overtrading. |

Several articles are not direct strategy candidates for this repo yet: private equity, options financing, long volatility, futures/carry, and leveraged single-stock ETFs. They are useful warnings, not current implementation targets.

## Highest-Value Strategy Candidates

### 1. Liquid Trend-Following Baseline

Why it matters:

- It is simple enough to debug end to end.
- It can be expressed through liquid ETFs before single-stock complexity.
- It gives a defensible first own-capital candidate if it survives costs and drawdowns.

Needed:

- daily adjusted bars;
- explicit rebalance schedule;
- moving-average and regime variants;
- benchmark-relative and absolute return reports;
- turnover and slippage assumptions;
- current paper/live-shadow run.

Current gap:

- The repo has LEAN runtime and quality-gated universe work, but the first promoted strategy is not yet a clean, boring trend-following baseline with full evidence.

### 2. Momentum And Daily-Return Feature Baseline

Why it matters:

- The corpus repeatedly points to momentum, skip-month behavior, volatility conditioning, and daily-return sequence features.
- This is a better first ML target than a fully autonomous LLM strategy.

Needed:

- canonical momentum feature definitions;
- daily-return rank/sequence features;
- volatility-regime features;
- broad enough universe to separate stock-specific and factor momentum;
- numeric-only, LLM-only, and combined ablations.

Current gap:

- The active universe is too narrow and thematic for robust cross-sectional momentum inference. It may overfit AI/software/semiconductor regimes.

### 3. Factor Crowding And Demand Pressure

Why it matters:

- The "factor playbook" idea is close to a tradable market-structure hypothesis: if many funds rebalance the same anomaly legs, demand pressure may be predictable.

Needed:

- broad stock universe;
- anomaly/factor membership snapshots;
- rebalance calendar;
- flow or demand proxies;
- start-of-month intraday or open-to-close data if the hypothesis requires it.

Current gap:

- The repo has no anomaly-membership feature store, no factor demand proxy, and no intraday execution/cost model. Implementing this now would be overfit unless reduced to a simple monthly factor-timing proxy first.

### 4. LLM Semantic Alpha From Filings, News, And Language

Why it matters:

- Articles on corporate language, AI disclosure analysis, and ChatGPT momentum support the project's LLM semantic-alpha thesis.

Needed:

- filing/news corpus with `availableAt`;
- source text versioning;
- fixed prompt/model versions;
- abstain records;
- live-shadow evaluation after the model's training window;
- evidence that LLM features improve numeric baselines.

Current gap:

- Current semantic ingestion is a good start, but it is mostly a pipeline proof. It is not yet a scalable filing/news alpha engine with ablation evidence.

## Architecture Overfit Risks

### Risk 1: Narrow Theme Universe Looks Smarter Than It Is

The current quality-gated universe is heavy in AI compute, software, power, and aerospace themes. That is useful for a conviction universe, but many Alpha Architect ideas require broad cross-section or cross-asset data. A strategy can look good simply because the selected themes had a favorable recent regime.

Fix:

- Keep `quality_core_backtest_safe` for the thematic strategy.
- Add separate research profiles for broad liquid ETFs and broad U.S. equities.
- Report when an alpha claim depends on the thematic universe.

### Risk 2: Cloud Import Can Become Selected-Run Evidence

Manual QuantConnect Cloud import is useful, but it can accidentally become a way to import only the runs that looked good.

Fix:

- Every Cloud attempt should create a run record, including failed, blocked, and bad runs.
- Promotion should require a run manifest that links parameter choices, source hashes, and all attempted variants.
- Add a selected-run-bias check before promotion.

### Risk 3: LLM Alpha May Be Treated As A Strategy Instead Of A Feature

The corpus supports LLM text features, but it does not justify letting the LLM become the allocator. LLMs may know historical outcomes, summarize persuasive narratives, or overfit research articles.

Fix:

- Keep LLM output as typed semantic alpha features.
- Require numeric-only, LLM-only, and combined ablations.
- Store flat/abstain/failed decisions.
- Prefer live-shadow evidence after the model/prompt version is fixed.

### Risk 4: Current Evidence Loop Is Not Yet Own-Capital Execution

Backtest, paper replay, and dashboard visibility do not prove broker readiness. Own-capital allocation needs broker-read-only snapshots, order/fill reconciliation, fee/tax accounting, and kill-switch drills.

Fix:

- Build broker-read-only adapter before broker writes.
- Add append-only cash, position, order, fill, fee, and tax-lot ledgers.
- Require cancel/flatten drills in paper/live-shadow before real order methods are implemented.

### Risk 5: Factor Ideas Need Vintage Data More Than The Current Repo Has

Many factor, valuation, macro, index, and filing ideas can be invalid if restated data leaks into backtests.

Fix:

- Implement vintage-data versioning before promoting factor timing, CAPE, fundamentals, index inclusion, macro-regime, or filing-language strategies.
- Block promotion when data vintage is unknown.

### Risk 6: Costs And Taxes Are Under-Specified

The corpus repeatedly warns about turnover, leverage decay, frictions, and tax structure. For own capital, after-cost and after-tax survivability matters more than pretty gross returns.

Fix:

- Add slippage, commission, spread, tax, and turnover reports to every promotion decision.
- Explicitly label before-tax vs after-tax evidence.
- Penalize strategies that require frequent turnover unless they have strong current paper/live-shadow evidence.

## Missing Architecture Pieces

| Missing piece | Why it matters for own capital | Suggested owner |
| --- | --- | --- |
| Hypothesis registry | Prevents blog/article ideas from becoming ad hoc trades. | Backend + docs |
| Broad research universe profiles | Needed for factor/momentum validity beyond a theme basket. | LEAN + config |
| Vintage-data store | Prevents restated macro/fundamental/text data from creating false alpha. | Backend + data pipeline |
| Numeric baseline runner | Establishes a durable baseline before LLM complexity. | LEAN + ML |
| Ablation framework | Proves whether LLM adds value over numeric features. | Backend + LEAN import |
| Selected-run-bias ledger | Prevents only winning Cloud runs from being promoted. | Backend |
| Cost/slippage/tax model | Determines whether own-capital trading can survive real frictions. | LEAN + backend |
| Broker-read-only adapter | Needed before any broker-write path. | Backend |
| Append-only account ledger | Required for reconciliation, P&L, and tax review. | Backend |
| Kill-switch and flatten drills | Required before real capital mutation. | Paper/live-shadow |

## Recommended Build Order

1. Add a hypothesis registry backed by the corpus.
2. Implement a liquid ETF trend-following baseline in LEAN.
3. Implement momentum/daily-return numeric features and ablations.
4. Add broad research profiles separate from the current theme universe.
5. Add selected-run-bias checks for Cloud import and promotion.
6. Add cost/slippage/tax reporting to promotion decisions.
7. Expand semantic alpha from FOMC evidence to filings/news only after the numeric baselines are stable.
8. Build broker-read-only reconciliation.
9. Draft the own-capital broker-write spec only after current paper/live-shadow runs are healthy.
10. Revisit Darwinex/Zero only after the strategy has an own-capital-grade track record.

## Practical Conclusion

The repo is not hopelessly overbuilt; the boundaries are mostly right. The risk is priority inversion. If the next work goes into more dashboards, more Darwinex design, or more LLM narrative without a simple validated capital-allocation baseline, the architecture will look sophisticated while still depending on best-case assumptions.

The next core slice should be:

```text
Alpha Architect hypothesis
  -> simple numeric baseline
  -> LEAN backtest
  -> Cloud import
  -> current paper/live-shadow
  -> reconciliation
  -> promotion report with cost and selected-run-bias checks
```

That slice serves own-capital allocation directly. Darwinex/Zero can only come after this works.
