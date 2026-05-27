# Development Guide

Status: operator runbook. The active product direction is defined by [../SPEC.md](../SPEC.md).

## Local Setup

Run the bootstrap script first:

```bash
./scripts/bootstrap-dev.sh
```

The repository currently uses:

- Bun for backend/frontend package scripts;
- Python virtual environments for ML and Lean CLI helpers;
- Docker or Podman for local LEAN;
- QuantConnect credentials only when running cloud or data-download paths.

Do not put broker credentials, raw account identifiers, or OpenAI keys in frontend config, prompts, logs, or docs.

## Backend

```bash
cd backend
bun install
bun run start:dev
```

Focused verification:

```bash
cd backend
bun run build
bun run test
bun run test:e2e
```

Useful CLI entrypoint:

```bash
cd backend
bun run v1:cli -- <command>
```

Examples:

```bash
cd backend
bun run v1:cli -- run-alpha-cycle
bun run v1:cli -- run-paper-cycle
bun run v1:cli -- live-preflight
```

`live-preflight` is evidence only under the active spec. It should remain blocked for real broker writes until a separate user-approved broker-write implementation spec exists.

## Frontend

```bash
cd frontend
bun install
bun run dev
```

Focused verification:

```bash
cd frontend
bun run typecheck
bun run lint
bun run test:run
bun run build
```

The dashboard is an operational surface. It should show alpha, run, risk, execution, reconciliation, and blocker state. Do not spend major effort on frontend polish while the LEAN/QuantConnect and LLM-alpha loop is incomplete.

## LEAN And ML

Python/LEAN setup:

```bash
./scripts/setup-ml-venv.sh
./scripts/setup-lean-cli.sh
./scripts/setup-lean-workspace.sh
```

Local LEAN smoke/backtest:

```bash
./scripts/lean-backtest aggressive_llm_momentum
```

Full local orchestration:

```bash
./scripts/run-full-backtest.sh --skip-alpha-cycle --skip-market-data-ingest --no-download-data
./scripts/run-local-strategy-smoke
./scripts/import-lean-run latest
```

Local simulator/sample-data runs prove plumbing only. `run-local-strategy-smoke` is useful local LEAN strategy validation artifacts, but strategy promotion still requires QuantConnect Cloud REST-imported evidence when account access allows it.

## Testing Policy

Use the narrowest test that protects behavior:

- schema and schema validation;
- feature timestamp/lookahead rejection;
- numeric scoring;
- portfolio/risk policy;
- idempotency;
- blocked pre-trade risk check/reconciliation cases.

Then run the direct command for the changed path. A unit test is not a substitute for proving the affected alpha/backtest/paper/reconciliation path still executes.

## Documentation Policy

New docs need a status line near the top:

- active normative spec;
- supporting design;
- operator runbook;
- decision record;
- archived historical context.

If a doc conflicts with [../SPEC.md](../SPEC.md), update or archive the doc rather than leaving contradictory guidance in place.
