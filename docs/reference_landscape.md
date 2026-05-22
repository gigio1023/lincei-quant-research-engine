# Reference Landscape

These projects and docs informed the scaffold. They are references for architecture, not dependencies
or endorsements.

## Open-Source Quant and Trading Systems

- [QuantConnect LEAN](https://github.com/QuantConnect/Lean): modular event-driven algorithmic trading
  engine; useful reference for data, algorithm, risk, and execution separation.
- [Microsoft Qlib](https://github.com/microsoft/qlib): AI-oriented quant research platform; useful for
  experiment and model workflow structure.
- [OpenBB](https://github.com/OpenBB-finance/OpenBB): investment research platform; useful for data
  access and research UX boundaries.
- [vectorbt](https://github.com/polakowo/vectorbt): vectorized backtesting; useful for fast signal
  research patterns.
- [Backtrader](https://github.com/mementum/backtrader): Python backtesting framework; useful for
  strategy/indicator/analyzer separation.
- [zipline-reloaded](https://github.com/stefan-jansen/zipline-reloaded): Pythonic algorithmic trading
  library; useful for event-driven research conventions.
- [QuantStats](https://github.com/ranaroussi/quantstats): portfolio analytics; useful for report metric
  expectations.
- [bt](https://github.com/pmorissette/bt): composable backtesting framework; useful for reusable
  strategy blocks.
- [NautilusTrader](https://nautilustrader.io/): research-to-live parity and deterministic event-driven
  architecture; useful as a long-term engineering bar.

## Financial AI and Agent References

- [FinRL](https://github.com/AI4Finance-Foundation/FinRL): financial reinforcement learning framework;
  useful as a reminder to separate environment, agent, and evaluation.
- [FinGPT](https://github.com/AI4Finance-Foundation/FinGPT): financial LLM ecosystem; useful for
  finance-specific NLP and benchmarking references.
- [FinRobot](https://github.com/AI4Finance-Foundation/FinRobot): LLM-based financial agent platform;
  useful for multi-agent research/reporting patterns.
- [TradingAgents](https://github.com/TauricResearch/TradingAgents): multi-agent LLM trading research;
  useful for role separation and risk-manager critique patterns.
- [RD-Agent](https://github.com/microsoft/RD-Agent): research and development automation; useful for
  agentic experiment-loop design.

## Agent Tooling References

- [Codex AGENTS.md guide](https://developers.openai.com/codex/guides/agents-md): project-local agent
  instruction pattern.
- [Claude Code skills](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview):
  progressive-disclosure skill structure.

## Design Takeaways

- Use mature engines as references before building execution infrastructure.
- Keep research, validation, risk, and execution boundaries explicit.
- Make LLM outputs structured, timestamped, cached, and auditable.
- Treat live trading as a separate governed system, not a small feature.
