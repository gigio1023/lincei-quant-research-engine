# CLAUDE.md

Status: active agent guidance. `AGENTS.md`, `SPEC.md`, linked `docs/spec/` files, and `terminology.md` remain authoritative. This file gives Claude Code a compact operational guide for this repository.

## Language And Authority

- Write documentation, code comments, commit messages, pull request titles, and pull request bodies in English.
- Use canonical terminology from `terminology.md`. If a Korean translation is ambiguous, prefer the English technical term.
- Before changing long-term direction, read `SPEC.md` and the linked `docs/spec/` files. Do not change real-money scope, live trading, leverage, derivatives, broker write permissions, QuantConnect promotion rules, testing policy, credential rules, or the LLM/broker boundary without explicit user approval.
- Treat dated handoffs, old prompts, and archived docs as context only. They cannot override the active spec.

## Core Project Direction

- The project is a LEAN/QuantConnect + LLM autonomous alpha research engine.
- The core loop is: data -> alpha -> LEAN insight -> portfolio target -> risk -> paper trading/shadow trading order intent -> fill or would-have-traded evidence -> reconciliation -> learning.
- Prioritize work that makes this loop executable, inspectable, and reproducible.
- Dashboards, reports, ledgers, and settings are support surfaces. They should not displace missing alpha generation, backtesting, portfolio sizing, risk, execution, reconciliation, or learning behavior.
- Keep LEAN as the strategy runtime. The NestJS control plane can orchestrate, validate, import, reconcile, and learn from evidence; it should not reimplement LEAN portfolio/risk/execution semantics.
- Keep the LLM inside the alpha and risk-judgment loop through typed LLM-derived features and explanations. Do not let the LLM access broker credentials, raw order payloads, or final order quantities.

## Research And Reasoning Discipline

Use these Karpathy-style guidelines to avoid common LLM coding mistakes. They bias toward explicit thinking, simple design, and verified outcomes.

### Think Before Coding

- Read the relevant spec, code, runbook, and recent artifacts before editing.
- State assumptions, uncertainty, and tradeoffs explicitly. Do not hide confusion.
- If multiple interpretations are plausible, name them. Pick only when the repo context or user direction makes the choice defensible; otherwise ask a concise question.
- Push back when the simpler or safer approach is clearly better for the stated goal.

### Simplicity First

- Implement the minimum code that solves the requested problem and advances the core alpha/execution loop.
- Do not add speculative features, broad abstractions, single-use frameworks, premature configurability, or error handling for impossible states.
- If a solution becomes much larger than the problem warrants, simplify before continuing.
- Prefer typed domain models and small collaborators over loose payload plumbing or large orchestration services.

### Surgical Changes

- Touch only files needed for the task. Match existing style and local patterns.
- Do not refactor adjacent code, reformat unrelated files, or delete unrelated dead code. Mention unrelated cleanup opportunities instead.
- Remove only unused imports, variables, helpers, comments, and fixtures created by the current change.
- Every changed line should trace to the user request, the active spec, or a concrete blocker.

### Goal-Driven Execution

- For multi-step work, keep a short plan where each step includes how it will be verified.
- Loop until the relevant command, direct execution path, artifact, or explicit blocker is captured.
- Distinguish unit-test evidence from direct engine evidence. A passing unit test does not prove a meaningful QuantConnect/LEAN path.
- For this repository, strong verification usually means one of: LEAN local backtest, QuantConnect Cloud backtest/import, alpha replay, paper cycle, shadow trading cycle, pre-trade risk check, reconciliation, learning loop, build/type check, or a focused state-based unit test.

## Platform Portability

- This repository moves between Apple Silicon macOS and Linux ARM64. Before platform-sensitive commands, check:

```bash
uname -s
uname -m
```

- Treat Docker/Podman, Lean CLI, Python wheels, browser tooling, native Node/Bun packages, and downloaded binaries as platform-sensitive.
- Prefer repo-local toolchains and setup scripts over global installs.
- Report the platform and runtime versions when a blocker may be platform-specific.

## Implementation Rules

