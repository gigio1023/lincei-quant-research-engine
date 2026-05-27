# API Reference

Status: operator API reference index. The active product direction is defined by [../SPEC.md](../SPEC.md).

Endpoint names may preserve historical `live-pilot` terminology, but the active spec keeps all real broker writes blocked unless a future user-approved broker-write implementation spec exists.

## Sections

- [Core Endpoints](api/01-core.md): health, reports, news, and risk gate endpoints.
- [Control Plane Research And Risk](api/02-control-plane-research-risk.md): budgets, research runs, market data, proposals, execution control, and kill switch.
- [Paper Account](api/03-paper-account.md): paper account state, seeding, promotion, and events.
- [Broker Readiness](api/04-broker-readiness.md): broker snapshots, funding readiness, blocked pre-trade risk check, and dry-run broker command artifact.
- [Broker Order And Fill Evidence](api/05-broker-order-fill-evidence.md): read-only broker order/fill evidence, adapter status, polling, and paper reconciliation.
- [Paper Order Plans](api/06-paper-orders.md): paper approvals, paper execution, paper order plans, and reconciliation.
- [Runs And Schedules](api/07-runs-and-schedules.md): run ledgers, schedules, worker status, ticks, and advancement.
- [Data Models](api/08-data-models.md): shared response models.

## Boundary

The API reference describes implemented endpoints. It does not grant broker-write permission. Broker write, cancel, replace, flatten, or liquidation paths remain blocked unless [../SPEC.md](../SPEC.md) and the broker-write implementation spec are explicitly approved.
