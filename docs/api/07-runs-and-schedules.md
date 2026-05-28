# Runs And Schedules API

Status: operator API reference for autonomous run ledgers and schedule ticks.

#### `POST /control-plane/runs`

- **Description**: Creates an observable autonomous-run ledger entry.
- **Example Request**:
  ```json
  {
    "objective": "Research and allocate dry-run budget",
    "budgetEnvelopeId": 1
  }
  ```

#### `GET /control-plane/runs`

- **Description**: Lists autonomous-run ledger entries.

#### `POST /control-plane/run-schedules`

- **Description**: Creates an autonomous run schedule for an active budget. The schedule stores cadence, next-run timestamp, paper-execution intent, optional standing paper authorization, pinned research dataset selectors, optional research-data freshness policy, and lease fields for duplicate-tick protection. It never enables broker execution or live trading. `cadenceMinutes` must be at least 5. `mode` can be `dry_run`, `paper`, or `broker_read_only`; `live` is rejected. `dry_run` and `broker_read_only` schedules keep paper execution off even if a caller asks for it. Paper schedules require `researchDatasetId`, `researchSymbol`, and `researchBenchmark`; these must reference imported timestamp-aligned market bars. If `researchMaxDataAgeMinutes` is set, schedule creation/tick/auto approval fail when the imported asset or benchmark availability is stale. `autoPaperApprovalEnabled` is accepted only when the schedule and budget are both `paper`, `attemptPaperExecution` is true, the budget policy has `allowPaperAutoApproval: true`, broker/live flags are false, and the stored budget hash still matches when a run is advanced. Normal BUY/allocation proposals must use the pinned imported dataset for the proposal research run. When execution control is `reducing`, auto approval can instead apply to deterministic SELL-only recovery proposals derived from the internal paper-account projection.
- **Example Request**:
  ```json
  {
    "budgetEnvelopeId": 1,
    "objective": "Research and allocate dry-run budget every hour",
    "cadenceMinutes": 60,
    "mode": "dry_run",
    "attemptPaperExecution": false,
    "autoPaperApprovalEnabled": false,
    "researchDatasetId": "manual-daily-bars-2026-05",
    "researchSymbol": "005930",
    "researchBenchmark": "KOSPI200",
    "researchMaxDataAgeMinutes": 1440
  }
  ```
- **Example Response**:
  ```json
  {
    "id": 1,
    "budgetEnvelopeId": 1,
    "objective": "Research and allocate dry-run budget every hour",
    "mode": "dry_run",
    "cadenceMinutes": 60,
    "nextRunAt": "2026-05-23T00:00:00.000Z",
    "enabled": true,
    "attemptPaperExecution": false,
    "autoPaperApprovalEnabled": false,
    "autoPaperApprover": null,
    "autoPaperApprovalReason": null,
    "autoPaperApprovalSignerKeyRef": null,
    "autoPaperApprovalBudgetHash": null,
    "researchDatasetId": "manual-daily-bars-2026-05",
    "researchSymbol": "005930",
    "researchBenchmark": "KOSPI200",
    "researchMaxDataAgeMinutes": 1440,
    "lastRunId": null,
    "lastCycleKey": null,
    "lastTickAt": null,
    "leaseOwner": null,
    "leaseExpiresAt": null,
    "lastError": null,
    "brokerExecutionEnabled": false,
    "liveTradingEnabled": false
  }
  ```

#### `GET /control-plane/run-schedules`

- **Description**: Lists autonomous run schedules ordered by latest update.

#### `GET /control-plane/run-schedules/worker-status`

- **Description**: Returns the in-process autonomous schedule worker state. The worker is disabled unless `AUTONOMOUS_RUN_SCHEDULER_ENABLED=true`. When enabled, it scans due, enabled, unlocked schedules every minute, acquires each schedule through the same lease path as manual ticks, and records only in-memory worker status. It never enables broker execution or live trading.
- **Example Response**:
  ```json
  {
    "enabled": true,
    "cron": "*/1 * * * *",
    "workerId": "control-plane-worker-12345",
    "maxSchedulesPerTick": 5,
    "leaseTtlSeconds": 120,
    "lastTickAt": "2026-05-23T00:05:00.000Z",
    "currentTime": "2026-05-23T00:05:30.000Z",
    "lastResult": {
      "trigger": "cron",
      "workerId": "control-plane-worker-12345",
      "enabled": true,
      "startedAt": "2026-05-23T00:05:00.000Z",
      "completedAt": "2026-05-23T00:05:03.000Z",
      "scanned": 2,
      "ticked": 1,
      "failed": 0,
      "skipped": 1,
      "items": [
        {
          "scheduleId": 1,
          "status": "ticked",
          "runId": 42,
          "message": "risk_evaluated"
        }
      ]
    }
  }
  ```

#### `POST /control-plane/run-schedules/:id/tick`

- **Description**: Atomically acquires a short-lived schedule lease, creates or resumes the due autonomous run cycle, and advances that run through the same safe path as `POST /control-plane/runs/:id/advance`. Repeated ticks are guarded by the schedule lease and cycle key. `force` can bypass disabled/not-due checks but not an active lease. `leaseTtlSeconds` must be between 1 and 3600. Tick failures are stored in `lastError`.
- **Example Request**:
  ```json
  {
    "actor": "scheduler",
    "leaseOwner": "scheduler-worker-1",
    "leaseTtlSeconds": 120,
    "force": false,
    "attemptPaperExecution": false
  }
  ```

#### `POST /control-plane/runs/:id/advance`

- **Description**: Advances one autonomous run through the safe control-plane path. It can run deterministic baseline research, generate a budget-capped proposal, evaluate risk, and, only when an active paper account plus signed approval already exist, consume the approval into one paper order plan. When execution control is `reducing`, it generates a deterministic SELL-only recovery proposal from active paper positions instead of a fresh BUY allocation proposal. A paper schedule with standing auto approval can create and consume a signed paper-auto approval for that SELL-only recovery proposal, but only while the execution control state is still `reducing`. It never enables broker execution or live trading.
- **Example Request**:
  ```json
  {
    "attemptPaperExecution": true
  }
  ```

## LEAN Validation Utility Endpoints

These historical `v1-pilot` endpoint names remain compatibility wrappers around the active LEAN validation path.

#### `POST /v1-pilot/live-shadow`

- **Description**: Records shadow trading would-have-traded artifacts from the latest imported LEAN target snapshot. It never submits broker orders.

#### `POST /v1-pilot/learning-loop`

- **Description**: Creates available alpha outcome labels and records a promotion decision. The promotion decision remains `blocked` unless QuantConnect Cloud and shadow trading artifacts are both present.
