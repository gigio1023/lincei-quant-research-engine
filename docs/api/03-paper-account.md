# Paper Account API

Status: operator API reference for paper-only account and execution evidence.

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
