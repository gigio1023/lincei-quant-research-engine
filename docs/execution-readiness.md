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
- Durable local paper account state across paper execution cycles.
- Local paper reconciliation endpoint.
- Minimal execution-control state that can block paper execution when paused, reducing, or halted.
- Manual broker read-only snapshot ledger and paper-account reconciliation.
- Durable signed paper order-plan approval ledger.
- Control-plane dashboard view.
- Local reference inspection under `references/projects/`.

## Not Runnable Yet

- live broker account connection;
- Toss API client;
- broker-backed paper trading;
- live order placement;
- scheduled broker order/account reconciliation;
- automated liquidation or exposure reduction;
- production kill switch;
- approved budget capsule storage;
- production signing custody for order-plan approvals;
- broker-grade quantity, cost-basis, reservation, and realized-PnL accounting.

## Required Gates

| Gate                    | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                    |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Research reports        | Partial | Existing app creates LLM-assisted reports, not trade proposals.                                                                                                                                                                                                                                                                                                          |
| Research-run provenance | Started | Research-run entity/API, proposal-ready gate, and deterministic baseline runner exist. External market ingestion is still missing.                                                                                                                                                                                                                                       |
| Proposal contract       | Started | Budget/research-run/proposal/risk-evaluation/run entities and endpoints exist.                                                                                                                                                                                                                                                                                           |
| Deterministic risk gate | Started | Evaluation-only backend module plus persisted risk-evaluation audit through control-plane.                                                                                                                                                                                                                                                                               |
| Paper execution         | Started | Deterministic paper simulator ledger, durable signed paper approvals, idempotent paper-execute endpoint, durable local paper account state, local reconciliation, and execution-control state exist. Production signing custody, append-only account ledgers, quantity/cost-basis accounting, transaction isolation, and broker-backed reconciliation are still missing. |
| Broker read-only        | Partial | Manual read-only broker snapshot ledger and paper reconciliation exist. Verified Toss/client polling and credential isolation are still missing.                                                                                                                                                                                                                         |
| Broker write access     | Blocked | Requires separate gated design and credentials.                                                                                                                                                                                                                                                                                                                          |
| Live trading            | Blocked | No real-money order path is implemented.                                                                                                                                                                                                                                                                                                                                 |

## Practical Next Step

Build toward this order:

1. proposal schema and audit storage;
2. external market/news ingestion for reproducible research runs;
3. production approval custody, explicit paper account seeding, and append-only paper accounting;
4. verified Toss read-only adapter and scheduled snapshot polling;
5. Toss paper/sandbox adapter if available;
6. tiny live pilot behind explicit approval.

## Toss-Specific Readiness

Toss Securities Open API should be treated as live broker access until an official test environment is verified. Public official materials show account, holdings, market data, and order examples, but access is gated by account ownership, pre-application, and API key issuance.

The repo now has a provider-neutral read-only broker snapshot ledger. It can store imported cash/holdings evidence, reject credentials and order payloads, and reconcile the snapshot against paper account state. It still does not have a verified Toss API client, credential boundary, polling schedule, or any order endpoint.
