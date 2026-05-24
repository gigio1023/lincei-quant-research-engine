# LEAN Backtest And Readiness Paths

Status: operator runbook. The active scope is defined by [../SPEC.md](../SPEC.md).

This document separates **what each path proves**. QuantConnect Cloud backtests are the preferred promotion evidence when account access allows them. Local historical LEAN runs can support strategy evidence when data quality passes. The local simulator and flow-validation paths prove artifact plumbing only.

## Path overview

| Path | Command / trigger | What it validates | Live-ready? |
|------|-------------------|-------------------|-------------|
| **LEAN flow validation** | `lean-backtest` with `LEAN_ALLOW_SIMULATOR=true`, or simulator fallback | End-to-end artifact export, import, paper bridge wiring | No |
| **Historical numeric backtest** | `run-full-backtest` / `LeanCliRunner` | Bar-by-bar numeric alpha inside LEAN on historical data | Strategy evidence when data gates pass |
| **Rolling ML / meta research** | `run-alpha-cycle`, external baselines, `LIVE_PREFLIGHT_ALLOW_RESEARCH=true` | Nest feature snapshots, LightGBM scores, LLM committee, static `meta_decisions.json` | No (research only) |
| **QuantConnect Cloud evidence** | `qc-cloud-backtest`, `qc-object-store-sync` | Cloud project push/backtest attempt, Object Store feature artifact upload, account-tier blockers | Promotion evidence when cloud run passes |
| **Paper / live-shadow readiness** | `run-paper-cycle`, `run-live-shadow`, `live-preflight` | Policy gates, would-have-traded evidence, broker snapshot reconciliation, blocked preflight evidence | No real broker writes under active spec |

**Static LLM / meta overlay is not historical alpha validation.** `meta_decisions.json` is a single committee snapshot per run (QuantConnect “precomputed overlay” pattern). It does not walk forward through time and must not be treated as proof that LLM alpha worked historically.

---

## LEAN flow validation (plumbing only)

Use when Docker/Lean CLI or QC data is unavailable (CI, local smoke).

```bash
export LEAN_ALLOW_SIMULATOR=true
./scripts/lean-backtest
./scripts/import-lean-run latest
```

Artifacts include `config.json` with `"simulator": "lean-local-simulator-v1"`. **Live preflight blocks** simulator runs, `validationMode: flow-validation`, and `usesStaticMetaOverlay: true` unless `LIVE_PREFLIGHT_ALLOW_RESEARCH=true` or `parameters.mode: research`.

---

## Historical numeric backtest (strategy evidence)

### What runs inside LEAN

| Layer | Where | Data |
|-------|--------|------|
| **Numeric alpha** | `LinceiNumericAlphaModel` | QC historical US equity bars |
| **Meta overlay (optional)** | `input/meta_decisions.json` from `run-alpha-cycle` | Static snapshot — not walk-forward LLM validation |
| **External ML file (optional)** | `input/ml_predictions.json` | LightGBM scores when present |
| **Portfolio / risk / execution** | Algorithm Framework | Same bar stream |
| **Artifacts** | `artifacts/lean-runs/<runId>/` | Imported via `import-lean-run` |

Numeric features are computed **bar-by-bar inside LEAN** (200+ day warm-up). Nest `market_data_bars` (Stooq ingest) feeds **ML alpha in Nest only**, not the LEAN engine bar stream.

Default window: **2024-01-01 → 2025-12-31** daily, universe `SPY, QQQ, IWM, TLT, GLD` — see `engines/lean/aggressive_llm_momentum/main.py`.

### One-time setup

#### Bun (required)

