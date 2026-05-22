## Rewritten request

Research QuantConnect and the open-source LEAN engine for a local, Python-first, agent-assisted quant research repository. Explain what QuantConnect/LEAN can do, what belongs in scope now, what should be avoided, how to integrate LEAN locally without depending on the full cloud platform, and how to control bias/risk for LLM-assisted strategy research.

## Issue breakdown

Your request is already strong: clear context, explicit non-goals, concrete deliverables, and a skeptical implementation tone. Minor improvements would be to separate “LEAN CLI” from “open-source LEAN engine” even more explicitly, because the CLI has account/platform dependencies while the engine repository is open source. “Where useful” is natural, but “where relevant” sounds slightly more formal.

## Why this is better

The rewrite compresses the task into an operational research objective while preserving every constraint: Python-first, local-first, reproducible, LLM-assisted, no live trading by default, and limited initial asset/risk scope.

## Better alternatives

“Investigate” is good. For engineering work, “evaluate for integration” is slightly sharper.
“Without becoming dependent on the full cloud platform” is very clear; keep that phrasing.

## Reusable pattern

For tool/platform research prompts, this structure works well:

> Evaluate [tool] for [target repo]. Separate local/open-source capabilities from hosted/platform-only capabilities. Recommend adoption levels, risks, first milestones, and explicit non-goals.

# Main answer

## 1. Executive summary

**QuantConnect** is a hosted algorithmic trading and quant research platform. Its own docs describe it as an open-source, community-driven algorithmic trading platform powered by LEAN, supporting Python and C#; the documentation is organized around Cloud Platform, Local Platform, Writing Algorithms, Research, LEAN CLI, and LEAN Engine. ([QuantConnect][1])

**LEAN** is the underlying algorithmic trading engine. Official docs describe LEAN as an open-source engine for strategy research, backtesting, and live trading. The engine core is C#, runs on Linux/macOS/Windows, supports algorithms written in Python 3.11 or C#, and is modular through `config.json` environments for result processing, datafeed sourcing, transaction handling, and simulated real-time events. ([QuantConnect][2])

**QuantConnect Cloud vs LEAN CLI vs open-source LEAN engine:**

| Layer                   | What it is                                                                                                                                  |                                                              Dependency level | Target repo use                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------: | ------------------------------------------------------------ |
| QuantConnect Cloud      | Hosted IDE/research/backtesting/optimization/live-trading platform with cloud datasets and compute                                          |                                                                       Highest | Avoid as a hard dependency for now                           |
| LEAN CLI                | Python CLI wrapper to run LEAN locally or in cloud; can create projects, run research, backtests, optimizations, reports, and live commands | Medium; current docs repeatedly say CLI use requires paid-tier org membership | Use only behind an optional adapter; smoke-test access first |
| Open-source LEAN engine | C#/Python engine repository, Apache-2.0, buildable from source, with engine, algorithm, brokerage, data, optimizer, report, and test code   |                                               Lowest, but heavier technically | Best long-term boundary if you want true local ownership     |

The LEAN GitHub repository exposes engine folders such as `Algorithm.Python`, `Engine`, `Data`, `Brokerages`, `Optimizer`, `Report`, `Tests`, and `Launcher`; it is Apache-2.0 licensed, and the README shows source-build paths via `dotnet build` and `dotnet QuantConnect.Lean.Launcher.dll`. ([GitHub][3])

**Verdict:** LEAN is suitable for local reproducible research **if treated as a separate execution engine**, not as the core of your Python repo from day one. The best immediate use is to copy LEAN’s modeling vocabulary and later run LEAN backtests as external validation jobs. Deep integration should wait.

---

## 2. Capability map

