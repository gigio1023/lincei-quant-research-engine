# Broker Order And Fill Evidence API

Status: operator API reference for read-only broker order/fill evidence and polling. These endpoints do not place, cancel, or modify broker orders.

#### `POST /control-plane/broker-order-statuses/import-read-only`

- **Description**: Imports read-only broker order lifecycle evidence such as submitted, open, partially filled, filled, cancelled, rejected, or unknown status. This is external broker truth evidence only. It rejects credentials, raw account/order refs, order payloads, client order ids, and callable order actions.
- **Example Request**:
  ```json
  {
    "provider": "manual",
    "sourceRef": "manual-order-status-import-20260523",
    "accountRefHash": "sha256:account-ref",
    "brokerOrderRefHash": "sha256:broker-order-open",
    "brokerOrderCommandId": 1,
    "externalStatus": "open",
    "symbol": "005930",
    "side": "BUY",
    "orderType": "MARKET",
    "requestedQuantity": 10,
    "filledQuantity": 0,
    "remainingQuantity": 10,
    "requestedNotional": 500000,
    "asOf": "2026-05-23T09:00:00.000Z"
  }
  ```
- **Response Notes**:
  - returns a `BrokerOrderStatusRecord`;
  - repeated `brokerOrderRefHash` imports replay the existing record;
  - statuses linked to current dry-run broker commands are marked `mismatch`, because a dry-run command must not create a real external broker order;
  - `brokerExecutionEnabled` and `liveTradingEnabled` are always `false`.

#### `GET /control-plane/broker-order-statuses`

- **Description**: Lists read-only broker order lifecycle records ordered by latest broker timestamp. This endpoint does not call broker order endpoints.

#### `GET /control-plane/broker-order-statuses/open`

- **Description**: Lists submitted, accepted, open, partially filled, pending cancel, and unknown broker order status records so emergency cancel dry-runs can show candidate external order refs without calling broker cancel endpoints.

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
    "emergencyControls": {
      "runtimeKillSwitchReady": true,
      "brokerCancelReady": false,
      "brokerFlattenReady": false,
      "openOrderPollingReady": false,
      "brokerWriteEnabled": false,
      "dryRunOnly": true,
      "blockers": [
        "Broker write access is disabled.",
        "Broker open-order polling is not implemented.",
        "Broker cancel/replace endpoint is not implemented.",
        "Broker flatten-position order path is not implemented.",
        "Emergency broker action reconciliation is not implemented."
      ],
      "detail": "Runtime stop can halt autonomous advancement, but broker-order cancel/flatten emergency controls are not implemented."
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
        "detail": "Live order placement is intentionally blocked until read-only reconciliation, sandbox parity, approval custody, and broker-order emergency controls exist."
      },
      {
        "key": "killSwitch",
        "status": "blocked",
        "detail": "Runtime stop can halt autonomous advancement, but broker-order cancel/flatten emergency controls are not implemented."
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
