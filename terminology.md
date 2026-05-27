# Terminology

Status: active normative terminology and style guide.

Use this file with [SPEC.md](SPEC.md) and [AGENTS.md](AGENTS.md). New code, docs, prompts, UI copy, comments, and run reports must use these terms unless an existing API/database/file contract forces a legacy name.

## Principle

Prefer standard English engineering and quantitative-finance terms. Do not invent product-y labels when an established term exists.

When Korean translation is ambiguous, use the English term directly. Examples: `computer science`, `domain model`, `feature store`, `point-in-time`, `lookahead bias`, `backtest`, `live-shadow`, `reconciliation`.

## Platform Terms

| Use | Meaning | Avoid |
|---|---|---|
| `platform` | OS + CPU architecture + runtime constraints | machine vibes, local weirdness |
| `operating system` | `Darwin`, `Linux`, etc. | OS-ish |
| `CPU architecture` | `arm64`, `aarch64`, `x86_64` | armd, arm thing |
| `Apple Silicon` | ARM-based macOS hardware | M-chip box |
| `Linux ARM64` | Linux on `aarch64`/ARM64 | ARM Linux vaguely |
| `x86_64` | 64-bit Intel/AMD architecture | amd64 unless matching a package name |

Before running platform-sensitive commands, report or record:

```bash
uname -s
uname -m
```

Also check runtime versions when relevant:

```bash
bun --version
python3 --version
docker info
podman info
```

## QuantConnect And LEAN Terms

| Use | Meaning | Avoid |
|---|---|---|
| `QuantConnect` | Managed quant platform | QuantConnector, quantconnector, QC connector |
| `LEAN` | Open-source algorithmic trading engine | Lean engine when naming the engine |
| `Lean CLI` | QuantConnect CLI tool installed as `lean` | random local runner |
| `QuantConnect Cloud` | Managed cloud backtest/research/paper/live environment | QC server thing |
| `Research Environment` | QuantConnect notebook/research workflow | notebook magic |
| `Object Store` | QuantConnect artifact store | object bucket, magic store |
| `custom data` | LEAN user-defined data feed | arbitrary files |
| `Algorithm Framework` | LEAN framework with Universe/Alpha/Portfolio/Risk/Execution models | framework glue |
| `UniverseSelectionModel` | LEAN universe selection model | ticker picker |
| `AlphaModel` | LEAN model that emits `Insight` objects | strategy brain |
| `Insight` | LEAN forecast object | trade signal when referring to LEAN |
| `PortfolioConstructionModel` | LEAN sizing/target model | allocator magic |
| `RiskManagementModel` | LEAN risk adjustment model | safety layer |
| `ExecutionModel` | LEAN order execution model | order sender |

## Quant And Trading Terms

| Use | Meaning | Avoid |
|---|---|---|
| `feature` | input variable available at decision time | data point if it is modeled |
| `label` | future outcome used for training/evaluation | answer, truth value |
| `alpha` | return forecast or edge estimate | money idea, trade idea when it is a forecast |
| `signal` | numeric or categorical model output | vibe, hunch |
| `semantic alpha feature` | structured LLM-derived feature from text evidence | LLM opinion blob |
| `horizonHours` / `horizonDays` | explicit forecast horizon unit; choose the one matching the contract granularity | horizon if the unit is hidden |
| `point-in-time` | uses only information available at that simulated time | historical-ish |
| `availability time` / `availableAt` | earliest time the strategy may consume the record | timestamp if ambiguous |
| `lookahead bias` | use of future information in historical evaluation | future leak |
| `backtest` | historical simulation under defined data and costs | test run if evaluating strategy |
| `walk-forward validation` | rolling train/validate/test evaluation | backtest sweep if training is involved |
| `out-of-sample` | data not used for training/tuning | unseen-ish |
| `paper trading` | simulated trading with paper account semantics | fake live |
| `live-shadow` | live-data decision recording without broker writes | almost live, dry live |
| `preflight` | deterministic gate check before execution-like action | readiness when naming a new concept |
| `reconciliation` | comparing intended state with observed state | sync check |
| `notional` | dollar value of a position/order | size if value matters |
| `exposure` | market value at risk | bet size when formal |
| `gross exposure` | sum of absolute exposures | total exposure if ambiguity matters |
| `net exposure` | long exposure minus short exposure | net bet |
| `drawdown` | decline from peak equity | loss streak |
| `slippage` | execution price difference versus reference | execution noise |
| `fill` | executed order event | completion when order-specific |
| `broker adapter` | provider-specific broker boundary implementation | broker connector |
| `own-capital allocation` | allocating the operator's own pre-funded capital after evidence gates pass | live pilot, tiny live order |
| `Darwinex/Zero` | external-capital track-record and performance-fee venue considered by this project | backtest platform when referring to Darwinex |
| `DARWIN` | Darwinex investable track-record product/index derived from a trader's signals and Darwinex risk management | Darwin strategy if ambiguous |
| `Darwinex Risk Engine` | Darwinex risk-standardization layer that can resize risk independently of our portfolio target | our risk model when referring to Darwinex |
| `performance fee` | compensation based on profit from allocated capital under venue rules | subscription fee, guaranteed fee |
| `allocated capital` | third-party or program capital assigned to a track record or strategy | AUM if the platform uses a different term |
| `high-water mark` | performance-fee reference level used to avoid paying twice for the same profit | previous best vaguely |
| `vintage data` | preserved historical data version available at a specific time | revised history if used as original data |
| `strategy research corpus` | stored articles, papers, and notes used to form testable hypotheses | blog dump, idea pile |

