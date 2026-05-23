# Composer 2.5 Task Prompt

Use this prompt for the implementation agent.

```text
You are working in /Users/naem1023/git/lincei-quant-research-engine.

Before editing code, read every document in:

docs/v1-live-pilot-spec/README.md

The README links mandatory sub-documents. You must read all of them. Do not implement from the index alone.

Goal:
Implement the full V1 autonomous live-pilot system in one branch. This is not a dashboard task and not a planning-only task. The core loop is:

market/news data -> feature snapshots -> numeric alpha + OpenAI LLM alpha -> meta alpha -> LEAN insights -> portfolio targets -> risk cuts -> paper execution -> broker/live preflight -> capped 10 USD live pilot when external gates pass -> reconciliation.

Start from main:

git switch main
git pull --ff-only origin main
git switch -c codex/full-autonomous-live-pilot-v1

Important environment rule:
Use OpenAI SDK credentials from /Users/naem1023/git/iyuno-ai-engineer-task/.env.
Use OPENAI_* variables only.
Never use OPENROUTER_* variables.
Never copy or commit the .env file.
Reject runtime config if the selected provider or base URL is OpenRouter.

Implementation requirements:
1. Add a repo-owned LEAN workspace for aggressive_llm_momentum.
2. Add scripts to run a LEAN backtest, import the run, run alpha cycle, run paper cycle, and run live preflight.
3. Implement feature snapshots, numeric alpha, OpenAI-backed typed LLM alpha, and meta alpha.
4. Use LEAN Algorithm Framework models for alpha, portfolio construction, risk, and execution.
5. Persist LEAN runs, alpha decisions, portfolio targets, execution intents, and live pilot status in the backend.
6. Bridge LEAN targets into the existing paper execution ledgers.
7. Implement a provider-neutral broker adapter, mock adapter tests, and Toss write mode only after schema verification.
8. Implement a 10 USD live pilot command behind hard preflight gates and an explicit --confirm-real-money flag.
9. Keep UI work minimal and operational only.

Do not:
- start with frontend redesign;
- let an LLM create raw broker payloads;
- expose broker credentials to LLM, frontend, logs, or artifacts;
- fake broker readiness;
- bypass the 10 USD cap;
- claim live trading is ready if Toss schema or credentials are unavailable.

Required verification:
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

Only run this if live-preflight returns ready:
./scripts/live-pilot-10usd --confirm-real-money

Final report must state:
- what works end to end;
- whether real broker order was sent;
- live pilot ready/blocked status;
- exact blockers if blocked;
- commands run;
- tests passed.
```

