# Lincei Quant Research Engine

Status: active QuantConnect/LEAN + LLM validation system.

Last aligned: 2026-05-24.

Lincei Quant Research Engine is a personal aggressive alpha research system. The active milestone is **not** automatic live trading. The current system is built around QuantConnect Cloud, local LEAN, typed LLM semantic alpha features, paper/live-shadow evidence, reconciliation, and a learning/promotion ledger.

Read [SPEC.md](SPEC.md) first. It is the canonical long-term spec index. If any document conflicts with `SPEC.md`, `SPEC.md` wins.

## Current Direction

- LEAN / QuantConnect owns executable strategy semantics: universe selection, `AlphaModel`, `Insight`, portfolio construction, risk management, execution, orders, and fills.
- The NestJS control plane owns orchestration, run manifests, LLM feature jobs, imports, paper/live-shadow ledgers, preflight, reconciliation, and operator visibility.
- LLMs are semantic alpha engines. They convert natural-language evidence into typed point-in-time features. They do not place broker orders, see credentials, or choose final order quantity.
- Universe selection is quality-gated by [config/universes/quality-gated-v2.json](config/universes/quality-gated-v2.json). Weak, redundant, hard-excluded, or disabled tactical instruments cannot leak into LEAN targets.
- Real broker writes remain blocked. `submit`, `cancel`, `replace`, `flatten`, transfer, and margin/account mutation require a future user-approved live-money spec.

## System Flow

```mermaid
flowchart LR
    RAW["Market bars<br/>news / filings / macro"] --> FS["Point-in-time<br/>feature snapshots"]
    MANIFEST["Quality-gated<br/>universe manifest"] --> FS
    MANIFEST --> LEAN
    RAW --> LLMFEAT["LLM semantic<br/>alpha features"]
    FS --> NUM["Numeric alpha"]
    LLMFEAT --> META["Meta alpha<br/>AlphaDecision"]
    NUM --> META
    META --> LEAN["LEAN Algorithm Framework<br/>Insights"]
    LEAN --> PC["PortfolioConstructionModel"]
    PC --> RISK["RiskManagementModel<br/>fail closed"]
    RISK --> PAPER["Paper cycle"]
    RISK --> SHADOW["Live-shadow<br/>would-have-traded"]
    PAPER --> RECON["Reconciliation"]
    SHADOW --> RECON
    RECON --> LEARN["Outcome labels<br/>promotion ledger"]
    LEARN --> META
```

## Evidence Gates

```mermaid
stateDiagram-v2
    [*] --> LocalDebug
    LocalDebug --> CloudAttempt: qc-cloud-backtest
    CloudAttempt --> CloudBlocked: credentials / project / tier / data blocker
    CloudAttempt --> CloudPassed: cloud REST artifacts imported
    CloudPassed --> PaperEvidence: run-paper-cycle
    LocalDebug --> LocalStrategy: run-local-strategy-smoke
    LocalStrategy --> PaperReplay: run-paper-replay
    PaperEvidence --> LiveShadow: run-live-shadow
    LiveShadow --> PromotionReview: run-learning-loop
    PromotionReview --> Accepted: cloud + paper/live-shadow evidence
    PromotionReview --> Blocked: missing evidence or reconciliation mismatch
    Blocked --> CloudAttempt
```

Local simulator and sample-data paths prove plumbing only. Promotion evidence requires imported QuantConnect Cloud artifacts plus current live-shadow evidence and reconciliation. Accepted local historical LEAN artifacts are useful strategy evidence for debugging and paper replay, but they do not replace Cloud promotion evidence. A successful `lean cloud backtest` command is not enough unless REST result artifacts are imported and pass strategy-evidence gates.

## Evidence Markers

```mermaid
flowchart TB
    LATEST[".latest<br/>latest attempted run"] --> ANY["any run type<br/>passed or blocked"]
    STRATEGY[".latest-strategy<br/>latest accepted strategy run"] --> LOCAL["accepted local LEAN<br/>or accepted Cloud run"]
    CLOUD[".latest-cloud-attempt<br/>latest Cloud attempt"] --> QC["QuantConnect Cloud<br/>passed or blocked"]
    SIM[".latest-simulator<br/>latest simulator run"] --> PLUMB["flow-validation<br/>plumbing only"]

    IMPORT["import-lean-run latest"] --> STRATEGY
    PAPER["run-paper-cycle"] --> STRATEGY
    REPLAY["run-paper-replay"] --> STRATEGY
    PREFLIGHT["live-preflight"] --> CURRENT["current paper/live-shadow<br/>not historical replay"]
```

