# Direction And Change Control

Status: active normative spec.

## Direction Lock

The active long-term direction is an own-capital-first monetization system:

1. Own-capital allocation after the alpha, risk, execution, preflight, and reconciliation gates pass.
2. Darwinex/Zero external-capital fee path only after the own-capital-grade strategy has a compatible signal, instrument mapping, and observed track record.

The active implementation milestone is still a QuantConnect Cloud and LEAN validation system for aggressive alpha research. It is not an automatic production/live-trading system.

The system should aggressively search for capital-growth opportunities, but only inside an evidence pipeline:

```text
research -> typed alpha -> LEAN validation -> paper/live-shadow evidence -> reconciliation -> review
```

Real broker writes are blocked by default. Any code path that could submit, cancel, flatten, or otherwise mutate a real brokerage account needs a separate user-approved broker-write implementation spec before implementation.

Parallelization is required where it improves evidence throughput: corpus ingest, hypothesis extraction, data ingest, feature generation, LLM semantic feature jobs, ablations, backtest sweeps, and Cloud artifact imports. Portfolio target consolidation, risk cuts, execution intent, reconciliation, and preflight remain single-writer.

## Why This Lock Exists

The previous direction mixed three concerns:

- proving the LEAN/QuantConnect alpha runtime;
- proving LLM semantic alpha inside the strategy loop;
- preparing a small real-money broker-write pilot.

Those are different risk levels. The current spec keeps live-money and Darwinex monetization as explicit long-term goals, but it does not let those goals bypass the evidence stack. Backtests, paper/live-shadow, reconciliation, and adapter-specific preflight must precede any account mutation or external-capital claim.

## Scope In

- QuantConnect Cloud and LEAN as the strategy validation runtime.
- Local LEAN for debugging, custom-data checks, deterministic replay, and smoke tests.
- LLM semantic alpha features from news, filings, macro, and portfolio context.
- Typed feature, alpha, insight, portfolio target, risk cut, execution intent, fill, and reconciliation contracts.
- Paper execution and live-shadow evidence where no real broker mutation occurs.
- Result import into the control plane.
- Narrow unit tests plus direct runnable verification.
- Oracle Cloud ARM as an always-on control plane for scheduled ingestion, alpha generation, live-shadow, imports, reconciliation, and alerts.
- Bounded parallel research jobs for hypothesis extraction, feature generation, ablation, backtest, and Cloud import work.
- Strategy research corpus and hypothesis registry work that feeds testable alpha candidates.
- Darwinex/Zero feasibility analysis after own-capital evidence exists.

## Scope Out

- automatic production trading in the current milestone;
- real broker writes without a dedicated broker-write implementation spec;
- unrestricted autonomous live deployment;
- margin, leverage, options, futures, shorting, or derivatives;
- HFT or market making;
- treating simulator or local sample-data runs as promotion evidence;
- selected-run-bias from only storing winning parallel backtests;
- using LLM free text as an order instruction;
- storing credentials in prompts, frontend state, logs, or research artifacts;
- Darwinex/Zero performance-fee claims without a compatible account, mapped instruments, observed track record, and allocated-capital profit under Darwinex rules.

## Spec Change Approval

`SPEC.md` and the linked `docs/spec/` files define the long-term product direction. Changing them is not a routine cleanup.

Explicit user approval is required before changing any of these:

- real-money scope;
- broker write permissions;
- maximum notional or capital limits;
- leverage, margin, derivatives, shorting, or asset-class expansion;
- QuantConnect Cloud promotion requirements;
- paper/live-shadow requirements;
- LLM permissions around execution or sizing;
- testing and verification policy;
- credential and broker-boundary rules.

Ambiguous approval means no approval. The 2026-05-27 approval changes the long-term goal to include own-capital allocation and Darwinex/Zero monetization. It does not approve exact broker writes, capital limits, leverage, derivatives, or a Darwinex execution bridge by itself.

## QuantConnect Subscription Posture

Do not buy subscriptions or datasets by default.

Current posture:

- Free QuantConnect Cloud access is the preferred first validation path because hosted backtests and Research can use cloud datasets without local data-download QCC charges where the dataset license allows it.
- Full quality-gated universe validation should run in QuantConnect Cloud before buying local data.
- Quant Researcher monthly may become worthwhile only when repo-driven CLI/API/MCP cloud automation is actively blocked by account tier and the user approves that platform subscription.
- Team, Trading Firm, Institution, annual Security Master downloads, local US Equities downloads, QCC credit packs, bulk data, and alternative-data add-ons are deferred until a specific implementation blocker requires them and the user approves the cost.

Local data-purchase decisions must be treated separately from platform subscription decisions. A cloud backtest blocker does not automatically justify buying local dataset licenses. Local QuantConnect `--download-data` is disabled by default in repo scripts and requires `ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true` after explicit user approval.

## Darwinex Subscription Posture

Do not buy or start a Darwinex/Zero subscription by default.

Darwinex/Zero cost, supported instruments, account type, jurisdiction, platform choice, and performance-fee rules must be verified against current official docs before implementation. A good QuantConnect backtest does not automatically justify a Darwinex/Zero subscription. Subscription approval should name the account type, expected instrument set, execution bridge, and what track-record evidence the subscription is meant to produce.

## Superseded Live-Pilot Language

Older documents mention a `10 USD live pilot`. That language is superseded. It remains historical context only and must not be used to justify broker write implementation under this spec.

## References

- QuantConnect pricing: https://www.quantconnect.com/pricing/?billing=mo
- LEAN CLI cloud backtest docs: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-cloud-backtest
- QuantConnect local data download costs: https://www.quantconnect.com/docs/v2/lean-cli/datasets/quantconnect/download-by-ticker/costs
- Darwinex Zero DARWIN overview: https://www.darwinexzero.com/docs/en/what-is-a-darwin
- Darwinex Zero performance fees: https://www.darwinexzero.com/docs/performance-fees
