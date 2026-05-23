# V1 Autonomous Live Pilot Working Spec

Created: 2026-05-23 18:32:05 KST.

This is the implementation spec for the next branch. The older project documents describe the overall product direction. This directory defines the current all-at-once V1 build: implement the full autonomous alpha loop, run backtests, run paper execution, and prepare a tightly capped real-money pilot around 10 USD.

## Mandatory Reading Order

Composer 2.5, or any weaker implementation agent, must read every linked document below before editing code. Do not start implementation from this index alone.

1. [Outcome And Scope](01-outcome-and-scope.md)
2. [System Architecture](02-system-architecture.md)
3. [Implementation Plan](03-implementation-plan.md)
4. [Contracts And Schemas](04-contracts-and-schemas.md)
5. [Environment And Secrets](05-environment-and-secrets.md)
6. [LEAN Alpha Implementation](06-lean-alpha-implementation.md)
7. [Broker And Live Pilot](07-broker-and-live-pilot.md)
8. [Validation And Handoff](08-validation-and-handoff.md)
9. [Composer 2.5 Task Prompt](composer-2.5-task-prompt.md)

## Non-Negotiable Goal

Build one executable V1 vertical slice:

```text
market/news data
-> feature snapshots
-> numeric alpha + LLM alpha
-> meta alpha
-> LEAN insights
-> portfolio targets
-> risk cuts
-> paper execution
-> broker/live preflight
-> 10 USD live pilot when external broker gates pass
-> reconciliation
```

Do not implement this as dashboard-first or planning-only work. UI, docs, and ledgers support the loop; they do not replace it.

## Required Branch

Start from current `main`:

```bash
git switch main
git pull --ff-only origin main
git switch -c codex/full-autonomous-live-pilot-v1
```

## External Reality

Some parts cannot be completed by code alone:

- OpenAI API credentials must be loaded from `/Users/naem1023/git/iyuno-ai-engineer-task/.env`.
- OpenRouter keys must not be used.
- Toss Securities order schema and account access must be verified before any real Toss order.
- If Toss write access is unavailable, implement the provider-neutral broker interface and keep real-money execution blocked, but still complete LEAN backtest and paper execution.

