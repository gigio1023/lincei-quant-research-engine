# Handoff: V1 LEAN + LLM Backtest Experiment (2026-05-23)

## Executive summary

The latest `run-full-backtest` run **did not validate strategy performance**. It validated that Nest → static JSON → LEAN Docker → artifact hydrate → DB import can complete without crashing.

| What people expect | What actually happened |
|--------------------|-------------------------|
| Non-zero insights/orders and PnL | **0 insights, 0 orders, 0% return** |
| LLM alpha driving LEAN live in backtest | LLM runs in **Nest only**; LEAN reads **pre-exported** `meta_decisions.json` |
| Historical research | **`flow-validation`** mode + **synthetic features** when Stooq fails |
| Import `passed` = good backtest | Import `passed` = **schema/hash gate only** |

**Treat the current experiment design as broken for performance research until the gaps below are fixed.**

---

## Branch and last meaningful run

- **Branch:** `codex/full-autonomous-live-pilot-v1`
- **Last full pipeline run ID:** `bt-20260523134430-3f344115`
- **LEAN folder:** `engines/lean/aggressive_llm_momentum/backtests/2026-05-23_22-44-31/` (gitignored)
- **Hydrated artifacts:** `artifacts/lean-runs/bt-20260523134430-3f344115/` (gitignored)

### LEAN statistics (real engine output)

- Period: `2020-01-01` → `2021-03-31` (forced when `--no-download-data` / Local provider)
- Start/End equity: $100,000 / $100,000
- Total orders: **0**
- Insight count: **0**
- Status: `Completed` (no runtime error after Python fixes)

### Nest alpha cycle (same run)

- `llmCount: 15`, `metaCount: 5` with `ALLOW_SYNTHETIC_FEATURES=true`
- Exported `meta_decisions.json` → **all symbols `flat`, `finalScore: 0.5`** (neutral pipeline filler)

---

## Why returns are 0% (root causes)

### 1. Split-brain alpha architecture

```
Nest (SQLite) ──run-alpha-cycle──► meta_decisions.json ──► LEAN reads static file
                     ▲                                      │
                     │                                      ▼
              LLM / synthetic features              No in-backtest LLM call
```

- LEAN never calls OpenAI during backtest.
- `meta_decisions.json` timestamps/scores are **not aligned** to LEAN simulation dates.
- `flow-validation` explicitly warns this is **pipeline proof**, not historical validation.

### 2. Data layer failure → neutral alpha

- Stooq ingest fails without `STOOQ_API_KEY` (HTML “get apikey” page).
- With `ALLOW_SYNTHETIC_FEATURES=true`, features are placeholders → LLM outputs **0.5 / flat**.
- Local LEAN data: sample `spy.zip` ends **2021-03-31**; other ETFs often **missing** (~44% data request failures in last run).

### 3. LEAN gating drops all signals

`meta_alpha.py` requires, per symbol:

- Bar present in `data.Bars`
- `numeric_score` from `NumericAlphaModel` (needs sufficient history)
- Combined score outside flat band

Missing bars + flat meta → **no insights** → portfolio model never targets → **no orders**.

### 4. Misleading success signals

- `LeanRunImportService` **passed** with **hydrated empty** `insights.json` / `portfolio_targets.json` (`riskNotes: hydrated_from_lean_summary_only`).
- Orchestrator reports `"status": "completed"` for the overall job.
- These checks do **not** require `Total Orders > 0` or non-flat alpha.

### 5. Artifact export not on host

- Algorithm logs `Exported artifacts to backtests/lincei-artifacts/{runId}` inside Docker.
- Files are **not reliably present** on the host mount; runner falls back to hydration placeholders.
- Cannot audit real insights/orders from repo artifacts today.

---

## Code changes in this commit (intent)

### Backend

- `repo-env.loader.ts` — load repo-root `.env`, fix `DATABASE_PATH`
- `lean-cli.runner.ts` — Docker LEAN backtest, Local provider window, artifact hydrate
- `v1-pilot-orchestrator.service.ts` — `runFullBacktest`, validation mode labeling
- `llm-alpha.service.ts` — skip `temperature` for `gpt-5*` / `o*` models
- `feature-snapshot.service.ts` — synthetic feature gate
- `live-preflight.service.ts` — simulator / kill-switch hardening
- Meta combiner parity (`meta-alpha.combiner.ts` + tests)
- Scripts use `bun run v1:cli`; CI uses `oven-sh/setup-bun`

