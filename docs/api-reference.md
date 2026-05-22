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

-   **`GET /health`**
    -   **Description**: Checks the service's health, including database and AI service connectivity.
    -   **Response**:
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

-   **Description**: Retrieves a paginated list of investment reports.
-   **Query Parameters**:
    -   `page` (number, optional, default: 1): The page number to retrieve.
    -   `limit` (number, optional, default: 10): The number of items per page.
-   **Response**:
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

-   **Description**: Fetches a specific report by its unique ID.
-   **Path Parameters**:
    -   `id` (number, required): The ID of the report.
-   **Response**:
    -   Returns the full `Report` object on success.
    -   Returns `null` if the report is not found.

#### `POST /reports/generate/:type`

-   **Description**: Manually triggers the generation of a new report. This is an asynchronous operation.
-   **Path Parameters**:
    -   `type` (string, required): The type of report to generate. Must be `morning` or `evening`.
-   **Response**:
    -   Returns the newly created `Report` object.
    -   **Note**: This process can take up to 30 seconds as it involves AI-based analysis.

### News

#### `POST /news/collect`

-   **Description**: Manually triggers the news collection and processing workflow.
-   **Response**:
    ```json
    {
      "status": "success",
      "message": "News collection started."
    }
    ```

#### `GET /news/stats`

-   **Description**: Retrieves statistics about the collected news articles.
-   **Response**:
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

-   **Description**: Returns the deterministic control-plane status. Broker execution is disabled.
-   **Response**:
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

-   **Description**: Evaluates a proposal against deterministic safety rules. This endpoint does not place orders and does not call broker APIs.
-   **Response Decisions**:
    -   `ALLOW`: dry-run proposal is inside policy limits.
    -   `REVIEW`: proposal is not denied, but human approval or missing provenance review is required.
    -   `DENY`: proposal violates hard policy.
-   **Example Request**:
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
-   **Example Response**:
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

-   **Description**: Returns system readiness, blockers, and confirms broker execution is disabled.

#### `POST /control-plane/budgets`

-   **Description**: Creates an active budget envelope. Live trading is forcibly disabled even if requested.
-   **Example Request**:
    ```json
    {
      "name": "Aggressive dry run",
      "totalBudget": 10000000,
      "currency": "KRW",
      "mode": "dry_run"
    }
    ```

#### `GET /control-plane/budgets`

-   **Description**: Lists budget envelopes ordered by latest update.

#### `POST /control-plane/research-runs`

-   **Description**: Stores a reproducible research run before a proposal can be created. This captures dataset windows, availability timestamps, feature refs, lag rules, benchmark, cost/slippage assumptions, model metadata, validation window, backtest metrics, artifacts, and known failure modes.
-   **Example Request**:
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

-   **Description**: Lists research-run ledger records ordered by latest update.

#### `POST /control-plane/research-runs/run-baseline`

-   **Description**: Runs the built-in deterministic baseline backtest and stores the resulting research run. This is a dry-run research action using local sample bars; it does not read broker data and does not place orders.
-   **Example Request**:
    ```json
    {
      "budgetEnvelopeId": 1,
      "objective": "Run deterministic momentum baseline before proposal",
      "symbol": "SAMPLE_MOMENTUM_BASKET",
      "benchmark": "SAMPLE_BENCHMARK"
    }
    ```
-   **Response Notes**:
    -   Returns a `ResearchRun`.
    -   `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.
    -   The run is `proposal_ready` only if dataset lineage, no-lookahead proof, cost/slippage assumptions, backtest metrics, and artifact hashes are present.

#### `POST /control-plane/proposals`

-   **Description**: Stores a typed investment proposal with portfolio snapshot, orders, thesis, and evidence references. A `researchRunId` is required, and the linked run must be `proposal_ready` with `advanceEligible: true`.

#### `GET /control-plane/proposals`

-   **Description**: Lists stored investment proposals.

#### `POST /control-plane/proposals/:id/evaluate-risk`

-   **Description**: Evaluates a stored proposal through the deterministic risk gate and persists request/response snapshots.

#### `GET /control-plane/risk-evaluations`

-   **Description**: Lists persisted risk evaluations.

#### `GET /control-plane/execution-control`

-   **Description**: Returns the latest execution-control state. If none exists, a default `active` state is created for paper simulation only.

#### `POST /control-plane/execution-control`

-   **Description**: Appends a new execution-control state. `paused` and `halted` block paper execution. `reducing` only permits SELL-only paper plans.
-   **Example Request**:
    ```json
    {
      "state": "halted",
      "actor": "human",
      "reason": "Manual stop before broker integration review"
    }
    ```

#### `POST /control-plane/proposals/:id/paper-execute`

-   **Description**: Creates or replays an idempotent paper-only order plan from a stored proposal. Orders are derived from the proposal; arbitrary order payloads, broker credentials, and account ids are not accepted. The endpoint requires an `ALLOW` risk evaluation matching the proposal snapshot, sufficient paper cash/positions, no active duplicate plan, and an execution-control state that permits the action.
-   **Example Request**:
    ```json
    {
      "idempotencyKey": "paper:proposal:1:risk:4",
      "expectedRiskEvaluationId": 4,
      "humanApprovalId": "paper-approval-20260523-001"
    }
    ```
-   **Response Notes**:
    -   returns a `PaperOrderPlan`;
    -   if the latest matching risk evaluation is not a paper-mode `ALLOW`, the service creates a paper-mode risk evaluation using `humanApprovalId`; without approval it remains blocked for review;
    -   `status` is `filled`, `blocked`, or `reconciled` for the current implementation;
    -   each plan stores `proposalHash`, `riskRequestHash`, `planHash`, `readinessSnapshot`, immutable paper order ids, fill events, cash ledger rows, position ledger rows, portfolio before/after snapshots, reconciliation state, and kill-switch snapshot;
    -   `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/paper-order-plans`

-   **Description**: Lists paper order plans ordered by latest update.

#### `GET /control-plane/paper-order-plans/:id`

-   **Description**: Fetches one paper order plan by id.

#### `POST /control-plane/paper-order-plans/:id/reconcile`

-   **Description**: Reconciles expected paper cash and positions against the local paper ledger. Until a broker read-only adapter exists, this is a local simulator reconciliation, not external broker truth.
-   **Example Request**:
    ```json
    {
      "tolerance": 0.01,
      "notes": ["Operator reviewed the paper ledger."]
    }
    ```

#### `POST /control-plane/runs`

-   **Description**: Creates an observable autonomous-run ledger entry.
-   **Example Request**:
    ```json
    {
      "objective": "Research and allocate dry-run budget"
    }
    ```

#### `GET /control-plane/runs`

-   **Description**: Lists autonomous-run ledger entries.

## Data Models

### Report

```typescript
interface Report {
  id: number;
  title: string;
  content: string; // Markdown format
  summary: string;
  reportType: 'morning' | 'evening';
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
```
