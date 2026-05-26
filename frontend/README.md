# Frontend Dashboard

Status: supporting operator surface.

This Vite/React app is a read-only observability surface for the research
engine. It must not hold broker credentials or trigger real-money broker
writes. The backend scripts and LEAN/QuantConnect remain the execution and
evidence paths.

## Operator Scenario

1. Open `/` to review the current backtest-based architecture cycle.
2. Check the run id, alpha counts, portfolio targets, current paper status,
   historical paper replay status, broker boundary, preflight blockers, and
   next safe action.
3. Run the listed CLI command outside the browser.
4. Refresh the page and verify that the blocker/evidence changed.
5. Open `/control-plane` only when a detailed drill-down is needed.

## Primary Routes

- `/` and `/backtest-cycle`: compact backtest-based architecture cycle view. It
  reads `/v1-pilot/status` and shows how Cloud/LEAN backtest evidence connects
  to alpha, portfolio targets, current paper/live-shadow evidence, historical
  replay evidence, fail-closed preflight, and learning.
- `/control-plane`: detailed drill-down for control-plane, paper, broker
  read-only, and readiness ledgers.

Legacy report, analytics, and testing pages are intentionally not routed in the
main app because they do not advance the current backtest-to-evidence workflow.

## Local Commands

```bash
bun install
bun run dev
bun run typecheck
bun run test:run
bun run build
```

Use the backend `VITE_API_URL` target when the API is not running on
`http://localhost:3001`.
