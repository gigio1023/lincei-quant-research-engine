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
- Explicit paper account seed/promote endpoints and append-only paper account event chain.
- Autonomous SELL-only recovery proposal path when execution control is `reducing`.
- Local paper reconciliation endpoint.
- Minimal execution-control state that can block paper execution when paused, reducing, or halted.
- Explicit disabled live-trading gate with blockers for order endpoints, broker write access, credential custody, kill switch, fill polling, and reconciliation.
- Manual broker read-only snapshot/fill evidence ledgers and paper-account reconciliation.
- Provider-neutral broker adapter readiness contract for Toss credentials, credential custody, schema, sandbox, read-only, and order capability gates.
- Durable signed paper order-plan approval ledger.
- Schedule-scoped standing paper authorization that can create and consume per-proposal signed paper approvals for paper-only schedules when the budget explicitly allows it and the stored budget hash still matches.
- Env-gated autonomous run schedule worker and dashboard worker status.
- Control-plane dashboard view.
- Local reference inspection under `references/projects/`.

## Not Runnable Yet

- live broker account connection;
- Toss API client;
- broker-backed paper trading;
- live order placement;
- scheduled broker order/account reconciliation;
- automated liquidation or exposure reduction;
- production-authenticated autonomous scheduler deployment;
- production kill switch;
- approved budget capsule storage;
- production credential custody and signing custody for order-plan approvals;
- database-level account balance locks around plan creation/readiness reservation and external broker reconciliation.

## Required Gates

| Gate                    | Status  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research reports        | Partial | Existing app creates LLM-assisted reports, not trade proposals.                                                                                                                                                                                                                                                                                                                                                       |
| Research-run provenance | Started | Research-run entity/API, proposal-ready gate, deterministic baseline runner, and durable imported market-bar ledger exist. External provider clients and scheduled ingestion are still missing.                                                                                                                                                                                                                                                                                    |
| Proposal contract       | Started | Budget/research-run/proposal/risk-evaluation/run entities and endpoints exist.                                                                                                                                                                                                                                                                                                                                        |
| Deterministic risk gate | Started | Evaluation-only backend module plus persisted risk-evaluation audit through control-plane.                                                                                                                                                                                                                                                                                                                            |
| Paper execution         | Started | Deterministic paper simulator ledger, durable signed paper approvals, schedule-scoped paper auto approval, explicit paper account seed/promote controls, append-only account events, idempotent paper-execute endpoint, idempotent SELL-only recovery proposal replay, autonomous reducing-state recovery proposal generation, approval payload hash/signature evidence, approval-to-account-event binding, final pre-apply account-event freshness guard, transaction-scoped final paper apply commit, rollback-to-blocked behavior when account-event append fails, quantity/cost-basis/realized-PnL accounting, reservation readiness evidence, database reservation-hold ledger, reserved-hold-aware availability checks, consumed/released reservation-hold snapshots, durable local paper account state, local reconciliation, broker-fill-to-paper-fill matching, and execution-control state exist. Production signing custody, database-level account balance locks around plan creation/readiness reservation, and live-provider reconciliation are still missing. |
| Broker read-only        | Partial | Read-only broker snapshot ledger, read-only broker fill evidence ledger, disabled-by-default Toss snapshot/fill polling workers, automatic paper reconciliation after snapshot poll/import, broker-fill-to-paper-fill matching, and a provider-neutral Toss adapter readiness contract with credential-custody evidence exist. Verified Toss schema/client responses, actual external secret-manager wiring, and live-provider fill schema validation are still missing.                                                                                                                                              |
| Broker write access     | Blocked | Requires separate gated design and credentials.                                                                                                                                                                                                                                                                                                                                                                       |
| Live trading            | Blocked | No real-money order path is implemented. Control-plane status exposes a disabled live-trading gate listing the missing order endpoint, broker write, credential custody, kill switch, fill polling, and reconciliation controls.                                                                                                                                                                                        |

## Practical Next Step

Build toward this order:

1. proposal schema and audit storage;
2. external market/news ingestion for reproducible research runs;
3. database-level reservation/account locks and production approval custody;
4. verified Toss read-only adapter and scheduled snapshot/fill polling;
5. Toss paper/sandbox adapter if available;
6. tiny live pilot behind explicit approval.

## Toss-Specific Readiness

Toss Securities Open API should be treated as live broker access until an official test environment is verified. Public official materials show account, holdings, market data, and order examples, but access is gated by account ownership, pre-application, and API key issuance.

The repo now has provider-neutral read-only broker snapshot and fill evidence ledgers, broker adapter readiness contract, and disabled-by-default Toss read-only snapshot/fill poll workers. It can store imported cash/holdings/fill evidence, reject credentials and order payloads, automatically attempt paper-account reconciliation after snapshot poll/import, match imported broker fills against paper fills, show whether Toss credentials/schema/fill-schema/sandbox/read-only gates are satisfied, and only allowlist token/account/holdings plus an operator-configured GET fill path when polling is explicitly enabled. It still does not have verified Toss schema access, sandbox parity, credential custody suitable for production, or any order endpoint.
