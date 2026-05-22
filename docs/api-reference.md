# API Reference

This document provides a detailed reference for the Auto Investment Helper REST API.

## Base URL

```
http://localhost:3001
```

## Authentication

Currently, no authentication is required for the API endpoints. This will be updated in future production releases.

## Endpoints

### Health Check

- **`GET /health`**
  - **Description**: Checks the service's health, including database and AI service connectivity.
  - **Response**:
    ```json
    {
      "status": "ok",
      "info": {
        "database": { "status": "up" },
        "gemini": { "status": "up" }
      },
      "details": {
        "database": { "status": "up" },
        "gemini": { "status": "up" }
      }
    }
    ```

### Reports

#### `GET /reports`

- **Description**: Retrieves a paginated list of investment reports.
- **Query Parameters**:
  - `page` (number, optional, default: 1): The page number to retrieve.
  - `limit` (number, optional, default: 10): The number of items per page.
- **Response**:
  ```json
  {
    "reports": [
      {
        "id": 1,
        "title": "Morning Report - 2024-12-06",
        "summary": "Market indices are up, driven by tech sector performance.",
        "reportType": "morning",
        "createdAt": "2024-12-06T08:00:00.000Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 10
  }
  ```

#### `GET /reports/:id`

- **Description**: Fetches a specific report by its unique ID.
- **Path Parameters**:
  - `id` (number, required): The ID of the report.
- **Response**:
  - Returns the full `Report` object on success.
  - Returns `null` if the report is not found.

#### `POST /reports/generate/:type`

- **Description**: Manually triggers the generation of a new report. This is an asynchronous operation.
- **Path Parameters**:
  - `type` (string, required): The type of report to generate. Must be `morning` or `evening`.
- **Response**:
  - Returns the newly created `Report` object.
  - **Note**: This process can take up to 30 seconds as it involves AI-based analysis.

### News

#### `POST /news/collect`

- **Description**: Manually triggers the news collection and processing workflow.
- **Response**:
  ```json
  {
    "status": "success",
    "message": "News collection started."
  }
  ```

#### `GET /news/stats`

- **Description**: Retrieves statistics about the collected news articles.
- **Response**:
  ```json
  {
    "totalArticles": 520,
    "articlesToday": 35,
    "sources": {
      "Reuters": 150,
      "Bloomberg": 120
    }
  }
  ```

### Risk Gate

#### `GET /risk-gate/status`

- **Description**: Returns the deterministic control-plane status. Broker execution is disabled.
- **Response**:
  ```json
  {
    "brokerExecutionEnabled": false,
    "liveTradingEnabled": false,
    "defaultPolicy": {
      "maxGrossExposurePct": 100,
      "maxSinglePositionPct": 20,
      "maxOrderNotional": 1000000,
      "maxDailyLossPct": 3,
      "maxDrawdownPct": 10,
      "maxDataAgeMinutes": 60
    }
  }
  ```

#### `POST /risk-gate/evaluate`

- **Description**: Evaluates a proposal against deterministic safety rules. This endpoint does not place orders and does not call broker APIs.
- **Response Decisions**:
  - `ALLOW`: dry-run proposal is inside policy limits.
  - `REVIEW`: proposal is not denied, but human approval or missing provenance review is required.
  - `DENY`: proposal violates hard policy.
- **Example Request**:
  ```json
  {
    "mode": "dry_run",
    "actor": "strategy",
    "strategyId": "momentum-v1",
    "ruleId": "long-only-breakout",
    "generatedAt": "2026-05-22T11:59:00.000Z",
    "marketDataTimestamp": "2026-05-22T11:55:00.000Z",
    "portfolio": {
      "currency": "KRW",
      "equity": 10000000,
      "cash": 10000000,
      "grossExposurePct": 0
    },
    "orders": [
      {
        "symbol": "005930",
        "assetClass": "domestic_stock",
        "side": "BUY",
        "orderType": "MARKET",
        "notional": 500000,
        "targetPositionPct": 5
      }
    ]
  }
  ```
- **Example Response**:
  ```json
  {
    "decision": "ALLOW",
    "mode": "dry_run",
    "brokerExecutionEnabled": false,
    "requiresHumanApproval": false,
    "reasons": [],
    "approvedOrderCount": 1
  }
  ```

### Control Plane

Control-plane endpoints create budget, research-run, proposal, risk-evaluation,
paper simulation, and run ledger records. They do not place broker orders, and
all broker/live execution flags remain `false`.

