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

- Add comments that explain intent, invariants, risk controls, or non-obvious domain rules.
- Do not add comments that merely repeat the code.
- For finance, execution, risk, broker, ledger, or reconciliation logic, include comments for the safety invariant being protected and the failure mode the code is avoiding.

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
