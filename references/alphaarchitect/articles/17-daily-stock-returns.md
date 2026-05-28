---
status: "supporting research corpus source"
source: "Alpha Architect"
source_url: "https://alphaarchitect.com/daily-stock-returns/"
reader_url: "https://r.jina.ai/http://r.jina.ai/http://https://alphaarchitect.com/daily-stock-returns/"
title: "Unlocking Hidden Patterns: How Daily Returns Predict Future Stock Performance"
author: "Larry Swedroe"
published: "March 27th, 2026"
retrieved_at: "2026-05-27T06:30:13+00:00"
content_sha256: "97b2fcdc1a5a0e5ca1ee44a946b968801eccbca05b172db355fa6e501b40e42a"
permission_note: "Stored in-repository per user-provided permission on 2026-05-27. Preserve source attribution."
categories:
  - "Predicting Market Returns"
  - "Larry Swedroe"
  - "Research Insights"
  - "Other Insights"
---

# Unlocking Hidden Patterns: How Daily Returns Predict Future Stock Performance

Source: [https://alphaarchitect.com/daily-stock-returns/](https://alphaarchitect.com/daily-stock-returns/)

## Stored Article Text

Title: Unlocking Hidden Patterns: How Daily Returns Predict Future Stock Performance

URL Source: https://alphaarchitect.com/daily-stock-returns/

Published Time: 2026-03-27T15:43:00+00:00

Markdown Content:
Nusret Cakici, Christian Fieberg, Gabor Neszveda, Robert Bianchi, and Adam Zaremba, authors of the January 2026 study “[A Unified Framework for Anomalies based on Daily Returns](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6005614),” challenged how we think about short-term return patterns in stock markets. Their research reveals that the wealth of information contained in daily stock returns has been hiding in plain sight—and when properly extracted, it generates remarkable predictive power for future performance.

## What the Researchers Examined

The academic literature is filled with anomalies that attempt to predict stock returns using recent daily price movements. Some focus on when returns occurred (like short-term reversal strategies), while others emphasize how extreme they were (like the MAX effect, which looks at maximum daily returns). But here’s the puzzle: all these strategies draw from the same raw material—the sequence of daily returns over the past month—yet each isolates just one specific aspect.

The authors asked a more fundamental question: What if we let the data tell us how to weight and combine information from recent daily returns, rather than imposing arbitrary functional forms?

Using nearly a century of U.S. stock data (1937-2024), they employed machine learning techniques ([elastic net regression](https://protect.checkpoint.com/v2/r01/___https:/en.wikipedia.org/wiki/Elastic_net_regularization___.YXAzOnNhcmFncmlsbG86YzpnOjRlOWZhZTAyODNhNjIyYTIzMGQ2OTE4YTE0NGUwMDdkOjc6MWRhNzoyMzNiNmUyYzIxZDgzY2UxYWEzMDk5ZTg4MTA5YTg5OWYxYjJmMzc5MjkzOTlmN2RjYWIzY2E3OGIwNWY0NDJmOnA6VDpO)) to systematically extract two core dimensions from the past month’s daily returns:

1.   Chronological information: The time-ordered sequence of daily returns, capturing when returns occurred within the month.
2.   Rank information: The magnitude-ordered returns, capturing how extreme each daily outcome was relative to others in that month.

From these components, they constructed the Daily Return Information (DRI) signal and its corresponding factor portfolio, DRIF (Daily Return Information Factor).

## Key Findings

The results are compelling across multiple dimensions:

1. Powerful Return Predictability

The DRIF strategy generates impressive performance:

*   1.57% monthly return (nearly 19% annualized) with a Sharpe ratio of 1.23.

![Image 1](https://alphaarchitect.com/wp-content/uploads/2026/03/Fig-1-800x580.png)

*   Abnormal return (six-factor alpha) of 1.60% per month after controlling for standard risk factors.
*   Performance driven by both long and short sides of the strategy.
*   Delivers larger spreads among smaller, lower-priced, and less liquid firms. The premium also rises among companies with higher idiosyncratic volatility and more extreme recent returns, a pattern consistent with limits to arbitrage amplifying the predictability.

2. Timing Matters More Than Magnitude

When decomposing the signal, a clear hierarchy emerges:

*   The chronological component (when returns occur) delivers most of the predictive power—about 1.5% monthly spread
*   The rank component (extreme outcomes) adds incremental but smaller value—roughly 0.9% monthly
*   This suggests investors primarily respond to _recent price pressure and [liquidity effects](https://alphaarchitect.com/the-illiquidity-discount-is-an-opportunity-cost/)_ rather than behavioral reactions to extreme outcomes

3. Remarkably Robust

The premium survives numerous challenges:

*   Persists across 2,304 alternative research designs (varying sample definitions, methods, and portfolio rules)
*   Remains significant even in the modern era (2000-2024), earning about 1% monthly
*   Works for large-cap stocks, not just small illiquid names
*   Strengthens during periods of high volatility and elevated interest rates

4. Stands Out in the “Factor Zoo”

Perhaps most impressive, DRIF holds its own against the explosion of documented return predictors:

*   Improves portfolio Sharpe ratios even after controlling for 150+ known anomalies
*   Subsumes nearly all short-horizon anomalies: volatility effects, MAX patterns, short-term reversal, and lottery-style strategies all lose their explanatory power once DRIF enters the model
*   In systematic factor selection tests, DRIF is chosen immediately after the market factor—ranking above momentum, value, size, and profitability
*   Bayesian model-averaging across 8.8 trillion possible specifications identifies DRIF as having the highest probability of being a genuine risk factor

5. Practical and Implementable

Despite high turnover (~93% monthly), the strategy remains viable:

*   Breakeven [trading costs](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=3229719) (36-42 basis points per trade) exceed typical institutional levels (10–20 bps per trade). Microcaps produced the highest thresholds: the value-weighted micro-cap spread supports roughly 83 basis points.
*   Long-only implementations show even better cost profiles
*   Performance persists with one-day implementation lags

## Key Investor Takeaways

1. Rethink Short-Term Information

Investors should view recent daily returns as a rich, multidimensional information source rather than focusing on single metrics. The traditional short-term reversal strategy captures only part of the picture. A systematic, data-driven approach extracts significantly more predictive content.

2. Recency Is King

The dominance of chronological information tells us that the most recent price movements matter most for predicting next month’s returns. This aligns with theories about temporary price pressure, liquidity provision, and market microstructure effects. The market appears to respond primarily to _when_ events occur rather than just _how extreme_ they are.

3. This Isn’t Another Weak Anomaly

DRIF isn’t just statistically significant—it appears to be a fundamental driver of cross-sectional returns. Its ability to absorb the explanatory power of numerous established anomalies, consistently rank as a top factor in systematic selection procedures, and maintain significance across nearly a century of data suggests this represents a core dimension of risk or mispricing that the market prices systematically.

4. Volatility Regimes Matter

The strategy performs particularly well during turbulent periods with high VIX and elevated interest rates—exactly when liquidity pressures intensify and temporary mispricings widen. This state-dependence could inform tactical allocation decisions.

5. Large Caps Aren’t Exempt

Unlike many anomalies that fade among liquid, large-cap stocks, DRIF continues to generate significant returns even in the most tradable segment of the market. This suggests the underlying forces aren’t simply arbitrage constraints in small stocks but reflect broader market dynamics.

## The Bottom Line

By taking a holistic, machine-learning-driven approach to extracting information from daily returns, the authors have identified what appears to be a fundamental feature of how markets process information over short horizons.

For practitioners, the message is clear: the sequence and timing of recent daily returns contains powerful predictive information that simpler approaches miss. Whether you’re building factor portfolios, seeking alpha sources, or simply trying to understand what drives short-term return patterns, the Daily Return Information Factor represents an advance in how we think about and exploit recent price history.

The fact that this pattern has persisted for nearly 90 years, survives modern statistical challenges, and dominates established factors suggests it captures something real and enduring about market dynamics—not just a statistical fluke waiting to disappear.

_Larry Swedroe is the author or co-author of 18 books on investing, including his latest_[_Enrich Your Future_](https://protect.checkpoint.com/v2/r01/___https:/www.amazon.com/Enrich-Your-Future-Successful-Investing/dp/1394245440/___.YXAzOnNhcmFncmlsbG86YzpnOjRlOWZhZTAyODNhNjIyYTIzMGQ2OTE4YTE0NGUwMDdkOjc6ZDNjODplY2U5YmM2YjI3ZTI1YjcyY2FjMzY4YWE5OTc3MWMyMzcwYmMxNDkwMDNhMDFmOWZmODlkZTVhNDBjNmIzY2NkOnA6VDpO)_. He is also a consultant to RIAs as an educator on investment strategies._

—

## Important Disclosures

_For informational and educational purposes only and should not be construed as specific investment, accounting, legal, or tax advice. Certain information is deemed to be reliable, but its accuracy and completeness cannot be guaranteed. Third party information may become outdated or otherwise superseded without notice. Neither the Securities and Exchange Commission (SEC) nor any other federal or state agency has approved, determined the accuracy, or confirmed the adequacy of this article._

_The views and opinions expressed herein are those of the author and do not necessarily reflect the views of Alpha Architect, its affiliates or its employees. Our full disclosures are available[here.](https://alphaarchitect.com/disclosures/)Definitions of common statistics used in our analysis are available[here](https://alphaarchitect.com/disclosures/)(towards the bottom)._

_Join thousands of other readers and[subscribe to our blog](https://alphaarchitect.com/subscribe/)._