#### `GET /control-plane/status`

- **Description**: Returns system readiness, blockers, and confirms broker execution is disabled. The response includes a `liveTradingGate` object that stays disabled until order endpoints, broker write access, production credential custody, kill-switch runtime, fill polling, and broker reconciliation are all implemented and verified.
- **Response Notes**:
  - `brokerExecutionEnabled` is always `false`;
  - `liveTradingReady` is always `false`;
  - `liveTradingGate.mode` is `disabled`;
  - `liveTradingGate.blockers` lists the missing production controls that must be cleared before any real-money order path can be considered.

#### `POST /control-plane/budgets`

- **Description**: Creates an active budget envelope. Live trading is forcibly disabled even if requested.
- **Example Request**:
  ```json
  {
    "name": "Aggressive dry run",
    "totalBudget": 10000000,
    "currency": "KRW",
    "mode": "dry_run"
  }
  ```

#### `GET /control-plane/budgets`

- **Description**: Lists budget envelopes ordered by latest update.

#### `POST /control-plane/research-runs`

- **Description**: Stores a reproducible research run before a proposal can be created. This captures dataset windows, availability timestamps, feature refs, lag rules, benchmark, cost/slippage assumptions, model metadata, validation window, backtest metrics, artifacts, and known failure modes.
- **Example Request**:
  ```json
  {
    "budgetEnvelopeId": 1,
    "objective": "Find a liquid long-only allocation candidate",
    "strategyFamily": "momentum",
    "hypothesis": "Recent relative strength can outperform the benchmark.",
    "datasetRefs": [
      {
        "id": "krx-daily-bars",
        "source": "sample",
        "windowStart": "2025-01-01",
        "windowEnd": "2026-05-22",
        "availabilityTimestamp": "2026-05-22T23:50:00.000Z"
      }
    ],
    "featureRefs": ["close_20d_return", "volatility_20d"],
    "timestampLagRules": ["Signals use data available before proposal time."],
    "noLookaheadChecked": true,
    "benchmark": "KOSPI",
    "costModel": "10bps fixed transaction cost",
    "slippageModel": "5bps notional slippage",
    "validationWindow": {
      "start": "2026-01-01",
      "end": "2026-05-22"
    },
    "backtestMetrics": {
      "totalReturnPct": 8.2,
      "benchmarkReturnPct": 3.1,
      "maxDrawdownPct": 4.3,
      "sharpeRatio": 1.1,
      "turnoverPct": 22,
      "tradeCount": 12
    },
    "artifactRefs": ["artifacts/research-runs/momentum-v1/report.md"],
    "artifactHashes": {
      "artifacts/research-runs/momentum-v1/report.md": "sha256:test"
    },
    "knownFailureModes": ["Trend reversal can cause delayed exits."]
  }
  ```

#### `GET /control-plane/research-runs`

- **Description**: Lists research-run ledger records ordered by latest update.

#### `POST /control-plane/market-data/bars/import`

- **Description**: Imports durable OHLCV market bars into the control-plane market-data ledger. This is research evidence only: it does not read broker accounts, does not place orders, and hard-sets broker/live execution flags to `false`.
- **Example Request**:
  ```json
  {
    "datasetId": "manual-daily-bars-2026-05",
    "provider": "manual",
    "sourceRef": "operator-upload:krx-sample",
    "symbol": "005930",
    "timeframe": "1d",
    "currency": "KRW",
    "bars": [
      {
        "timestamp": "2026-05-20T00:00:00.000Z",
        "availabilityTimestamp": "2026-05-20T15:30:00.000Z",
        "open": 75000,
        "high": 76000,
        "low": 74500,
        "close": 75500,
        "adjustedClose": 75500,
        "volume": 1000000
      }
    ]
  }
  ```

#### `GET /control-plane/market-data/bars`

- **Description**: Lists imported market bars. Optional query params: `datasetId`, `symbol`.

#### `POST /control-plane/research-runs/run-baseline`

- **Description**: Runs the deterministic baseline backtest and stores the resulting research run. By default it uses built-in local sample bars. If `datasetId`, `symbol`, and `benchmark` are provided, it uses imported timestamp-aligned bars from `/control-plane/market-data/bars/import`. This is a dry-run research action; it does not read broker data and does not place orders.
- **Example Request**:
  ```json
  {
    "budgetEnvelopeId": 1,
    "objective": "Run deterministic momentum baseline before proposal",
    "datasetId": "manual-daily-bars-2026-05",
    "symbol": "005930",
    "benchmark": "KOSPI200"
  }
  ```
