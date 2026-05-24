# Execution Readiness

Status: operator readiness snapshot. The active scope is defined by [../SPEC.md](../SPEC.md).

## Current Verdict

Not ready for real money, and real-money execution is not in active scope.

The repo can exercise meaningful parts of the alpha/control-plane stack, including local LEAN runs, result import, point-in-time LLM semantic feature replay, paper ledgers, broker read-only evidence, risk gates, and dashboard visibility. The current readiness gap is accepted QuantConnect Cloud or historical LEAN strategy evidence plus paper/live-shadow reconciliation, not another dashboard or a small broker-write pilot.

## Runnable Now

- backend build, unit tests, and e2e tests with Bun;
- frontend typecheck, lint, tests, and build with Bun;
- local LEAN/Podman/Docker smoke runs;
- local LEAN result import;
- simulator path for plumbing evidence only;
- ML baseline setup and Python tests;
- alpha cycle and paper cycle when local data/env is available;
- live preflight as a blocked evidence report;
- broker read-only snapshot/fill ledgers where credentials and schema verification allow polling;
- paper account, paper order plan, approval, reservation, and reconciliation ledgers;
- execution-control and kill-switch state;
- operational dashboard surfaces for status and blockers.

## Not Promotion Evidence By Itself

- local simulator runs;
- local sample-data runs;
- static `meta_decisions.json` overlays;
- synthetic features;
- import status without non-zero insights/orders/fills;
- paper fills without reconciliation;
- broker dry-run commands;
- live preflight that is blocked as designed.

These can prove plumbing. They cannot prove strategy quality or broker readiness.

## Current Blockers

| Area | Status | Blocker |
|---|---|---|
| QuantConnect Cloud | Blocked/partial | Cloud wrappers exist and record blocked evidence, but the current verified run is blocked by missing cloud project. Command success alone is blocked unless imported cloud result artifacts pass strategy-evidence gates. |
| Local LEAN strategy evidence | Partial | Linux ARM can run LEAN, but local QC data access and Security Master licensing can block real local historical evidence. Simulator runs are plumbing only. |
| Numeric alpha | Partial | LEAN skeleton exists, but promotion-quality cloud evidence and ablation history are still missing. |
| LLM semantic alpha | Partial | Point-in-time semantic feature export and LEAN replay exist, but richer source ingestion, Object Store workflow, and ablation evidence are still needed. |
| Paper execution | Partial | Paper ledgers and cycles exist, but current direct execution is blocked until an accepted LEAN target snapshot exists. |
| Live-shadow | Partial | Would-have-traded mode exists and never writes broker orders, but current direct execution is blocked until an accepted LEAN target snapshot exists. |
| Broker writes | Out of scope | Real submit/cancel/flatten paths require a separate user-approved live-money spec. |
| Reconciliation | Partial | Paper and read-only reconciliation exist, but broker-backed live reconciliation is intentionally absent. |

## Required Gates For Active Scope

- cloud backtest attempt with actionable blocked/passed status;
- cloud command success must not count as promotion evidence until cloud result artifacts are imported and pass acceptance;
- imported cloud or local LEAN run with source/config/data hashes;
- non-zero insight/target/order evidence for strategy-validation claims;
- no-lookahead feature and alpha records keyed by `availableAt`;
- numeric-only, LLM-only, and combined ablation where relevant;
- paper or live-shadow cycle from imported target to reconciliation evidence;
- preflight remains blocked for real broker writes unless a future spec changes scope.

## Practical Next Step

Build toward this order:

1. create or push the QuantConnect Cloud project, then import real cloud result artifacts;
2. stabilize numeric-only LEAN backtests before LLM overlay;
3. expand LLM semantic source ingestion while preserving `eventTime`, `availableAt`, hashes, model, and prompt version;
4. consume those features in LEAN through custom data or Object Store artifacts;
5. run paper and live-shadow cycles from accepted LEAN targets;
6. join outcomes back to feature/alpha versions for learning.

Do not implement real broker writes under the active spec.

## Toss-Specific Readiness

Toss Securities Open API should be treated as live broker access until an official test environment is verified. The current repo posture is read-only or blocked evidence only:

- credentials stay in approved env/secret boundaries;
- schema verification is required before polling;
- read-only snapshots and fills can be imported where enabled;
- order payloads and credentials are rejected from frontend/LLM paths;
- submit, cancel, replace, and flatten remain out of scope.

See [Toss Securities Open API Readiness](toss-open-api-readiness.md) for source-specific details.