The marker split prevents a blocked Cloud attempt or simulator smoke from overwriting the latest accepted strategy evidence. `run-paper-replay` can prove historical target plumbing, but only current paper/live-shadow evidence can satisfy live preflight and promotion gates.

## Quality-Gated Universe

The default active profile is `quality_core_backtest_safe`. It is intentionally narrower than an idea list:

```mermaid
flowchart TB
    MANIFEST["config/universes/quality-gated-v2.json"] --> PROFILE["quality_core_backtest_safe"]
    PROFILE --> SEMI["Semiconductor / AI compute<br/>SMH + vetted single names"]
    PROFILE --> SW["Software / Cybersecurity<br/>IGV, CIBR + vetted single names"]
    PROFILE --> POWER["Power / Electrification<br/>GRID + infrastructure names"]
    PROFILE --> SPACE["Space / Aerospace<br/>XAR, UFO + vetted primes/RKLB"]
    PROFILE --> CAPS["symbol caps<br/>sleeve caps<br/>ETF redundancy rules"]
    CAPS --> LEAN["LEAN portfolio/risk models"]
```

| Sleeve                     | Active instruments                                                                |
| -------------------------- | --------------------------------------------------------------------------------- |
| Semiconductor / AI compute | `SMH`, `NVDA`, `AVGO`, `TSM`, `ASML`, `AMAT`, `AMD`, `MU`, `LRCX`, `KLAC`, `MRVL` |
| Software / Cybersecurity   | `IGV`, `CIBR`, `MSFT`, `ORCL`, `NOW`, `PANW`, `CRWD`, `PLTR`, `ANET`, `DDOG`      |
| Power / Electrification    | `GRID`, `ETN`, `PWR`, `VRT`, `GEV`, `CEG`, `VST`                                  |
| Space / Aerospace          | `XAR`, `UFO`, `RKLB`, `LMT`, `NOC`, `LHX`                                         |

`SPY`, `QQQ`, `IWM`, `SOXX`, `XLU`, and `ITA` are benchmark or smoke-test symbols, not default active alpha targets. `NASA` is forward-only from 2026-03-31. `SOXL` remains disabled unless `V1_ALLOW_LEVERAGED_ETF=true` and a tactical profile are explicitly selected; this is research-only, not live-money approval.

## Repository Map

| Path                                                                          | Purpose                                                                 |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [SPEC.md](SPEC.md)                                                            | Canonical active spec index and direction lock                          |
| [terminology.md](terminology.md)                                              | Required terminology and banned AI-slop expressions                     |
| [AGENTS.md](AGENTS.md)                                                        | Agent/contributor rules for this repo                                   |
| [docs/spec/](docs/spec)                                                       | Normative split spec documents                                          |
| [config/universes/](config/universes)                                         | Quality-gated universe manifests and instrument policy                  |
| [docs/](docs)                                                                 | Supporting design docs, runbooks, API reference, decisions, archive     |
| [backend/](backend)                                                           | NestJS control plane, ledgers, CLI orchestration, API                   |
| [engines/lean/aggressive_llm_momentum/](engines/lean/aggressive_llm_momentum) | LEAN Algorithm Framework strategy                                       |
| [ml/](ml)                                                                     | Offline feature/model helpers and external baseline registry            |
| [frontend/](frontend)                                                         | Operational dashboard                                                   |
| [scripts/](scripts)                                                           | Repo-level wrappers for setup, LEAN, Cloud, paper/live-shadow, learning |

## Active Runtime Architecture

