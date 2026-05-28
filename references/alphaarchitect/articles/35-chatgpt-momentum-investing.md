---
status: "supporting research corpus source"
source: "Alpha Architect"
source_url: "https://alphaarchitect.com/chatgpt-momentum-investing/"
reader_url: "https://r.jina.ai/http://r.jina.ai/http://https://alphaarchitect.com/chatgpt-momentum-investing/"
title: "Can AI Read the News Better Than You? How ChatGPT Could Transform Momentum Investing"
author: "Larry Swedroe"
published: "January 16th, 2026"
retrieved_at: "2026-05-27T06:27:07+00:00"
content_sha256: "e6f0ff3c3978ee370d94cbcf236ad768d238d48ef6246b4620b1de40b662417c"
permission_note: "Stored in-repository per user-provided permission on 2026-05-27. Preserve source attribution."
categories:
  - "Research Insights"
  - "AI and Machine Learning"
  - "Momentum Investing Research"
---

# Can AI Read the News Better Than You? How ChatGPT Could Transform Momentum Investing

Source: [https://alphaarchitect.com/chatgpt-momentum-investing/](https://alphaarchitect.com/chatgpt-momentum-investing/)

## Stored Article Text

Title: Can AI Read the News Better Than You? How ChatGPT Could Transform Momentum Investing

URL Source: https://alphaarchitect.com/chatgpt-momentum-investing/

Published Time: 2026-01-16T16:33:00+00:00

Markdown Content:
[Skip to content](https://alphaarchitect.com/chatgpt-momentum-investing/#content)

[![Image 1](https://alphaarchitect.com/wp-content/uploads/2023/04/logo.png)](https://alphaarchitect.com/)

*   [ETFs](https://alphaarchitect.com/disclaimer)
    *   [Review Our ETFs](https://alphaarchitect.com/disclaimer)
    *   [Start an ETF](https://etfarchitect.com/)

*   [1042 QRP](https://alphaarchitect.com/1042qrp/)
*   [About](https://alphaarchitect.com/about/)
    *   [Firm](https://alphaarchitect.com/about/)
    *   [Team](https://alphaarchitect.com/about/team/)

*   [Research](https://alphaarchitect.com/chatgpt-momentum-investing/)
    *   [Blog](https://alphaarchitect.com/blog/)
    *   [“Best Of” Blog](https://alphaarchitect.com/best-of-blog/)
    *   [Academic Research](https://alphaarchitect.com/research-articles/)
    *   [Books](https://alphaarchitect.com/book)
    *   [New? Start Here](https://alphaarchitect.com/an-introduction-to-investing-and-how-to-use-our-site/)

*   [Search](https://alphaarchitect.com/chatgpt-momentum-investing/# "Search")

**The Research Question: Can AI Actually Improve Momentum Strategies?**

Momentum investing has been a cornerstone of quantitative finance for decades. Researchers Nikolas Anic, Andrea Barbon, Ralf Seiz, and Carlo Zarattini hypothesized that the ability of large language models (LLMs) to interpret and synthesize textual information in real time can be used to identify news that is likely to trigger price momentums. Their study, “[ChatGPT in Systematic Investing, Enhancing Risk-Adjusted Returns with LLMs](https://url.avanan.click/v2/r01/___https:/papers.ssrn.com/sol3/papers.cfm?abstract_id=5680782___.YXAzOnNhcmFncmlsbG86YTpnOmQwNjQyM2MxYmE2ZWQxNjRlOGUzOTI0MTdlZmI5MjE1Ojc6Njg1MjplYmE4ZGM2NzBmYzBkY2QxZjA0ZWQwYmYxN2M4YTAyYzdmNDg3Y2Q0ZDM3NzQxMDBiNzRmNDU5MTA2OWI5ODgxOnA6VDpO)”, tested whether an LLM like ChatGPT can actually improve real-world investment strategies.

**The Research Setup**

The research team created a testing environment that combined three key data sources:

1.   Daily stock returns for S&P 500 companies from October 2019 to March 2025.
2.   High-frequency news data with second-level precision from reputable sources including CNBC, Bloomberg, Zacks, and The Motley Fool.
3.   ChatGPT 4.0 mini accessed through prompts designed to extract semantic signals from the text of each news article, such as its relevance to the firm, and whether the news is likely to reinforce or contradict existing price trends.

**The Innovation: AI as a News Interpreter**

Here’s where it gets interesting. Traditional momentum strategies simply rank stocks by past performance and buy the winners. The researchers enhanced this by:

*   Feeding ChatGPT all news articles about each momentum candidate from the previous day.
*   Explicitly telling the AI that the stock was about to enter a momentum portfolio.
*   Asking the model to score (0 to 1) whether recent news supports continued strong performance.
*   Using these scores to both select stocks and adjust portfolio weights.

This approach is fundamentally different from older sentiment analysis methods. Instead of counting positive and negative words, ChatGPT actually interprets the context and meaning of news in relation to the momentum hypothesis.

**The Testing Framework**

They began by sorting stocks each month based on their past 12-month returns (excluding the most recent month) and constructing a long-only portfolio by buying the top two deciles. They focused on the long leg to better reflect realistic investment constraints and institutional practices. They then split their data into two periods:

*   **Validation Set** (October 2019 – December 2023): Used to optimize 512 different parameter combinations.
*   **Test Set** (January 2024 – March 2025): Out-of-sample period for final evaluation.

Crucially, ChatGPT 4.0 mini was trained only through October 2023, making results from November 2023 onward completely free from any possibility that the model was using memorized information. This was a genuine test of the AI’s ability to interpret new, unseen events.

**Key Findings:**

**Performance Gains Are Real and Substantial**

The LLM-enhanced strategy delivered impressive improvements across multiple metrics:

**Full Sample Results:**

*   Sharpe ratio increased from 0.57 to 0.69 (21% improvement).
*   Sortino ratio jumped from 0.54 to 0.69 (28% improvement).
*   Annual returns rose from 15% to 18%.
*   Volatility decreased from 26% to 24%.
*   Maximum drawdown improved from -33% to -31%.

**Out-of-Sample Results (Even Better):**

*   Sharpe ratio surged from 0.79 to 1.06 (34% improvement).
*   Sortino ratio increased from 0.93 to 1.28 (38% improvement).
*   Annual returns climbed from 24% to 30%.
*   Volatility dropped from 24% to 22%.
*   Maximum drawdown improved from -19% to -17%.

![Image 2](blob:http://localhost/44f425f0363766914a47fa366988a965)
_The results are hypothetical results and are NOT an indicator of future results and do NOT represent returns that any investor actually attained.Indexes are unmanaged and do not reflect management or trading fees, and one cannot invest directly in an index_.

**The Out-of-Sample Period Validation**

The fact that performance actually improved in the out-of-sample period (after the AI’s training cutoff) is perhaps the study’s most important finding. This strongly suggests that ChatGPT isn’t just pattern-matching from its training data but is genuinely capable of interpreting news and extracting forward-looking signals.

**Robustness: It Works Under Real-World Conditions**

The researchers tested their strategy under the following assumptions:

*   **Transaction costs**: All results include 2 basis points per trade.
*   **Different prompts**: Both simple and complex prompts worked, with simpler ones slightly better.
*   **Various portfolio sizes**: Tested from 25 to 100 stocks.
*   **Rebalancing frequencies**: Compared weekly and monthly approaches.
*   **Weight constraints**: Applied maximum position limits.

The strategy remained profitable across all these variations, demonstrating genuine robustness rather than fragile overfitting.

**Optimal Configuration: Less Is Often More**

The research uncovered several insights about what works best:

1.   **Monthly rebalancing** far outperformed weekly (lower transaction costs matter).
2.   **One-day news lookback** was optimal (markets incorporate news quickly).
3.   **Simple prompts** worked better than complex ones.
4.   **50 stocks** seemed to be the sweet spot for balancing conviction and diversification. However, the more concentrated 25-stock portfolio achieved the highest Sharpe ratio, approximately 1.3, compared to around 0.95 for a 100-stock portfolio. This suggests the AI’s edge is strongest in identifying high-conviction opportunities rather than providing broad market coverage.
5.   **Value-weighted** initial allocation leveraged the information advantage of larger, news-rich companies.
6.   **High score tilt** (multiplier of 5) captured the full benefit of the AI signals.

**Key Takeaways for Investors**

**1. AI Can Add Genuine Value to Systematic Strategies**

This research provides evidence that LLMs aren’t just hype—they can extract meaningful predictive signals from financial news that translate into improved risk-adjusted returns. The technology is ready for practical application today.

**2. Simplicity Beats Complexity**

Investors don’t need elaborate AI systems or complex prompts to benefit from this technology. The basic prompt used in this study was straightforward, essentially asking: “Given that this stock has shown momentum, does recent news support continuation?” This has important implications for cost and implementation.

**3. The Power Is in Real-Time Interpretation, Not Memorization**

Because performance improved after the AI’s training cutoff, we know these gains stem from genuine language understanding rather than pattern recognition. This suggests the approach could remain effective going forward as new events unfold—unless, of course, everyone else does it and the advantage is arbitraged away.

**4. Concentration and Conviction Matter More Than Diversification**

For investors using AI-enhanced strategies, the research suggests focusing on fewer, higher-conviction positions rather than trying to spread the signal across many stocks. This aligns with the intuition that AI works best where there’s substantial, impactful [news flow](https://alphaarchitect.com/news-and-its-impact-on-risk-and-returns-around-the-world/).

**5. Transaction Costs Still Matter**

While the AI signal is valuable, the research confirms that monthly rebalancing outperforms weekly specifically because of transaction costs. Even with powerful predictive tools, traditional portfolio management principles around cost minimization remain crucial.

**6. Implementation Is Practical and Scalable**

The researchers used ChatGPT 4.0 mini, a relatively inexpensive model. They didn’t fine-tune it or require massive computational resources. This means individual investors or smaller asset managers could potentially implement similar approaches without prohibitive infrastructure costs. However, one note of caution is that the use of a one-day look back at the news strategy might have a flaw in that news on stocks is often conveyed _after the close_. In that case, the news is reflected in the _opening price_ the next morning. Typically, momentum (and other monthly) strategies use closing prices. Thus, the advantage conveyed by a one-day lookback may not be realizable in real life.

**7. Larger Stocks Benefit More**

The strategy worked best with value-weighted portfolios, suggesting that the information advantage is strongest for larger, more widely covered companies. This makes sense—more news means more signal for the AI to extract. For retail investors, this means focusing AI-enhanced strategies on liquid, large-cap names. However, another explanation is that the result just reflected that positions in the megacap stocks like the Mag 7 worked best in this time period.

**8. This Is Just the Beginning**

The study’s limitations—short out-of-sample period, single model, focus on U.S. large caps—also represent opportunities. There’s significant room for improvement through model fine-tuning, incorporating additional data sources, extending to other markets, asset classes, or less liquid securities.

Their findings led the authors to conclude:

“Our findings suggest that LLMs are not merely experimental tools but practical, scalable components of modern investment processes, capable of delivering incremental value beyond established factor models.”

**Practical Considerations and Caveats**

**What This Research Doesn’t Mean**

*   **Not fully tested across all market conditions**: The sample period doesn’t include extreme events like the 2008 financial crisis.
*   **Not yet validated for individual investors**: The study used institutional-level execution assumptions.

**Important Limitations to Consider**

1.   **Data costs**: Access to high-frequency news feeds and API calls to ChatGPT involves ongoing expenses.
2.   **Model evolution**: ChatGPT and other LLMs are constantly updated, which could affect performance.
3.   **Market adaptation**: If many investors adopt similar AI-enhanced strategies, the edge could diminish.
4.   **Regulatory considerations**: The use of AI in investment management may face evolving regulatory scrutiny
5.   **Execution quality**: Retail investors may face higher transaction costs than the 2 bps assumed in the study

**Conclusion**

The study provided evidence that ChatGPT and similar large language models can enhance traditional investment strategies through superior interpretation of financial news. The improvements are economically meaningful, statistically robust, and persist under realistic implementation constraints.

But perhaps most importantly, this research opens the door to an entire new field of inquiry. What other investment strategies could benefit from AI enhancement? How can multiple AI-generated signals be combined optimally? Can these approaches work in less efficient markets where information advantages might be even larger?

The integration of large language models into systematic investing is no longer a question of “if” but “how.” As these tools continue to evolve and as researchers uncover optimal ways to leverage them, we’re likely standing at the beginning of a fundamental transformation in how investment decisions are made.

For investors willing to embrace this technology thoughtfully—combining AI’s interpretive power with sound risk management and realistic expectations—the opportunities are significant. The machines aren’t replacing human investors; they’re becoming powerful partners in the quest for superior risk-adjusted returns.

_Larry Swedroe is the author or co-author of 18 books on investing, including his latest,_[_Enrich Your Future: The Keys to Successful Investing_](https://url.avanan.click/v2/___https:/www.amazon.com/Enrich-Your-Future-Successful-Investing/dp/1394245440/?_encoding=UTF8&pd_rd_w=4Sseu&content-id=amzn1.sym.a725c7b8-b047-4210-9584-5391d2d91b93%3Aamzn1.symc.d10b1e54-47e4-4b2a-b42d-92fe6ebbe579&pf_rd_p=a725c7b8-b047-4210-9584-5391d2d91b93&pf_rd_r=RYEQQT5H3TKW4PDAEYEW&pd_rd_wg=0Qq3I&pd_rd_r=4591f111-2c92-421b-9949-5c47e3cc1eb3&ref_=pd_hp_d_atf_ci_mcx_mr_hp_atf_m___.YXAzOnNhcmFncmlsbG86YTpnOmJiM2Y3YWRjZmE4MDZiYzQ1M2JlOWFlMDkyMzMyYjU3OjY6NTJkODozNGUwNTA3ZTk1OGE4MjY0OWMyMTg2NjUxNzE3ZjM1YTZkODY5ZDdlNmYwYjQwZjNjOTBiZGEzNTc1NTE3YjZkOnA6VA). You can subscribe to my Substack column [here.](https://url.avanan.click/v2/r01/___https:/larryswedroe.substack.com/___.YXAzOnNhcmFncmlsbG86YTpnOmQwNjQyM2MxYmE2ZWQxNjRlOGUzOTI0MTdlZmI5MjE1Ojc6ZDE0MDoyNGJlZTUyZWVjM2Y0NTkwMmRiZGVkOTM1YjQzYzViYzEwNmI4MmRhYTI0YTMwNTdmN2RhNzI1ZjkxOTQ2NDQ4OnA6VDpO)

![Image 3](blob:http://localhost/4f6f139e95384b24b38da57a6f0f870d)

—

## Important Disclosures

_For informational and educational purposes only and should not be construed as specific investment, accounting, legal, or tax advice. Certain information is deemed to be reliable, but its accuracy and completeness cannot be guaranteed. Third party information may become outdated or otherwise superseded without notice. Neither the Securities and Exchange Commission (SEC) nor any other federal or state agency has approved, determined the accuracy, or confirmed the adequacy of this article._

_The views and opinions expressed herein are those of the author and do not necessarily reflect the views of Alpha Architect, its affiliates or its employees. Our full disclosures are available[here.](https://alphaarchitect.com/disclosures/)Definitions of common statistics used in our analysis are available[here](https://alphaarchitect.com/disclosures/)(towards the bottom)._

_Join thousands of other readers and[subscribe to our blog](https://alphaarchitect.com/subscribe/)._

[Page load link](https://alphaarchitect.com/chatgpt-momentum-investing/#)[Go to Top](https://alphaarchitect.com/chatgpt-momentum-investing/#)
