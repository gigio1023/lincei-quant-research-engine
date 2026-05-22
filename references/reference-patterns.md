# Reference Patterns

The local clones under `references/projects/` are ignored by git. These paths are valid when the reference clones are present locally.

## Patterns To Adapt

| Pattern | Reference anchors | Lincei adaptation |
| --- | --- | --- |
| Explicit run lifecycle | `references/projects/lean/Launcher/Program.cs`, `references/projects/lean/Engine/Engine.cs`, `references/projects/lean-cli/lean/commands/backtest.py` | Every research or execution run should be a job with config, output, status, and shutdown behavior. |
| Handler and adapter boundaries | `references/projects/lean/Engine/LeanEngineSystemHandlers.cs`, `references/projects/lean/Engine/LeanEngineAlgorithmHandlers.cs` | Strategy, data, risk, execution, reporting, and broker adapters stay separate. |
| Environment separation | `references/projects/nautilus_trader/nautilus_trader/system/kernel.py` | Backtest, paper, broker read-only, and live modes must be explicit and mutually guarded. |
| Signal to target to risk to execution | `references/projects/lean/Algorithm/QCAlgorithm.Framework.cs`, `references/projects/qlib/qlib/contrib/strategy/signal_strategy.py`, `references/projects/hummingbot/hummingbot/strategy_v2/executors/executor_orchestrator.py` | Research can propose signals and targets; only the risk gate can advance a proposal toward execution. |
| Risk before execution | `references/projects/nautilus_trader/nautilus_trader/live/risk_engine.py`, `references/projects/freqtrade/freqtrade/plugins/protectionmanager.py`, `references/projects/hummingbot/hummingbot/connector/budget_checker.py` | Pre-trade policy must run before paper or live adapters see an order plan. |
| Runtime control states | `references/projects/freqtrade/freqtrade/worker.py`, `references/projects/nautilus_trader/nautilus_trader/live/node.py` | Use audited states such as `idle`, `running`, `paused`, `halted`, and `stopping`, not loose UI buttons. |
| No-lookahead handling | `references/projects/qlib/qlib/contrib/strategy/order_generator.py`, `references/projects/vectorbt/vectorbt/portfolio/base.py` | Timestamp alignment tests must guard close-derived signals and generated order timing. |
| Experiment artifacts | `references/projects/qlib/qlib/workflow/recorder.py`, `references/projects/qlib/qlib/workflow/expm.py`, `references/projects/vectorbt/vectorbt/portfolio/base.py` | Keep a proposal ledger with inputs, config, signal version, simulated intents, metrics, and reports. |
| Research-run provenance | `references/projects/lean/Common/Packets/BacktestResultPacket.cs`, `references/projects/lean/Common/Statistics/PerformanceMetrics.cs`, `references/projects/lean/Engine/Results/BacktestingResultHandler.cs`, `references/projects/qlib/qlib/workflow/recorder.py`, `references/projects/vectorbt/vectorbt/portfolio/base.py` | Persist dataset windows, availability timestamps, no-lookahead proof, cost/slippage assumptions, benchmark, backtest metrics, artifact hashes, and known failure modes before proposal creation. |
| Paper-before-live execution | `references/projects/freqtrade/freqtrade/exchange/exchange.py`, `references/projects/hummingbot/hummingbot/connector/budget_checker.py` | Add a paper execution enclave before any broker write adapter. |
| Runtime kill switch | `references/projects/hummingbot/hummingbot/core/utils/kill_switch.py`, `references/projects/nautilus_trader/nautilus_trader/risk/engine.pyx` | Recovery should be stop/reduce/exit based on policy, not LLM judgment. |

## Patterns To Avoid

| Risk | Reference anchors | Lincei rule |
| --- | --- | --- |
| Early live brokerage setup | `references/projects/lean/Engine/Setup/BrokerageSetupHandler.cs` | Do not sync live cash, holdings, or open orders before broker read-only and paper gates exist. |
| Direct SDK order surface | `references/projects/alpaca-py/alpaca/trading/client.py`, `references/projects/alpaca-py/alpaca/common/enums.py` | Broker SDK calls live only inside an execution adapter, never in research/report/frontend code. |
| Force-entry and force-exit controls | `references/projects/freqtrade/freqtrade/rpc/rpc.py` | Initial product must not expose manual force-trade endpoints. |
| Crypto bot product shape | `references/projects/freqtrade`, `references/projects/hummingbot` | Reuse protections and connector boundaries, not crypto market-making assumptions. |
| Simulation as execution | `references/projects/vectorbt/vectorbt/portfolio/base.py` | Fast simulations do not define real broker fill, latency, or reconciliation behavior. |
| RL as first allocator | `references/projects/FinRL/finrl/meta/env_stock_trading/env_stocktrading.py` | Reinforcement-learning actions should not be the initial capital allocation engine. |

Future design notes should extend this file when a new reference is inspected.
