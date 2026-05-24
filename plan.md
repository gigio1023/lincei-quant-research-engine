# plan.md

## Intent (의도)
- Hand off the V1 autonomous pilot branch with enough evidence for a successor AI to resume without rediscovering the system state.

## Background (배경)
- The branch already contains the repo-side V1 system surface for alpha evidence, LEAN backtest import, paper execution, live preflight, dashboard status, and operator scripts.
- The previous implementation was committed and pushed as `04380c1 feat(v1-pilot): add whole-system operator status`.
- Live production remains intentionally blocked by external broker/data readiness gates, not by a repo-side order-path shortcut.
- This turn was interrupted during a documentation consolidation pass; `plan.md` is restored here as the handoff plan.

## Goals (목표)
- Goal 1: Preserve the verified implementation state and avoid accidental rollback.
- Goal 2: Produce explicit handoff files for human and successor-AI continuation.
- Goal 3: Keep remaining work classified as repo work, external gate work, or optional docs polish.
- Goal 4: Commit and push the handoff artifacts on the current branch.

## Expected Results (결과)
- `handoff.md` states what is done, what is blocked, and what to do first next.
- `context-pack.json` mirrors the same state in a machine-readable form.
- `plan.md`, `progress.md`, and `result.md` remain coherent with the handoff.
- The branch is clean after commit and push.

## Scope
- In scope: `engine` repo tracking artifacts, handoff files, and commit/push.
- Out of scope: new trading behavior, broker write implementation, live-order enablement, secret handling changes, or worktree creation.

## Constraints
- Work in this branch only.
- Do not use git worktrees.
- English only in files, logs, and final response.
- Do not expose or commit secrets, local databases, generated LEAN data, or backtest artifacts.
- Do not claim live-production readiness without broker/data evidence.

## Success Criteria
- `handoff.md` exists and cites the implementation evidence.
- `context-pack.json` exists and has the same status as `handoff.md`.
- `progress.md` and `result.md` record the handoff commit state.
- Git status shows only intended handoff artifact changes before commit.
- Commit and push complete on `codex/full-autonomous-live-pilot-v1`.

## Workstreams
- WS1: Handoff artifact restoration, Owner: main agent, Output: restored `plan.md`, Done signal: plan validates structurally.
- WS2: Human handoff, Owner: main agent, Output: `handoff.md`, Done signal: objective, completed work, blockers, risks, and next actions are explicit.
- WS3: Machine handoff, Owner: main agent, Output: `context-pack.json`, Done signal: normalized tasks, risks, decisions, verification, and continuation mode are present.
- WS4: Repository sync, Owner: main agent, Output: commit and push, Done signal: branch is clean against origin.

## Dependency Graph
- WS1 must complete before validators run.
- WS2 and WS3 can be authored in parallel conceptually, but they must agree on status.
- WS4 depends on WS1 through WS3.

## Validation Gates
- Gate A: Handoff status must not overstate live readiness.
- Gate B: Completion claims must reference existing evidence in `result.md`, `progress.md`, or commit history.
- Gate C: JSON must parse.
- Gate D: Artifact validators must pass when available.
- Gate E: Git diff must not include secrets or generated runtime data.

## Risks and Mitigations
- Risk: Handoff claims “complete” while live trading is still blocked. Mitigation: classify repo-side implementation as ready and live production as externally blocked.
- Risk: Interrupted documentation edits leave tracking files inconsistent. Mitigation: restore and validate plan/progress/result.
- Risk: Large documentation rewrite delays handoff. Mitigation: keep this turn focused on handoff artifacts and defer README/diagram consolidation as optional follow-up unless explicitly resumed.

## Execution Waves / Order
- Wave 1: Inspect current branch status and source artifacts.
- Wave 2: Restore `plan.md` and create handoff outputs.
- Wave 3: Update progress/result with handoff state.
- Wave 4: Validate artifacts and inspect diff.
- Wave 5: Commit and push.

## Rollback / Containment Intent
- Handoff changes are documentation-only and can be reverted independently.
- Existing implementation commit `04380c1` is not modified.
- External live gates remain fail-closed.
