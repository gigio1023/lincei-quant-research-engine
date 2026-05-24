# Paper Order Plans API

Status: operator API reference for paper-only order plans and reconciliation.

#### `POST /control-plane/proposals/:id/order-plan-approvals`

- **Description**: Creates a durable signed approval record for paper-only execution of a stored proposal. The service builds a paper-mode `ALLOW` risk evaluation from the current paper account snapshot or deterministic seed portfolio, hashes the proposal/risk/approval payloads, stores approver and reason, and keeps broker/live execution disabled.
- **Example Request**:
  ```json
  {
    "idempotencyKey": "paper:proposal:1:risk:4",
    "approver": "operator@example.com",
    "reason": "Approve this paper cycle after reviewing the risk gate.",
    "expectedPaperAccountEventHash": "sha256:latest-paper-account-event",
    "expiresAt": "2026-05-24T00:00:00.000Z"
  }
  ```
- **Response Notes**:
  - returns an `OrderPlanApproval`;
  - `status` starts as `active` and becomes `consumed` after a filled paper order plan uses it;
  - approval creation requires `expectedPaperAccountEventHash`, and the service rejects creation if it does not match the latest promoted paper account event;
  - approval records store `proposalHash`, `riskRequestHash`, `approvalHash`, `approvalSnapshot`, `idempotencyKey`, expiry, approver, reason, consumed plan id, paper account id, paper account event hash/sequence, canonical payload hash, signer key ref, and local hash signature;
  - replaying the same approval idempotency key returns the existing approval only when the signed payload intent matches;
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
  - `readinessSnapshot` includes reservation evidence and custody evidence: required cash, reserved cash, available cash, required sells, reserved sells, available sell notional by symbol, approval custody status, approval paper account event hash, current paper account event hash, current account event sequence, and paper account lock version;
  - readiness checks subtract `paper_reservation_holds` rows with `status === "reserved"` before falling back to legacy open paper plans or `reservationHold.status === "reserved"` snapshots;
  - filled paper plans include a durable `reservationHold` snapshot with hold id, status, cash amount, sell notional by symbol, hold hash, approval-custody-at-hold evidence, account event hash/sequence at hold, account lock version at hold, and consumption timestamp;
  - non-blocked paper plans create a database reservation-hold record before fill simulation and mark it consumed after the local paper plan is filled;
  - immediately before applying simulated fills to the durable paper account, the service rechecks that the latest account event and account lock version still match the readiness snapshot; if either changed, the plan is blocked, fills/ledgers are cleared, and the reservation hold is released instead of consuming the approval;
  - before final account mutation, the service atomically claims the next paper-account lock version; if another writer claimed it first, the plan is blocked and the reservation hold is released;
  - the final paper apply commit uses a database transaction when available, covering plan persistence, reservation-hold consumption or release, paper account projection update, append-only account event creation, approval consumption, and proposal audit update;
  - if the transaction fails, including account-event append failure, the service blocks the plan and releases the reservation hold rather than leaving a partially applied paper account;
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
