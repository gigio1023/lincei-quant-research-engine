# V1 Implementation Review Prompt

Status: archived and superseded. This prompt is historical context only; it does not authorize live-money or broker-write work. See [../../../SPEC.md](../../../SPEC.md).

Use this prompt to review the `codex/full-autonomous-live-pilot-v1` branch after merge or before release.

```text
You are reviewing the V1 autonomous live pilot implementation in lincei-quant-research-engine.

Read first:
- docs/v1-live-pilot-spec/README.md and all linked spec documents
- PR diff for branch codex/full-autonomous-live-pilot-v1

Verify the executable loop:
1. Feature snapshots for SPY, QQQ, IWM, TLT, GLD
2. Numeric, LLM (OpenAI only), and meta alpha decisions with schema validation
3. LEAN backtest path (Lean CLI or local simulator fallback)
4. LEAN run import with idempotent replay and artifact hash persistence
5. Paper bridge from portfolio targets to paper order plans
6. Live preflight fail-closed gates
7. 10 USD live pilot command behind --confirm-real-money and broker write flags

Run locally:
cd backend && npm run build
cd backend && npm test -- --runInBand
cd backend && npm run test:e2e -- --runInBand
cd frontend && npm run typecheck
cd frontend && npm run test:run
./scripts/lean-backtest aggressive_llm_momentum
./scripts/import-lean-run latest
./scripts/run-alpha-cycle
./scripts/run-paper-cycle
./scripts/live-preflight

Only if preflight returns ready:
./scripts/live-pilot-10usd --confirm-real-money

Security checks:
- OPENROUTER_* is rejected at startup/config load
- Broker credentials never appear in LLM prompts, frontend, or artifacts
- Live notional capped at 10 USD; single order capped at 5 USD by default
- Toss write adapter remains blocked until TOSS_ORDER_SCHEMA_VERIFIED=true

Report format:
Summary (what works end-to-end)
Live pilot status (ready/blocked + exact blockers)
Whether any real broker order was sent
Commands run and test results
Safety notes (kill switch, reconciliation, credential mode)
Gaps vs spec (if any)
Recommended next PRs
```