| Capability                                 | What LEAN/QuantConnect can do                                                                                                                                                                                                                                                | Recommendation for your repo                                                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backtesting                                | LEAN backtests event-driven algorithms over historical data. `lean backtest` runs local backtests in Docker using the `quantconnect/lean` image, streams logs, and stores full results under the project backtest directory or a custom `--output` path. ([QuantConnect][4]) | Useful, but start with one smoke-test project only. Treat LEAN as an independent backtest validator, not the primary research loop yet.                                          |
| Supported asset classes                    | LEAN’s data folder structure includes `equity`, `forex`, `cfd`, `crypto`, `future`, `futureoption`, `option`, `index`, `indexoption`, `alternative`, `market-hours`, and `symbol-properties`. ([QuantConnect][5])                                                            | Initial scope should only enable long-only equities/ETFs, daily or hourly. Explicitly reject options, futures, crypto derivatives, margin, shorting, and high-frequency configs. |
| Data ingestion / formats                   | LEAN stores data in human-readable flat files, CSV or JSON, compressed with zip. Local Platform docs also say local algorithms/research need local data, stored in the data directory, configurable through `data-folder`. ([QuantConnect][5])                               | Good fit for reproducibility, but only if your repo owns a data manifest: source, license, timestamp semantics, timezone, file hash, adjustment mode.                            |
| Synthetic / fake data                      | The CLI can generate Brownian-motion-based fake market data for most supported security types/resolutions, useful for designing and testing without buying real data. ([QuantConnect][6])                                                                                    | Very useful for initial CI/smoke tests. Do not use synthetic data to claim strategy validity.                                                                                    |
| Algorithm API / Python                     | LEAN algorithms can be written in Python 3.11 or C#. The engine is C# underneath; Python strategies use the LEAN API. ([QuantConnect][2])                                                                                                                                    | Fine for generated strategy skeletons, but your repo should not let LLMs freely generate arbitrary `QCAlgorithm` code without validators.                                        |
| Portfolio / execution modeling             | LEAN has customizable reality models for portfolio, brokerage, fills, slippage, fees, buying power, settlement, short availability, margin interest, dividends, and options models. Defaults assume highly liquid assets. ([QuantConnect][7])                                | Strong reason to use LEAN eventually. But defaults are not magic; every strategy report must disclose fill, fee, slippage, and liquidity assumptions.                            |
| Fills / slippage / fees / brokerage models | Fill models determine price/quantity and can incorporate spread/slippage; slippage models make fills more realistic; fee models simulate brokerage fees; brokerage models simulate brokerage behavior and validate orders. ([QuantConnect][8])                               | Useful for risk-first reporting. Require explicit model selection in every LEAN run manifest.                                                                                    |
| Research notebooks                         | `lean research` starts a local Jupyter Lab environment in Docker, mounting the project directory and exposing Jupyter locally. Docs say it requires paid-tier organization membership. ([QuantConnect][9])                                                                   | Optional. Your Python-first repo probably already has notebooks/scripts; do not migrate research workflow into LEAN notebooks initially.                                         |
| Optimization / parameter sweeps            | `lean optimize` supports local or cloud parameter optimization, including strategies such as Grid Search and Euler Search, with targets like Sharpe ratio or drawdown. Docs again state CLI paid-tier membership. ([QuantConnect][10])                                       | Delay. Optimization is dangerous with LLM-generated ideas because it amplifies overfitting. Add only after train/test/OOS and audit machinery exists.                            |
| Reporting / result artifacts               | CLI backtests store JSON result artifacts; `lean report` can generate professional-grade reports for backtest/live results, but docs state CLI paid-tier membership for report use. ([QuantConnect][4])                                                                      | Parse JSON first. Report generation can wait. Your own risk-first report should be canonical.                                                                                    |
| Live trading                               | LEAN and CLI support live trading commands, including local live trading and commands like live deploy/submit/cancel/update order. ([QuantConnect][6])                                                                                                                       | Explicitly out of scope. Block `lean live`, brokerage credentials, cloud deployment, and live order commands in this repo.                                                       |

---

## 3. Local integration analysis

### What can be done fully locally

You can run LEAN from source, build the open-source repository, and execute the launcher locally. The GitHub README shows cloning/building the repo, building `QuantConnect.Lean.sln`, and running the launcher from `Launcher/bin/Debug`. ([GitHub][3])

You can also run local backtests through LEAN CLI using Docker, with your own local data, and store results under a project backtest directory or a custom output directory. ([QuantConnect][4])

Local data can be stored in LEAN’s flat-file format, with `data-folder` configured in the LEAN config. This is compatible with reproducible local research if you pin the data snapshot and avoid implicit auto-updates. ([QuantConnect][5])

### What requires QuantConnect Cloud or account/API access

Be careful here: the **GitHub README** presents `pip install lean`, `lean init`, `lean create-project`, `lean research`, and `lean backtest` as a local workflow, but current official docs for backtest, research, datasets, reports, and optimization repeatedly say the CLI requires membership in an organization on a paid tier. ([GitHub][11])

So the practical interpretation should be:

> Assume the open-source engine is local. Assume the CLI may require QuantConnect account/org access depending on command/version/current policy. Smoke-test before building around it.

