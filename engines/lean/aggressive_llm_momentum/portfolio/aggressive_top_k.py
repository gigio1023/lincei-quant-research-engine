"""Aggressive top-k portfolio construction with volatility targeting."""

from __future__ import annotations

from typing import TYPE_CHECKING

from AlgorithmImports import *

from shared.history_frame import history_frame

if TYPE_CHECKING:
    from export.artifact_exporter import LinceiArtifactExporter


class AggressiveTopKPortfolioConstructionModel(PortfolioConstructionModel):
    """Concentrated top-k portfolio with single-name and gross exposure caps."""

    def __init__(
        self,
        top_k: int = 2,
        max_single_name_pct: float = 0.35,
        vol_target_annual: float = 0.15,
        artifact_exporter: LinceiArtifactExporter | None = None,
    ) -> None:
        self._top_k = max(1, top_k)
        self._max_single_name_pct = max_single_name_pct
        self._vol_target_annual = vol_target_annual
        self._artifact_exporter = artifact_exporter
        self._last_insight_ids: dict[str, list[str]] = {}

    def CreateTargets(
        self,
        algorithm: QCAlgorithm,
        insights: list[Insight],
    ) -> list[PortfolioTarget]:
        actionable = [
            insight
            for insight in insights
            if insight.Direction != InsightDirection.Flat
        ]
        if not actionable:
            if self._artifact_exporter is not None:
                self._artifact_exporter.record_portfolio_targets([], 0.0, 0.0, [])
            return []

        ranked = sorted(
            actionable,
            key=lambda insight: (insight.Magnitude or 0.0) * (insight.Confidence or 0.0),
            reverse=True,
        )[: self._top_k]

        raw_weights = [max(0.0, (insight.Magnitude or 0.0) + 0.5) for insight in ranked]
        weight_sum = sum(raw_weights) or 1.0
        normalized = [weight / weight_sum for weight in raw_weights]
        vol_scalar = self._volatility_scalar(algorithm, [insight.Symbol for insight in ranked])
        scaled = [min(self._max_single_name_pct, weight * vol_scalar) for weight in normalized]

        gross = sum(scaled)
        if gross > 1.0:
            scaled = [weight / gross for weight in scaled]
            gross = 1.0

        targets: list[PortfolioTarget] = []
        export_rows: list[dict] = []
        max_single = 0.0
        for insight, weight in zip(ranked, scaled):
            max_single = max(max_single, weight)
            target = PortfolioTarget.Percent(algorithm, insight.Symbol, weight)
            targets.append(target)
            insight_id = f"{insight.Symbol.Value}-{insight.GeneratedTimeUtc:%Y%m%d}"
            self._last_insight_ids[str(insight.Symbol.Value)] = [insight_id]
            export_rows.append(
                {
                    "symbol": str(insight.Symbol.Value),
                    "targetWeight": round(weight, 6),
                    "sourceInsightIds": [insight_id],
                    "riskAdjusted": vol_scalar < 1.0,
                    "riskNotes": [] if vol_scalar >= 1.0 else ["vol_target_scalar_applied"],
                },
            )

        if self._artifact_exporter is not None:
            self._artifact_exporter.record_portfolio_targets(
                export_rows,
                gross,
                max_single,
                [],
            )

        return targets

    def _volatility_scalar(
        self,
        algorithm: QCAlgorithm,
        symbols: list[Symbol],
    ) -> float:
        if not symbols:
            return 1.0

        volatilities: list[float] = []
        for symbol in symbols:
            history = history_frame(algorithm, symbol, 25, Resolution.Daily)
            if history is None:
                continue
            daily_returns = history["close"].astype(float).pct_change().dropna()
            if daily_returns.empty:
                continue
            volatilities.append(float(daily_returns.std() * (252 ** 0.5)))

        if not volatilities:
            return 1.0

        portfolio_vol = sum(volatilities) / len(volatilities)
        if portfolio_vol <= 0:
            return 1.0
        return min(1.0, self._vol_target_annual / portfolio_vol)