```mermaid
flowchart TB
    subgraph QC["QuantConnect / LEAN"]
        QCLOUD["QuantConnect Cloud<br/>promotion runtime"]
        LLEAN["Local LEAN<br/>debug / replay / smoke"]
        OBJ["Object Store<br/>feature artifacts"]
    end

    subgraph CP["NestJS Control Plane"]
        CLI["v1 CLI wrappers"]
        CONTRACTS["Typed contracts<br/>availableAt / horizonHours"]
        EVIDENCE["Run, paper, live-shadow,<br/>promotion ledgers"]
        LLM["LLM feature engine"]
    end

    subgraph DATA["Data Sources"]
        BARS["Market bars"]
        NEWS["News / filings / macro"]
    end

    DATA --> LLM
    DATA --> CONTRACTS
    LLM --> OBJ
    CONTRACTS --> LLEAN
    OBJ --> QCLOUD
    CLI --> LLEAN
    CLI --> QCLOUD
    LLEAN --> EVIDENCE
    QCLOUD --> EVIDENCE
```

## Platform Support

This repo is actively moved between Apple Silicon macOS and Linux ARM64. Before platform-sensitive commands, check:

```bash
uname -s
uname -m
bun --version
python3 --version
.venv-lean-cli/bin/lean --version
```

Treat Docker/Podman, Lean CLI, Python wheels, browser tooling, native Bun/Node packages, and downloaded binaries as platform-sensitive.

The latest validated platform snapshot for this branch was:

- `Linux aarch64`
- Bun `1.3.14`
- Python `3.12.3`
- Lean CLI `1.0.225`

## Setup

`git clone` alone is not enough. Secrets, local data, dependency directories, LEAN workspace, generated artifacts, and local SQLite databases are intentionally gitignored.

### Prerequisites

| Tool                                   | Used for                                       |
| -------------------------------------- | ---------------------------------------------- |
| Bun                                    | Backend, frontend, CLI wrappers                |
| Python 3.10+                           | ML venv and Lean CLI venv                      |
| Docker or Podman-compatible Docker CLI | Local LEAN container runs                      |
| QuantConnect account/API token         | Cloud backtests, workspace setup, Object Store |
| OpenAI API key                         | LLM semantic alpha features                    |

### Bootstrap

```bash
git clone <repository-url>
cd lincei-quant-research-engine
cp .env.example .env

# Fill QUANTCONNECT_USER_ID, QUANTCONNECT_API_TOKEN, OPENAI_API_KEY as needed.
./scripts/bootstrap-dev.sh
```

Manual setup commands:

```bash
./scripts/setup-ml-venv.sh
./scripts/setup-lean-cli.sh
./scripts/lean-login-from-env.sh
./scripts/setup-lean-workspace.sh

cd backend && bun install
cd ../frontend && bun install
```

QuantConnect local data is not downloaded by bootstrap. Full quality-gated universe validation should run in QuantConnect Cloud first to avoid local QCC data-download charges.

## Command Cheat Sheet

Run from repository root unless noted.

```bash
# Alpha and feature generation
./scripts/run-alpha-cycle

# Local LEAN and import
./scripts/lean-backtest aggressive_llm_momentum
./scripts/import-lean-run latest
./scripts/prepare-lean-local-data
./scripts/run-full-backtest.sh --skip-alpha-cycle --skip-market-data-ingest --no-download-data
./scripts/run-local-strategy-smoke
./scripts/verify-lean-cloud-package aggressive_llm_momentum

# QuantConnect Cloud / Object Store
./scripts/run-cloud-quality-backtest
./scripts/qc-cloud-backtest aggressive_llm_momentum
./scripts/qc-cloud-push aggressive_llm_momentum
./scripts/qc-object-store-sync lincei/llm-features/latest.json

# Paper, live-shadow, learning, broker-write preflight
./scripts/run-paper-cycle
./scripts/run-paper-replay
./scripts/run-live-shadow
./scripts/run-learning-loop
./scripts/live-preflight
# Legacy compatibility command; always blocked under active SPEC.md.
./scripts/live-pilot-10usd --confirm-real-money
```

Exit code `2` means policy/account/platform `blocked` evidence, not a crash. Examples: missing QuantConnect Cloud project, missing Cloud account tier, failed strategy-evidence gates, missing paper target evidence, or blocked live-money preflight.

## Current Implementation Status

Implemented in this branch:

