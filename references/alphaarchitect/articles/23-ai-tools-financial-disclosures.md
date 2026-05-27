---
status: "supporting research corpus source"
source: "Alpha Architect"
source_url: "https://alphaarchitect.com/ai-tools-financial-disclosures/"
reader_url: "https://r.jina.ai/http://r.jina.ai/http://https://alphaarchitect.com/ai-tools-financial-disclosures/"
title: "How AI Can Help Find the Needle in the Haystack"
author: "Larry Swedroe"
published: "February 27th, 2026"
retrieved_at: "2026-05-27T06:30:13+00:00"
content_sha256: "132826a46749801efab31ad8967f5a8435057497c3c95bc6a8505f41828599cf"
permission_note: "Stored in-repository per user-provided permission on 2026-05-27. Preserve source attribution."
categories:
  - "Research Insights"
  - "Larry Swedroe"
  - "AI and Machine Learning"
  - "Other Insights"
---

# How AI Can Help Find the Needle in the Haystack

Source: [https://alphaarchitect.com/ai-tools-financial-disclosures/](https://alphaarchitect.com/ai-tools-financial-disclosures/)

## Stored Article Text

Title: How AI Can Help Find the Needle in the Haystack

URL Source: https://alphaarchitect.com/ai-tools-financial-disclosures/

Published Time: 2026-02-27T16:03:00+00:00

Markdown Content:
[Skip to content](https://alphaarchitect.com/ai-tools-financial-disclosures/#content)

[![Image 1](https://alphaarchitect.com/wp-content/uploads/2023/04/logo.png)](https://alphaarchitect.com/)

*   [ETFs](https://alphaarchitect.com/disclaimer)
    *   [Review Our ETFs](https://alphaarchitect.com/disclaimer)
    *   [Start an ETF](https://etfarchitect.com/)

*   [1042 QRP](https://alphaarchitect.com/1042qrp/)
*   [About](https://alphaarchitect.com/about/)
    *   [Firm](https://alphaarchitect.com/about/)
    *   [Team](https://alphaarchitect.com/about/team/)

*   [Research](https://alphaarchitect.com/ai-tools-financial-disclosures/)
    *   [Blog](https://alphaarchitect.com/blog/)
    *   [“Best Of” Blog](https://alphaarchitect.com/best-of-blog/)
    *   [Academic Research](https://alphaarchitect.com/research-articles/)
    *   [Books](https://alphaarchitect.com/book)
    *   [New? Start Here](https://alphaarchitect.com/an-introduction-to-investing-and-how-to-use-our-site/)

*   [Search](https://alphaarchitect.com/ai-tools-financial-disclosures/# "Search")

Artificial intelligence is rapidly transforming the investment landscape in ways that extend far beyond algorithmic trading and robo-advisors. One of AI’s most promising applications lies in its ability to process and extract meaning from vast amounts of unstructured text—something that even the most diligent human investors struggle to do at scale. While a skilled analyst might carefully read through a handful of company filings in a day, AI can analyze thousands of documents simultaneously, identifying patterns and connections that would be virtually impossible for humans to spot. This capability is particularly valuable because much of the information that moves stock prices is buried in narrative disclosures—the sea of text that companies release through regulatory filings.

With the average 10-K report containing over 60,000 words, the challenge is identifying which sentences actually matter—what’s actually _new_ and important enough to move stock prices? Finding this relevant information can be like trying to find a “needle in a haystack.” Anna Costello, Bradford Levy, and Valeri Nikolaev, authors of the November 2025 study “[Representations of Investor Beliefs](https://protect.checkpoint.com/v2/r01/___https:/papers.ssrn.com/sol3/papers.cfm?abstract_id=5717862___.YXAzOnNhcmFncmlsbG86YzpnOjExOGU5MzRiYzdlYWEzYmE5YjkwNjA0ZmI3ZjI2ZTg0Ojc6ZGZkMjowODc4MjUxZmM0MGQzZWRkMTcyNjQ1Zjg4YWE3OThlZDUxNzliOTZlYmZiYzRjYWExN2YyNzJlNDdlOWViMzA0OnA6VDpO)” tackled this question using artificial intelligence.

**What the Researchers Examined**

Costello, Levy, and Nikolaev developed a novel approach to identify “surprise” information in corporate filings. Their solution combined information theory with large language models (LLMs)—the same technology behind ChatGPT. They trained AI models specifically on financial disclosures to understand what information investors already know about a company, then used these models to identify truly _new_ information in subsequent filings. Their study required:

*   Pretraining an LLM from scratch on a cross-section of firms’ narrative disclosures.
*   Further pretraining the LLM from each individual firm’s time-series of disclosures to yield a firm-specific model for each firm in the sample.
*   Iteratively applying and further pretraining the firm-specific model.
*   Out-of-sample test to measure the information in new narrative disclosures.

Their study analyzed all disclosures filed on SEC EDGAR by 500 companies from 1996 through 2023, covering nearly 278,000 filings with approximately 1.7 billion words. By pretraining from scratch with a fixed knowledge cutoff of 2007 and iteratively updating each firm-specific LLM, they addressed concerns regarding look-ahead bias.

**Key Findings**

**1. Most News Doesn’t Come from Where You Think**

While investors and researchers traditionally focus on earnings announcements and quarterly reports, the study found that the majority of new information actually arrives through current reports (Form 8-K) and exhibits attached to filings, rather than the main portions of annual and quarterly reports.

Exhibits attached to filings contained roughly 150% more high-information content than main filing portions. Even more striking, while [earnings announcements](https://alphaarchitect.com/macroeconomic-announcements/) receive enormous attention, other 8-K items like changes in accountants, bankruptcy notices, and warnings about previously issued financial statements contained 60% or more high-information content.

**2. Information Arrives Continuously, Not Just Quarterly**

The research revealed that 55.2% of high-information content arrives almost continuously via non-earnings announcement current reports and other filings, while only 10.2% comes from earnings announcements, 14.3% from quarterly reports, and 20.3% from annual reports—challenging the common practice of only checking in on companies during quarterly earnings season.

**3. The AI Measure Explains Market Reactions**

The researchers validated their approach by showing it explained actual market behavior—companies with filings in the highest information decile saw a 106% increase in absolute returns on the disclosure date, compared to just 24.2% for those in the lowest decile.

**4. Sentiment Only Matters When It’s Informative**

While traditional sentiment analysis found that the difference between the most negative and most positive filings was about 53 basis points, when the researchers weighted sentiment by information content, this difference jumped to 422 basis points. In other words, it’s not just whether language is positive or negative that matters—it’s whether that positive or negative language is telling investors something they didn’t already know.

**5. Limited Attention Has Consequences**

The study examined what happens when investors only process certain types of disclosures. They found that investors who only read annual reports or annual and quarterly reports would experience perceived “under-reactions” to what they consider news, while investors relying solely on current reports generally saw market reactions that matched their beliefs but were somewhat muted.

Their findings led Costello, Levy, and Nikolaev to conclude: “LLMs can be used to form priors over narrative content, which can then be used to identify information in new content.”

**Key Investor Takeaways**

**1. Don’t Just Focus on Earnings Day**

If you’re only paying attention during quarterly earnings announcements, you’re missing the majority of important information. Set up alerts for all Form 8-K filings from companies in your portfolio, not just earnings releases.

**2. Read the Exhibits**

Those lengthy attachments to SEC filings that most investors skip? They often contain the most newsworthy information—new contracts, debt agreements, and material business developments.

**3. Context Is Everything**

A filing that sounds negative isn’t necessarily bad news if it’s just repeating information the company already disclosed. Similarly, positive language only matters if it represents genuinely new information. This is where the research suggests AI tools could help individual investors level the playing field.

**4. Continuous Monitoring Matters**

Unlike earnings that arrive on a predictable quarterly schedule, important information can drop at any time. This creates challenges for individual investors but also opportunities for those willing to stay engaged throughout the year.

**5. The Information Advantage Is Real**

The fact that this AI-based measure of information can predict returns up to 12 months out suggests that carefully processing narrative disclosures provides genuine investment insights. The market does eventually incorporate this information.

**The Bottom Line**

This research provides scientific validation for something many experienced investors intuitively know: reading and understanding company disclosures matters. However, it also highlights that in our data-saturated world, _what_ you read and _how_ you process it is just as important as whether you read it at all.

As AI tools become more accessible, individual investors may soon have powerful allies in sorting through the haystack of corporate disclosures to find the needles that really matter. Until then, the key lesson is clear: widen your aperture beyond quarterly earnings, pay attention to all material disclosures, and remember that novelty—not just sentiment—is what moves markets.

**AI and the Future of Market Efficiency**

The fact that AI can identify information that predicts returns up to a year in advance suggests that markets may not be as efficient at processing narrative information as they are at processing numerical data like earnings surprises. The sheer volume and complexity of textual disclosures—with important information scattered across different filing types, arriving at unpredictable times, and buried in lengthy exhibits—creates natural barriers to information processing that even sophisticated investors struggle to overcome.

As AI tools become more widely accessible and adopted, we may see markets become more efficient at incorporating narrative information. When more investors can quickly identify and act on genuinely new information regardless of where or when it appears, mispricings based on limited attention or incomplete processing should diminish. This could narrow the window of opportunity for generating alpha from textual analysis.

However, this also raises an interesting paradox: if everyone has access to similar AI tools, will the advantage disappear? Not necessarily. The key will lie in how these tools are applied, what questions investors ask of them, and how their insights are integrated with other forms of analysis and judgment. AI can process information at superhuman scale, but investment success will still require human wisdom in interpreting that information and making decisions under uncertainty.

The future of investing isn’t about AI replacing human judgment—it’s about augmenting human capabilities to navigate an ever-expanding universe of information. Those who learn to harness this partnership effectively may discover that the real alpha lies not in having more information, but in knowing what information matters.

Larry Swedroe is the author or co-author of 18 books on investing, including his latest[_Enrich Your Future_](https://protect.checkpoint.com/v2/r01/___https:/www.amazon.com/Enrich-Your-Future-Successful-Investing/dp/1394245440/___.YXAzOnNhcmFncmlsbG86YzpnOjExOGU5MzRiYzdlYWEzYmE5YjkwNjA0ZmI3ZjI2ZTg0Ojc6NmVmNzo4OGQzNGZkOWUyY2EwZDkxMzljOGQwZmMwODA0NTMwZTNhNTc0M2RjOTg5M2FiMTcyMmNlMWVhNmZlZTBjZDRhOnA6VDpO). He is also a consultant to RIAs as an educator on investment strategies.

![Image 2](blob:http://localhost/4f6f139e95384b24b38da57a6f0f870d)

—

## Important Disclosures

_For informational and educational purposes only and should not be construed as specific investment, accounting, legal, or tax advice. Certain information is deemed to be reliable, but its accuracy and completeness cannot be guaranteed. Third party information may become outdated or otherwise superseded without notice. Neither the Securities and Exchange Commission (SEC) nor any other federal or state agency has approved, determined the accuracy, or confirmed the adequacy of this article._

_The views and opinions expressed herein are those of the author and do not necessarily reflect the views of Alpha Architect, its affiliates or its employees. Our full disclosures are available[here.](https://alphaarchitect.com/disclosures/)Definitions of common statistics used in our analysis are available[here](https://alphaarchitect.com/disclosures/)(towards the bottom)._

_Join thousands of other readers and[subscribe to our blog](https://alphaarchitect.com/subscribe/)._

[Page load link](https://alphaarchitect.com/ai-tools-financial-disclosures/#)[Go to Top](https://alphaarchitect.com/ai-tools-financial-disclosures/#)