- **Response Notes**:
  - Returns a `ResearchRun`.
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.
  - The run is `proposal_ready` only if dataset lineage, no-lookahead proof, cost/slippage assumptions, backtest metrics, and artifact hashes are present.

#### `POST /control-plane/recovery/run-baseline`

- **Description**: Builds a deterministic SELL-only recovery proposal from the active promoted paper account, then persists the linked research run, investment proposal, and risk evaluation. This endpoint creates proposal evidence only. It does not create an order-plan approval, does not paper-execute fills, does not call a broker, and never enables live trading.
- **Example Request**:
  ```json
  {
    "paperAccountId": 1,
    "budgetEnvelopeId": 1,
    "objective": "Reduce oversized paper exposure",
    "maxPositions": 10
  }
  ```
- **Response Notes**:
  - returns `{ "researchRun": ResearchRun, "proposal": InvestmentProposal, "riskEvaluation": RiskEvaluation }`;
  - the proposal orders are `SELL` and capped by the active budget `maxOrderNotional`;
  - zero and negative paper positions are ignored;
  - repeated calls for the same paper-account projection, budget, max position count, and max order notional replay the existing recovery research run/proposal/risk evaluation through a `paper-recovery-state:*` evidence ref;
  - a paper-mode budget will usually return `REVIEW` until a signed order-plan approval is created through `POST /control-plane/proposals/:id/order-plan-approvals`;
  - a changed paper-account projection after paper execution produces a new recovery state and can create the next reducing proposal.

#### `POST /control-plane/proposals`

- **Description**: Stores a typed investment proposal with portfolio snapshot, orders, thesis, and evidence references. A `researchRunId` is required, and the linked run must be `proposal_ready` with `advanceEligible: true`.

#### `GET /control-plane/proposals`

- **Description**: Lists stored investment proposals.

#### `POST /control-plane/proposals/:id/evaluate-risk`

- **Description**: Evaluates a stored proposal through the deterministic risk gate and persists request/response snapshots.

#### `GET /control-plane/risk-evaluations`

- **Description**: Lists persisted risk evaluations.

#### `GET /control-plane/execution-control`

- **Description**: Returns the latest execution-control state. If none exists, a default `active` state is created for paper simulation only.

#### `POST /control-plane/execution-control`

- **Description**: Appends a new execution-control state. `paused` and `halted` block paper execution. `reducing` only permits SELL-only paper plans.
- **Example Request**:
  ```json
  {
    "state": "halted",
    "actor": "human",
    "reason": "Manual stop before broker integration review"
  }
  ```

#### `GET /control-plane/paper-account`

- **Description**: Returns the latest active local paper account state after explicit seed and promotion. This is read-only and does not create an account. It returns `404` until an operator has seeded and promoted a paper account.
- **Response Notes**:
  - returns cash, equity, gross exposure, positions, applied plan ids, account-level cash ledger, and account-level position ledger;
  - paper positions can include simulator accounting fields: `quantity`, `averagePrice`, `costBasis`, `unrealizedPnl`, and `realizedPnl`;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`;
  - current ledger arrays are local simulator evidence, not broker truth.

#### `POST /control-plane/paper-account/seed`

- **Description**: Creates a one-time `seeded` paper account projection and an append-only `explicit_seed` paper account event. This represents the operator's paper capital boundary before any paper execution can run. It is idempotent by request hash and does not activate execution by itself.
- **Example Request**:
  ```json
  {
    "budgetEnvelopeId": 1,
    "cash": 10000000,
    "actor": "operator@example.com",
    "reason": "Seed paper capital before the first execution cycle.",
    "idempotencyKey": "paper-seed-20260523-001"
  }
  ```

#### `POST /control-plane/paper-account/:id/promote`

- **Description**: Promotes a `seeded` paper account to `active` after recording an append-only `account_promoted` event. Paper approvals and paper execution require an active promoted account.
- **Example Request**:
  ```json
  {
    "actor": "operator@example.com",
    "reason": "Promote reviewed seed capital for paper execution.",
    "idempotencyKey": "paper-promote-20260523-001",
    "expectedEventHash": "sha256:seed-event"
  }
  ```

#### `GET /control-plane/paper-account/events`

- **Description**: Lists append-only paper account events. Events are sequence-numbered per account, hash chained with `previousEventHash`, replay-protected with `requestHash`, and keep broker/live flags disabled.

#### `POST /control-plane/broker-snapshots/import-read-only`

- **Description**: Imports a read-only broker account snapshot for cash, equity, and positions. This is a provider-neutral ledger step for later Toss or broker integration. It does not call a broker, does not store raw account ids, rejects credential/order fields, and cannot place orders.
- **Example Request**:
  ```json
  {
    "provider": "manual",
    "accountRef": "operator-visible-account-ref",
    "sourceRef": "manual-import-20260523",
    "asOf": "2026-05-23T09:00:00.000Z",
    "currency": "KRW",
    "cash": 9499250,
    "equity": 9999250,
    "positions": [
      {
        "symbol": "005930",
        "assetClass": "domestic_stock",
        "marketValue": 500000,
        "weightPct": 5
      }
    ]
  }
  ```
- **Response Notes**:
  - returns a `BrokerSnapshot`;
  - `accountRef` is stored only as `accountRefHash`;
  - `brokerCredentials`, tokens, account ids, and order payload fields are rejected;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/broker-snapshots`

