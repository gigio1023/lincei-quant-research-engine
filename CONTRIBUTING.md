# Contributing

Status: active contribution guide.

This repository is a self-funded capital-first QuantConnect/LEAN + LLM autonomous alpha system. Darwinex/Zero is a later track-record monetization path, not the first architecture driver. Contributions must serve the active spec in [SPEC.md](SPEC.md). Do not treat this project as a generic dashboard or report app.

## Required Reading

Before changing core behavior, read:

- [SPEC.md](SPEC.md)
- [terminology.md](terminology.md)
- [AGENTS.md](AGENTS.md)
- [docs/README.md](docs/README.md)

`SPEC.md` and linked `docs/spec/*` files are long-term spec documents. Changing them changes project direction. Live-money broker writes, Darwinex/Zero adapters, leverage, derivatives, capital limits, QuantConnect promotion requirements, testing policy, credential rules, and the LLM/broker boundary require explicit user approval before implementation.

## Development Flow

```mermaid
flowchart LR
    SPEC["Read SPEC.md<br/>and terminology.md"] --> GAP["Identify core<br/>alpha/execution gap"]
    GAP --> CODE["Implement typed<br/>vertical slice"]
    CODE --> TEST["Run focused tests"]
    TEST --> DIRECT["Run direct<br/>engine command"]
    DIRECT --> DOCS["Update docs<br/>and runbooks"]
    DOCS --> COMMIT["Commit with<br/>validation artifacts"]
    COMMIT --> PUSH["Push branch"]
```

Prefer vertical slices that advance:

```text
research hypothesis -> point-in-time data -> alpha -> LEAN Insight -> portfolio target -> risk -> paper trading/shadow trading artifacts -> reconciliation -> learning
```

Maximize bounded parallelism before promotion: corpus ingest, hypothesis extraction, data ingest, feature generation, LLM-derived feature jobs, ablations, backtest sweeps, and Cloud artifact imports. Keep portfolio/risk/execution/reconciliation/pre-trade risk checks single-writer and fail closed.

Do not spend major effort on UI polish while the executable alpha-to-validation loop is missing or broken.

## Commit Policy

Do **not** collapse broad work into one vague commit. Commit history should explain what was built even without reading the full diff.

This project follows the standard Git message shape: a short subject, a blank line, and an explanatory body when the change is not trivial. The body is not decoration. It is the durable review artifact that explains why the change exists, how it affects the alpha/execution loop, what was verified, and what remains blocked.

References:

