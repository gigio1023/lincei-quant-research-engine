from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from lincei_quant.models import EventExtraction, NewsItem


def test_news_ingestion_must_not_precede_publication() -> None:
    published = datetime(2026, 1, 1, tzinfo=UTC)
    with pytest.raises(ValueError):
        NewsItem(
            source_id="2026-01-01-test",
            source_name="unit",
            published_at_utc=published,
            ingested_at_utc=published - timedelta(seconds=1),
            headline="test",
        )


def test_event_extraction_defaults_to_not_trading() -> None:
    event = EventExtraction(
        source_id="2026-01-01-test",
        headline="Company reports mixed guidance",
        bull_case="Revenue resilience could support the long-term thesis.",
        bear_case="Margin pressure may dominate the near-term reaction.",
        neutral_interpretation="The event needs validation against price and expectations.",
        reason_not_to_trade_immediately="LLM extraction is not a validated signal.",
    )
    assert event.should_affect_trading_signal is False
