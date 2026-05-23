# Repository Coding Rules

These rules apply to the whole repository unless a narrower `AGENTS.md` overrides them.

## Scope And Shape

- Infer useful implicit requirements from the user's goal. This is good and expected. However, implicit work is valuable only when it serves the project's core objective first. For this repository, the core objective is an executable Lean/QuantConnect + LLM autonomous alpha system that can research, decide, backtest, size, execute, reconcile, and learn.
- Before implementing an inferred feature, ask: "Does this advance the core alpha/execution loop?" If the answer is no, defer it unless the user explicitly asked for it or it removes a blocker.
- Prioritize the execution engine over surrounding polish. A new dashboard, report, ledger, or settings page is secondary if the Lean/QuantConnect runtime, alpha model, portfolio construction, risk/execution path, broker adapter, or reconciliation loop is missing or broken.
- Prefer vertical slices that prove the money-moving loop end to end: data -> alpha -> LEAN insight -> portfolio target -> risk -> paper/live order -> fill -> reconciliation. Horizontal infrastructure is allowed only when it unblocks that slice.
- Do not let safety infrastructure become a substitute for the trading engine. Budget management, risk gates, approvals, and ledgers are required, but they are support systems around the alpha/execution core.
- Keep files small enough to review in one pass. As a default target, product code files should stay under about 300 lines. If a file grows beyond that, split it by responsibility before adding more behavior.
- Keep functions and React components focused. A function over about 50 lines or a component over about 120 lines needs a clear reason; otherwise extract helpers, hooks, or child components.
- Keep classes narrow. A class should own one domain concept. If it accumulates orchestration, persistence, validation, and rendering concerns, split those responsibilities.
- Avoid “god” service files. Backend modules should move pure calculations, policy checks, mappers, and persistence helpers into named collaborators instead of growing one large service.

## Core-First Implementation Rule

- Always identify the core functional gap before implementation. In this project, the current core gap is the missing Lean/QuantConnect execution engine and LLM alpha integration, not the absence of more UI panels.
- If a task can be implemented as either a cosmetic/supporting surface or a working engine slice, choose the working engine slice.
- If the user asks for broad planning, keep the plan oriented around alpha generation, backtesting, portfolio sizing, risk execution, broker operations, and learning loops.
- If the system cannot yet run a meaningful Lean backtest or paper cycle, do not spend major effort on frontend polish unless explicitly requested.
- When adding docs, keep them implementation-directive: define contracts, commands, acceptance criteria, and blockers. Avoid vague strategy prose that does not move the engine forward.

## Comments

This repository follows practices aligned with [Google's code review guidance](https://google.github.io/eng-practices/review/reviewer/looking-for.html) and Meta/Facebook-style reviewable changes: comments and commit messages should explain **why**, not restate **what** the code already says. If code needs a "what" comment, prefer renaming or simplifying the code first.

### Default rule

- Write comments in **English**.
- Every comment must earn its place: if deleting the comment loses no information a reader cannot get from names and structure, remove it.
- Prefer clear names, small functions, and typed contracts over inline narration.

### What to comment (required in this repo)

| Situation | What to write |
|-----------|----------------|
| **Money-moving paths** (broker, paper/live execution, reconciliation, live pilot) | The safety invariant, fail-closed default, and the failure mode being prevented (e.g. duplicate submit, stale features, cap bypass). |
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
- **Python (LEAN)**: Module docstring at top; class docstring for Framework models explaining role in the V1 loop.
- **Shell scripts**: One header block: purpose, delegation target, and exit-code meaning.
- Do not box comments with asterisk frames (Google styleguide).
- Keep comments up to date: delete comments that contradict the code or describe removed behavior.

### Documentation vs comments

- **Comments**: In-code reasoning for maintainers at the point of use.
- **Docs** (`docs/`, `SPEC.md`, module READMEs): Contracts, runbooks, acceptance criteria, and operator commands.
- **JSDoc on public APIs**: Purpose, preconditions, and side effects when the method is called from scripts, other modules, or HTTP—not parameter renames.

### Finance-specific (V1 live pilot)

- Structured (non-LLM) alpha defaults to a **promoted gradient-boosted tabular model** (LightGBM when available, else sklearn `HistGradientBoostingRegressor`). Heuristic scoring is degraded fallback only.
- State maximum notional caps and "blocked beats ready" wherever live or broker write paths are implemented.
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

## Frontend

- Dashboards must be operational surfaces, not marketing pages. Show state, blockers, ledger evidence, and next safe actions in one scan-friendly layout.
- Split large screens into a data hook, formatting helpers, sample/documented data, and small section components.
- Do not use decorative gradient blobs, glassmorphism, or oversized cards for dense trading/control-plane surfaces.
- Financial numbers should use tabular or mono-like styling, and trading up/down colors must keep their semantic meaning.

## Testing And Review

- When behavior changes, update or add tests close to the changed surface.
- Before pushing, run the relevant unit tests plus build/type checks for the touched app.
- If a change touches broker, execution, paper account, risk, or reconciliation paths, include a test for the blocked or failure case, not only the happy path.
