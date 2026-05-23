# Validation And Handoff

## Required Local Verification

Backend:

```bash
cd backend
npm run build
npm test -- --runInBand
npm run test:e2e -- --runInBand
```

Frontend:

```bash
cd frontend
npm run typecheck
npm run test:run
```

LEAN and execution:

```bash
./scripts/lean-backtest aggressive_llm_momentum
./scripts/import-lean-run latest
./scripts/run-alpha-cycle
./scripts/run-paper-cycle
./scripts/live-preflight
```

Real money command, only after preflight is ready:

```bash
./scripts/live-pilot-10usd --confirm-real-money
```

## Required Tests

Add tests for:

- OpenAI env loader rejects OpenRouter configuration;
- LLM alpha output schema validation;
- stale feature snapshot rejection;
- LEAN result import success;
- LEAN result duplicate replay;
- missing artifact rejection;
- portfolio target import;
- paper bridge success;
- kill switch blocks paper/live execution;
- live preflight blocks missing broker write readiness;
- live preflight blocks unknown open orders;
- 10 USD cap enforcement;
- broker adapter idempotency.

## Handoff Report Format

The PR or final report must include:

```text
Summary
- What executable loop now works.
- What remains blocked by external broker access.

Commands run
- backend build/test
- frontend typecheck/test
- lean backtest
- alpha cycle
- paper cycle
- live preflight

Live pilot status
- ready or blocked
- exact blocker reasons
- whether any real broker order was sent

Safety notes
- max notional
- kill-switch behavior
- credential handling
- reconciliation status
```

## Failure Handling

Do not hide blockers. If a command fails because Lean CLI, Docker, broker credentials, market data, or Toss schema is unavailable, keep the failure explicit and actionable.

Bad:

```text
Live trading ready.
```

Good:

```text
Live pilot blocked because Toss order schema is not verified and BROKER_WRITE_ENABLED is false. Backtest and paper cycle passed.
```

## PR Title

Use simple English. Do not include `codex`.

Suggested title:

```text
Build autonomous live pilot V1
```

