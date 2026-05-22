# Execution Readiness

## Current Verdict

Not ready for real money.

After the initial control-plane work, the repo can run deterministic research, risk, and paper-simulation slices. It still cannot take a cash deposit, connect a broker account, place real orders, monitor real fills, or recover positions end to end.

## Runnable Now

- Backend report service, if environment variables are configured.
- Frontend report UI.
- New risk gate tests and backend build.
- Control-plane budget/research-run/proposal/risk-evaluation/run ledgers.
- Deterministic paper order-plan/fill/cash/position ledger.
- Local paper reconciliation endpoint.
- Minimal execution-control state that can block paper execution when paused, reducing, or halted.
- Control-plane dashboard view.
- Local reference inspection under `references/projects/`.

## Not Runnable Yet

- broker account connection;
- Toss API client;
- broker-backed paper trading;
- live order placement;
- broker order reconciliation;
- automated liquidation or exposure reduction;
- production kill switch;
- approved budget capsule storage;
- signed order plan workflow.

## Required Gates

| Gate | Status | Notes |
| --- | --- | --- |
| Research reports | Partial | Existing app creates LLM-assisted reports, not trade proposals. |
| Research-run provenance | Started | Research-run entity/API, proposal-ready gate, and deterministic baseline runner exist. External market ingestion is still missing. |
| Proposal contract | Started | Budget/research-run/proposal/risk-evaluation/run entities and endpoints exist. |
| Deterministic risk gate | Started | Evaluation-only backend module plus persisted risk-evaluation audit through control-plane. |
| Paper execution | Started | Deterministic paper simulator ledger, idempotent paper-execute endpoint, local reconciliation, and execution-control state exist. Signed order plans, durable paper account state, and broker-backed reconciliation are still missing. |
| Broker read-only | Missing | Toss or another broker snapshot adapter required. |
| Broker write access | Blocked | Requires separate gated design and credentials. |
| Live trading | Blocked | No real-money order path is implemented. |

## Practical Next Step

Build toward this order:

1. proposal schema and audit storage;
2. external market/news ingestion for reproducible research runs;
3. signed order-plan approval and durable paper account state;
4. Toss read-only adapter;
5. Toss paper/sandbox adapter if available;
6. tiny live pilot behind explicit approval.

## Toss-Specific Readiness

Toss Securities Open API should be treated as live broker access until an official test environment is verified. Public official materials show account, holdings, market data, and order examples, but access is gated by account ownership, pre-application, and API key issuance. The current repo must not add a Toss order adapter before paper execution and broker read-only reconciliation exist.