### LEAN Python

- `shared/history_frame.py` — `History` without pandas `.empty`
- `insight_direction_label()` — `InsightDirection` has no `.name`
- `lincei_risk.py` — `GetLastData()` + UTC-safe stale check
- `PortfolioTarget.Percent` sizing (earlier fix)
- `main.py` — backtest date parameters

### Docs / scripts

- `docs/full-lean-backtest-setup.md`
- `scripts/setup-lean-cli.sh`, `lean-login-from-env.sh`, `run-full-backtest.sh`, etc.

---

## Environment (operator)

- Canonical secrets: **repo root `.env`** (never commit).
- OpenAI: use `OPENAI_MODEL=gpt-5.5` and `OPENAI_REASONING_EFFORT=medium` (not `gpt-5.5-medium`).
- QuantConnect: `QUANTCONNECT_USER_ID`, `QUANTCONNECT_API_TOKEN` for `lean login`.
- Optional: `STOOQ_API_KEY`, `ALLOW_SYNTHETIC_FEATURES` (should be **false** for real experiments).

**Rotate API keys** if they were exposed in logs or chat.

---

## Commands reference

```bash
# Login + LEAN workspace (once)
./scripts/lean-login-from-env.sh
./scripts/setup-lean-workspace.sh

# Full pipeline (current behavior — NOT performance validation)
cd backend
ALLOW_SYNTHETIC_FEATURES=true bun run v1:cli -- run-full-backtest --no-download-data

# Alpha only
bun run v1:cli -- run-alpha-cycle

# LEAN only
bun run v1:cli -- lean-backtest

# Import latest
bun run v1:cli -- import-lean-run latest
```

---

## Recommended redesign (before more runs)

### A. Define acceptance criteria (hard gates)

Fail the job unless:

- `InsightCount > 0` and `OrderCount > 0` (or explicit waiver for unit tests)
- `insights.json` not empty and not hydration-only
- `meta_decisions.json` has at least one non-flat symbol for the run window
- Market data ingest success for all universe symbols OR abort (no silent synthetic)

### B. Pick one alpha path for backtest

| Option | Description |
|--------|-------------|
| **1. In-LEAN LLM** | Call model inside algorithm (expensive, complex) |
| **2. Point-in-time Nest** | For each backtest day, regenerate features + meta from DB bars; export dated decisions |
| **3. Research mode** | Drop static meta; run numeric + ML only in LEAN until (2) exists |

### C. Data

- Accept QC data terms; `run-full-backtest` **without** `--no-download-data` for 2024–2025, or
- Fix Stooq + persist bars in SQLite before alpha.

### D. Artifacts

- Write exports to host-visible path (e.g. repo `artifacts/lean-runs/{runId}` via mount or post-copy from container).
- Remove or gate `hydrate_from_lean_summary_only` behind `ALLOW_EMPTY_ARTIFACTS=true`.

### E. Rename statuses

- `import.passed` → `import.schema_ok`
- `run.completed` → require `research.validated` boolean

---

## Tests run before this handoff

- Backend: `bun run build`, unit + e2e (earlier in session)
- LEAN: manual `lean backtest` after Python fixes — **Completed**, still 0 orders

CI may need Bun lockfile and workflow updates verified on next PR.

---

## Open questions for next owner

1. Is V1 goal **pipeline demo** or **Sharpe/drawdown research**? Current code optimizes the former.
2. Should synthetic features be **disallowed** in `run-full-backtest` by default?
3. Should `flow-validation` be removed from default full backtest path?
4. Who owns QC data subscription vs local Stooq?

---

## Related docs

- `docs/v1-live-pilot-spec/` — product spec (may assume happier path than reality)
- `docs/full-lean-backtest-setup.md` — operator setup
- `docs/review-prompt-v1-lean-experiment-handoff.md` — copy-paste prompt for external AI review
- `docs/review-prompt-gpt55-lean-ml-backtest.md` — earlier GPT-focused review checklist (optional)
