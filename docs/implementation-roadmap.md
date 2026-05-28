# Implementation Roadmap

Status: supporting roadmap index. The normative roadmap is [spec/06-implementation-roadmap.md](spec/06-implementation-roadmap.md).

Use this file as a short pointer for contributors who discover the older top-level roadmap path. Do not add new phase detail here; update the normative roadmap instead.

## Current Order

1. Align docs and evidence policy.
2. Build the QuantConnect Cloud backtest/import loop.
3. Stabilize numeric alpha inside LEAN.
4. Add the LLM-derived feature feed with point-in-time replay.
5. Combine numeric and LLM alpha into LEAN `Insight` objects.
6. Run paper and shadow trading artifacts without real broker writes.
7. Add the learning loop.

Live-money execution is deferred and requires explicit user approval for a separate spec change.
