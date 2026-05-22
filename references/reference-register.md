# Reference Project Register

These repositories are cloned under `references/projects/` for local inspection only. The clone directories are git-ignored.

| Project | URL | Local commit | Use as reference for | Do not copy blindly |
| --- | --- | --- | --- | --- |
| Lean | https://github.com/QuantConnect/Lean.git | `a253751` | algorithm lifecycle, data normalization, backtest/live separation, result reporting | full engine scope, live broker command surface |
| Lean CLI | https://github.com/QuantConnect/lean-cli.git | `51acba7` | workflow boundaries, local/cloud command ergonomics | cloud dependency or unrestricted live commands |
| NautilusTrader | https://github.com/nautechsystems/nautilus_trader.git | `1ac3492` | event-driven execution and adapter isolation | heavy architecture before the repo needs it |
| Alpaca-py | https://github.com/alpacahq/alpaca-py.git | `e4268eb` | small broker SDK boundary and request models | US-only assumptions as default design |
| Freqtrade | https://github.com/freqtrade/freqtrade.git | `0d84e80` | dry-run mode, protections, config validation, operational stop rules | crypto-first strategy/exchange assumptions |
| Hummingbot | https://github.com/hummingbot/hummingbot.git | `91ff6bf` | connector isolation, strategy vs execution split, kill-switch style controls | high-frequency market-making scope |
| Qlib | https://github.com/microsoft/qlib.git | `d5379c5` | research workflow, datasets, model experiment structure | direct allocator behavior |
| vectorbt | https://github.com/polakowo/vectorbt.git | `b213e07` | fast vectorized research and parameter sweeps | overfitted sweep culture |
| Zipline Reloaded | https://github.com/stefan-jansen/zipline-reloaded.git | `943010b` | backtest API and bundle concepts | dated ecosystem constraints |
| Backtrader | https://github.com/mementum/backtrader.git | `b853d7c` | strategy/backtest interface patterns | broker/live assumptions |
| bt | https://github.com/pmorissette/bt.git | `2630651` | portfolio rebalancing and benchmark baselines | too-simple execution model |
| FinRL | https://github.com/AI4Finance-Foundation/FinRL.git | `220f9e4` | warning label and RL research reference | RL as first capital allocator |

## Inspection Rule

When a future change uses a reference pattern, include the inspected file path and explain the adaptation. The default is to design for this project's control-plane goals first.