- Canonical typed contracts around `availableAt`, `horizonHours`, LEAN runtime/mode/status, LLM feature refs, live-shadow records, outcome labels, and promotion decisions.
- Raw evidence archive from existing news records into point-in-time evidence rows.
- LLM semantic feature generation with point-in-time evidence filtering and replayable abstain/flat records when LLM or eligible evidence is unavailable.
- LEAN replay helper for `llm_event_features.json` with future-`availableAt` rejection.
- Static meta-alpha and ML artifact replay now ignores records whose `availableAt` is in the simulated future.
- QuantConnect Cloud backtest/Object Store wrapper commands that record passed/blocked local evidence and import Cloud REST statistics, insights, orders, and derived order-target evidence when credentials are configured.
- Split latest-run markers: `.latest`, `.latest-strategy`, `.latest-simulator`, and `.latest-cloud-attempt` so simulator/cloud attempts cannot displace accepted strategy evidence.
- Current paper cycle remains strict about fresh market data; historical paper replay is explicit `paper-replay` evidence and is ignored by live preflight.
- Live-shadow would-have-traded ledger with broker writes disabled and explicit `evidenceMode` (`historical_target_replay` vs `current_live_shadow`).
- Learning loop with outcome labeling from `max(asOf, availableAt)` where market bars are available and promotion decisions that block without Cloud + live-shadow evidence.
- Legacy live-money command surface that always records blocked evidence and never creates broker-write intents under the active spec.
- Quality-gated universe manifest with backend and LEAN loaders, hard-exclusion validation, symbol caps, sleeve caps, ETF redundancy policy, and per-run `universe-selection-report.json`.
- LEAN portfolio construction applies manifest caps and emits zero targets for old holdings that drop out of top-k.
- Local LEAN data preparation command that ingests Stooq daily bars when `STOOQ_API_KEY` is present, exports LEAN daily zip/map/factor files, hydrates the feature DB from existing LEAN data, and reports per-symbol coverage before a full universe backtest.
- Cost-control guard for local QuantConnect data downloads: `run-full-backtest` defaults to `--no-download-data`, and `--download-data` is blocked unless `ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true`.
- Cloud package preflight command that compiles LEAN source, runs focused LEAN tests, and executes a local Docker LEAN backtest with the universe manifest path intentionally missing. `qc-cloud-backtest --push`, `qc-cloud-push`, and `run-cloud-quality-backtest` run this preflight before pushing unless `SKIP_LEAN_CLOUD_PACKAGE_PREFLIGHT=true` is explicitly set.

Known current blockers from direct verification:

- `run-cloud-quality-backtest` can push and compile the QuantConnect Cloud project, but the current account blocks CLI/API Cloud backtest execution with a paid-organization-tier requirement. Manual web-IDE Cloud backtesting may still be useful, but repo-imported promotion evidence remains blocked until CLI/API result access is available.
- Cloud REST result import still needs `QC_PROJECT_ID`/`QUANTCONNECT_PROJECT_ID`, `QC_USER_ID`/`QUANTCONNECT_USER_ID`, and `QC_API_TOKEN`/`QUANTCONNECT_API_TOKEN` when account tier permits API access.
- Full quality-gated local backtests need paid/local data access and are intentionally not the default path. Use `./scripts/run-cloud-quality-backtest` first.
- Local LEAN strategy-evidence works on Linux ARM64 through the Docker group fallback when direct socket access is stale in the current shell.
- `run-paper-cycle` is expected to block on stale historical targets unless a current target snapshot exists; use `run-paper-replay` for plumbing checks that must not satisfy live preflight.
- Promotion remains blocked until QuantConnect Cloud evidence and `current_live_shadow` evidence are both present.

## Verification

Primary proof is direct execution. Unit tests support that proof but do not replace it.

Complete gate before merging broad changes:

```bash
cd backend && bun run build
cd backend && bun run test
cd backend && bun run test:e2e

cd frontend && bun run typecheck
cd frontend && bun run build
cd frontend && bun run lint
cd frontend && bun run test:run

.venv-ml/bin/python -m pytest engines/lean/aggressive_llm_momentum/tests
./scripts/verify-lean-cloud-package aggressive_llm_momentum
python3 -m py_compile engines/lean/aggressive_llm_momentum/alpha/semantic_features.py
git diff --check
```

Latest direct verification on 2026-05-25 UTC, Linux aarch64:

