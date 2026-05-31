# Capital Loop Hardening Plan

Status: supporting implementation plan.

Created: 2026-06-01.

## Purpose

Close the remaining broker-excluded gaps that make the current self-funded capital evidence loop hard to operate or too easy to misread.

This plan follows the active direction in [SPEC.md](../SPEC.md): self-funded capital allocation is the first monetization priority, broker writes remain blocked until a separate user-approved broker-write spec exists, and Darwinex/Zero stays deferred.

## Preserve

| Asset | Reason |
| --- | --- |
| `lincei` CLI | Canonical operator entrypoint for the capital evidence loop. |
| QuantConnect Cloud import path | Promotion evidence must be tied to Cloud project/backtest ids. |
| Paper trading / shadow trading / reconciliation ledgers | These are the current execution-like artifacts before broker writes. |
| Toss write adapter fail-closed behavior | Broker writes are not approved in the current milestone. |
| Variant retention | Failed, blocked, flat, and winning variants must remain visible to reduce multiple-testing bias. |

## Gap Matrix

| Gap | Priority | Current problem | Target behavior |
| --- | --- | --- | --- |
| Broker read-only actionability | P0 | `capital triage` recommends another `capital run` even when the blocker is broker read-only. | Triage points to read-only broker status/poll/reconcile commands. |
| CLI broker read-only commands | P0 | HTTP endpoints exist, but the primary operator path is CLI. | `lincei broker ...` covers status, snapshot poll, fill poll, and reconciliation. |
| Manual broker file fallback | P0 | KIS/Toss/other provider login and API onboarding can block read-only polling. | `lincei broker import-snapshot/import-fills` imports CSV/JSON exports without broker writes. |
| Evidence lineage | P1 | A Cloud run, current alpha decisions, and paper targets can appear connected without matching universe/run lineage. | Current targets fail closed when alpha symbols do not belong to the validated run universe. |
| LLM-derived replay evidence | P1 | Numeric-only Cloud evidence can make the overall loop look stronger than LLM/combined evidence really is. | LLM-only and combined variants stay blocked unless variant-specific Cloud/backtest evidence exists. |
| Variant-level validation records | P2 | Multiple-testing bias checks can pass on ablation records without retained backtest/Cloud variant records. | Promotion check requires retained backtest and Cloud-import variant job types. |
| Timeout side effects | P2 | Step timeout blocks the caller but does not cancel every underlying async side effect. | Timeout remains explicit; downstream reports call out residual side-effect risk until abortable jobs exist. |
| Stale docs and legacy CLI | P2 | Old support docs and the old V1 CLI surface confuse the canonical command path. | Mark superseded docs and remove unused legacy CLI entrypoints. |

## Implementation Phases

### Phase 1: Operator Path Correction

Files:

- `backend/src/runtime/create-lincei-runtime.ts`
- `backend/src/cli/lincei.ts`
- `backend/src/cli/capital-triage.ts`
- `backend/src/cli/*.spec.ts`
- `result.md`

Deliver:

- Add framework-neutral runtime access to broker readiness and Toss read-only services.
- Add `broker status`, `broker poll-read-only`, `broker poll-fills`, `broker import-snapshot`, `broker import-fills`, and `broker reconcile-snapshot`.
- Keep every broker command read-only or reconciliation-only.
- Change triage so broker-read-only blockers recommend broker read-only commands, not `capital run`.
- Allow manual CSV/JSON broker evidence imports so certificate/login blockers do not stop reconciliation development.

### Phase 2: Evidence Lineage And Variant Hardening

Files:

- `backend/src/modules/v1-pilot/alpha/current-alpha-target.service.ts`
- `backend/src/modules/v1-pilot/research/research-factory.service.ts`
- related focused specs

Deliver:

- Refuse current target generation when selected alpha symbols are outside `leanRun.parameters["universe-symbols"]`.
- Add lineage notes to target risk notes where the validated universe is known.
- Require both retained backtest and retained Cloud-import variant job types in the multiple-testing bias check.

### Phase 3: Cleanup

Files:

- `backend/package.json`
- `backend/src/cli/v1-pilot-cli.ts`
- stale docs that describe superseded operator paths

Deliver:

- Remove the unused legacy CLI script and package alias.
- Update comments that still point operators to the legacy CLI.
- Mark the old capital evidence work plan as superseded by this hardening plan.

## Non-Goals

- No broker submit/cancel/replace/flatten implementation.
- No capital-limit change.
- No Darwinex/Zero adapter.
- No frontend/dashboard expansion.
- No broad architecture rewrite.

## Verification

Direct commands:

```bash
bun --cwd=backend run lincei -- --help
bun --cwd=backend run lincei -- broker status --json
bun --cwd=backend run lincei -- broker import-snapshot --file /path/to/snapshot.csv --json
bun --cwd=backend run lincei -- broker import-fills --file /path/to/fills.csv --json
bun --cwd=backend run lincei -- capital triage --json
bun --cwd=backend run lincei -- capital status --json
```

Focused tests:

```bash
cd backend
bun run test -- src/cli/lincei.spec.ts src/cli/capital-triage.spec.ts src/runtime/create-lincei-runtime.spec.ts src/modules/v1-pilot/alpha/current-alpha-target.service.spec.ts src/modules/v1-pilot/research/research-factory.service.spec.ts
bun run build
```

Repository check:

```bash
git diff --check
```

## Done Criteria

- The next recommended action for a simulated broker snapshot is broker-read-only work.
- Broker read-only work can be started from `lincei` without using HTTP curl manually.
- Target generation cannot silently link ETF alpha decisions to a Cloud run whose universe excludes those symbols.
- Multiple-testing bias checks no longer pass without retained backtest and Cloud-import variant job types.
- Legacy CLI dead code is removed or clearly superseded.
