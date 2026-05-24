# Control Plane Research And Risk API

Status: operator API reference. Real broker writes remain blocked by the active spec.

### Control Plane

Control-plane endpoints create budget, research-run, proposal, risk-evaluation,
paper simulation, and run ledger records. They do not place broker orders, and
all broker/live execution flags remain `false`.

#### `GET /control-plane/status`

- **Description**: Returns system readiness, blockers, and confirms broker execution is disabled. The response includes a `killSwitch` object for the runtime stop state and a `liveTradingGate` object that stays disabled until order endpoints, broker write access, production credential custody, fill polling, broker reconciliation, and broker-order emergency controls are implemented and verified.
- **Response Notes**:
  - `brokerExecutionEnabled` is always `false`;
  - `liveTradingReady` is always `false`;
  - `liveTradingGate.mode` is `disabled`;
  - `killSwitch.tripped` is `true` when execution control is `halted`;
  - `killSwitch.runtimeReady` only means autonomous advancement can be halted; it does not cancel or flatten broker orders;
  - `actionStatus` summarizes the latest autonomous run, paper evidence, broker snapshot evidence, broker fill evidence, current blocker, and next safe action for the one-page dashboard;
  - `paperAccountReservationLockReady` reports whether reservation readiness recompute, hold creation, and final paper account apply can run inside a TypeORM transaction after an optimistic account lock-version claim; it does not prove broker custody or external broker truth;
  - `schemaMigrationPolicyReady` reports whether production-style schema policy is enforced with `TYPEORM_SYNCHRONIZE=false`, `TYPEORM_MIGRATIONS_RUN=true`, and no pending TypeORM migrations;
  - `liveTradingGate.blockers` lists the missing production controls that must be cleared before any real-money order path can be considered.

#### `GET /control-plane/action-timeline`

- **Description**: Returns a single chronological audit feed across budgets, execution-control states, autonomous schedules/runs, research runs, proposals, risk evaluations, order-plan approvals, paper account events, paper order plans, paper reservation holds, broker snapshots, broker fills, and market-data ingestion runs.
- **Query Parameters**:
  - `limit`: optional number from `1` to `250`; defaults to `100`.
- **Response Notes**:
  - every event includes `severity`, `category`, `sourceType`, `title`, `detail`, optional blocker/next action fields, and source provenance ids;
  - `brokerExecutionEnabled` and `liveTradingEnabled` remain `false` on every event;
  - this endpoint is for operator visibility and audit review only; it does not advance automation or place/cancel broker orders.

#### `POST /control-plane/budgets`

- **Description**: Creates an active budget envelope. Live trading is forcibly disabled even if requested. `policy.allowPaperAutoApproval` defaults to `false`; setting it to `true` only permits explicitly authorized paper schedules to create per-proposal signed paper approvals.
- **Example Request**:
  ```json
  {
    "name": "Aggressive dry run",
    "totalBudget": 10000000,
    "currency": "KRW",
    "mode": "dry_run",
    "policy": {
      "allowPaperAutoApproval": false
    }
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
        "availabilityTimestamp": "2026-05-22T23:50:00.000Z",
        "marketDataTimestamp": "2026-05-22T23:50:00.000Z"
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

#### `GET /control-plane/market-data/ingestion/status`

- **Description**: Returns the disabled-by-default external market-data ingestion worker config and latest in-memory poll state. This reports provider, dataset, symbols, benchmark, timeframe, lookback, cron, and hard-coded broker/live execution flags.

#### `POST /control-plane/market-data/ingestion/poll`

- **Description**: Manually runs the configured market-data ingestion poll. By default this skips when `MARKET_DATA_INGESTION_ENABLED` is not `true`. Passing `"force": true` allows an operator dry-run, but imported bars still only write the research market-data ledger and never call broker or live order paths.
- **Example Request**:
  ```json
  {
    "force": true,
    "datasetId": "scheduled-daily-bars",
    "provider": "stooq",
    "symbols": ["005930"],
    "benchmark": "KOSPI200",
    "timeframe": "1d",
    "currency": "KRW",
    "windowStart": "2026-05-01T00:00:00.000Z",
    "windowEnd": "2026-05-23T00:00:00.000Z"
  }
  ```

#### `GET /control-plane/market-data/ingestion-runs`

- **Description**: Lists durable market-data ingestion run records ordered by latest update, including imported/replaced counts, imported/failed symbols, blocked reasons, request hash, and broker/live execution flags.

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
  - a changed paper-account projection after paper execution produces a new recovery state and can create the next reducing proposal;
  - autonomous run advancement uses this same recovery path when execution control is `reducing`, instead of generating a new BUY allocation proposal.

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

#### `GET /control-plane/kill-switch/status`

- **Description**: Returns the current runtime kill-switch state derived from execution control. This is an autonomous-runtime stop, not a broker order cancel/flatten endpoint.

#### `POST /control-plane/kill-switch/trip`

- **Description**: Appends a durable `halted` execution-control event and prevents future autonomous advancement or paper execution until an operator explicitly changes execution control. It does not place broker orders, cancel broker orders, or liquidate positions.
- **Example Request**:
  ```json
  {
    "actor": "dashboard-operator",
    "reason": "Dashboard emergency stop"
  }
  ```
- **Example Response**:
  ```json
  {
    "armed": true,
    "tripped": true,
    "runtimeReady": true,
    "executionControlState": "halted",
    "lastActor": "dashboard-operator",
    "lastReason": "Kill switch trip: Dashboard emergency stop",
    "brokerExecutionEnabled": false,
    "liveTradingEnabled": false
  }
  ```
