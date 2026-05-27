# Deployment Guide

Status: operator runbook for development and validation deployments. The active spec does not permit broker writes in the current milestone.

## Scope

Use this guide to run the backend, frontend, database migrations, and local validation stack. It is not a broker-write deployment runbook.

Broker-connected or real-money deployment requires a separate user-approved broker-write implementation spec.

## Requirements

- Bun;
- Node runtime compatible with the checked-in packages;
- PostgreSQL or the configured development database;
- Docker or Podman for local LEAN;
- Python virtual environments from the setup scripts;
- QuantConnect credentials only for cloud/data paths that need them.

## Local Services

Backend:

```bash
cd backend
bun install
bun run start:dev
```

Frontend:

```bash
cd frontend
bun install
bun run dev
```

## Database Migration Policy

Do not use `TYPEORM_SYNCHRONIZE=true` for broker-connected or long-running validation environments.

Check and run migrations:

```bash
cd backend
bun run migration:show
bun run migration:run
```

Migration state is part of pre-trade risk check artifacts. Unknown migration state should block execution-like paths.

## Validation Deployment Checklist

Before calling a validation deployment usable, run the relevant commands:

```bash
cd backend
bun run build
bun run test
bun run test:e2e

cd ../frontend
bun run typecheck
bun run test:run
bun run build
```

For engine-facing changes, also run the matching LEAN/alpha/paper command from [LEAN Backtest And Readiness Paths](full-lean-backtest-setup.md).

## CI/CD

CI should report:

- backend build and tests;
- frontend typecheck, lint, tests, and build;
- Python/LEAN unit tests for touched LEAN modules;
- direct smoke commands where credentials and data access are available.

CI must not enable broker writes. Any real-money path should remain blocked unless a future spec explicitly changes that rule.
