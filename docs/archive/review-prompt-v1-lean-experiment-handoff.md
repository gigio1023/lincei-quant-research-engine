# Review Prompt: V1 LEAN + LLM Backtest Experiment Handoff

Status: archived historical prompt.

This prompt targets a superseded branch/spec. Use it only for context, not as active implementation direction.

Use this document as the **full prompt** for a fresh AI review session. Copy the section below the line into a new chat, or point the reviewer at this file on branch `codex/full-autonomous-live-pilot-v1`.

---

## Prompt (copy from here)

You are reviewing the **lincei-quant-research-engine** repository on branch **`codex/full-autonomous-live-pilot-v1`**, commit **`595f569`** (or latest on that branch).

### Context

This branch attempted a V1 “full backtest” pipeline: Nest alpha (LLM) → static JSON → LEAN Docker backtest → artifact import to SQLite. The operators concluded the **experiment design is wrong for performance validation**, not merely buggy.

**Last documented run:** `bt-20260523134430-3f344115`

- LEAN period: 2020-01-01 → 2021-03-31 (local data, `--no-download-data`)
- **0% return, 0 orders, 0 LEAN insights**
- Nest alpha reported `llmCount: 15`, `metaCount: 5` but exported `meta_decisions.json` was **all flat / score 0.5** (synthetic features + Stooq failure)
- DB import **`passed`** despite empty hydrated insights/targets — this is **schema/import success**, not strategy success

Read first:

- `docs/handoff-2026-05-23-v1-lean-experiment.md`
- `docs/review-prompt-v1-lean-experiment-handoff.md` (this file)

### What we need from you

1. **Architecture review** — Is the split-brain alpha design (Nest LLM → static `meta_decisions.json` → LEAN) ever valid for historical backtest? What should replace it (point-in-time Nest, in-LEAN LLM, numeric-only, etc.)?
2. **Success criteria** — Where does the codebase falsely equate `import.passed` / `status: completed` with a good backtest? Propose hard gates (e.g. `OrderCount > 0`, non-empty artifacts, no synthetic features).
3. **Data path** — Stooq ingest failures, `ALLOW_SYNTHETIC_FEATURES`, local LEAN sample data limits; what must change before any performance claim?
4. **Artifact pipeline** — Docker export vs host `artifacts/lean-runs/`; `hydrate_from_lean_summary_only` placeholders in `backend/src/modules/v1-pilot/lean/lean-cli.runner.ts`.
5. **Code review** on changed surfaces (correctness, safety, finance invariants):
   - `backend/src/modules/v1-pilot/v1-pilot-orchestrator.service.ts`
   - `backend/src/modules/v1-pilot/lean/lean-cli.runner.ts`
   - `backend/src/shared/repo-env.loader.ts`
   - `backend/src/modules/v1-pilot/alpha/` (feature snapshot, LLM, meta combiner)
   - `engines/lean/aggressive_llm_momentum/` (`main.py`, `alpha/`, `portfolio/`, `risk/`, `shared/history_frame.py`)
   - `backend/src/modules/v1-pilot/live/live-preflight.service.ts`
6. **CI / tooling** — Bun migration (`.github/workflows/pr-quality-check.yml`, `backend/bun.lock`, `scripts/*` → `bun run v1:cli`).
7. **Prioritized fix plan** — P0/P1/P2 with smallest vertical slice that produces **non-zero insights and orders** on real or QC-downloaded data.

### Constraints for your review

- Do **not** treat the last run as a successful backtest.
- Flag any path that allows **silent neutral alpha** (synthetic features, flat meta JSON) through to “completed” status.
- Secrets live in repo-root `.env` (gitignored); never suggest committing them.
- OpenAI model id should be `gpt-5.5` + `OPENAI_REASONING_EFFORT=medium`, not `gpt-5.5-medium`.

### Spec alignment

Cross-check against `docs/v1-live-pilot-spec/` (especially `06-lean-alpha-implementation.md`, `08-validation-and-handoff.md`) and note **spec vs implementation gaps**.

### Output format

1. Executive verdict (1 paragraph): is this branch ready to merge for **research**, **pipeline demo only**, or **neither**?
2. Table: issue | severity | file(s) | recommendation
3. Proposed acceptance criteria for `run-full-backtest`
4. Suggested next PR scope (max 3 small PRs)
5. Open questions for the human owner

Use **repository-relative paths only** (e.g. `backend/src/...`, `engines/lean/...`). Do not assume or invent absolute filesystem paths on the reviewer’s machine.

---

## Related files

| Document | Purpose |
|----------|---------|
| `docs/handoff-2026-05-23-v1-lean-experiment.md` | Factual handoff from the failed experiment run |
| `docs/full-lean-backtest-setup.md` | Operator setup for LEAN CLI + Docker |
| `docs/review-prompt-gpt55-lean-ml-backtest.md` | Earlier GPT-focused review checklist (optional) |
