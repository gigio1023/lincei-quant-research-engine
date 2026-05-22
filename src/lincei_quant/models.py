from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, model_validator

Score = Annotated[float, Field(ge=0.0, le=1.0)]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", use_enum_values=True)


class EventType(StrEnum):
    earnings = "earnings"
    guidance = "guidance"
    product = "product"
    regulation = "regulation"
    litigation = "litigation"
    macro = "macro"
    mna = "mna"
    analyst_action = "analyst_action"
    supply_chain = "supply_chain"
    other = "other"


class Direction(StrEnum):
    positive = "positive"
    negative = "negative"
    mixed = "mixed"
    neutral = "neutral"
    unknown = "unknown"


class NewsItem(StrictModel):
    source_id: str
    source_name: str
    published_at_utc: datetime
    ingested_at_utc: datetime
    headline: str = Field(min_length=1)
    body: str | None = None
    url: str | None = None

    @model_validator(mode="after")
    def ingestion_cannot_precede_publication(self) -> NewsItem:
        if self.ingested_at_utc < self.published_at_utc:
            raise ValueError("ingested_at_utc must be >= published_at_utc")
        return self


class EntityMention(StrictModel):
    name: str
    ticker: str | None = None
    entity_type: str = "company"
    confidence: Score = 0.0


class EventExtraction(StrictModel):
    schema_version: str = "1.0"
    source_id: str
    published_at_utc: datetime | None = None
    ingested_at_utc: datetime | None = None
    headline: str
    mentioned_entities: list[EntityMention] = Field(default_factory=list)
    primary_tickers: list[str] = Field(default_factory=list)
    event_type: EventType = EventType.other
    event_direction: Direction = Direction.unknown
    materiality_score: Score = 0.0
    novelty_score: Score = 0.0
    source_quality_score: Score = 0.0
    confidence_score: Score = 0.0
    expected_horizon: str = "unknown"
    bull_case: str
    bear_case: str
    neutral_interpretation: str
    key_uncertainties: list[str] = Field(default_factory=list)
    should_affect_trading_signal: bool = False
    reason_not_to_trade_immediately: str


class PerformanceMetrics(StrictModel):
    cagr: float
    annualized_volatility: float
    sharpe: float
    max_drawdown: float
    turnover: float = 0.0
    trade_count: int = 0


class BacktestResult(StrictModel):
    strategy_name: str
    benchmark: str
    start: datetime
    end: datetime
    metrics: PerformanceMetrics
    limitations: list[str] = Field(default_factory=list)
    classification: str = "not_live_ready"
