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
- company investor-relations feeds;
- press-release feeds;
- earnings-call transcripts;
- central-bank and macro release pages;
- Treasury, FRED, BLS, EIA, and similar public macro sources;
- paid news APIs if a specific edge justifies the cost.

Direct raw data must be stored with source URL, retrieval time, event time, availability time, content hash, and parser version.

## Point-In-Time Rules

Every market-moving input needs separate timestamps:

- `eventTime`: when the event occurred;
- `publishedAt`: when the source says it was published;
- `retrievedAt`: when our system fetched it;
- `availableAt`: earliest time the strategy is allowed to use it;
- `processedAt`: when our feature pipeline produced the structured record.

Backtests and replay must key eligibility on `availableAt`, not on file write time or event date.

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

The feature store may start as files plus database records. It should preserve enough metadata to replay an alpha decision without re-calling external APIs.

## LEAN Consumption

LEAN should consume structured feature records through one of these paths:

- custom data subscription for timestamped feature files;
- Object Store artifact read for parameter/model/feature manifests;
- local files during deterministic smoke tests.

Raw articles, filings, or transcripts should usually be processed outside LEAN. LEAN consumes the typed features and evidence refs, not full text dumps.

## References

- Tiingo News Feed: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/tiingo/tiingo-news-feed
- Benzinga News Feed: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/benzinga/benzinga-news-feed
- US SEC Filings: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/securities-and-exchange-commission/us-sec-filings
- EODHD Economic Events: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/eod-historical-data/economic-events
- EODHD Upcoming Earnings: https://www.quantconnect.com/docs/v2/writing-algorithms/datasets/eod-historical-data/upcoming-earnings
- QuantConnect alternative data overview: https://www.quantconnect.com/docs/v2/cloud-platform/datasets/quantconnect/alternative-data
- Custom data history: https://www.quantconnect.com/docs/v2/writing-algorithms/historical-data/custom-data
- Importing data key concepts: https://www.quantconnect.com/docs/v2/writing-algorithms/importing-data/key-concepts
