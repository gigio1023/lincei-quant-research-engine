# plan.md

## Intent (의도)
- Finish the V1 work as a whole autonomous pilot system: alpha decisions, LEAN evidence, control-plane import, paper execution, broker read-only evidence, live preflight, live pilot gate, dashboard observability, scripts, and verification.

## Background (배경)
- The repo docs define the V1 target in `docs/project-architecture.md` and `docs/v1-live-pilot-spec/`.
- The previous pass hardened LEAN evidence and live gates, but the operator-facing system status still reports only LEAN plus preflight and does not show the complete design loop.
- The user reports the 4 failed local LEAN data requests are fixed, so verification must rerun the strict backtest path and downstream import/paper/preflight.

## Goals (목표)
- Goal 1: Map the documented whole-system V1 loop to implemented repo surfaces.
- Goal 2: Add a read-only whole-system V1 status API that covers every required stage without triggering execution side effects.
- Goal 3: Upgrade the dashboard V1 panel to show the whole loop, not only LEAN/preflight.
- Goal 4: Add a single operator script that runs backtest -> paper -> live preflight and preserves blocked live status as a valid outcome.
- Goal 5: Rerun strict backtest, import, paper, live preflight, backend checks, frontend checks, and artifact validators.

## Expected Results (결과)
- Operators can see whether data/features, alpha, LEAN, import, paper, broker read-only, preflight, live-pilot submit, and reconciliation are ready/blocked/missing.
- Dashboard status reads are observational and do not append preflight rows.
- The full local V1 command path can prove the loop up to live preflight, while live trading remains blocked unless real broker gates pass.
- Plan/progress/result artifacts reflect the final implemented and verified state.

## Scope
- In scope: `engine` repo only; V1 backend status API; frontend V1 panel; scripts; tests; strict backtest and downstream verification.
- Out of scope: inventing Toss schemas, bypassing broker write gates, purchasing external data, exposing secrets, or changing unrelated report-app behavior.

## Constraints
- Work in the current branch only; no git worktrees.
- English-only code, docs, logs, and final response.
- Keep files focused and avoid large new monoliths.
- No secrets may be printed, committed, or copied into artifacts.
- Real broker write calls remain impossible unless explicit schema, credential custody, cancel/flatten/open-order, and live flags pass.

## Success Criteria
- `GET /v1-pilot/status` returns a whole-system status with stage summaries and no execution side effects.
- The dashboard V1 panel renders the complete V1 loop with blockers and next actions.
- `./scripts/run-v1-cycle` exists and runs the operator loop through live preflight.
- `./scripts/run-full-backtest.sh --skip-market-data-ingest` or the local-data equivalent completes strict LEAN acceptance after the user’s data fix.
- `./scripts/run-paper-cycle` reconciles a paper plan from the accepted LEAN run.
- `./scripts/live-preflight` is `ready` only if all live gates pass; otherwise it reports exact blockers.
- Backend build/unit/e2e, frontend typecheck/test, Python LEAN unittest, format/lint, and plan/progress/result validators pass or have explicit external blockers.

## Workstreams
- WS1: Spec mapping and tracking, Owner: main agent + explorer, Output: updated plan/progress/result, Done signal: docs mapped to implementation.
- WS2: Backend whole-system status, Owner: main agent, Output: V1 status service/controller tests, Done signal: API summarizes all documented stages without side effects.
- WS3: Dashboard/operator UX, Owner: main agent, Output: V1 panel/API types/tests, Done signal: frontend shows full loop status.
- WS4: Operator script and verification, Owner: main agent, Output: `run-v1-cycle` and command evidence, Done signal: full local loop verified or blocked explicitly.
- WS5: Parallel audit, Owner: subagents, Output: prioritized remaining gaps, Done signal: findings integrated or documented.

## Dependency Graph
- WS1 starts first and stays active.
- WS2 and WS5 run in parallel after spec mapping.
- WS3 depends on WS2 status shape.
- WS4 depends on WS2/WS3 code stability and the user’s fixed LEAN data.
- Commit/push depends on WS4 and final result sync.

## Validation Gates
- Gate A: Dashboard status endpoints do not trigger live/preflight/paper/backtest side effects.
- Gate B: Strict LEAN evidence remains required for import, paper, and live readiness.
- Gate C: Live broker execution remains fail-closed without verified Toss write readiness.
- Gate D: Frontend and backend tests cover changed status surfaces.
- Gate E: Generated artifacts, data, DBs, and secrets remain uncommitted.

## Risks and Mitigations
- Risk: The fixed local LEAN data still fails strict acceptance. Mitigation: report exact data-monitor blocker and keep system blocked.
- Risk: Status aggregation becomes a hidden executor. Mitigation: use repository reads only and keep execution on POST/CLI/script commands.
- Risk: Whole-system scope expands into real Toss write implementation without schemas. Mitigation: expose blocker/readiness status only until official evidence exists.
- Risk: Dashboard becomes a redesign. Mitigation: keep the existing compact right-rail panel and add dense operational fields only.

## Execution Waves / Order
- Wave 1: Read whole-system docs, update plan/progress, launch read-only audits.
- Wave 2: Implement backend whole-system status DTO/service/controller.
- Wave 3: Implement frontend API typing and panel rendering.
- Wave 4: Add operator loop script.
- Wave 5: Run strict backtest/import/paper/preflight and automated checks.
- Wave 6: Update result, commit, and push.

## Rollback / Containment Intent
- New status code is additive; existing execution commands stay in place.
- If strict evidence fails, do not weaken acceptance; record the blocker.
- If frontend changes cause broad churn, keep only the backend/script/status work and leave a minimal panel fallback.
