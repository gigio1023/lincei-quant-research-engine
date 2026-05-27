# Data Sources And Feature Store

Status: active normative spec.

## Data Strategy

Use a hybrid data approach:

```text
QuantConnect native datasets -> parity with LEAN backtest/paper/live-shadow
direct external ingestion -> broader text coverage and semantic edge
LLM feature engine -> point-in-time natural-language features
LEAN -> consumes typed features and emits Insights
```

QuantConnect datasets give backtest/live parity. Direct ingestion gives flexibility for sources that are missing, delayed, expensive, or better processed outside LEAN.

## QuantConnect-Native Sources

Use QuantConnect-native data when it gives reliable backtest/live parity:

- market bars and fundamentals;
- Tiingo or Benzinga news where licensed;
- US SEC filings;
- EODHD economic events and earnings calendars where licensed;
- FRED, Treasury, BLS, and other macro datasets where available;
- custom data imported into LEAN for project-specific features.

Dataset availability and costs can change, so implementation work must verify current vendor terms before depending on a paid feed.

## Direct External Sources

Direct ingestion can include:

- SEC EDGAR;
- Hugging Face research datasets when licensing and point-in-time fields are usable;
- company investor-relations feeds;
- press-release feeds;
- earnings-call transcripts;
- central-bank and macro release pages;
- Treasury, FRED, BLS, EIA, and similar public macro sources;
- paid news APIs if a specific edge justifies the cost.

Direct raw data must be stored with source URL, retrieval time, event time, availability time, content hash, and parser version.

The active collection map starts from the quality-gated universe manifest. Active and watchlist symbols can collect raw evidence, but only active profile symbols can become portfolio targets. This prevents watchlist research or excluded turnaround ideas from leaking into execution.

Strategy research articles, practitioner notes, and academic summaries are allowed as direct external sources only as hypothesis inputs. They must be stored with source URL, publisher, title, author when available, publication time, retrieval time, content hash, parser version, and an extracted hypothesis. They must not be treated as executable alpha until the hypothesis has been converted into features and validated.

Initial approved Hugging Face usage is semantic evidence, not price data replacement:

- `vtasca/fomc-statements-minutes` may feed macro `RawEvidenceRecord` rows for FOMC statements/minutes.
- Earnings-call, SEC-index, and financial-news datasets may be added only when the ingest preserves `eventTime`, `publishedAt` or equivalent, `retrievedAt`, `availableAt`, source URL, parser version, and source hash.
- Hugging Face stock-price datasets are research-only unless they provide enough adjusted OHLCV, corporate-action, ETF, and universe coverage to match the intended LEAN validation path.

## Point-In-Time Rules

Every market-moving input needs separate timestamps:

- `eventTime`: when the event occurred;
- `publishedAt`: when the source says it was published;
- `retrievedAt`: when our system fetched it;
- `availableAt`: earliest time the strategy is allowed to use it;
- `processedAt`: when our feature pipeline produced the structured record.

Backtests and replay must key eligibility on `availableAt`, not on file write time or event date.

## Vintage Data Rules

Some sources revise history after the first release: macro series, fundamentals, estimates, index constituents, earnings calendars, filing corrections, and even edited articles. For those sources, the feature store must preserve vintage data rather than overwriting records in place.

Required behavior:

- store every retrieved version with `retrievedAt`, `availableAt`, source hash, parser version, and prior-version reference when known;
- mark whether a feature came from originally available data, later-restated data, or a mixed source;
- block promotion when a backtest depends on a source whose original availability cannot be reconstructed;
- keep LLM semantic features tied to the text version the model actually saw.

This is not optional bookkeeping. Without vintage data, a strategy can look profitable because the backtest used information that did not exist at decision time.

## Feature Store Requirements

Feature records must include:

- symbol or asset identifier;
- feature type;
- `asOf` and `availableAt`;
- source refs;
- source hash;
- parser or prompt version;
- model version if generated;
- confidence or quality score where applicable;
- blocker or abstain reason where applicable.
- vintage status where the source can be restated or corrected.

## Parallel Feature Generation

Feature generation should be parallelized by source, symbol, asset id, time window, feature family, and hypothesis id when the job does not mutate shared account state.

Parallel feature jobs must record:

- job id and run id;
- partition key;
- input refs and input hash;
- output refs and output hash;
- feature version or model version;
- cost ref when an external API or LLM was used;
- blocker reasons.

The feature store must support idempotent writes. Retrying a job with the same partition key and input hash must not create duplicate features. Unknown idempotency state blocks promotion.

The feature store may start as files plus database records. It should preserve enough metadata to replay an alpha decision without re-calling external APIs.

## LEAN Consumption

LEAN should consume structured feature records through one of these paths:

- custom data subscription for timestamped feature files;
- Object Store artifact read for parameter/model/feature manifests;
- local files during deterministic smoke tests.

Raw articles, filings, or transcripts should usually be processed outside LEAN. LEAN consumes the typed features and evidence refs, not full text dumps.

## Local Market Data Preparation

Local LEAN daily data is a first-class debugging path, but it is not promotion evidence by itself and must not become the default full-universe validation path when it requires paid QuantConnect downloads. The required local data contract is:

- LEAN daily zip under `engines/lean/data/equity/usa/daily/<symbol>.zip`;
- matching map file under `engines/lean/data/equity/usa/map_files/<symbol>.csv`;
- matching factor file under `engines/lean/data/equity/usa/factor_files/<symbol>.csv`;
- at least two point-in-time daily bars in `market_data_bars` before exporting a missing local file.

`./scripts/prepare-lean-local-data` is the canonical preflight for this path. It must report `ready`, `exportable`, and `missing` symbols rather than letting a full LEAN run fail later with an opaque data error.

Stooq CSV ingestion is allowed for local research data preparation when `STOOQ_API_KEY` is configured. The key is obtained through Stooq's interactive `get_apikey` page, so the agent must not try to bypass the captcha flow. If Stooq is unavailable or the key is absent, the data state is blocked unless local data already exists or QuantConnect Cloud validation is available.

QuantConnect local `--download-data` can spend QCC and is disabled by default. It requires explicit user approval plus `ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true`. Prefer Cloud backtests for full quality universe validation so hosted QuantConnect datasets are used without local download charges where the cloud license permits it.

## References

- Tiingo News Feed: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/tiingo/tiingo-news-feed
- Benzinga News Feed: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/benzinga/benzinga-news-feed
- US SEC Filings: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/securities-and-exchange-commission/us-sec-filings
- EODHD Economic Events: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/eod-historical-data/economic-events
- EODHD Upcoming Earnings: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/eod-historical-data/upcoming-earnings
- QuantConnect alternative data overview: https://www.quantconnect.com/docs/v2/cloud-platform/datasets/quantconnect/alternative-data
- Custom data history: https://www.quantconnect.com/docs/v2/writing-algorithms/historical-data/custom-data
- Importing data key concepts: https://www.quantconnect.com/docs/v2/writing-algorithms/importing-data/key-concepts
- Stooq historical database: https://stooq.com/db/h/
- Stooq CSV API key flow example: https://stooq.com/q/d/?s=smh.us&get_apikey
- Hugging Face FOMC statements/minutes dataset: https://huggingface.co/datasets/vtasca/fomc-statements-minutes
- Quality-gated universe manifest: ../../config/universes/quality-gated-v2.json
