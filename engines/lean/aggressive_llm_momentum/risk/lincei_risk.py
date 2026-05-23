"""Risk model: stale data, drawdown, vol spike, and exposure caps cut targets before execution."""

from __future__ import annotations

from datetime import timedelta
from typing import TYPE_CHECKING

from AlgorithmImports import *

if TYPE_CHECKING:
    from export.artifact_exporter import LinceiArtifactExporter


class LinceiRiskManagementModel(RiskManagementModel):
    """Cuts portfolio targets on stale data, drawdown, vol spikes, and policy breaches."""

    def __init__(
        self,
        max_single_name_pct: float = 0.35,
        max_gross_exposure_pct: float = 1.0,
        max_drawdown_pct: float = 0.12,
        vol_spike_threshold: float = 0.35,
        stale_data_hours: int = 48,
        artifact_exporter: LinceiArtifactExporter | None = None,
    ) -> None:
        self._max_single_name_pct = max_single_name_pct
        self._max_gross_exposure_pct = max_gross_exposure_pct
        self._max_drawdown_pct = max_drawdown_pct
        self._vol_spike_threshold = vol_spike_threshold
        self._stale_data_hours = stale_data_hours
        self._artifact_exporter = artifact_exporter
        self._peak_equity = 0.0
        self._kill_switch_tripped = False

    def ManageRisk(
        self,
        algorithm: QCAlgorithm,
        targets: list[PortfolioTarget],
    ) -> list[PortfolioTarget]:
        risk_notes: list[str] = []
        adjusted = list(targets)

        if self._kill_switch_tripped or self._read_kill_switch(algorithm):
            self._kill_switch_tripped = True
            risk_notes.append("kill_switch_tripped")
            adjusted = [PortfolioTarget(target.Symbol, 0) for target in targets]

        if self._is_data_stale(algorithm):
            risk_notes.append("stale_data_cut")
            adjusted = [self._scale_target(target, 0.5) for target in adjusted]

        drawdown = self._current_drawdown(algorithm)
        if drawdown >= self._max_drawdown_pct:
            risk_notes.append("drawdown_breach")
            adjusted = [self._scale_target(target, 0.25) for target in adjusted]

        if self._volatility_spike(algorithm):
            risk_notes.append("volatility_spike")
            adjusted = [self._scale_target(target, 0.5) for target in adjusted]

        adjusted = self._enforce_caps(adjusted, risk_notes)

        if self._artifact_exporter is not None:
            export_rows = [
                {
                    "symbol": str(target.Symbol.Value),
                    "targetWeight": round(float(target.Quantity), 6),
                    "riskAdjusted": bool(risk_notes),
                    "riskNotes": list(risk_notes),
                }
                for target in adjusted
            ]
            gross = sum(abs(row["targetWeight"]) for row in export_rows)
            max_single = max((abs(row["targetWeight"]) for row in export_rows), default=0.0)
            self._artifact_exporter.record_portfolio_targets(
                export_rows,
                gross,
                max_single,
                risk_notes,
            )

        return adjusted

    def _read_kill_switch(self, algorithm: QCAlgorithm) -> bool:
        flag = algorithm.GetParameter("kill-switch")
        return str(flag).lower() in {"1", "true", "yes", "on"}

    def _is_data_stale(self, algorithm: QCAlgorithm) -> bool:
        stale_after = timedelta(hours=self._stale_data_hours)
        for security in algorithm.ActiveSecurities.Values:
            if security.Data is None:
                continue
            last_data = security.Data.EndTime
            if algorithm.UtcTime - last_data > stale_after:
                return True
        return False

    def _current_drawdown(self, algorithm: QCAlgorithm) -> float:
        equity = float(algorithm.Portfolio.TotalPortfolioValue)
        self._peak_equity = max(self._peak_equity, equity)
        if self._peak_equity <= 0:
            return 0.0
        return 1.0 - (equity / self._peak_equity)

    def _volatility_spike(self, algorithm: QCAlgorithm) -> bool:
        benchmark = algorithm.Securities.get("SPY")
        if benchmark is None or not benchmark.HasData:
            return False
        history = algorithm.History[TradeBar](benchmark.Symbol, 25, Resolution.Daily)
        if history.empty:
            return False
        vol = float(history["close"].astype(float).pct_change().dropna().std() * (252 ** 0.5))
        return vol >= self._vol_spike_threshold

    def _enforce_caps(
        self,
        targets: list[PortfolioTarget],
        risk_notes: list[str],
    ) -> list[PortfolioTarget]:
        capped: list[PortfolioTarget] = []
        for target in targets:
            weight = float(target.Quantity)
            if abs(weight) > self._max_single_name_pct:
                risk_notes.append("single_name_cap")
                weight = self._max_single_name_pct if weight > 0 else -self._max_single_name_pct
            capped.append(PortfolioTarget(target.Symbol, weight))

        gross = sum(abs(float(target.Quantity)) for target in capped)
        if gross <= self._max_gross_exposure_pct:
            return capped

        risk_notes.append("gross_exposure_cap")
        scale = self._max_gross_exposure_pct / gross
        return [PortfolioTarget(target.Symbol, float(target.Quantity) * scale) for target in capped]

    @staticmethod
    def _scale_target(target: PortfolioTarget, scalar: float) -> PortfolioTarget:
        return PortfolioTarget(target.Symbol, float(target.Quantity) * scalar)