- **Description**: Lists imported read-only broker snapshots ordered by snapshot timestamp.

#### `GET /control-plane/broker-snapshots/latest`

- **Description**: Returns the latest imported read-only broker snapshot. Returns `404` until a snapshot has been imported.

#### `POST /control-plane/broker-fills/import-read-only`

- **Description**: Imports read-only broker fill evidence and immediately attempts to match it against existing paper fills. This is a provider-neutral ledger step for later broker fill polling. It does not call a broker, does not store raw account/order/fill refs, rejects credential/order payload fields, and cannot place, cancel, or modify orders.
- **Example Request**:
  ```json
  {
    "provider": "manual",
    "accountRef": "operator-visible-account-ref",
    "brokerOrderRef": "broker-order-123",
    "brokerFillRef": "broker-fill-123",
    "sourceRef": "manual-fill-import-20260523",
    "symbol": "005930",
    "side": "BUY",
    "quantity": 10,
    "fillPrice": 50000,
    "fee": 500,
    "filledAt": "2026-05-23T09:00:00.000Z"
  }
  ```
- **Response Notes**:
  - returns a `BrokerFill`;
  - `accountRef`, `brokerOrderRef`, and `brokerFillRef` are stored only as hashes;
  - `reconciliation.status` becomes `matched` or `mismatch` after automatic paper-fill matching;
  - `brokerCredentials`, tokens, account ids, and order payload fields are rejected;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/broker-fills`

- **Description**: Lists imported read-only broker fill evidence ordered by fill timestamp.

#### `POST /control-plane/broker-fills/:id/reconcile-paper`

- **Description**: Re-runs read-only broker fill matching against paper fills. Optional `paperOrderPlanId` and `paperFillId` constrain the match. This updates only the local `BrokerFill.reconciliation` evidence and never calls a broker or places orders.
- **Example Request**:
  ```json
  {
    "paperOrderPlanId": 7,
    "paperFillId": "paper-order:3:0:fill:0",
    "tolerance": 0.01,
    "notes": ["Operator-requested fill reconciliation."]
  }
  ```

#### `GET /control-plane/broker-adapter/status`

- **Description**: Returns the provider-neutral broker adapter readiness contract. The current first candidate is Toss. This endpoint reports evidence only; it does not trigger polls, place orders, or expose secrets. It reports whether required credential environment variables are present, whether credential custody is production-ready, whether the OpenAPI schema and sandbox have been operator-verified, read-only polling state, and which broker capabilities remain blocked.
- **Example Response**:
  ```json
  {
    "provider": "toss",
    "configured": false,
    "readOnlyEnabled": false,
    "paperTradingEnabled": false,
    "liveTradingEnabled": false,
    "authMethod": "oauth2_client_credentials",
    "credentialRef": "missing",
    "credentialCustody": {
      "mode": "missing",
      "configured": false,
      "productionReady": false,
      "secretRef": "missing",
      "detail": "Production trading requires an external secret manager reference before broker write access can be considered."
    },
    "schemaVerified": false,
    "sandboxVerified": false,
    "readOnlyPoll": {
      "provider": "toss",
      "enabled": false,
      "configured": false,
      "schemaVerified": false,
      "canPoll": false,
      "baseUrl": "https://openapi.tossinvest.com",
      "accountRef": "missing",
      "allowedEndpoints": [
        "POST /oauth2/token",
        "GET /api/v1/accounts",
        "GET /v1/holdings"
      ],
      "cron": "*/5 * * * *",
      "running": false,
      "lastReconciliationStatus": "not_checked",
      "brokerExecutionEnabled": false,
      "liveTradingEnabled": false
    },
    "capabilities": [
      {
        "key": "credentials",
        "status": "blocked",
        "detail": "TOSS_OPEN_API_CLIENT_ID, TOSS_OPEN_API_CLIENT_SECRET, and TOSS_OPEN_API_ACCOUNT_REF are required."
      },
      {
        "key": "credentialCustody",
        "status": "blocked",
        "detail": "Production trading requires an external secret manager reference before broker write access can be considered."
      },
      {
        "key": "orderPlacement",
        "status": "blocked",
        "detail": "Live order placement is intentionally blocked until read-only reconciliation, sandbox parity, approval custody, and kill switch runtime exist."
      }
    ],
    "blockers": ["credentials: Toss Open API credentials are missing."],
    "brokerExecutionEnabled": false
  }
  ```

#### `POST /control-plane/broker-adapter/poll-read-only`

- **Description**: Attempts a Toss read-only snapshot poll, disabled by default. The same poller also runs every five minutes but immediately returns unless it can poll. It requires `BROKER_READ_ONLY_ENABLED=true`, `TOSS_READ_ONLY_POLLER_ENABLED=true`, Toss credentials/account ref, and `TOSS_OPEN_API_SCHEMA_VERIFIED=true`. The adapter allowlist permits `POST /oauth2/token`, `GET /api/v1/accounts`, and `GET /v1/holdings`, then imports the mapped snapshot through the same broker snapshot ledger. After import it attempts an automatic paper-account reconciliation and records the result in the read-only poll status. It has no order, preview, cancel, or modify endpoint.
- **Response Notes**:
  - returns `{ "status": BrokerAdapterReadOnlyPollStatus, "snapshot": BrokerSnapshot }` on success;
  - returns `400` when disabled or unverified;
  - raw Toss account refs are only passed into the adapter and then stored through `accountRefHash`;
  - `brokerExecutionEnabled` and `liveTradingEnabled` remain `false`.

#### `POST /control-plane/broker-adapter/poll-read-only-fills`

- **Description**: Attempts a Toss read-only fill poll, disabled by default. This endpoint is intentionally path-configured because the exact Toss fill/execution schema is not publicly verified in this repo. It requires the snapshot poll gates plus `TOSS_READ_ONLY_FILL_POLLER_ENABLED=true`, `TOSS_OPEN_API_FILL_SCHEMA_VERIFIED=true`, and a relative `TOSS_OPEN_API_FILLS_PATH`. The adapter only permits `GET` to that configured path, maps returned executions/fills into provider-neutral `ImportBrokerFillRequest` objects, imports them through `broker_fills`, and reuses paper-fill matching.
- **Response Notes**:
  - returns `{ "status": BrokerAdapterReadOnlyPollStatus, "fills": BrokerFill[] }` on success;
  - returns `400` when disabled, unverified, or missing a configured fill path;
  - duplicate provider fill refs replay idempotently through the hashed `brokerFillRefHash`;
  - `brokerExecutionEnabled` and `liveTradingEnabled` remain `false`.

#### `POST /control-plane/broker-snapshots/:id/reconcile-paper`

- **Description**: Reconciles a broker read-only snapshot against the active paper account. This compares cash, equity, positions, tolerance, and snapshot age. It still does not prove live broker readiness because Toss schema verification, sandbox parity, fill polling, order custody, and broker write controls remain blocked.
- **Example Request**:
  ```json
  {
    "tolerance": 0.01,
    "maxAgeMinutes": 60,
    "notes": ["Operator imported broker read-only evidence."]
  }
  ```

#### `POST /control-plane/proposals/:id/order-plan-approvals`

- **Description**: Creates a durable signed approval record for paper-only execution of a stored proposal. The service builds a paper-mode `ALLOW` risk evaluation from the current paper account snapshot or deterministic seed portfolio, hashes the proposal/risk/approval payloads, stores approver and reason, and keeps broker/live execution disabled.
- **Example Request**:
  ```json
  {
    "idempotencyKey": "paper:proposal:1:risk:4",
    "approver": "operator@example.com",
    "reason": "Approve this paper cycle after reviewing the risk gate.",
    "expiresAt": "2026-05-24T00:00:00.000Z"
  }
  ```
- **Response Notes**:
  - returns an `OrderPlanApproval`;
  - `status` starts as `active` and becomes `consumed` after a filled paper order plan uses it;
  - approval records store `proposalHash`, `riskRequestHash`, `approvalHash`, `approvalSnapshot`, `idempotencyKey`, expiry, approver, reason, and consumed plan id;
  - `mode` is always `paper`, and `brokerExecutionEnabled` / `liveTradingEnabled` are always `false`.

#### `GET /control-plane/order-plan-approvals`

- **Description**: Lists durable paper order-plan approvals ordered by latest approval time.

#### `POST /control-plane/proposals/:id/paper-execute`

- **Description**: Creates or replays an idempotent paper-only order plan from a stored proposal. Orders are derived from the proposal; arbitrary order payloads, broker credentials, and account ids are not accepted. The endpoint requires an active signed paper order-plan approval, an `ALLOW` paper-mode risk evaluation matching the current paper account snapshot or deterministic seed portfolio, sufficient paper cash/positions, no active duplicate plan, and an execution-control state that permits the action.
- **Example Request**:
  ```json
  {
    "idempotencyKey": "paper:proposal:1:risk:4",
    "expectedRiskEvaluationId": 4,
    "orderPlanApprovalId": 7
  }
  ```
- **Response Notes**:
  - returns a `PaperOrderPlan`;
  - without an active matching signed approval it remains blocked for review;
  - `status` is `filled`, `blocked`, `reconciled`, or `reconciliation_failed` for the current implementation;
  - each plan stores `orderPlanApprovalId`, `proposalHash`, `riskRequestHash`, `planHash`, `readinessSnapshot`, immutable paper order ids, fill events, cash ledger rows, position ledger rows, portfolio before/after snapshots, reconciliation state, and kill-switch snapshot;
  - `readinessSnapshot` includes reservation evidence: required cash, reserved cash, available cash, required sells, reserved sells, and available sell notional by symbol;
  - readiness checks subtract `paper_reservation_holds` rows with `status === "reserved"` before falling back to legacy open paper plans or `reservationHold.status === "reserved"` snapshots;
  - filled paper plans include a durable `reservationHold` snapshot with hold id, status, cash amount, sell notional by symbol, hold hash, and consumption timestamp;
  - non-blocked paper plans create a database reservation-hold record before fill simulation and mark it consumed after the local paper plan is filled;
  - fill and position-ledger rows include simulator quantity, average-price, cost-basis, and realized-PnL evidence;
  - filled plans update the durable local paper account so later paper cycles start from accumulated simulated state;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/paper-order-plans`

