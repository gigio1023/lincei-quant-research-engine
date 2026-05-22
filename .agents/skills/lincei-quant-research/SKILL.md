---
name: lincei-quant-research
description: >
  Use this skill for this repository's quant research, news/NLP event extraction,
  backtest implementation, skeptical strategy review, paper-trading readiness, or
  Korean/English prompts like "전략 검증", "뉴스 이벤트 추출", "백테스트 리뷰",
  "투자 agent workflow", "quant research", "LLM trading signal validation".
---

# Lincei Quant Research

## Quick Start

1. Read `PROJECT_CONTEXT.md`, `AGENTS.md`, and the relevant doc in `docs/`.
2. Identify whether the task is strategy design, implementation, news extraction, review, or risk gating.
3. Keep the work research-first unless the user explicitly opens a separate execution-gate task.
4. Use Pydantic contracts in `src/lincei_quant/models.py` before inventing new data shapes.
5. End with tests run, known limits, and the current decision classification.

## Workflows

### Strategy Proposal

Return hypothesis, universe, data, signal, holding period, portfolio construction, risk controls,
benchmark, validation plan, failure modes, and decision.

### Backtest Implementation

Keep data loading, features, backtest logic, metrics, risk, and reporting separate. Add tests for
timestamp alignment and no-lookahead behavior before adding complex strategy code.

### News/Event Extraction

Preserve publication and ingestion timestamps. Validate strict JSON with `EventExtraction`. Include
bull, bear, and neutral interpretations plus a reason not to trade immediately.

### Skeptical Review

Lead with critical issues. Check leakage, survivorship bias, costs, slippage, turnover, benchmark
choice, LLM contamination, timestamp validity, and hidden live-trading paths.

## Reference Files

| File | When to read | Purpose |
|---|---|---|
| `references/review-checklist.md` | Before review or paper-readiness work | Common failure modes and output format |
| `docs/reference_landscape.md` | When choosing architecture or dependencies | Open-source reference map |
| `docs/news_nlp_protocol.md` | For news/NLP tasks | Event extraction rules |
| `docs/risk_policy.md` | For execution or paper-trading tasks | Safety gates |

## Gotchas

- Do not collapse this into a FinBERT sentiment project; LLM event structuring is broader.
- Do not let a report imply a strategy is investable because tests pass.
- Do not add broker credentials, order submission, or live execution as a casual extension.
- Do not use current facts inside historical predictions unless the leakage is explicit.