Cloud backtesting, cloud optimization, cloud synchronization, cloud datasets, hosted result pages, and live cloud deployment should be considered platform-dependent. The CLI configuration also includes `user-id`, `api-token`, `default-language`, and `engine-image`, which means some workflows are explicitly tied to QuantConnect API credentials. ([GitHub][11])

### What requires proprietary or paid data

Local LEAN research/backtests require local data. QuantConnect’s Local Platform docs say you need local data to run algorithms and research locally, and that data downloaded from Dataset Market is stored in the data directory. ([QuantConnect][12])

QuantConnect also states that locally running LEAN requires local data, and that licensed dataset downloads are for the licensed organization’s internal LEAN use only, with costs depending on the dataset and file/day usage. ([QuantConnect][13])

For Polygon, QuantConnect documents that Polygon provides institutional-grade equity, option, index, forex, and crypto data, that universe selection in local deployments requires downloading Dataset Market universe data, and that historical data availability depends on the Polygon plan. ([QuantConnect][14])

For your repo, this means: do not start by depending on premium US equities, security master, fundamentals, or alternative data. Start with sample/synthetic data and one documented external data source.

### How to run a local LEAN backtest from CLI

A minimal local workflow, version-dependent, looks like this:

```bash
pip install --upgrade lean
lean init
lean create-project "lean_smoke_test"
lean backtest "lean_smoke_test" --output ./artifacts/lean/backtests/smoke_001
```

The exact project command may appear as `lean create-project` or `lean project-create` depending on docs/CLI version; the current CLI repository README shows local workflows using `lean create-project`, while the LEAN GitHub README lists `lean project-create`. ([GitHub][11])

For reproducibility, prefer a pinned engine image:

```bash
lean backtest "lean_smoke_test" \
  --image quantconnect/lean:<pinned_tag> \
  --output ./artifacts/lean/backtests/2026-05-22_smoke_001
```

The `lean backtest` docs state that the command uses the `quantconnect/lean` Docker image and supports custom output directories; QuantConnect’s local backtesting deployment docs also describe running with a specific `quantconnect/lean:<tag>` image. ([QuantConnect][4])

### How to store configs and results reproducibly

Do not just keep LEAN’s JSON result file. Store a full manifest:

```yaml
run_id: 2026-05-22_lean_smoke_001
engine:
  lean_cli_version: "captured from `lean --version`"
  lean_image: "quantconnect/lean:<pinned_tag>"
  lean_repo_commit: null
  docker_platform: "linux/amd64 or linux/arm64"
project:
  generated_from_template: "templates/lean_long_only_v1.py"
  strategy_source_hash: "sha256:..."
  config_hash: "sha256:..."
data:
  data_folder: "./lean_workspace/data"
  data_snapshot_id: "sample_or_synthetic_v1"
  data_hash_manifest: "./manifests/data/sample_or_synthetic_v1.sha256"
  timezone_policy: "exchange-local -> UTC at ingestion"
  adjustment_policy: "raw/adjusted/split-adjusted explicitly declared"
constraints:
  long_only: true
  leverage: 1.0
  margin: false
  shorting: false
  options: false
  futures: false
  crypto_derivatives: false
  hft: false
outputs:
  stdout: "./artifacts/lean/backtests/.../stdout.log"
  stderr: "./artifacts/lean/backtests/.../stderr.log"
  result_json: "./artifacts/lean/backtests/.../result.json"
```

### Python-first subprocess boundary

For your target repo, do **not** import LEAN deeply into your Python research engine at first. Treat it as an external executable boundary:

```python
from __future__ import annotations

import subprocess
from pathlib import Path


def run_lean_backtest(
    project_dir: Path,
    output_dir: Path,
    lean_image: str,
) -> subprocess.CompletedProcess[str]:
    output_dir.mkdir(parents=True, exist_ok=True)

    cmd = [
        "lean",
        "backtest",
        str(project_dir),
        "--image",
        lean_image,
        "--output",
        str(output_dir),
    ]

    return subprocess.run(
        cmd,
        check=False,
        text=True,
        capture_output=True,
    )
```

The boundary should be:

```text
Python research repo
  ├─ generates signal/event/data artifacts
  ├─ validates long-only/no-live/no-derivatives constraints
  ├─ generates LEAN project skeleton/config
  ├─ calls `lean backtest` as subprocess
  ├─ captures stdout/stderr/result JSON
  └─ parses LEAN results into repo-native risk reports
```

This keeps LEAN useful without letting it swallow the entire architecture.

---

## 4. Architecture recommendation