- **Description**: Lists paper order plans ordered by latest update.

#### `GET /control-plane/paper-order-plans/:id`

- **Description**: Fetches one paper order plan by id.

#### `POST /control-plane/paper-order-plans/:id/reconcile`

- **Description**: Reconciles expected paper cash and positions against the local paper ledger. Until a broker read-only adapter exists, this is a local simulator reconciliation, not external broker truth.
- **Example Request**:
  ```json
  {
    "tolerance": 0.01,
    "notes": ["Operator reviewed the paper ledger."]
  }
  ```

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

- **Description**: Creates an autonomous run schedule for an active budget. The schedule stores cadence, next-run timestamp, paper-execution intent, and lease fields for duplicate-tick protection. It never enables broker execution or live trading. `cadenceMinutes` must be at least 5. `mode` can be `dry_run`, `paper`, or `broker_read_only`; `live` is rejected. `dry_run` and `broker_read_only` schedules keep paper execution off even if a caller asks for it.
- **Example Request**:
  ```json
  {
    "budgetEnvelopeId": 1,
    "objective": "Research and allocate dry-run budget every hour",
    "cadenceMinutes": 60,
    "mode": "dry_run",
    "attemptPaperExecution": false
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

- **Description**: Advances one autonomous run through the safe control-plane path. It can run deterministic baseline research, generate a budget-capped proposal, evaluate risk, and, only when an active paper account plus signed approval already exist, consume the approval into one paper order plan. It never enables broker execution or live trading.
- **Example Request**:
  ```json
  {
    "attemptPaperExecution": true
  }
  ```

## Data Models

### Report

```typescript
interface Report {
  id: number;
  title: string;
  content: string; // Markdown format
  summary: string;
  reportType: "morning" | "evening";
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```
