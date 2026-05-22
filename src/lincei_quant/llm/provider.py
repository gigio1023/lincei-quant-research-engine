from __future__ import annotations

from typing import Protocol

from lincei_quant.models import EventExtraction, NewsItem


class EventExtractor(Protocol):
    """Runtime boundary for LLM-backed event extraction providers."""

    def extract(self, item: NewsItem) -> EventExtraction:
        """Return a validated event extraction for a timestamped news item."""


class DisabledExtractor:
    """Default extractor that prevents accidental network or model calls."""

    def extract(self, item: NewsItem) -> EventExtraction:
        raise RuntimeError(f"no LLM provider configured for source_id={item.source_id}")