This repo uses **Bun** for Node/TypeScript apps (**not npm**). Install [Bun](https://bun.sh), then:

```bash
cd backend && bun install
cd ../frontend && bun install
```

Pre-PR quality gate:

```bash
cd backend && bun install && bun run lint && bun run test:all && bun run build
cd ../frontend && bun install && bun run lint && bun run test:run && bun run build
```

Validation commands always go through `bun run v1:cli -- <command>` from `backend/` or the `./scripts/*` wrappers.

#### Repo (automated)

```bash
./scripts/setup-ml-venv.sh
./scripts/download-external-baselines
./scripts/setup-lean-cli.sh
chmod +x scripts/*.sh
```

#### Docker

Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and verify `docker info`.

#### QuantConnect workspace

1. Account: https://www.quantconnect.com/signup  
2. API token: https://www.quantconnect.com/account  
3. `./scripts/setup-lean-workspace.sh` → `engines/lean/lean.json` and `engines/lean/data/`

#### QC market data (required for real backtest)

```bash
cd engines/lean
export LEAN_CLI_PATH=../../.venv-lean-cli/bin/lean

$LEAN_CLI_PATH data download \
  --dataset "USA Equities" \
  --data-type Trade \
  --ticker SPY \
  --resolution Daily
# Repeat for QQQ, IWM, TLT, GLD
```

#### Secrets in `backend/.env`

Copy `backend/.env.example` if needed, then fill:

```bash
QUANTCONNECT_USER_ID=...      # from QC email
QUANTCONNECT_API_TOKEN=...    # from QC email
OPENAI_API_KEY=sk-...         # optional; LLM committee in alpha cycle
```

```bash
./scripts/lean-login-from-env.sh   # writes ~/.lean/credentials
./scripts/setup-lean-workspace.sh  # creates engines/lean/lean.json
```

### Run historical backtest

```bash
./scripts/run-full-backtest.sh
```

Equivalent:

```bash
cd backend && bun run v1:cli -- run-full-backtest
```

Does **not** fall back to the local simulator.

---

## Rolling ML / meta research (Nest alpha cycle)

```bash
./scripts/run-alpha-cycle
# or: cd backend && bun run v1:cli -- run-alpha-cycle
```

Requires ingested bars in SQLite (`datasetId: v1-lean-universe`) **or** test-only synthetic features:

| Variable | Purpose |
|----------|---------|
| `ALLOW_SYNTHETIC_FEATURES=true` | Allow placeholder features when &lt; 2 bars per symbol (tests/simulator only) |

Production `run-full-backtest` ingests Stooq bars first; if ingestion fails, alpha may still run only when bars exist.

Outputs under `engines/lean/aggressive_llm_momentum/input/`:

- `meta_decisions.json` — static meta/LLM overlay for LEAN  
- `llm_event_features.json` — point-in-time semantic alpha features for LEAN replay
- `ml_predictions.json` — optional external LightGBM scores  

The same LLM feature payload is exported to `artifacts/llm-features/latest.json` for QuantConnect Object Store upload.

---

## QuantConnect Cloud and Object Store

Cloud commands use Lean CLI and always create local evidence records:

```bash
./scripts/qc-cloud-backtest aggressive_llm_momentum --push
./scripts/qc-object-store-sync lincei/llm-features/latest.json
```

If credentials, paid organization tier, project lock, or dataset access block the run, the command records a `quantconnect-cloud` LEAN run with `status: blocked` and actionable blocker reasons.

---

## Paper / live-shadow readiness

```bash
./scripts/run-paper-cycle
./scripts/run-live-shadow
./scripts/live-preflight
```

`run-live-shadow` records proposed targets and would-have-traded orders without broker writes. `live-preflight` is **fail-closed** and is expected to stay blocked for real broker writes under the active spec. It blocks when:

- Latest LEAN run is simulator / flow-validation / static-meta (unless research mode)  
- Broker snapshot `provider === 'simulated'`  
- Broker or paper `reconciliation.status !== 'matched'`  
- Any required env flag or credential is missing  

Research escape hatch (does **not** enable broker writes):

| Variable | Purpose |
|----------|---------|
| `LIVE_PREFLIGHT_ALLOW_RESEARCH=true` | Allow flow-validation / static-meta overlay blockers to be waived for dev |
| `parameters.mode: research` in LEAN `config.json` | Same, per-run |

---

## CLI flags (`bun run v1:cli -- <command>` from `backend/`)

### `run-full-backtest`

| Flag | Effect |
|------|--------|
| `--skip-alpha-cycle` | Reuse existing `input/meta_decisions.json` |
| `--no-download-data` | Do not pass `--download-data` to Lean CLI |
| `--skip-market-data-ingest` | Skip Stooq → SQLite ingest |
| `--with-static-meta` | Enable static `meta_decisions.json` overlay; disabled by default |
| `--with-static-ml` | Enable static `ml_predictions.json` overlay; disabled by default |
| `--no-static-meta` | Explicitly keep static meta disabled; redundant with current default |
| `--no-static-ml` | Explicitly keep static ML disabled; redundant with current default |

### `lean-backtest`

Uses Lean CLI when `engines/lean/lean.json` exists; with `LEAN_ALLOW_SIMULATOR=true` forces simulator. With `LEAN_STRICT_CLI=false`, failed CLI may fall back to simulator. Simulator fallback is plumbing evidence only.

### `qc-cloud-backtest`

Runs `lean cloud backtest`. `--push` pushes the local project before the cloud backtest. Exit code **2** means account/platform policy blocked the cloud run and a local evidence record was written.

### `run-live-shadow`

Creates a live-shadow record from the latest imported LEAN target snapshot. It never submits broker orders.

### `run-learning-loop`

Creates alpha outcome labels when future market bars are available and records a promotion decision. Promotion remains `blocked` unless QuantConnect Cloud and live-shadow evidence are both present.

Exit code **2** = blocked by policy (not a crash).

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `LEAN_CLI_PATH` | Path to `lean` binary (default `.venv-lean-cli/bin/lean`) |
| `LEAN_ALLOW_SIMULATOR=true` | Force smoke simulator for `lean-backtest` |
| `LEAN_STRICT_CLI=false` | Fall back to simulator if CLI fails |
| `ALLOW_SYNTHETIC_FEATURES=true` | Test/simulator: synthetic Nest features without bars |
| `LIVE_PREFLIGHT_ALLOW_RESEARCH=true` | Waive flow-validation / static-meta preflight blockers |
| `QUANTCONNECT_USER_ID`, `QUANTCONNECT_API_TOKEN` | Lean CLI login (see `lean-login-from-env.sh`) |
| `OPENAI_API_KEY` | LLM committee in alpha cycle |
| `DATABASE_PATH` | SQLite (default `backend/data/investment.db`) |

---

## Verify success (historical backtest)

1. `artifacts/lean-runs/bt-*/statistics.json` — no `Simulator: lean-local-simulator-v1`  
2. `config.json` — no top-level `simulator` field  
3. CLI: `"mode": "lean-cli"`, `"status": "completed"`  
4. Non-zero `Total Orders`, `End Equity` in `statistics.json`

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `Missing lean.json` | `./scripts/setup-lean-workspace.sh` |
| `Docker is not running` | Start Docker Desktop |
| `Insufficient market data for SPY` | Run ingest or `ALLOW_SYNTHETIC_FEATURES=true` (tests only) |
| `lean: command not found` | `./scripts/setup-lean-cli.sh` |
| Missing QC data | `lean data download` per ticker |
| Live preflight: simulator | Re-run with Lean CLI, not simulator |
| Live preflight: reconciliation | `reconcileBrokerSnapshot` / paper reconcile until `matched` |
| Meta overlay static | Expected for the current static overlay path; not historical LLM validation |

---

## Architecture note

- **Model sharing:** Downloaded LightGBM + JSON into LEAN (no QC model hub).  
- **Sign-off:** QuantConnect Cloud evidence when available, plus local LEAN/direct verification; never treat `lean-local-simulator` as strategy validation.

See also: [ml-external-baselines-research.md](./ml-external-baselines-research.md), [lean-quantconnect-engine.md](./lean-quantconnect-engine.md).
