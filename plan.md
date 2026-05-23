# plan.md

## Intent (의도)
- Finish the remaining V1 autonomous pilot work as far as the current branch, credentials, and external account entitlements honestly allow, while preserving strict evidence gates and fail-closed live behavior.

## Background (배경)
- The LEAN local Docker path now runs, exports strict artifacts, imports them, and feeds a reconciled paper plan.
- QuantConnect data terms are accepted, but the current organization lacks the Security Master map/factor entitlement required for `--download-data` equity runs.
- Live preflight is blocked on Toss read-only/write readiness, broker credentials, and explicit live flags.
- The remaining uncertainty is which blockers are engineering defects versus external account/API access requirements.

## Goals (목표)
- Goal 1: Remove or refine code paths that hide actionable LEAN/QC failures.
- Goal 2: Add explicit validation around QuantConnect entitlement and LEAN data-provider state so failures are diagnosed before false claims.
- Goal 3: Advance safe Toss readiness only where current credentials, schemas, and repo contracts make implementation defensible.
- Goal 4: Re-run strict LEAN backtesting and downstream import/paper/preflight gates after changes.
- Goal 5: Leave durable plan, progress, and result artifacts for continuation.

## Expected Results (결과)
- LEAN failures surface concise root-cause output instead of only the failed command.
- QC download-data status is classified as either runnable or externally blocked with specific evidence.
- Local LEAN historical-research evidence remains reproducible and strict-importable.
- Paper bridge remains reconciled before live preflight.
- Live remains blocked only for real broker/account readiness, not avoidable internal plumbing issues.

## Scope
- In scope: `engine` repo only; LEAN runner diagnostics; QC readiness checks; V1 paper/live preflight contracts; tests; backtest verification; plan/progress/result files.
- Out of scope: Purchasing QC subscriptions; accepting paid charges; inventing Toss credentials; bypassing live safety gates; using simulator results as production evidence.

## Constraints
- Work must happen on the current branch, without git worktrees.
- English-only code comments, docs, logs, and final response.
- No secrets may be printed, committed, or stored in plan artifacts.
- Files should stay small and focused; split tests or helpers when needed.
- Real live trading cannot be marked ready without Toss read-only reconciliation, write schema verification, broker credentials, kill/cancel/flatten readiness, and explicit live flags.

## Success Criteria
- `./scripts/run-full-backtest.sh --skip-market-data-ingest` either completes with QC download-data evidence or fails fast with a precise external entitlement blocker.
- `LEAN_DOWNLOAD_DATA=false ./scripts/run-full-backtest.sh --skip-market-data-ingest` either completes with zero failed data requests or is rejected with a precise partial-data blocker.
- `./scripts/import-lean-run latest` passes only when latest evidence satisfies strict strategy acceptance; otherwise the blocker is explicit and no false production evidence is claimed.
- `./scripts/run-paper-cycle` returns a reconciled paper plan only after a strict accepted LEAN import exists.
- `./scripts/live-preflight` reports data-evidence blockers plus external/live broker blockers without marking the system ready prematurely.
- Backend build, unit tests, e2e tests, lint, format, Python tests, and whitespace checks pass.

## Workstreams
- WS1: Delivery tracking, Owner: main agent, Output: `plan.md`, `progress.md`, `result.md`, Done signal: artifacts stay current with the branch state.
- WS2: QC/LEAN readiness, Owner: main agent plus explorer, Output: clearer diagnostics and backtest evidence, Done signal: QC entitlement state and LEAN run result are explicit.
- WS3: Toss/live readiness, Owner: explorer plus main agent, Output: implementable safe refinements or explicit external blockers, Done signal: live preflight blockers are classified and defensible.
- WS4: Verification, Owner: main agent, Output: command evidence, Done signal: required checks pass or external blockers are documented.

## Dependency Graph
- WS1 starts first and remains active throughout.
- WS2 and WS3 run in parallel after WS1.
- WS4 is blocked by any code changes from WS2 or WS3.
- Closure is blocked by WS4 and final `result.md`.

## Validation Gates
- Gate A: No generated data, artifacts, secrets, or local LEAN workspace files are committed.
- Gate B: Strict LEAN acceptance is not weakened for convenience.
- Gate C: Live broker readiness remains fail-closed when any required Toss evidence is missing.
- Gate D: Tests cover changed behavior near the changed surface.
- Gate E: Backtest evidence is labeled accurately as QC download-data, local LEAN data, or blocked.

## Risks and Mitigations
- Risk: QC account cannot download required equity map/factor files. Mitigation: detect and document as external entitlement; do not fake production evidence.
- Risk: LEAN CLI mutates `lean.json` provider settings across runs. Mitigation: validate local/QC provider state and restore deterministic local behavior where appropriate.
- Risk: Toss write implementation without official schema/credentials could create false readiness. Mitigation: only implement schema-backed, testable pieces; leave live blocked otherwise.
- Risk: Long backtests or Docker state can mask failures. Mitigation: capture direct LEAN logs and summarize root cause.

## Execution Waves / Order
- Wave 1: Create plan/progress, launch parallel read-only audits, inspect current blockers.
- Wave 2: Implement narrowly scoped diagnostics/readiness fixes that remove internal blockers.
- Wave 3: Run QC download-data attempt and local LEAN strict fallback with clear labeling.
- Wave 4: Run import, paper, live preflight, and full automated checks.
- Wave 5: Write `result.md`, commit, and push if code or plan artifacts changed.

## Rollback / Containment Intent
- Keep safety gates strict and additive; avoid broad refactors.
- If a change weakens evidence or live fail-closed behavior, revert that change before committing.
- Keep generated LEAN data/artifacts ignored so reruns do not pollute source history.
