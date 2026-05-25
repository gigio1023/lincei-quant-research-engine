"""Aggressive top-k portfolio construction with volatility targeting."""

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
        max_single_name_pct: float = 0.08,
        vol_target_annual: float = 0.15,
        max_gross_exposure_pct: float = 1.0,
        symbol_caps: dict[str, float] | None = None,
        sleeve_by_symbol: dict[str, str] | None = None,
        sleeve_caps: dict[str, float] | None = None,
        etf_symbols: set[str] | None = None,
        artifact_exporter: "LinceiArtifactExporter | None" = None,
    ) -> None:
        self._top_k = max(1, top_k)
        self._max_single_name_pct = max_single_name_pct
        self._vol_target_annual = vol_target_annual
        self._max_gross_exposure_pct = max_gross_exposure_pct
        self._symbol_caps = symbol_caps or {}
        self._sleeve_by_symbol = sleeve_by_symbol or {}
        self._sleeve_caps = sleeve_caps or {}
        self._etf_symbols = etf_symbols or set()
        self._artifact_exporter = artifact_exporter
        self._last_insight_ids: dict[str, list[str]] = {}
        self._last_target_symbols: set[str] = set()

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
            targets = self._liquidation_targets(algorithm, set())
            if self._artifact_exporter is not None:
                self._artifact_exporter.record_portfolio_targets(
                    self._export_rows_for_targets(
                        algorithm,
                        targets,
                        1.0,
                        ["no_actionable_insights"],
                    ),
                    0.0,
                    0.0,
                    ["no_actionable_insights"],
                )
            self._last_target_symbols = set()
            return targets

        ranked = sorted(
            actionable,
            key=lambda insight: (insight.Magnitude or 0.0) * (insight.Confidence or 0.0),
            reverse=True,
        )[: self._top_k]

        raw_weights = [max(0.0, (insight.Magnitude or 0.0) + 0.5) for insight in ranked]
        weight_sum = sum(raw_weights) or 1.0
        normalized = [weight / weight_sum for weight in raw_weights]
        vol_scalar = self._volatility_scalar(algorithm, [insight.Symbol for insight in ranked])
        scaled = [
            min(self._symbol_cap(str(insight.Symbol.Value)), weight * vol_scalar)
            for insight, weight in zip(ranked, normalized)
        ]
        scaled = self._apply_sleeve_caps(ranked, scaled)

        gross = sum(scaled)
        if gross > self._max_gross_exposure_pct:
            scale = self._max_gross_exposure_pct / gross
            scaled = [weight * scale for weight in scaled]
            gross = self._max_gross_exposure_pct

        targets: list[PortfolioTarget] = []
        export_rows: list[dict] = []
        max_single = 0.0
        selected_symbols: set[str] = set()
        for insight, weight in zip(ranked, scaled):
            max_single = max(max_single, weight)
            target = PortfolioTarget.Percent(algorithm, insight.Symbol, weight)
            targets.append(target)
            selected_symbols.add(str(insight.Symbol.Value))
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

        liquidation_targets = self._liquidation_targets(algorithm, selected_symbols)
        targets.extend(liquidation_targets)
        export_rows.extend(
            self._export_rows_for_targets(
                algorithm,
                liquidation_targets,
                vol_scalar,
                ["dropped_from_top_k_liquidate"],
            ),
        )
        self._last_target_symbols = selected_symbols

        if self._artifact_exporter is not None:
            self._artifact_exporter.record_portfolio_targets(
                export_rows,
                gross,
                max_single,
                [],
            )

        return targets

    def _symbol_cap(self, symbol: str) -> float:
        cap = self._symbol_caps.get(symbol, self._max_single_name_pct)
        if symbol in self._etf_symbols:
            return cap
        return min(cap, self._max_single_name_pct)

    def _apply_sleeve_caps(
        self,
        insights: list[Insight],
        weights: list[float],
    ) -> list[float]:
        by_sleeve: dict[str, float] = {}
        for insight, weight in zip(insights, weights):
            sleeve = self._sleeve_by_symbol.get(str(insight.Symbol.Value), "unclassified")
            by_sleeve[sleeve] = by_sleeve.get(sleeve, 0.0) + abs(weight)

        scaled = list(weights)
        for index, insight in enumerate(insights):
            symbol = str(insight.Symbol.Value)
            sleeve = self._sleeve_by_symbol.get(symbol, "unclassified")
            cap = self._sleeve_caps.get(sleeve)
            sleeve_total = by_sleeve.get(sleeve, 0.0)
            if cap is not None and sleeve_total > cap > 0:
                scaled[index] = scaled[index] * (cap / sleeve_total)
        return scaled

    def _liquidation_targets(
        self,
        algorithm: QCAlgorithm,
        selected_symbols: set[str],
    ) -> list[PortfolioTarget]:
        symbols_to_clear = set(self._last_target_symbols)
        for security in algorithm.ActiveSecurities.Values:
            if self._is_invested(security):
                symbols_to_clear.add(str(security.Symbol.Value))
        return [
            PortfolioTarget.Percent(algorithm, security.Symbol, 0.0)
            for security in algorithm.ActiveSecurities.Values
            if str(security.Symbol.Value) in symbols_to_clear
            and str(security.Symbol.Value) not in selected_symbols
        ]

    def _export_rows_for_targets(
        self,
        algorithm: QCAlgorithm,
        targets: list[PortfolioTarget],
        vol_scalar: float,
        risk_notes: list[str],
    ) -> list[dict]:
        return [
            {
                "symbol": str(target.Symbol.Value),
                "targetWeight": round(self._target_percent(algorithm, target), 6),
                "sourceInsightIds": self._last_insight_ids.get(str(target.Symbol.Value), []),
                "riskAdjusted": True,
                "riskNotes": risk_notes if vol_scalar >= 1.0 else risk_notes + ["vol_target_scalar_applied"],
            }
            for target in targets
        ]

    @staticmethod
    def _is_invested(security: Security) -> bool:
        holdings = getattr(security, "Holdings", None)
        return bool(getattr(security, "Invested", False) or getattr(holdings, "Invested", False))

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

    @staticmethod
    def _target_percent(algorithm: QCAlgorithm, target: PortfolioTarget) -> float:
        total_value = float(algorithm.Portfolio.TotalPortfolioValue)
        if total_value <= 0:
            return 0.0
        security = algorithm.Securities[target.Symbol]
        price = float(security.Price)
        if price <= 0:
            return 0.0
        return float(target.Quantity) * price / total_value
