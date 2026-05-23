# LLM Alpha Committee

## Purpose

The LLM committee should reason like an investment team, but produce typed alpha decisions that LEAN can execute and the control plane can audit.

The committee is allowed to judge. It is not allowed to place orders.

## Agent Roles

| Role | Job | Output |
|---|---|---|
| Technical Analyst | Interpret numeric factor and price context | trend, momentum, volatility, invalidation levels |
| News / Sentiment Analyst | Read recent news and social/news sentiment | sentiment, novelty, event type, urgency |
| Fundamental Analyst | Review earnings, valuation, growth, balance-sheet context | fundamental score, key risks |
| Macro Analyst | Review rates, inflation, FX, index, sector, and volatility regime | macro risk and exposure modifier |
| Bull Researcher | Build the strongest long thesis | positive evidence |
| Bear Researcher | Build the strongest short/avoid thesis | negative evidence |
| Risk Reviewer | Challenge sizing, liquidity, drawdown, and concentration | risk cuts and abstain reasons |
| Final Trader | Produce final typed `AlphaDecision` | direction, horizon, confidence, max position hint |

The roles can run in parallel where possible. The Final Trader should consume the structured outputs, not raw chat transcripts.

## Decision Schema

```ts
type LlmAlphaDecision = {
  symbol: string;
  asOf: string;
  horizonDays: number;
  direction: "up" | "down" | "flat";
  expectedReturnBps?: number;
  confidence: number;
  conviction: "low" | "medium" | "high";
  maxPositionPct?: number;
  stopLossPct?: number;
  takeProfitPct?: number;
  eventScore?: number;
  fundamentalScore?: number;
  macroRiskScore?: number;
  thesis: string;
  counterThesis: string;
  evidenceRefs: string[];
  abstainReason?: string;
};
```

## Guardrails

- Use structured outputs only.
- Require evidence references for every non-flat decision.
- Require counter-thesis for every long or short decision.
- Require an abstain path.
- Reject decisions based on stale inputs.
- Do not expose broker credentials, account ids, or tokens.
- Do not ask the LLM to generate raw broker orders.
- Store model name, prompt version, input hash, output hash, and latency.

## Backtest Bias Controls

LLM backtests can be biased because modern models may have seen historical news or company outcomes during training. Mitigations:

- prefer post-model-training-period live-shadow evaluation;
- anonymize company names for sentiment-only experiments where practical;
- compare headline-only, anonymized, and numeric-only baselines;
- timestamp every retrieved document by availability time;
- separate prompt version, model version, and data window;
- do not promote LLM-only strategies from in-sample historical results.

## Where LLM Judgment Is Valuable

Use LLM judgment for:

- interpreting ambiguous events;
- deciding whether a numeric trend is supported by narrative;
- identifying crowded or fragile trades;
- summarizing earnings-call or filing surprises;
- creating hypotheses for Lean backtests;
- choosing between already-validated strategy variants;
- explaining why the system abstained.

Avoid LLM judgment for:

- final order quantity;
- covariance estimation;
- latency-sensitive stops;
- broker request payloads;
- hidden strategy parameter search without recording failed trials.

## First Implementation

Start with one committee workflow:

1. gather a feature snapshot for each candidate symbol;
2. retrieve recent news/filings/macro snippets;
3. run Technical, News, Macro, Bull, and Bear roles in parallel;
4. run Risk Reviewer;
5. run Final Trader to emit `LlmAlphaDecision`;
6. store all outputs;
7. pass the decision to Meta Alpha.

The first committee can use hosted frontier models. Local fine-tuning is optional and belongs in the training plan.
