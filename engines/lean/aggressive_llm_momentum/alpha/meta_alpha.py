"""Meta alpha: numeric score + precomputed LLM semantic-alpha features.

The static JSON overlay is replay evidence only; it is not historical LLM validation.
Conflict handling reduces conviction when numeric and LLM-derived signals disagree.
"""

import json
import os
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from AlgorithmImports import *

from alpha.meta_alpha_combiner import (
    UP_THRESHOLD,
    resolve_component_scores,
)
from alpha.numeric_alpha import LinceiNumericAlphaModel
from alpha.semantic_features import (
    load_semantic_feature_records,
    semantic_record_for_time,
)
from shared.history_frame import insight_direction_label

if TYPE_CHECKING:
    from export.artifact_exporter import LinceiArtifactExporter


class LinceiMetaAlphaModel(AlphaModel):
    """Combines numeric alpha with precomputed LLM/meta decisions from JSON."""

    NUMERIC_WEIGHT = 0.50
    EVENT_WEIGHT = 0.25
    MACRO_WEIGHT = 0.15
    RISK_WEIGHT = 0.10
    UP_THRESHOLD = UP_THRESHOLD
    FLAT_THRESHOLD = 0.35
    INSIGHT_PERIOD = 21

    def __init__(
        self,
        algorithm: QCAlgorithm,
        meta_decisions_path: str | None = None,
        artifact_exporter: "LinceiArtifactExporter | None" = None,
        *,
        use_ml_predictions: bool = True,
    ) -> None:
        self._algorithm = algorithm
        self._numeric = LinceiNumericAlphaModel(
            artifact_exporter=artifact_exporter,
            use_ml_predictions=use_ml_predictions,
        )
        self._artifact_exporter = artifact_exporter
        self._meta_by_symbol = self._load_meta_decisions(
            meta_decisions_path or self._default_meta_path(algorithm),
        )
        semantic_features_path = (
            algorithm.GetParameter("llm-event-features-path")
            or "input/llm_event_features.json"
        )
        self._semantic_features_by_symbol = load_semantic_feature_records(
            semantic_features_path,
        )
        self._last_final_scores: dict[str, float] = {}
        self._last_component_scores: dict[str, dict[str, float]] = {}

    def Update(
        self,
        algorithm: QCAlgorithm,
        data: Slice,
    ) -> list[Insight]:
        numeric_insights = self._numeric.Update(algorithm, data)
        numeric_by_symbol = {insight.Symbol: insight for insight in numeric_insights}
        insights: list[Insight] = []

        for symbol in algorithm.ActiveSecurities.Keys:
            if symbol not in data.Bars or data.Bars[symbol] is None:
                continue

            symbol_value = str(symbol.Value)
            numeric_score = self._numeric.get_last_score(symbol_value)
            if numeric_score is None:
                continue

            meta_record = (
                semantic_record_for_time(
                    self._semantic_features_by_symbol,
                    symbol_value,
                    algorithm.UtcTime,
                )
                or self._meta_record_for_time(symbol_value, algorithm.UtcTime)
            )
            final_score, conflict_notes, component_scores = self._combine_scores(
                numeric_score,
                meta_record,
            )
            self._last_final_scores[symbol_value] = final_score
            self._last_component_scores[symbol_value] = component_scores
            direction = self._direction_from_score(final_score)
            if direction == InsightDirection.Flat:
                continue

            confidence = min(1.0, max(0.0, abs(final_score - 0.5) * 2.0))
            if meta_record is not None and meta_record.get("confidence") is not None:
                confidence = min(confidence, float(meta_record["confidence"]))

            magnitude = final_score - 0.5
            if numeric_by_symbol.get(symbol) is not None:
                magnitude = max(magnitude, numeric_by_symbol[symbol].Magnitude or 0.0)

            insight = Insight.Price(
                symbol,
                timedelta(days=self.INSIGHT_PERIOD),
                direction,
                magnitude=magnitude,
                confidence=confidence,
                sourceModel="LinceiMetaAlphaModel",
            )
            insights.append(insight)

            if self._artifact_exporter is not None:
                self._artifact_exporter.record_meta_insight(
                    symbol_value,
                    final_score,
                    insight_direction_label(direction),
                    confidence,
                    conflict_notes,
                    meta_record,
                    component_scores,
                )

        return insights

    def get_last_final_score(self, symbol: str) -> float | None:
        return self._last_final_scores.get(symbol)

    def get_last_component_scores(self, symbol: str) -> dict[str, float] | None:
        return self._last_component_scores.get(symbol)

    def _default_meta_path(self, algorithm: QCAlgorithm) -> str:
        configured = algorithm.GetParameter("meta-decisions-path")
        if configured:
            return configured
        return os.path.join(algorithm.ObjectStore.root_directory or ".", "input/meta_decisions.json")

    def _load_meta_decisions(self, path: str) -> dict[str, dict[str, Any]]:
        candidates = [path]
        if not os.path.isabs(path):
            candidates.extend(
                [
                    os.path.join(os.getcwd(), path),
                    os.path.join(os.path.dirname(__file__), "..", path),
                ],
            )

        for candidate in candidates:
            normalized = os.path.normpath(candidate)
            if not os.path.exists(normalized):
                continue
            try:
                with open(normalized, encoding="utf-8") as handle:
                    payload = json.load(handle)
            except (OSError, json.JSONDecodeError) as error:
                algorithm_log = getattr(self._algorithm, "Debug", None)
                if algorithm_log is not None:
                    algorithm_log(f"Meta decisions load failed for {normalized}: {error}")
                continue

            decisions = payload.get("decisions", payload if isinstance(payload, list) else [])
            indexed: dict[str, dict[str, Any]] = {}
            for decision in decisions:
                symbol = str(decision.get("symbol", "")).upper()
                if symbol:
                    indexed[symbol] = decision
            return indexed

        return {}

    def _meta_record_for_time(
        self,
        symbol: str,
        algorithm_time: object,
    ) -> dict[str, Any] | None:
        record = self._meta_by_symbol.get(symbol.upper())
        if record is None:
            return None
        available_at = record.get("availableAt")
        if available_at is None:
            return None
        try:
            available = datetime.fromisoformat(str(available_at).replace("Z", "+00:00"))
            current = self._to_utc_datetime(algorithm_time)
        except ValueError:
            return None
        return record if available <= current else None

    def _combine_scores(
        self,
        numeric_score: float,
        meta_record: dict[str, Any] | None,
    ) -> tuple[float, list[str], dict[str, float]]:
        conflict_notes: list[str] = []
        component_scores = resolve_component_scores(numeric_score, meta_record)
        final_score = component_scores["finalScore"]

        if meta_record is None:
            return final_score, conflict_notes, component_scores

        numeric_used = component_scores["numericScore"]
        direction = str(meta_record.get("direction", "flat")).lower()
        risk_adjustment = component_scores["riskAdjustment"]

        numeric_up = numeric_used >= self.UP_THRESHOLD
        numeric_flat = numeric_used <= self.FLAT_THRESHOLD
        llm_up = direction == "up"
        llm_flat = direction == "flat"

        if numeric_up and llm_flat:
            final_score = min(final_score, 0.5)
            conflict_notes.append("numeric_up_llm_flat_reduce_exposure")
        if numeric_flat and llm_up:
            final_score = min(final_score, 0.55)
            conflict_notes.append("numeric_flat_llm_up_paper_only")
        if risk_adjustment >= 0.8:
            final_score = min(final_score, 0.52)
            conflict_notes.append("risk_reviewer_high_risk_cap")

        component_scores["finalScore"] = round(final_score, 6)
        return final_score, conflict_notes, component_scores

    def _direction_from_score(self, score: float) -> InsightDirection:
        if score >= self.UP_THRESHOLD:
            return InsightDirection.Up
        return InsightDirection.Flat

    @staticmethod
    def _to_utc_datetime(value: object) -> datetime:
        if isinstance(value, datetime):
            parsed = value
        else:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
