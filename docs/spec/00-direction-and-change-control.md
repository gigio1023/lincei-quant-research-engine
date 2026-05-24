# Direction And Change Control

Status: active normative spec.

## Direction Lock

The active milestone is a QuantConnect Cloud and LEAN validation system for aggressive alpha research. It is not an automatic production/live-trading system.

The system should aggressively search for capital-growth opportunities, but only inside an evidence pipeline:

```text
research -> typed alpha -> LEAN validation -> paper/live-shadow evidence -> reconciliation -> review
```

Real broker writes are blocked by default. Any code path that could submit, cancel, flatten, or otherwise mutate a real brokerage account needs a separate user-approved spec before implementation.

## Why This Lock Exists

The previous direction mixed three concerns:

- proving the LEAN/QuantConnect alpha runtime;
- proving LLM semantic alpha inside the strategy loop;
- preparing a small real-money broker-write pilot.

Those are different risk levels. The current spec keeps the first two and removes the live-money milestone until the validation stack is stronger.

## Scope In

- QuantConnect Cloud and LEAN as the strategy validation runtime.
- Local LEAN for debugging, custom-data checks, deterministic replay, and smoke tests.
- LLM semantic alpha features from news, filings, macro, and portfolio context.
- Typed feature, alpha, insight, portfolio target, risk cut, execution intent, fill, and reconciliation contracts.
- Paper execution and live-shadow evidence where no real broker mutation occurs.
- Result import into the control plane.
- Narrow unit tests plus direct runnable verification.

## Scope Out

- automatic production trading;
- real broker writes;
- unrestricted autonomous live deployment;
- margin, leverage, options, futures, shorting, or derivatives;
- HFT or market making;
- treating simulator or local sample-data runs as promotion evidence;
- using LLM free text as an order instruction;
- storing credentials in prompts, frontend state, logs, or research artifacts.

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

Ambiguous approval means no approval. Agents may draft proposed spec changes, but implementation must wait until the user approves the direction change clearly.

## QuantConnect Subscription Posture

Do not buy subscriptions or datasets by default.

Current posture:

- Free QuantConnect access is enough for manual exploration and early cloud checks where available.
- Quant Researcher monthly may become worthwhile when repo-driven CLI/API/MCP cloud automation is actively blocked by account tier.
- Team, Trading Firm, Institution, annual Security Master downloads, QCC credit packs, and alternative-data add-ons are deferred until a specific implementation blocker requires them.

Local data-purchase decisions must be treated separately from platform subscription decisions. A cloud backtest blocker does not automatically justify buying local dataset licenses.

## Superseded Live-Pilot Language

Older documents mention a `10 USD live pilot`. That language is superseded. It remains historical context only and must not be used to justify broker write implementation under this spec.

## References

- QuantConnect pricing: https://www.quantconnect.com/pricing/?billing=mo
- LEAN CLI cloud backtest docs: https://www.quantconnect.com/docs/v2/lean-cli/api-reference/lean-cloud-backtest
- QuantConnect local data download costs: https://www.quantconnect.com/docs/v2/lean-cli/datasets/quantconnect/download-by-ticker/costs