- [Git documentation: `git commit`](https://git-scm.com/docs/git-commit)
- [GitHub Docs: setting guidelines for repository contributors](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/setting-guidelines-for-repository-contributors)
- [Chris Beams: How to Write a Git Commit Message](https://cbea.ms/git-commit/)

Use multiple commits grouped by subsystem or evidence boundary:

- spec/doc alignment and archive moves;
- schema/entity/migration changes;
- LLM feature feed and point-in-time replay;
- QuantConnect Cloud/Object Store command loop;
- LEAN runtime changes;
- paper trading/shadow trading/reconciliation changes;
- learning/promotion ledger changes;
- README/runbook/API updates.

### Commit Message Format

Use a concise imperative subject plus a detailed body:

```text
Implement QuantConnect Cloud artifacts loop

- Add LeanCloudRunner for cloud backtest and Object Store commands
- Record missing project/tier/credential states as blocked evidence
- Add repo wrappers for qc-cloud-backtest and qc-object-store-sync

Verification:
- backend: bun run build
- backend: bun run test -- src/modules/v1-pilot/lean/lean-cloud.runner.spec.ts
- direct: ./scripts/qc-cloud-backtest aggressive_llm_momentum -> blocked, missing cloud project
```

The subject should fit in one line and name the action. Keep broad explanations out of the subject; put them in the body.

Good subjects:

- `Align active spec and archive superseded live-pilot docs`
- `Add canonical alpha validation schemas`
- `Implement LLM-derived feature replay`
- `Record shadow trading and promotion blockers`

Avoid:

- `update`
- `fix stuff`
- `wip`
- `final`
- `misc`

### When A Detailed Body Is Required

A detailed body is required for any commit that touches:

- `SPEC.md`, `docs/spec/*`, `AGENTS.md`, `terminology.md`, or this file;
- broker-write boundaries, paper trading, shadow trading, execution intents, reconciliation, risk cuts, or pre-trade risk checks;
- LLM-derived features, prompt contracts, feature schemas, or point-in-time replay;
- LEAN runtime, QuantConnect Cloud integration, Object Store imports, or promotion evidence;
- database schema, persisted artifacts, migrations, or compatibility identifiers;
- operator dashboards, API response shape, runbooks, or user-facing status language;
- broad mechanical terminology updates across code and docs.

Tiny commits may omit the body only when the subject fully explains the change, for example `Fix typo in README heading`.

### What Belongs In The Body

For non-trivial commits, include the sections that apply. Do not invent sections just to fill space, but do not omit a real risk or blocker.

- **Context:** the problem, missing evidence, or spec mismatch that made the change necessary.
- **Changes:** the important file, subsystem, or domain-level changes. Group by boundary when useful.
- **Core loop impact:** how the change advances or protects `data -> alpha -> backtest -> portfolio target -> risk -> execution intent -> reconciliation -> learning`.
- **Compatibility:** legacy identifiers retained, migration behavior, API shape changes, and intentionally unchanged surfaces.
- **Scope boundaries:** what the commit explicitly does not change, especially live-money scope, broker write permissions, leverage, derivatives, capital limits, QuantConnect promotion requirements, credential rules, and the LLM/broker boundary.
- **Verification:** exact commands run and result. Include direct engine commands when the touched path affects strategy validation.
- **Artifacts:** run ids, imported QuantConnect Cloud project/backtest ids, evidence ledger paths, or generated report paths when available.
- **Blockers:** exact reason a direct command could not run or could not pass. Missing credentials, account tier, dataset license, Docker/Podman, market data, broker schema, and reconciliation artifacts are different blockers.
- **Risk and follow-up:** operational risk, rollback notes, and next work that is necessary but intentionally not included.

Distinguish these cases clearly:

- simulator passed vs strategy validation artifacts passed;
- pre-trade risk check blocked by policy vs command failed;
- legacy identifier retained for compatibility vs approved term for new work;
- local sample data vs QuantConnect Cloud promotion evidence.

### Preferred Body Template

```text
Context:
- Explain the concrete problem, evidence gap, or spec mismatch.

Changes:
- Describe the important code/doc/data changes by subsystem.
- Mention new commands, schemas, API fields, or persisted artifacts.

Core loop impact:
- State whether this advances data, alpha, backtest, portfolio sizing,
  risk, execution intent, reconciliation, or learning.

Compatibility and scope:
- Name retained legacy identifiers or migrations.
- State unchanged safety boundaries when relevant.

Verification:
- command -> passed
- command -> blocked, exact reason

Artifacts:
- run id, imported artifact path, report path, or "none, docs-only".

Risk / follow-up:
- Remaining risk or next action.
```

Bad bodies:

```text
Update docs.
```

```text
Tests passed.
```

```text
Misc cleanup.
```

These bodies force reviewers to reconstruct intent from the diff. In this repository, that is not acceptable for core alpha/execution work.

### Commit Body Examples

Documentation-only commit:

```text
Document detailed commit bodies

Context:
- Prior commits described broad work with terse bodies, which makes it
  hard to review why evidence, scope, and blockers changed.

Changes:
- Expand CONTRIBUTING.md with a required detailed body format for
  non-trivial commits.
- Link AGENTS.md to the active contribution guide.
- Delete the misspelled CONTRIBUING.md compatibility stub.

Compatibility and scope:
- Documentation-only. No trading, broker-write, risk, QuantConnect,
  Darwinex/Zero, capital, credential, or LLM/broker boundary changes.

Verification:
- git diff --check -> passed
- rg -n "CONTRIBUING" ... -> no active references

Artifacts:
- none, docs-only.
```

Engine commit:

```text
Import QuantConnect Cloud backtest artifacts

Context:
- Local unit tests prove importer behavior, but promotion review needs
  imported Cloud backtest metadata, statistics, orders, and insights.

Changes:
- Add paginated Cloud backtest import for insights and orders.
- Preserve QuantConnect projectId/backtestId on imported artifacts.
- Record page retry failures as blocked import evidence.

Core loop impact:
- Advances backtest -> evidence ledger -> paper trading promotion review.

Compatibility and scope:
- Keeps broker-write path blocked.
- Does not treat historical paper replay as current live readiness.

Verification:
- backend: bun run test -- src/modules/v1-pilot/lean/lean-cloud-rest-importer.spec.ts -> passed
- backend: bun run build -> passed
- direct: ./scripts/import-cloud-backtest --project-id ... --backtest-id ... -> blocked, missing credential env

Artifacts:
- none from Cloud, blocked before authenticated import.

Risk / follow-up:
- Run authenticated import on an operator machine with QuantConnect access.
```

## Testing And Evidence

Unit tests are required where they protect behavior, but they are not the final proof. Direct execution evidence is the main acceptance signal.

Run the narrowest useful commands for the touched surface:

```bash
cd backend && bun run build
cd backend && bun run test
cd backend && bun run test:e2e

cd frontend && bun run typecheck
cd frontend && bun run build
cd frontend && bun run lint
cd frontend && bun run test:run

.venv-ml/bin/python -m pytest engines/lean/aggressive_llm_momentum/tests

./scripts/run-alpha-cycle
./scripts/run-full-backtest.sh --skip-alpha-cycle --skip-market-data-ingest --no-download-data
./scripts/verify-lean-cloud-package aggressive_llm_momentum
./scripts/qc-cloud-backtest aggressive_llm_momentum
./scripts/run-paper-cycle
./scripts/run-live-shadow
./scripts/run-learning-loop
./scripts/live-preflight
```

Before a QuantConnect Cloud push, run `./scripts/verify-lean-cloud-package aggressive_llm_momentum`. The `qc-cloud-backtest --push`, `qc-cloud-push`, and `run-cloud-quality-backtest` wrappers run it automatically. Only set `SKIP_LEAN_CLOUD_PACKAGE_PREFLIGHT=true` when documenting an explicit platform blocker or emergency Cloud-only check.

If a direct command cannot pass because credentials, account tier, dataset licensing, Docker/Podman, market data, broker schema, or reconciliation evidence is missing, record the blocker exactly.

## Platform Portability

This repo moves between Apple Silicon macOS and Linux ARM64. Before platform-sensitive commands, record:

```bash
uname -s
uname -m
bun --version
python3 --version
.venv-lean-cli/bin/lean --version
```

Treat Docker/Podman, Lean CLI, Python wheels, browser tooling, native Bun/Node packages, and downloaded binaries as platform-sensitive.

## Documentation

Update documentation in the same branch as code changes.

- Root `README.md` should describe the current runnable system, not historical intent.
- `docs/README.md` should point to active spec, runbooks, API docs, decisions, and archives.
- `docs/full-lean-backtest-setup.md` should list executable commands and what each proves.
- API docs should say whether a path can mutate broker state. Under the active spec, real broker writes stay blocked.
- Use Mermaid diagrams when a workflow or boundary is easier to review visually.

## Terminology

Use terms from [terminology.md](terminology.md). Prefer precise English terms when Korean translations are ambiguous.

Required examples:

- `QuantConnect`, not `QuantConnector`;
- `LEAN`, `Lean CLI`, `QuantConnect Cloud`;
- `LLM-derived feature`;
- `point-in-time`, `availableAt`, `lookahead bias`;
- `paper trading`, `shadow trading`, `pre-trade risk check`, `reconciliation`;
- `broker-write path`, not vague “money-moving” language.

## Safety Boundary

LLMs may generate typed LLM-derived features and risk judgments. They must not:

- see broker credentials or raw account identifiers;
- generate broker request payloads;
- decide final order quantity;
- bypass deterministic risk gates;
- create non-replayable live-only decisions.

Real broker writes require a separate user-approved broker-write implementation spec.