- Use Bun for backend and frontend JavaScript/TypeScript workflows unless a legacy command is explicitly documented.
- Do not run destructive dependency or lockfile changes such as `npm audit fix --force` unless the user explicitly asks for dependency remediation.
- Prefer explicit interfaces, DTOs, value objects, narrow classes, Pydantic models for external Python JSON, dataclasses/`TypedDict` in LEAN runtime code, and typed boundary mappers.
- Keep `Record<string, unknown>`, `any`, raw JSON maps, and `dict[str, Any]` at IO edges, fixtures, or genuinely opaque provider payloads.
- Split orchestration, policy, mapping, persistence, and IO before a service becomes a catch-all.
- Keep product files reviewable. As a default, product code files should stay under about 300 lines, functions under about 50 lines, and React components under about 120 lines unless there is a clear reason.
- Comments must explain why: safety invariants, boundary constraints, fail-closed behavior, non-obvious algorithms, replay/idempotency expectations, and real workarounds. Do not narrate obvious mechanics.

## Current Architecture Map

- `backend/`: NestJS control plane for V1 pilot workflows, evidence ingestion, LLM-derived features, LEAN artifact import, paper trading/shadow trading cycles, pre-trade risk check, reconciliation, and learning.
- `lean/`: LEAN/QuantConnect strategy runtime and Framework models.
- `frontend/`: operational dashboard for status, blockers, artifacts, and next safe actions.
- `scripts/`: operator entry points for setup, QuantConnect Cloud push/backtest/import, local backtest, alpha cycle, paper trading/shadow trading, pre-trade risk checks, reconciliation, learning, and text evidence ingestion.
- `docs/spec/`: active subsystem specifications linked from `SPEC.md`.
- `artifacts/`: generated run evidence, latest pointers, LEAN run exports, import results, and learning artifacts.

## Common Commands

Backend:

```bash
cd backend
bun run build
bun run test
bun run test -- --runInBand
bun run lint
bun run format:check
```

Frontend when touched:

```bash
cd frontend
bun run typecheck
bun run build
bun run test:run
bun run lint
bun run format:check
```

Direct engine paths:

```bash
./scripts/lean-backtest
./scripts/qc-cloud-push
./scripts/qc-cloud-backtest
./scripts/import-cloud-backtest --project-id <project-id> --backtest-id <backtest-id>
./scripts/ingest-semantic-evidence --source hf-fomc-statements-minutes --limit 80
./scripts/run-alpha-cycle
./scripts/run-paper-cycle
./scripts/run-live-shadow
./scripts/live-preflight
./scripts/run-learning-loop
```

Use the smallest command set that proves the affected behavior. If a direct engine command cannot run, report the exact blocker and the next command that should be run after the blocker is removed.

## Verification Expectations

- Docs-only changes normally need `git diff --check`.
- Backend code changes need the relevant focused tests plus `cd backend && bun run build`.
- Frontend changes need typecheck/build plus the relevant Vitest or lint command.
- LEAN runtime changes need a local strategy smoke/backtest when data is available, or a QuantConnect Cloud package/push/build check when cloud is the target.
- QuantConnect Cloud result ingestion should preserve run id, project id, backtest id, runtime, insight count, order count, fill/order-event count, promotion eligibility, and artifact path.
- Broker, paper, shadow trading, pre-trade risk check, reconciliation, and cap changes must include at least one blocked/failure case. Unknown state is blocked.

## Communication

- Be explicit and context-rich with the user. Explain what changed, why it changed, how it was verified, and what remains uncertain.
- Do not flood the user with raw logs. Summarize the important result and point to the command, artifact path, run id, or file.
- Clearly distinguish "simulator passed", "Cloud import passed", "strategy validation artifacts passed", "pre-trade risk check blocked by policy", and "command failed".
- If platform-sensitive behavior was involved, include `Darwin arm64`, `Linux aarch64`, `Linux ARM64`, `Apple Silicon`, or `x86_64` context as appropriate.

## Outdated Surfaces

- Older report-generation, RSS dashboard, Gemini-only, and npm-centric instructions may still appear in historical docs or legacy code. Do not treat them as active product direction unless `SPEC.md` points to them.
- When touching legacy surfaces, label legacy identifiers as compatibility concerns rather than spreading old terminology into new APIs, docs, prompts, or UI copy.
