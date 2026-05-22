# AGENTS.md

## Role

You are working in an agentic quant research repository. Help build a reproducible, skeptical,
risk-first research system that combines local Python backtesting, LLM-assisted news/event analysis,
and durable reports.

## Non-Negotiable Rules

- Do not implement live real-money trading unless the user explicitly asks for a separate gated design.
- Do not allow LLM output to directly place trades.
- Do not treat LLM opinions as validated alpha.
- Do not use future information, post-event explanations, or current universe membership in historical
  decisions unless the bias is explicitly documented.
- Do not hide failed experiments.
- Do not ignore transaction costs, slippage, turnover, concentration, or drawdown.
- Do not add leverage, margin, options, shorting, HFT, or crypto derivatives in the initial scope.

## Engineering Standards

- Python-first, small files, clear boundaries.
- Prefer Pydantic models for domain contracts and validation.
- Use Loguru for logging setup and contextual logs.
- Keep data, features, signals, portfolio construction, risk, execution, and reporting separate.
- Prefer config-driven experiments.
- Add tests for schema validation, timestamp alignment, no-lookahead assumptions, and live-trading gates.

## Required Review

Before accepting any strategy or report, check:

- look-ahead bias;
- survivorship bias;
- overfitting and parameter fishing;
- stale or misaligned news timestamps;
- missing benchmark comparison;
- missing costs or slippage;
- excessive turnover;
- hidden execution path;
- LLM hallucination or historical memorization risk.

## Default Output Style

Be direct and skeptical. A good-looking backtest is not proof. Prefer a rejected weak result over an
overclaimed result.
