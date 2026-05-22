# Lincei Quant Research Engine

This repository is being rebuilt as an agentic quant research lab: a compact Python system for
backtests, news/event extraction schemas, LLM-assisted research workflows, and risk-first review.

`Lincei` points to the Italian scientific tradition of sharp observation and experimental review.
The repository name is meant to say: observe markets carefully, turn theses into quant research,
and keep every agent-generated idea behind validation and risk gates.

The purpose is not autonomous live trading. The purpose is to let Codex, Claude Code, and other
agents help produce reproducible hypotheses, validation artifacts, skeptical reviews, and
paper-trading readiness checks.

## Current Scope

- Long-only research scaffolding.
- Baseline backtest utilities for ETF/equity experiments.
- Pydantic contracts for strategy configs, news items, LLM event extraction, and reports.
- Loguru-based logging setup.
- Strict no-live-trading guardrails by default.
- Repo-local agent skill for quant research and review workflows.

## Out of Scope

- Real-money order placement.
- Broker credentials or broker API integration.
- Leverage, margin, options, short selling, HFT, or crypto derivatives.
- Treating LLM output as validated alpha.

## Quick Start

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
pytest
lincei-quant-demo
```

The demo uses synthetic prices and writes a small markdown report under `reports/experiments/`.

## Main Documents

- [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md): project identity and mission.
- [MASTER_CONTEXT.md](MASTER_CONTEXT.md): compact context package for coding agents.
- [AGENTS.md](AGENTS.md): Codex-facing operating rules.
- [CLAUDE.md](CLAUDE.md): Claude Code-facing operating rules.
- [docs/architecture.md](docs/architecture.md): module boundaries.
- [docs/reference_landscape.md](docs/reference_landscape.md): open-source references used for structure.
- [docs/risk_policy.md](docs/risk_policy.md): execution and safety gates.
