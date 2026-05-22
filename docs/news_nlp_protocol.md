# News and NLP Protocol

News/NLP is a first-class component from the beginning, but it is not a direct trading trigger.

## Pipeline

1. Ingest timestamped news, filings, transcripts, or macro text.
2. Preserve source, publication time, ingestion time, URL or source ID, and raw text where permitted.
3. Normalize timestamps to UTC.
4. Map entities to tickers.
5. Extract strict JSON with Pydantic validation.
6. Aggregate event materiality by ticker and date.
7. Validate whether features improve baselines out of sample.

## LLM Extraction Requirements

- Event type.
- Affected tickers.
- Direction.
- Materiality, novelty, source quality, and confidence scores.
- Bull, bear, and neutral interpretations.
- Key uncertainties.
- Reason not to trade immediately.

Default value for `should_affect_trading_signal` is false.
