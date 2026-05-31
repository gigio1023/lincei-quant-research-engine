# Capital Evidence Work Plan

Status: superseded supporting implementation plan.

Superseded by [Capital Loop Hardening Plan](capital-loop-hardening-plan.md). This file remains as the implementation note for the bounded `capital run` and `capital triage` slice that has already been merged.

This plan covers the next broker-excluded evidence slice. It does not approve broker writes, broker API integration, Darwinex/Zero implementation, leverage, derivatives, or capital-limit changes.

## Objective

Make the current capital evidence loop more reliable and more reviewable before any broker API integration:

```text
data -> alpha -> backtest -> QuantConnect Cloud import -> portfolio target -> risk -> paper/shadow -> reconciliation -> learning
```

## Current Blocker

`capital status` reports the current milestone as blocked by broker-read-only and pre-trade risk check readiness. That is expected, but the broker-excluded loop still has three implementation gaps:

- `capital run` can run long without step progress or a bounded blocked result.
- The CLI does not have a triage command that turns the status tree into one next safe action.
- The first self-funded baseline path still defaults toward the theme-stock universe instead of a liquid ETF trend/defensive universe.

## Core Loop Impact

This slice advances the loop before the broker boundary:

- Data and alpha: use a liquid ETF baseline universe by default for `capital run`.
- Backtest and Cloud import: keep local LEAN and QuantConnect Cloud steps explicit, bounded, and recorded as passed or blocked.
- Paper/shadow/reconciliation/learning: keep single-writer execution-like stages unchanged.
- Pre-trade risk check: continue to fail closed because broker-read-only evidence and broker-write approval are out of scope.

## Scope

In:

- Add bounded step execution and progress events for `capital run`.
- Add `capital triage` as a read-only operator command.
- Add a liquid ETF baseline universe profile and make `capital run` default to `SPY,QQQ,TLT,IEF`.
- Preserve passed, failed, blocked, and flat/no-order variant outcomes.

Out:

- Broker API integration.
- Broker submit, cancel, replace, flatten, transfer, or margin/account mutation.
- Darwinex/Zero adapter work.
- Frontend/dashboard changes.
- Broad framework rewrites.

## Evidence Slice

Hypothesis:

- A liquid ETF trend/defensive baseline is the first self-funded capital baseline worth validating before theme-stock or LLM-heavy variants.

Universe:

- `SPY,QQQ,TLT,IEF`

Variants:

- `trend-regime-numeric-v1`
- `semantic-llm-v1`
- `trend-regime-combined-v1`

Failure condition:

- Any step that cannot finish within its configured timeout records a blocked step with the step key, timeout, and blocker reason.
- Missing market data, missing QuantConnect credentials, missing Cloud artifacts, or broker-read-only blockers stay blocked instead of being filled by placeholder evidence.

Direct commands:

```bash
bun --cwd=backend run lincei -- capital triage --json
bun --cwd=backend run lincei -- capital run --max-backtest-workers 1 --step-timeout-ms 60000 --json
```

Expected artifacts:

- `CapitalEvidenceSliceResult.steps[]` contains started/completed timestamps, status, blockers, and evidence refs for every attempted step.
- `ResearchJobRecord` retains the numeric, LLM-derived, and combined ablation variant outcomes.
- `capital triage` returns one recommended next action, exact blockers, and command text.

## Acceptance Criteria

Passed:

- `capital triage --json` returns `status`, `recommendedAction`, and a concrete command.
- `capital run --json` prints progress to stderr, returns JSON to stdout, and does not hang indefinitely on async steps.
- Local LEAN backtest execution has a process timeout when invoked through this path.
- Default `capital run` universe is `SPY,QQQ,TLT,IEF` unless explicitly overridden.

Blocked:

- Broker-read-only and broker-write readiness remain blocked until a separate approved broker-write spec exists.
- QuantConnect Cloud credential gaps remain blocked evidence.

Failed:

- A code exception that is not a known policy blocker returns a failed or blocked step with the exact error message instead of silent progress loss.

## Verification

Direct execution:

```bash
bun --cwd=backend run lincei -- capital triage --json
bun --cwd=backend run lincei -- capital run --max-backtest-workers 1 --step-timeout-ms 1000 --json
```

Focused tests:

```bash
cd backend
bun run test -- src/modules/v1-pilot/research/capital-evidence-slice.service.spec.ts src/cli/lincei.spec.ts
bun run build
```

## Non-Goals

- No broker writes.
- No broker API integration.
- No simulator or placeholder evidence promoted as QuantConnect Cloud promotion evidence.
- No LLM output crosses into broker credentials, raw broker order payloads, or final order quantities.
