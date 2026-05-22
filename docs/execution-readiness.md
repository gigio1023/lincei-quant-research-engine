# Execution Readiness

## Current Verdict

Not ready for real money.

After the initial control-plane work, the repo can run a deterministic risk evaluation endpoint. It still cannot take a cash deposit, research investments, place orders, monitor fills, or recover positions end to end.

## Runnable Now

- Backend report service, if environment variables are configured.
- Frontend report UI.
- New risk gate tests and backend build.
- Local reference inspection under `references/projects/`.

## Not Runnable Yet

- broker account connection;
- Toss API client;
- paper trading;
- live order placement;
- order reconciliation;
- automated liquidation or exposure reduction;
- production kill switch;
- approved budget capsule storage;
- signed order plan workflow.

## Required Gates

| Gate | Status | Notes |
| --- | --- | --- |
| Research reports | Partial | Existing app creates LLM-assisted reports, not trade proposals. |
| Proposal contract | Missing | Needs schema, storage, provenance, timestamps. |
| Deterministic risk gate | Started | Evaluation-only backend module. |
| Paper execution | Missing | Must exist before broker write access. |
| Broker read-only | Missing | Toss or another broker snapshot adapter required. |
| Broker write access | Blocked | Requires separate gated design and credentials. |
| Live trading | Blocked | No real-money order path is implemented. |

## Practical Next Step

Build toward this order:

1. proposal schema and audit storage;
2. reproducible research runs;
3. paper execution enclave;
4. Toss read-only adapter;
5. Toss paper/sandbox adapter if available;
6. tiny live pilot behind explicit approval.