- `cd backend && bun run build` passed.
- Targeted backend Jest passed: Stooq API-key blocker handling, local LEAN data export/coverage, universe manifest validation, LEAN CLI runner, Cloud runner, and LEAN run acceptance.
- `.venv-ml/bin/python -m pytest engines/lean/aggressive_llm_momentum/tests` passed.
- `python3 -m py_compile` passed for the touched LEAN Python modules.
- `./scripts/verify-lean-cloud-package aggressive_llm_momentum` passed. It compiled source Python files excluding generated `backtests/`, ran the focused LEAN test suite, and completed a Docker LEAN backtest with `universe-manifest-path` set to a deliberately missing Cloud-package path. Latest preflight run id: `cloud-package-preflight-20260525070732`.
- `./scripts/run-full-backtest.sh --download-data --skip-alpha-cycle --skip-market-data-ingest` returned exit code `2` before LEAN/Docker execution because paid local QuantConnect data downloads are disabled by default.
- `bash -n scripts/run-full-backtest.sh scripts/run-cloud-quality-backtest scripts/run-local-strategy-smoke scripts/run-v1-cycle scripts/setup-lean-workspace.sh scripts/bootstrap-dev.sh scripts/qc-cloud-backtest` passed.
- `./scripts/run-local-strategy-smoke` passed on Linux ARM64 through the in-process `sg docker` fallback. Latest accepted local strategy run: `bt-20260525055106-0a291ac7`.
- `./scripts/run-v1-cycle --skip-alpha-cycle --skip-market-data-ingest --no-download-data` previously returned exit code `0`: accepted local strategy run `bt-20260524172437-5f504408`, paper cycle blocked by stale market data and missing approval, and live preflight recorded explicit broker/credential blockers. The script now respects the `--skip-alpha-cycle` argument directly.
- The latest smoke exported `universe-selection-report.json` with `quality_core_backtest_safe`, benchmark override `SPY,QQQ,IWM`, hard exclusions, symbol caps, sleeve caps, and Korea/US tax context notes.
- Full quality-gated local `--download-data` execution is no longer a default verification path because it can spend QCC. It is blocked unless `ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true` is explicitly set after cost approval.
- `./scripts/run-cloud-quality-backtest` pushed and compiled the full quality-gated QuantConnect Cloud project, then returned exit code `2` because the current account requires a paid tier for CLI/API Cloud backtest execution. Latest blocked Cloud attempt: `qc-20260525060040-919f3120`.
- `./scripts/import-lean-run latest` reads `.latest-strategy` and imports the latest accepted strategy run even after blocked simulator or Cloud attempts move `.latest`.
- `./scripts/run-paper-cycle` returned exit code `2` with stale market data and paper approval blockers. This is the expected strict current-market behavior for historical LEAN targets.
- `./scripts/run-paper-replay` returned exit code `0` and created a reconciled paper replay plan for historical target plumbing.
- `./scripts/run-live-shadow` returned exit code `0` with `evidenceMode: historical_target_replay`.
- `./scripts/run-learning-loop` returned exit code `2` because the latest LEAN run is local, not QuantConnect Cloud, and live-shadow evidence is historical replay rather than `current_live_shadow`.
- `./scripts/live-preflight` returned exit code `2`; it ignored paper replay evidence and stayed blocked on missing current paper cycle, simulated broker snapshot, broker flags, and credentials.

## Documentation

- [Documentation Index](docs/README.md)
- [API Reference](docs/api-reference.md)
- [Development Guide](docs/development-guide.md)
- [Deployment Guide](docs/deployment-guide.md)
- [LEAN Backtest And Readiness Paths](docs/full-lean-backtest-setup.md)
- [Execution Readiness](docs/execution-readiness.md)
- [QuantConnect Realignment Decision](docs/decisions/2026-05-24-quantconnect-realignment.md)

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md), [AGENTS.md](AGENTS.md), and [terminology.md](terminology.md) before changing core behavior.

Important rules:

- Do not modify `SPEC.md` or `docs/spec/*` to expand live-money scope without explicit user approval.
- Use standard English engineering and quantitative-finance terms from `terminology.md`.
- Keep implementation files small and typed; prefer domain models over loose dictionaries.
- Commit in meaningful, reviewable chunks with detailed commit messages and verification evidence.

## License

ISC