### Level A — No integration yet; model docs after LEAN concepts

**Adopt now.**

Use LEAN’s conceptual vocabulary in your repo docs: `Security`, `Symbol`, `Portfolio`, `Universe`, `FillModel`, `SlippageModel`, `FeeModel`, `BrokerageModel`, `DataNormalizationMode`, `CashBook`, `Benchmark`, `Warmup`, `History`, `OnData`, and `Slice`.

**Tradeoff:** almost no implementation risk, but no independent LEAN validation yet.

**When to adopt:** immediately.

Recommended files:

```text
docs/
  lean_concepts_mapping.md
  backtest_assumptions.md
  no_live_trading_policy.md
  agent_strategy_review_checklist.md
```

### Level B — Export signals/data and run LEAN backtests separately

**Best first real integration.**

Your Python repo produces audited signals/events; a separate LEAN project consumes them as data or strategy inputs. LEAN handles the simulated execution, fills, portfolio accounting, fees, slippage, and result artifacts.

**Tradeoff:** moderate complexity. You must maintain data format, timestamps, and generated LEAN strategy templates. But the separation is healthy.

**When to adopt:** after your own Python backtest core has deterministic tests and you have one LEAN smoke test running on sample/synthetic data.

Recommended structure:

```text
integrations/lean/
  README.md
  templates/
    long_only_equity_strategy.py.j2
  runner.py
  parse_results.py
  manifests/
examples/
  lean_smoke_long_only/
tests/
  test_lean_adapter_constraints.py
  test_lean_result_parser.py
```

### Level C — Adapter that generates LEAN-compatible skeletons/configs

**Adopt after Level B proves useful.**

The adapter turns a validated research idea into a minimal `QCAlgorithm` skeleton. The skeleton should be intentionally boring: `initialize`, `on_data`, long-only targets, daily/hourly resolution, no live deployment hooks, no brokerage credentials.

**Tradeoff:** more automation means more ways for an LLM to generate invalid or overfit code. You need AST/static checks.

**When to adopt:** when you have a review checklist, deterministic signal fixtures, and CI tests that reject forbidden APIs.

Forbidden patterns should include:

```text
lean live
lean live deploy
lean live submit-order
add_option
add_future
add_crypto
set_holdings(symbol, negative_weight)
margin account
leverage > 1
short targets
brokerage credentials
cloud push/backtest as default path
```

The CLI docs list live commands including deploy, submit-order, cancel-order, liquidate, and update-order, so blocking these is not theoretical. ([QuantConnect][6])

### Level D — Deep integration with LEAN engine

**Wait.**

This means embedding or modifying LEAN engine behavior, custom data providers, custom result handlers, custom transaction/fill logic, or direct source builds. LEAN is modular and configurable, but deep integration pulls your Python-first repo toward a C#/Docker/engine-maintenance project. ([QuantConnect][2])

**Tradeoff:** highest control, highest maintenance.

**When to adopt:** only if LEAN becomes your canonical backtest engine, not just an external validator.

---

## 5. Bias and risk review

### Where LEAN helps

LEAN helps most with **execution realism and engine discipline**. Its event-driven design, portfolio accounting, transaction handling, datafeed sourcing, and simulated real-time callbacks are much better than a hand-rolled Pandas backtest for many classes of mistakes. ([QuantConnect][2])

LEAN’s reality modeling is especially useful: fill, slippage, fee, brokerage, buying power, settlement, margin interest, dividend yield, short availability, and option-related models are explicit and customizable. But the docs warn that defaults assume highly liquid assets, so using defaults without disclosure is still weak research. ([QuantConnect][7])

LEAN also has infrastructure for corporate actions. US Equity subscriptions provide notifications for splits, dividends, symbol changes, and delistings; LEAN stores split data in factor files and ticker changes in map files. ([QuantConnect][15])

For some official datasets, QuantConnect explicitly addresses survivorship. For example, its docs state that the Morningstar US Fundamentals dataset includes delisted tickers, making those backtests free of survivorship bias for that universe, though it excludes ETFs, ADRs, and OTC securities. ([QuantConnect][16])

### Where LEAN does **not** automatically protect you

LEAN does not automatically make a strategy valid. It does not save you from:

