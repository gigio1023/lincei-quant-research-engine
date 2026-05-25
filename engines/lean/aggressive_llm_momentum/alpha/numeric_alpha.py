"""
Numeric alpha for LEAN backtests.

Prefers NestJS-exported LightGBM scores (ml_predictions.json). Falls back to
in-algorithm rank features only when that file is missing (degraded replay).
"""

import json
import os
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from AlgorithmImports import *

from shared.history_frame import history_frame, insight_direction_label

if TYPE_CHECKING:
    from export.artifact_exporter import LinceiArtifactExporter


class LinceiNumericAlphaModel(AlphaModel):
    """Rank-based numeric alpha using momentum, trend, vol, drawdown, and liquidity."""

    LOOKBACK_LONG = 126
    LOOKBACK_MID = 63
    VOL_LOOKBACK = 20
    SMA_LOOKBACK = 200
    UP_THRESHOLD = 0.65
    FLAT_THRESHOLD = 0.35
    INSIGHT_PERIOD = 21

    def __init__(
        self,
        artifact_exporter: "LinceiArtifactExporter | None" = None,
        *,
        use_ml_predictions: bool = True,
    ) -> None:
        self._artifact_exporter = artifact_exporter
        self._use_ml_predictions = use_ml_predictions
        self._last_scores: dict[str, float] = {}

    def Update(
        self,
        algorithm: QCAlgorithm,
        data: Slice,
    ) -> list[Insight]:
        symbols = [
            symbol
            for symbol in algorithm.ActiveSecurities.Keys
            if data.Bars.ContainsKey(symbol) and data.Bars[symbol] is not None
        ]
        if not symbols:
            return []

        feature_rows: list[tuple[Symbol, dict[str, float]]] = []
        for symbol in symbols:
            features = self._compute_features(algorithm, symbol)
            if features is None:
                continue
            feature_rows.append((symbol, features))

        if not feature_rows:
            return []

        ranked_scores = self._score_universe(algorithm, feature_rows)
        insights: list[Insight] = []
        for symbol, score in ranked_scores.items():
            self._last_scores[str(symbol)] = score
            direction = self._direction_from_score(score)
            if direction == InsightDirection.Flat:
                continue
            confidence = min(1.0, max(0.0, abs(score - 0.5) * 2.0))
            insight = Insight.Price(
                symbol,
                timedelta(days=self.INSIGHT_PERIOD),
                direction,
                magnitude=score - 0.5,
                confidence=confidence,
                sourceModel="LinceiNumericAlphaModel",
            )
            insights.append(insight)
            if self._artifact_exporter is not None:
                self._artifact_exporter.record_numeric_score(
                    str(symbol.Value),
                    score,
                    insight_direction_label(direction),
                    confidence,
                )

        return insights

    def get_last_score(self, symbol: str) -> float | None:
        return self._last_scores.get(symbol)

    def _compute_features(
        self,
        algorithm: QCAlgorithm,
        symbol: Symbol,
    ) -> dict[str, float] | None:
        history = history_frame(algorithm, symbol, self.SMA_LOOKBACK + 5, Resolution.Daily)
        if history is None or len(history) < self.LOOKBACK_LONG + 1:
            return None

        closes = history["close"].astype(float)
        volumes = history["volume"].astype(float)
        latest_close = float(closes.iloc[-1])
        return_63d = self._period_return(closes, self.LOOKBACK_MID)
        return_126d = self._period_return(closes, self.LOOKBACK_LONG)
        sma_200 = float(closes.tail(self.SMA_LOOKBACK).mean())
        price_vs_sma_200d = (latest_close / sma_200) - 1.0 if sma_200 > 0 else 0.0
        realized_vol_20d = float(closes.pct_change().tail(self.VOL_LOOKBACK).std() * (252 ** 0.5))
        drawdown_63d = self._drawdown(closes.tail(self.LOOKBACK_MID + 1))
        dollar_volume_20d = float((closes.tail(self.VOL_LOOKBACK) * volumes.tail(self.VOL_LOOKBACK)).mean())

        return {
            "return_63d": return_63d,
            "return_126d": return_126d,
            "price_vs_sma_200d": price_vs_sma_200d,
            "realized_vol_20d": realized_vol_20d,
            "drawdown_63d": drawdown_63d,
            "dollar_volume_20d": dollar_volume_20d,
        }

    @staticmethod
    def _period_return(closes, periods: int) -> float:
        if len(closes) <= periods:
            return 0.0
        start = float(closes.iloc[-(periods + 1)])
        end = float(closes.iloc[-1])
        if start <= 0:
            return 0.0
        return (end / start) - 1.0

    @staticmethod
    def _drawdown(closes) -> float:
        rolling_max = closes.cummax()
        drawdowns = (closes / rolling_max) - 1.0
        return float(drawdowns.min())

    def _load_ml_scores(self, algorithm_time: object) -> dict[str, float]:
        if not self._use_ml_predictions:
            return {}
        path = os.path.join("input", "ml_predictions.json")
        if not os.path.exists(path):
            return {}
        with open(path, encoding="utf-8") as handle:
            payload = json.load(handle)
        current = self._to_utc_datetime(algorithm_time)
        return {
            item["symbol"]: float(item["score"])
            for item in payload.get("predictions", [])
            if "symbol" in item and "score" in item
            and self._prediction_available(item, current)
        }

    def _score_universe(
        self,
        algorithm: QCAlgorithm,
        feature_rows: list[tuple[Symbol, dict[str, float]]],
    ) -> dict[Symbol, float]:
        ml_scores = self._load_ml_scores(algorithm.UtcTime)
        if ml_scores:
            return {
                symbol: ml_scores.get(str(symbol.Value), 0.5)
                for symbol, _ in feature_rows
            }

        rank_inputs = {
            "return_63d": [row[1]["return_63d"] for row in feature_rows],
            "return_126d": [row[1]["return_126d"] for row in feature_rows],
        }
        rank_63 = self._percentile_ranks(rank_inputs["return_63d"])
        rank_126 = self._percentile_ranks(rank_inputs["return_126d"])

        scores: dict[Symbol, float] = {}
        for index, (symbol, features) in enumerate(feature_rows):
            trend_bonus = 0.1 if features["price_vs_sma_200d"] > 0 else 0.0
            vol_penalty = min(0.25, features["realized_vol_20d"] * 0.5)
            drawdown_penalty = min(0.25, abs(features["drawdown_63d"]) * 2.0)
            liquidity_penalty = 0.1 if features["dollar_volume_20d"] < 1_000_000 else 0.0
            raw_score = (
                rank_63[index]
                + rank_126[index]
                + trend_bonus
                - vol_penalty
                - drawdown_penalty
                - liquidity_penalty
            )
            scores[symbol] = max(0.0, min(1.0, raw_score / 2.2))
        return scores

    @staticmethod
    def _prediction_available(item: dict, current: datetime) -> bool:
        available_at = item.get("availableAt")
        if available_at is None:
            return False
        try:
            available = datetime.fromisoformat(str(available_at).replace("Z", "+00:00"))
        except ValueError:
            return False
        if available.tzinfo is None:
            available = available.replace(tzinfo=timezone.utc)
        else:
            available = available.astimezone(timezone.utc)
        return available <= current

    @staticmethod
    def _to_utc_datetime(value: object) -> datetime:
        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _percentile_ranks(values: list[float]) -> list[float]:
        if len(values) == 1:
            return [0.5]
        ordered = sorted((value, index) for index, value in enumerate(values))
        ranks = [0.0] * len(values)
        for rank_index, (_, original_index) in enumerate(ordered):
            ranks[original_index] = rank_index / max(1, len(values) - 1)
        return ranks

    def _direction_from_score(self, score: float) -> InsightDirection:
        if score >= self.UP_THRESHOLD:
            return InsightDirection.Up
        return InsightDirection.Flat
