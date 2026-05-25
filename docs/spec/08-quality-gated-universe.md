# Quality-Gated Universe

Status: active normative spec.

Last aligned: 2026-05-24.

## Purpose

The active V1 universe is a quality-gated research universe, not a broad ticker idea list. It should exclude instruments that are unpopular, structurally weak, redundant with a better ETF, too speculative for the current engine, or unsuitable for historical portfolio backtests.

The canonical machine-readable manifest is:

- `config/universes/quality-gated-v2.json`

Backend services and the LEAN runtime must read this manifest. Hardcoded fallback universes are allowed only for explicitly named local smoke paths, and those smoke paths must be described as plumbing evidence rather than strategy evidence.

## Admission Rules

An instrument can enter the active trade universe only if it passes these checks:

- It is declared in the manifest with a status, sleeve, cap, and rationale.
- It is not `hard_excluded`.
- It is not a disabled tactical instrument unless the profile and explicit env flag permit it.
- It has enough market-data availability for the intended backtest window.
- It is not a redundant ETF when a stronger anchor already expresses the same factor.
- It has current business momentum or a clear undervaluation thesis worth testing.

Unknown state is blocked state. Missing manifest, unknown profile, undeclared override, hard-excluded override, or disabled leveraged ETF all fail closed before LEAN can produce portfolio targets.

## Default Profile

Default profile: `quality_core_backtest_safe`.

This profile is designed for historical backtests and excludes newly launched forward-only products and daily leveraged ETFs.

Active sleeves:

| Sleeve | Active instruments |
| --- | --- |
| Semiconductor / AI compute | `SMH`, `NVDA`, `AVGO`, `TSM`, `ASML`, `AMAT`, `AMD`, `MU`, `LRCX`, `KLAC`, `MRVL` |
| Software / Cybersecurity | `IGV`, `CIBR`, `MSFT`, `ORCL`, `NOW`, `PANW`, `CRWD`, `PLTR`, `ANET`, `DDOG` |
| Power / Electrification | `GRID`, `ETN`, `PWR`, `VRT`, `GEV`, `CEG`, `VST` |
| Space / Aerospace | `XAR`, `UFO`, `RKLB`, `LMT`, `NOC`, `LHX` |

Benchmark and diagnostic symbols such as `SPY`, `QQQ`, `IWM`, `SOXX`, `XLU`, and `ITA` may be used for comparison or local smoke overrides, but they are not active default alpha targets.

## ETF Redundancy Rules

Use one ETF anchor per sleeve unless a future spec explicitly approves overlap handling.

- Semiconductor anchor: `SMH`. `SOXX` is benchmark/alternate only.
- Software/cyber anchors: `IGV` and `CIBR`. `WCLD`, `SKYY`, and similar cloud baskets are excluded from active trading.
- Power/electrification anchor: `GRID`. `XLU` is defensive utility beta, not default aggressive exposure. `DRIV`, `ICLN`, `TAN`, and `LIT` dilute the intended signal.
- Space/aerospace anchors: `XAR` and `UFO`. `ITA` is benchmark only; `NASA` is forward-only; `PPA`, `ROKT`, and `ARKX` are excluded as redundant or less pure.

## Forward And Tactical Profiles

`forward_nasa` adds `NASA` only from 2026-03-31 onward. It must not be used for pre-inception historical backtests.

`tactical_leverage_disabled` adds `SOXL` only when `V1_ALLOW_LEVERAGED_ETF=true` and `allow-leveraged-etf=true` reach LEAN. This remains research-only and must not be interpreted as live-money approval.

## Portfolio And Risk Policy

The manifest supplies symbol caps, sleeve caps, ETF flags, and blocked symbols. LEAN must enforce these at runtime.

Default caps:

- gross exposure cap: 100%;
- ordinary single-name cap: 8%;
- high-volatility capped names: 5-6%;
- ETF anchor cap: up to 25%;
- semiconductor sleeve cap: 35%;
- software/cyber sleeve cap: 30%;
- power/electrification sleeve cap: 30%;
- space/aerospace sleeve cap: 12%.

Portfolio construction must explicitly create zero targets for old holdings that drop out of top-k. Risk management must cut blocked symbols to zero even if an upstream bug emits a target.

## Evidence Collection

Universe selection must produce `universe-selection-report.json` for LEAN/simulator runs. The report must include profile, active symbols, benchmark symbols, watchlist symbols, hard exclusions, caps, sleeve mapping, and the manifest path/hash context available at runtime.

Market data, news, filings, and macro collection should be mapped from the active and watchlist symbols. Watchlist evidence can train future decisions, but watchlist symbols must not create portfolio targets.

Before a full local LEAN run, the active profile plus required benchmark symbol must pass local data coverage: daily zip, map file, factor file, and enough ingested bars to repair missing local files. `prepare-lean-local-data` is the canonical check. If Stooq requires `STOOQ_API_KEY` or QuantConnect requires Security Master/map-factor entitlement, the run is blocked rather than silently shrinking the universe.

Cost posture: the full quality-gated universe should run in QuantConnect Cloud first. Local QuantConnect `--download-data` is a paid/QCC path and must stay disabled unless the user explicitly approves local data cost.

## Tax Context

For a Korea-based operator trading U.S. listed securities, reports should track realized-gain estimates, dividends, foreign withholding notes, and turnover. The system must not claim tax advice. It records research evidence for later review.

## References

- QuantConnect US equities: https://www.quantconnect.com/docs/v2/cloud-platform/datasets/quantconnect/us-equities
- QuantConnect ETF constituents: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/quantconnect/us-etf-constituents
- Stooq historical database: https://stooq.com/db/h/
- Stooq CSV API key flow example: https://stooq.com/q/d/?s=smh.us&get_apikey
- VanEck SMH: https://www.vaneck.com/us/en/investments/semiconductor-etf-smh/
- iShares SOXX: https://www.ishares.com/us/products/239705/ishares-phlx-semiconductor-etf
- Direxion SOXL/SOXS: https://www.direxion.com/product/daily-semiconductor-bull-bear-3x-etfs
- iShares IGV: https://www.blackrock.com/us/individual/products/239771/ishares-expanded-tech-software-sector-etf
- First Trust CIBR: https://www.ftportfolios.com/retail/etf/EtfSummary.aspx?Ticker=CIBR
- First Trust GRID: https://www.ftportfolios.com/Retail/Etf/EtfSummary.aspx?Ticker=GRID
- State Street XLU: https://www.ssga.com/us/en/etfs/the-utilities-select-sector-spdr-fund-xlu
- State Street XAR: https://www.ssga.com/us/en/etfs/spdr-sp-aerospace-defense-etf-xar
- Tema NASA: https://temaetfs.com/nasa
- Korea National Tax Service foreign stock tax guide: https://s.nts.go.kr/nts/cm/cntnts/cntntsView.do?cntntsId=8800&mi=12274
- U.S.-Korea income tax treaty: https://www.irs.gov/pub/irs-trty/korea.pdf