## Engineering Terms

| Use | Meaning | Avoid |
|---|---|---|
| `domain model` | typed object representing business concept | dictionary blob |
| `DTO` | typed request/response transfer object | loose payload |
| `Pydantic model` | Python validation model for JSON/contracts | dict soup |
| `dataclass` | Python structured object where validation is not needed | random object |
| `TypedDict` | LEAN-compatible typed dictionary shape | plain dict if structure matters |
| `typed contract` | explicit schema shared across boundaries | shape-ish |
| `idempotency key` | replay-protection key | duplicate guard vaguely |
| `artifact` | persisted output file/object from a run | dump |
| `manifest` | metadata describing artifacts, hashes, versions, and inputs | list of files |
| `hash` | deterministic digest of content | fingerprint if not literal |
| `fail closed` | unknown or invalid state blocks the action | safe by default if vague |
| `blocked` | action intentionally refused by policy/gate | failed when policy worked |

## Legacy Names

Some implemented API routes, entity names, scripts, and migrations contain older names such as `V1`, `live-pilot`, or `readiness`. Do not rename those casually because they are part of existing contracts.

Rules:

- Existing contract names may remain until a planned migration updates them.
- Existing persisted fields such as `horizonDays` may remain until a schema migration changes them; new contracts should make the unit explicit.
- New docs should call them `historical endpoint name`, `legacy identifier`, or `blocked preflight evidence` when needed.
- New product scope must not use `live pilot`; use `broker-write spec`, `own-capital allocation`, or `Darwinex/Zero track-record path` as appropriate.
- New implementation names should avoid `V1` unless they refer to an immutable migration, fixture, or archived path.

## Avoid AI-Slop Expressions

Avoid these unless quoting historical text:

- `magic`, `just works`, `smart layer`, `AI brain`, `agent brain`;
- `autopilot` for broker/execution behavior;
- `production-ready` without naming exact gates;
- `tiny live pilot`, `small live order`, `live pilot` for current scope;
- `vibe`, `hunch`, `intuition` for model output;
- `gatch`, `gacha`, or game-like wording for technical behavior;
- `engine slice` when `vertical slice` or `execution path` is clearer;
- `money-moving` when `broker-write path`, `execution path`, or `paper/live-shadow path` is more precise;
- `QuantConnector`, `quantconnector`, `QC connector` when the platform is `QuantConnect`.

## Preferred Report Phrasing

Use:

- `Local LEAN simulator run passed; this proves artifact plumbing only.`
- `QuantConnect Cloud backtest is blocked by account tier or data access.`
- `The preflight gate returned blocked as expected.`
- `The LLM produced a semantic alpha feature with evidence refs and availability time.`

Avoid:

- `The trading brain works.`
- `Ready for live.`
- `The AI decided to buy.`
- `Local test proves strategy performance.`
