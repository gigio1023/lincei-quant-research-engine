# Repository Coding Rules

These rules apply to the whole repository unless a narrower `AGENTS.md` overrides them.

## Spec Authority And Change Control

- `SPEC.md` is the active specification index. Documents linked from `SPEC.md` are normative unless they are explicitly marked archived or historical.
- Changing `SPEC.md` or any linked `docs/spec/` file changes the long-term project direction. Do not make those changes from inference alone.
- Explicit user approval is required before changing real-money scope, automatic live trading, broker write permissions, leverage, derivatives, capital limits, QuantConnect promotion requirements, testing policy, credential rules, or the LLM/broker boundary.
- Ambiguous approval means no approval. Agents may draft proposed spec wording, but implementation must wait until the user clearly approves the direction change.
- Older dated handoffs, prompts, and archived documents are historical context only. They cannot override `SPEC.md`.
- `terminology.md` is normative. New code, docs, comments, UI copy, prompts, and run reports must use its canonical terms and avoid its banned AI-slop expressions. If a legacy API/entity/script name violates terminology, label it as a legacy identifier rather than spreading the term into new surfaces.

## Research And Reasoning Discipline

These rules adapt the Karpathy-style caution against common LLM coding mistakes to this repository. They apply when researching, planning, coding, reviewing, refactoring, or updating docs.

- Think before coding. Read the relevant spec, code, runbook, and recent artifacts before making changes. State assumptions, uncertainty, and tradeoffs explicitly instead of hiding confusion.
- If multiple interpretations are plausible, name them. Pick only when the local context or user direction makes the choice defensible; otherwise ask a concise question.
- Define the core gap before implementation. For this repository, the gap should usually map to the alpha/execution evidence loop, not to a cosmetic or speculative surface.
- Use verifiable success criteria. For multi-step work, keep a short plan where each step has a concrete verification command, artifact, run id, or blocker.
- Prefer the simplest working implementation. Do not add speculative features, single-use abstractions, premature configurability, broad frameworks, or defensive branches for impossible states.
- If an implementation grows much larger than the problem warrants, stop and simplify. A senior engineer should be able to trace the design back to the user request, the spec, or a real blocker.
- Make surgical changes. Touch only files needed for the task, match existing style, and avoid adjacent refactors. If unrelated dead code or stale docs are discovered, mention them rather than deleting them unless the user asked for cleanup.
- Clean up only the mess created by the current change: unused imports, orphaned helpers, obsolete local comments, and test fixtures introduced by the change.
- Loop until verified. A task is not done because code was written; it is done when the relevant direct execution, build, unit test, smoke test, or explicit blocker has been reported.
- Direct execution evidence is preferred over test theater. Unit tests matter for pure scoring, schema, idempotency, cap, timestamp, and fail-closed behavior, but they do not replace a meaningful LEAN backtest, QuantConnect Cloud import, alpha replay, paper/live-shadow cycle, preflight, or reconciliation check when that path is affected.

## Scope And Shape

- Infer useful implicit requirements from the user's goal. This is good and expected. However, implicit work is valuable only when it serves the project's core objective first. For this repository, the core objective is an executable Lean/QuantConnect + LLM autonomous alpha system that can research, decide, backtest, size, execute, reconcile, and learn.
- Before implementing an inferred feature, ask: "Does this advance the core alpha/execution loop?" If the answer is no, defer it unless the user explicitly asked for it or it removes a blocker.
- Prioritize the execution engine over surrounding polish. A new dashboard, report, ledger, or settings page is secondary if the Lean/QuantConnect runtime, alpha model, portfolio construction, risk/execution path, broker boundary, or reconciliation loop is missing or broken.
- Prefer vertical slices that prove the validated capital-allocation loop end to end: data -> alpha -> LEAN insight -> portfolio target -> risk -> paper/live-shadow order intent -> fill or would-have-traded evidence -> reconciliation. Horizontal infrastructure is allowed only when it unblocks that slice.
- Do not let safety infrastructure become a substitute for the trading engine. Budget management, risk gates, approvals, and ledgers are required, but they are support systems around the alpha/execution core.
- Keep files small enough to review in one pass. As a default target, product code files should stay under about 300 lines. If a file grows beyond that, split it by responsibility before adding more behavior.
- Keep functions and React components focused. A function over about 50 lines or a component over about 120 lines needs a clear reason; otherwise extract helpers, hooks, or child components.
- Keep classes narrow. A class should own one domain concept. If it accumulates orchestration, persistence, validation, and rendering concerns, split those responsibilities.
- Avoid “god” service files. Backend modules should move pure calculations, policy checks, mappers, and persistence helpers into named collaborators instead of growing one large service.

## Platform Portability

