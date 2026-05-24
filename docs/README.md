# Documentation Index

Status: active documentation map.

Read [../SPEC.md](../SPEC.md) first. It is the authority document for project direction and links to the active normative spec set.

## Active Normative Spec

- [SPEC.md](../SPEC.md): canonical spec index, direction lock, and change-control rules.
- [Terminology](../terminology.md): canonical terms and banned AI-slop expressions.
- [Direction And Change Control](spec/00-direction-and-change-control.md)
- [QuantConnect And LEAN Runtime](spec/01-quantconnect-lean-runtime.md)
- [LLM Semantic Alpha Engine](spec/02-llm-semantic-alpha-engine.md)
- [Data Sources And Feature Store](spec/03-data-sources-and-feature-store.md)
- [Risk, Execution, And Broker Boundary](spec/04-risk-execution-and-broker-boundary.md)
- [Testing And Verification Policy](spec/05-testing-and-verification.md)
- [Implementation Roadmap](spec/06-implementation-roadmap.md)
- [References](spec/07-references.md)

## Supporting Design Docs

These documents explain subsystem intent. If they conflict with `SPEC.md`, `SPEC.md` wins.

- [Project Architecture](project-architecture.md)
- [LEAN and QuantConnect Engine](lean-quantconnect-engine.md)
- [Alpha Model Design](alpha-model-design.md)
- [LLM Alpha Committee](llm-alpha-committee.md)
- [Latency and Execution Paths](latency-and-execution-paths.md)
- [Model Training Plan](model-training-plan.md)
- [ML External Baselines Research](ml-external-baselines-research.md)
- [Toss Securities Open API Readiness](toss-open-api-readiness.md)

## Operator Runbooks

- [Development Guide](development-guide.md)
- [Deployment Guide](deployment-guide.md)
- [LEAN Backtest And Readiness Paths](full-lean-backtest-setup.md)
- [Execution Readiness](execution-readiness.md)
- [API Reference](api-reference.md)
- [Contribution Guide](../CONTRIBUTING.md)

## Current Implementation Surface

- QuantConnect Cloud wrappers: `scripts/qc-cloud-backtest`, `scripts/qc-cloud-push`, `scripts/qc-object-store-sync`.
- LLM semantic alpha feature export: `artifacts/llm-features/latest.json` and LEAN input `llm_event_features.json`.
- LEAN point-in-time semantic feature replay with `availableAt` rejection.
- Paper/live-shadow evidence commands: `scripts/run-paper-cycle`, `scripts/run-live-shadow`.
- Learning/promotion ledger command: `scripts/run-learning-loop`.

## Decision Records

- [2026-05-24 QuantConnect Realignment](decisions/2026-05-24-quantconnect-realignment.md)

## Archived Historical Context

Archived documents preserve previous prompts, handoffs, and superseded specs. They are not active requirements.

- [Archive Index](archive/README.md)
