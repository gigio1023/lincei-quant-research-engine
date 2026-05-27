# Broker Readiness API

Status: operator API reference for broker snapshots, funding readiness, blocked pre-trade risk check, and dry-run broker command artifact.

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

#### `POST /control-plane/broker-snapshots/:id/assess-funding-readiness`

- **Description**: Records whether a reconciled read-only broker snapshot can support a requested deposit amount. The endpoint never accepts raw account refs or order intent. It copies the hashed account ref from the broker snapshot and requires that snapshot's reconciliation status to be `matched` before returning `ready`.
- **Example Request**:
  ```json
  {
    "expectedDepositAmount": 9500000,
    "currency": "KRW",
    "tolerance": 0.01,
    "maxAgeMinutes": 60,
    "idempotencyKey": "funding-readiness-20260523-001",
    "notes": ["Expected deposit checked against read-only broker cash."]
  }
  ```
- **Response Notes**:
  - returns a `FundingReadinessRecord`;
  - `status` is `ready` only when broker cash and equity are sufficient, currency matches, the snapshot is fresh, the snapshot has a hashed account ref, and snapshot reconciliation is `matched`;
  - missing `idempotencyKey` creates a fresh time-sensitive check; explicit idempotency keys replay the prior result;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/funding-readiness`

- **Description**: Lists funding readiness records ordered by latest check. This is a local readiness ledger for deposit checks, not a broker transfer, deposit, or order capability.

#### `POST /control-plane/funding-readiness/:id/assess-live-pilot-readiness`

- **Description**: Historical endpoint name for broker-write pre-trade risk check artifacts. This endpoint is a readiness ledger only. It rejects credentials, raw account/order refs, and order intent fields, then combines funding readiness, active budget policy, broker adapter status, schema migration policy, read-only/fill polling, and broker emergency-control evidence. Under the active spec, status must remain `blocked` for real broker writes until a broker-write implementation spec is approved.
- **Example Request**:
  ```json
  {
    "pilotBudgetAmount": 500000,
    "maxPilotBudgetAmount": 1000000,
    "maxSingleOrderNotional": 100000,
    "idempotencyKey": "live-pilot-readiness-20260523-001",
    "notes": [
      "Broker-write pre-trade risk check reviewed after funding readiness."
    ]
  }
  ```
- **Response Notes**:
  - returns a `LivePilotReadinessRecord`;
  - `status` remains `blocked` under the active spec. A broker-write implementation spec would need funding readiness, explicit budget limits, production schema migrations, production credential custody, verified broker schema/sandbox/read-only/fill polling, broker cancel/flatten/open-order polling, and a separate approved live order path;
  - `brokerWriteEnabled`, `orderEndpointImplemented`, `brokerExecutionEnabled`, and `liveTradingEnabled` are always `false` in the current slice;
  - explicit idempotency keys replay the prior time-sensitive readiness result.

#### `GET /control-plane/live-pilot-readiness`

- **Description**: Lists historical live-pilot readiness records ordered by latest check. This is local pre-trade risk check artifacts only; it cannot place, cancel, modify, flatten, or route broker orders.

#### `POST /control-plane/paper-order-plans/:id/prepare-broker-order-command`

- **Description**: Creates or replays a blocked dry-run broker command record from a stored paper order plan. This endpoint is a broker-command ledger only. It copies order intent from the persisted paper plan and its signed approval artifact; it rejects credentials, raw account refs, caller-supplied order payloads, and live execution fields.
- **Example Request**:
  ```json
  {
    "livePilotReadinessId": "live-pilot-readiness-1",
    "idempotencyKey": "broker-command-20260523-001",
    "notes": ["Prepare the paper order plan for broker-write review."]
  }
  ```
- **Response Notes**:
  - returns a `BrokerOrderCommand`;
  - `commandType` is `submit_order_plan`;
  - `status` is `blocked` and `mode` is `dry_run`;
  - `orderIntents` are copied from the paper plan and are not accepted from the request body;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`;
  - this endpoint does not place, preview, cancel, flatten, or route broker orders.

#### `POST /control-plane/broker-order-commands/emergency-dry-run`

- **Description**: Records a blocked dry-run emergency broker command for future cancel/flatten controls. This is an audit and readiness artifact only; it does not call broker cancel, open-order, or liquidation endpoints.
- **Example Request**:
  ```json
  {
    "commandType": "cancel_open_orders",
    "livePilotReadinessId": "live-pilot-readiness-1",
    "idempotencyKey": "cancel-dry-run-20260523-001",
    "reason": "Operator verifies emergency-control blockers before broker write work.",
    "notes": ["No broker endpoint called."]
  }
  ```
- **Response Notes**:
  - `commandType` must be `cancel_open_orders` or `flatten_positions`;
  - `status` is `blocked` and `mode` is `dry_run`;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/broker-order-commands`

- **Description**: Lists blocked dry-run broker command records ordered by latest update. This endpoint is for dashboard/operator review before any broker write adapter exists.