| Risk                  | Why LEAN does not solve it automatically                                                                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Survivorship bias     | If you bring your own universe or only test current tickers, LEAN cannot know your universe is biased.                                                                                           |
| Data leakage          | If your news/event data uses publication date incorrectly, or your LLM-derived signal uses future context, LEAN will faithfully backtest the contaminated input.                                 |
| Timestamp mistakes    | Custom event/news data must encode when information became tradable, not merely when it was about a company.                                                                                     |
| Overfitting           | LEAN optimization can make this worse if used too early. QuantConnect’s own research guide warns about overfitting and recommends walk-forward/out-of-sample style testing. ([QuantConnect][17]) |
| Look-ahead bias       | QuantConnect’s research guide gives examples including using financial statement period-end dates instead of release dates, and misuse of adjusted price data. ([QuantConnect][17])              |
| LLM contamination     | LEAN cannot tell whether a strategy was generated after seeing benchmark results, cherry-picked examples, leaked future labels, or repeated prompt iterations against the same test set.         |
| Unrealistic liquidity | LEAN’s default reality models assume highly liquid assets unless you customize them. ([QuantConnect][7])                                                                                         |

### Agent-generated LEAN strategy checklist

Every LLM-generated strategy should fail review unless it answers all of these:

1. **Hypothesis:** Is there a falsifiable cause/effect claim before code?
2. **Scope:** Long-only, no leverage, no margin, no options, no futures, no shorting, no crypto derivatives, no live trading.
3. **Data manifest:** Source, license, timezone, timestamp meaning, adjustment mode, file hashes, point-in-time status.
4. **Signal timing:** Every signal timestamp must be earlier than the order timestamp.
5. **News/event timing:** Use publication/availability time, not event date or article ingestion time after the fact.
6. **Universe:** Is the universe point-in-time, or is it a handpicked list of surviving tickers?
7. **Execution assumptions:** Fee model, slippage model, fill model, order type, liquidity assumptions.
8. **Optimization:** Number of parameters, search space, train/test/OOS split, walk-forward policy, failed trials.
9. **LLM audit:** Prompt, generated code, edits, rejected variants, and rationale must be logged.
10. **No live path:** No `lean live`, no brokerage credentials, no cloud deployment, no real order submission.

---

## 6. Practical first milestones

### Milestone 1 — Create LEAN concept docs

Add:

```text
docs/lean_concepts_mapping.md
docs/backtest_reality_models.md
docs/no_live_trading_policy.md
docs/agent_generated_strategy_review.md
```

The goal is not integration yet. The goal is to make your repo’s language more precise: fill model, slippage, fee, benchmark, universe, warm-up, data normalization, look-ahead, survivorship, and point-in-time.

### Milestone 2 — Add a local-only LEAN smoke test project

Create a tiny LEAN project that does one boring thing: buy-and-hold one equity-like symbol on synthetic/sample data, long-only, no leverage.

```text
examples/lean_smoke_long_only/
  main.py
  config.json
  README.md
```

Use generated/fake data first. QuantConnect explicitly documents fake Brownian-motion data generation for local design/testing when real market data is expensive or license-restricted. ([QuantConnect][6])

### Milestone 3 — Add a subprocess runner and result parser

Add:

```text
integrations/lean/runner.py
integrations/lean/result_parser.py
integrations/lean/run_manifest.py
```

The runner should not be smart. It should run one pinned command, capture stdout/stderr, store result JSON, and write a manifest.

### Milestone 4 — Add constraint tests before strategy generation

Tests should reject:

```text
negative target weights
target weight > 1.0
leverage > 1
margin account
shorting
options/futures/crypto derivative subscriptions
tick/second HFT-like configs
live trading commands
brokerage credentials
cloud deployment defaults
missing data manifest
missing fee/slippage/fill disclosure
```

### Milestone 5 — Add an agent review report template

Create:

```text
reports/templates/agent_strategy_review.md
```

Minimum fields:

```markdown
# Strategy Review

## Hypothesis
## Data Used
## Timestamp / Point-in-Time Assumptions
## Universe Definition
## LEAN Reality Models
## Risk Limits
## Backtest Result Summary
## Failure Modes
## Reasons This May Be False
## LLM Involvement
## Human Review Decision
```

---

## 7. Tests needed before claiming LEAN integration is reliable

Before saying “LEAN integration works,” require:

| Test                         | Purpose                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| CLI/source availability test | Confirms whether your environment can actually run LEAN CLI or source build under current access rules. |
| Docker image pin test        | Same LEAN image + same data + same config should produce stable result artifacts.                       |
| Synthetic data smoke test    | Verifies no paid data dependency.                                                                       |
| Manifest completeness test   | Fails if run lacks engine version, data hash, config hash, parameters, and strategy source hash.        |
| Constraint validator test    | Fails forbidden live/derivative/margin/short/HFT patterns.                                              |
| Result parser test           | Parses LEAN JSON and extracts equity curve, orders, statistics, drawdown, exposure, turnover.           |
| Timestamp fixture test       | Confirms event/news signals cannot be consumed before their declared availability time.                 |
| LLM contamination audit test | Ensures generated strategy files are linked to prompt/review metadata and not silently accepted.        |

