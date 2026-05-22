# Repository Coding Rules

These rules apply to the whole repository unless a narrower `AGENTS.md` overrides them.

## Scope And Shape

- Keep files small enough to review in one pass. As a default target, product code files should stay under about 300 lines. If a file grows beyond that, split it by responsibility before adding more behavior.
- Keep functions and React components focused. A function over about 50 lines or a component over about 120 lines needs a clear reason; otherwise extract helpers, hooks, or child components.
- Keep classes narrow. A class should own one domain concept. If it accumulates orchestration, persistence, validation, and rendering concerns, split those responsibilities.
- Avoid “god” service files. Backend modules should move pure calculations, policy checks, mappers, and persistence helpers into named collaborators instead of growing one large service.

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