- This repository moves between Apple Silicon macOS and Linux ARM64. Before running platform-sensitive commands, check the current platform with `uname -s` and `uname -m`.
- Treat Docker/Podman, Lean CLI, Python wheels, browser tooling, native Node/Bun packages, and downloaded binaries as platform-sensitive.
- Use canonical platform terms from `terminology.md`: `Darwin arm64`, `Linux aarch64`, `Linux ARM64`, `Apple Silicon`, and `x86_64`.
- Do not assume a command that passed on macOS ARM will pass on Linux ARM. If a failure may be platform-specific, report the platform and runtime versions with the blocker.
- Prefer repo-local toolchains and setup scripts (`.venv-lean-cli`, `.venv-ml`, Bun dependencies, `scripts/setup-*`) over global installs. Do not hardcode Mac-only or Linux-only absolute paths unless the command is explicitly platform-scoped.

## User Communication

- Be friendly, explicit, and context-rich with the user. Do not hide intent, assumptions, tradeoffs, or implied context that only the AI inferred.
- Avoid the anti-pattern of returning only a compressed result. The user should be able to understand what was done, why it was done, what changed, what was verified, and what remains uncertain or blocked.
- For non-trivial work, final responses should include the relevant context needed for review: objective, important decisions, changed files or subsystems, validation commands/results, known risks, and next useful action. Keep the structure clear instead of making the user reconstruct the work from terse fragments.
- Explain implications when they matter. For example, distinguish "simulator passed" from "strategy evidence passed", "preflight blocked by policy" from "command failed", and "legacy identifier kept for compatibility" from "term approved for new work".
- If the work involved platform-sensitive behavior, include the platform and runtime context that affected the result.
- If the answer would benefit from teaching the user a concept, include a concise explanation using the canonical English term from `terminology.md`. Do not over-translate ambiguous technical terms into Korean.
- Do not flood the user with raw logs or irrelevant implementation details. Provide enough context for informed review and learning, then point to files, commands, artifacts, or blockers for deeper inspection.

## Core-First Implementation Rule

- Always identify the core functional gap before implementation. In this project, the current core gap is QuantConnect Cloud promotion evidence plus point-in-time LLM semantic-alpha replay, not the absence of more UI panels.
- If a task can be implemented as either a cosmetic/supporting surface or a working engine slice, choose the working engine slice.
- If the user asks for broad planning, keep the plan oriented around alpha generation, backtesting, portfolio sizing, risk execution, broker operations, and learning loops.
- If the system cannot yet run a meaningful Lean backtest or paper cycle, do not spend major effort on frontend polish unless explicitly requested.
- When adding docs, keep them implementation-directive: define contracts, commands, acceptance criteria, and blockers. Avoid vague strategy prose that does not move the engine forward.

## Implementation Architecture

- Build scalable vertical slices around typed domain concepts, not loose payload plumbing. The core objects are feature snapshots, LLM event features, alpha decisions, LEAN insights, portfolio targets, risk cuts, execution intents, orders, fills, reconciliations, and readiness states.
- Prefer typed domain models over dictionary soup. In TypeScript, use explicit interfaces, DTOs, value objects, or narrow classes. In Python services and offline processors, use Pydantic models for external JSON and persisted contracts. Inside LEAN runtime code, use dataclasses or `TypedDict` when Pydantic would be unsafe for QuantConnect compatibility.
- Convert untrusted external payloads at boundaries into typed domain models immediately. `Record<string, unknown>`, `any`, `dict[str, Any]`, and raw JSON maps should stay at IO edges, test fixtures, or truly opaque provider payloads.
- Keep orchestration, policy, mapping, persistence, and IO separate. A service that starts coordinating all of these should be split before more behavior is added.
- Keep LEAN as the strategy runtime. The backend control plane can orchestrate, validate, import, and reconcile, but it should not reimplement LEAN portfolio/risk/execution semantics in NestJS.
- Keep the LLM inside the alpha loop through typed semantic features and risk judgments. Do not let it cross into broker credentials, raw order payloads, or final order quantities.

## Comments