---

## 8. What is useful now, what should wait, what is out of scope

### Useful now

Use LEAN as a **conceptual standard** and optional external validation target. Its strongest near-term value is not “more alpha”; it is stricter language around execution assumptions, data formats, fills, slippage, fees, portfolio accounting, corporate actions, and reproducibility.

Adopt Level A immediately. Build Level B as a small smoke test. Use synthetic/sample data first.

### Should wait

Wait on:

```text
full LEAN-native research workflow
optimization / parameter sweeps
cloud backtests
premium datasets
fundamental universes
Polygon or other paid data providers
custom LEAN engine modifications
professional report generation
```

Optimization should especially wait. LEAN supports it, but the combination of LLM-generated ideas plus grid search is an overfitting machine unless your review process is already strict. QuantConnect’s own research guide warns about overfitting and look-ahead bias, so this is not just theoretical. ([QuantConnect][17])

### Explicitly out of scope

For this target repo, explicitly block:

```text
live real-money trading
brokerage credentials
lean live / live deploy / live submit-order
cloud deployment as default path
margin
leverage
shorting
options
futures
crypto derivatives
HFT
LLM-autonomous trade placement
LLM-generated strategy treated as validated alpha
```

## Final conclusion

LEAN is worth integrating, but only as a **separate, pinned, auditable backtest engine boundary**. Do not let the project become “a QuantConnect Cloud project with local wrappers.” Start by borrowing LEAN’s concepts, then add a tiny local LEAN smoke test, then a subprocess adapter, then a guarded strategy skeleton generator. Deep LEAN engine integration and optimization should wait until the repo has strong data manifests, timestamp tests, risk reports, and agent-generated strategy review gates.

[1]: https://www.quantconnect.com/docs/v2?utm_source=chatgpt.com "Documentation"
[2]: https://www.quantconnect.com/docs/v2/lean-engine/getting-started "Getting Started - QuantConnect.com"
[3]: https://github.com/QuantConnect/Lean/ "GitHub - QuantConnect/Lean: Lean Algorithmic Trading Engine by QuantConnect (Python, C#) · GitHub"
[4]: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-backtest "lean backtest - QuantConnect.com"
[5]: https://www.quantconnect.com/docs/v2/lean-cli/datasets/format-and-storage "Format and Storage - QuantConnect.com"
[6]: https://www.quantconnect.com/docs/v2/lean-cli/datasets/generating-data "Generating Data - QuantConnect.com"
[7]: https://www.quantconnect.com/docs/v2/writing-algorithms/reality-modeling/key-concepts "Key Concepts - QuantConnect.com"
[8]: https://www.quantconnect.com/docs/v2/writing-algorithms/reality-modeling/trade-fills/key-concepts?utm_source=chatgpt.com "Trade Fills"
[9]: https://www.quantconnect.com/docs/v2/lean-cli/research "Research - QuantConnect.com"
[10]: https://www.quantconnect.com/docs/v2/lean-cli/optimization/deployment "Deployment - QuantConnect.com"
[11]: https://github.com/QuantConnect/lean-cli "GitHub - QuantConnect/lean-cli: CLI for running the LEAN engine locally and in the cloud · GitHub"
[12]: https://www.quantconnect.com/docs/v2/local-platform/datasets/getting-started "Getting Started - QuantConnect.com"
[13]: https://www.quantconnect.com/docs/v2/local-platform/datasets/downloading-data "Downloading Data - QuantConnect.com"
[14]: https://www.quantconnect.com/docs/v2/local-platform/datasets/polygon "Polygon - QuantConnect.com"
[15]: https://www.quantconnect.com/docs/v2/writing-algorithms/securities/asset-classes/us-equity/corporate-actions?utm_source=chatgpt.com "Corporate Actions"
[16]: https://www.quantconnect.com/docs/v2/writing-algorithms/universes/equity/fundamental-universes?utm_source=chatgpt.com "Fundamental Universes"
[17]: https://www.quantconnect.com/docs/v2/writing-algorithms/key-concepts/research-guide "Research Guide - QuantConnect.com"
