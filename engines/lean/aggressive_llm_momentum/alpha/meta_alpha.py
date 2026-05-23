"""Meta alpha model combining numeric scores with external meta_decisions.json."""

from __future__ import annotations

import json
import os
from typing import TYPE_CHECKING, Any

from AlgorithmImports import *

from alpha.numeric_alpha import LinceiNumericAlphaModel

if TYPE_CHECKING:
    from export.artifact_exporter import LinceiArtifactExporter


class LinceiMetaAlphaModel(AlphaModel):
    """Combines numeric alpha with precomputed LLM/meta decisions from JSON."""

    NUMERIC_WEIGHT = 0.50
    EVENT_WEIGHT = 0.25
    MACRO_WEIGHT = 0.15
    RISK_WEIGHT = 0.10
    UP_THRESHOLD = 0.65
    FLAT_THRESHOLD = 0.35
    INSIGHT_PERIOD = 21

    def __init__(
        self,
        algorithm: QCAlgorithm,
        meta_decisions_path: str | None = None,
        artifact_exporter: LinceiArtifactExporter | None = None,
    ) -> None:
        self._algorithm = algorithm
        self._numeric = LinceiNumericAlphaModel(artifact_exporter=artifact_exporter)
        self._artifact_exporter = artifact_exporter
        self._meta_by_symbol = self._load_meta_decisions(
            meta_decisions_path or self._default_meta_path(algorithm),
        )
        self._last_final_scores: dict[str, float] = {}

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

            meta_record = self._meta_by_symbol.get(symbol_value.upper())
            final_score, conflict_notes = self._combine_scores(numeric_score, meta_record)
            self._last_final_scores[symbol_value] = final_score
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
                    direction.name.lower(),
                    confidence,
                    conflict_notes,
                    meta_record,
                )

        return insights

    def get_last_final_score(self, symbol: str) -> float | None:
        return self._last_final_scores.get(symbol)

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

    def _combine_scores(
        self,
        numeric_score: float,
        meta_record: dict[str, Any] | None,
    ) -> tuple[float, list[str]]:
        conflict_notes: list[str] = []
        if meta_record is None:
            return numeric_score, conflict_notes

        llm_scores = meta_record.get("llmScores") or {}
        direction = str(meta_record.get("direction", "flat")).lower()
        llm_direction_score = 0.5
        if direction == "up":
            llm_direction_score = 0.75
        elif direction == "down":
            llm_direction_score = 0.25

        event_score = float(llm_scores.get("event", llm_direction_score))
        macro_score = float(llm_scores.get("macro", llm_direction_score))
        risk_adjustment = float(llm_scores.get("riskAdjustment", 0.5))

        final_score = (
            self.NUMERIC_WEIGHT * numeric_score
            + self.EVENT_WEIGHT * event_score
            + self.MACRO_WEIGHT * macro_score
            + self.RISK_WEIGHT * risk_adjustment
        )
        final_score = max(0.0, min(1.0, final_score))

        numeric_up = numeric_score >= self.UP_THRESHOLD
        numeric_flat = numeric_score <= self.FLAT_THRESHOLD
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

        return final_score, conflict_notes

    def _direction_from_score(self, score: float) -> InsightDirection:
        if score >= self.UP_THRESHOLD:
            return InsightDirection.Up
        return InsightDirection.Flat