This repository follows practices aligned with [Google's code review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and Meta/Facebook-style reviewable changes: comments and commit messages should explain **why**, not restate **what** the code already says. If code needs a "what" comment, prefer renaming or simplifying the code first.

### Default rule

- Write comments in **English**.
- Comments should preserve intent, background, safety invariants, non-obvious tradeoffs, and operational constraints that names and types cannot express. A useful comment may be detailed when it explains why the code must behave a certain way.
- Do not narrate obvious mechanics, parameter names, imports, or control flow. If a comment only says what the next line does, improve the name or extract a helper instead.
- Prefer clear names, small functions, and typed contracts over inline narration.

### What to comment (required in this repo)

| Situation | What to write |
|-----------|----------------|
| **Broker-write or execution-like paths** (broker, paper/live-shadow execution, reconciliation, preflight) | The safety invariant, fail-closed default, and the failure mode being prevented (e.g. duplicate submit, stale features, cap bypass). |
| **Boundary crossings** (LEAN ↔ NestJS, LLM ↔ broker, script ↔ CLI) | Why the boundary exists and what must *not* happen across it (no OpenAI in LEAN backtest, no credentials in LLM/frontend/logs). |
| **Policy gates** (preflight, kill switch, schema verification flags) | Why the gate exists and what "unknown" means (always blocked). |
| **Non-obvious algorithms** (meta-alpha weights, numeric scoring, idempotency replay) | Brief intent and replay/idempotency expectations—not a line-by-line walkthrough. |
| **Workarounds and constraints** | Link to spec section or ticket; include `TODO(name):` only when follow-up is real. |

### What not to comment

- Obvious control flow (`// increment i`, `// return result`).
- Getters, DTO field lists, or imports.
- Test files, unless a test encodes a subtle regression contract (one line above the `it` block is enough).
- Generated or mechanical code (migrations, lockfiles).
- Closing braces, section banners with no new information, or ASCII art separators.

### Format

- **TypeScript/JavaScript**: Use `/** ... */` for file/module intent and public service methods; use `//` sparingly for single-line invariants inside hot paths.
- **Python (LEAN)**: Module docstring at top; class docstring for Framework models explaining role in the current validation loop.
- **Shell scripts**: One header block: purpose, delegation target, and exit-code meaning.
- Do not box comments with asterisk frames (Google styleguide).
- Keep comments up to date: delete comments that contradict the code or describe removed behavior.

### Documentation vs comments

- **Comments**: In-code reasoning for maintainers at the point of use.
- **Docs** (`docs/`, `SPEC.md`, module READMEs): Contracts, runbooks, acceptance criteria, and operator commands.
- **JSDoc on public APIs**: Purpose, preconditions, and side effects when the method is called from scripts, other modules, or HTTP—not parameter renames.

### Finance-specific

- Structured (non-LLM) alpha defaults to a **promoted gradient-boosted tabular model** (LightGBM when available, else sklearn `HistGradientBoostingRegressor`). Heuristic scoring is degraded fallback only.
- State maximum notional caps and "blocked beats ready" wherever paper, live-shadow, preflight, or broker paths are implemented.
- Never document secrets, keys, or raw account identifiers in comments; refer to "credential env" or "hashed ref" instead.
- When mock or simulator paths exist, comment that they prove plumbing only and must not be described as production broker readiness.

### Review checklist

Before merging comment-heavy changes:

1. Could any comment be replaced by a better name or a 5-line helper?
2. Do safety comments name the invariant and failure mode?
3. Are there any Korean or stale comments left in touched files?
4. Would a new engineer understand **why** the branch fails closed without reading the spec?

## Documentation

- Prefer an index plus split documents over one very long document.
- Keep each document focused on one decision, subsystem, workflow, or operational runbook.
- If a topic becomes long, create a short index page that links to detailed subpages.
- Documentation should be detailed enough to implement from, but not bundled into a single wall of text.
- Every new or materially updated document should state its status: active normative spec, supporting design, operator runbook, decision record, or archived historical context.
- Do not leave stale docs in place without a status note. If a doc no longer represents active direction, move it under `docs/archive/` or add a clear superseded banner.
- Root `SPEC.md` should stay short enough to act as an index and authority document. Put subsystem detail in focused `docs/spec/` pages.
- Follow `terminology.md` exactly. When a Korean translation is ambiguous, prefer the English technical term.

## Frontend

- Dashboards must be operational surfaces, not marketing pages. Show state, blockers, ledger evidence, and next safe actions in one scan-friendly layout.
- Split large screens into a data hook, formatting helpers, sample/documented data, and small section components.
- Do not use decorative gradient blobs, glassmorphism, or oversized cards for dense trading/control-plane surfaces.
- Financial numbers should use tabular or mono-like styling, and trading up/down colors must keep their semantic meaning.

## Testing And Review

- This repository is a non-production research engine. The primary proof is direct execution of the relevant engine path: LEAN backtest, QuantConnect Cloud backtest when available, import, alpha replay, paper cycle, live-shadow cycle, preflight, or reconciliation. Unit tests support that proof; they do not replace it.
- Prefer Detroit/classicist, state-based unit tests where they are high value: pure scoring logic, portfolio/risk policy, schema validation, timestamp/lookahead checks, idempotency, cap enforcement, and fail-closed broker/preflight behavior.
- Avoid low-value test theater: shallow tests that only restate framework wiring, excessive mocks of local collaborators, snapshots that do not protect behavior, or unit tests that pass while the executable alpha-to-order path cannot run.
- When behavior changes, add the narrowest useful test close to the changed surface and run the direct command that proves the affected loop still executes.
- If a change touches broker, execution, paper account, risk, reconciliation, live-shadow, or preflight paths, include at least one blocked/failure case. Unknown state must stay blocked.
- Before pushing, run the relevant unit tests plus build/type checks for the touched app.
- Final reports must distinguish unit-test evidence from smoke/direct-execution evidence, including command, mode, artifact path or run id, and exact blocker when a command cannot complete.
