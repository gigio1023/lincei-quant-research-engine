from __future__ import annotations

from collections import defaultdict
from datetime import date

from lincei_quant.models import EventExtraction


def validate_event_payload(payload: dict) -> EventExtraction:
    """Validate a raw LLM extraction payload before it can enter feature storage."""
    return EventExtraction.model_validate(payload)


def aggregate_materiality_by_ticker(events: list[EventExtraction]) -> dict[tuple[str, date], float]:
    """Aggregate event materiality by ticker and UTC date."""
    totals: dict[tuple[str, date], float] = defaultdict(float)
    for event in events:
        event_date = _event_date(event)
        for ticker in event.primary_tickers:
            totals[(ticker, event_date)] += event.materiality_score
    return dict(totals)


def _event_date(event: EventExtraction) -> date:
    if event.ingested_at_utc:
        return event.ingested_at_utc.date()
    return _source_date(event.source_id)


def _source_date(source_id: str) -> date:
    # Source IDs should start with YYYY-MM-DD in this scaffold.
    return date.fromisoformat(source_id[:10])
