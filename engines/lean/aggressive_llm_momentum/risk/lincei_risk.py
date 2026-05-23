"""Risk model: stale data, drawdown, vol spike, and exposure caps cut targets before execution."""

from __future__ import annotations

from datetime import timedelta, timezone
from typing import TYPE_CHECKING

from AlgorithmImports import *

from shared.history_frame import history_frame

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
            adjusted = [
                PortfolioTarget.Percent(algorithm, target.Symbol, 0.0)
                for target in targets
            ]

        if self._is_data_stale(algorithm):
            risk_notes.append("stale_data_cut")
            adjusted = [
                self._scale_target(algorithm, target, 0.5) for target in adjusted
            ]

        drawdown = self._current_drawdown(algorithm)
        if drawdown >= self._max_drawdown_pct:
            risk_notes.append("drawdown_breach")
            adjusted = [
                self._scale_target(algorithm, target, 0.25) for target in adjusted
            ]

        if self._volatility_spike(algorithm):
            risk_notes.append("volatility_spike")
            adjusted = [
                self._scale_target(algorithm, target, 0.5) for target in adjusted
            ]

        adjusted = self._enforce_caps(algorithm, adjusted, risk_notes)

        if self._artifact_exporter is not None:
            export_rows = [
                {
                    "symbol": str(target.Symbol.Value),
                    "targetWeight": round(
                        self._target_percent(algorithm, target),
                        6,
                    ),
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
            if not security.HasData:
                continue
            last_bar = security.GetLastData()
            if last_bar is None:
                continue
            last_time = getattr(last_bar, "EndTime", getattr(last_bar, "Time", None))
            if last_time is None:
                continue
            if self._hours_since(algorithm.UtcTime, last_time) > self._stale_data_hours:
                return True
        return False

    @staticmethod
    def _hours_since(current: object, previous: object) -> float:
        current_utc = LinceiRiskManagementModel._to_utc(current)
        previous_utc = LinceiRiskManagementModel._to_utc(previous)
        return (current_utc - previous_utc).total_seconds() / 3600.0

    @staticmethod
    def _to_utc(moment: object) -> object:
        if getattr(moment, "tzinfo", None) is None:
            return moment.replace(tzinfo=timezone.utc)  # type: ignore[union-attr]
        return moment.astimezone(timezone.utc)  # type: ignore[union-attr]

    def _current_drawdown(self, algorithm: QCAlgorithm) -> float:
        equity = float(algorithm.Portfolio.TotalPortfolioValue)
        self._peak_equity = max(self._peak_equity, equity)
        if self._peak_equity <= 0:
            return 0.0
        return 1.0 - (equity / self._peak_equity)

    def _volatility_spike(self, algorithm: QCAlgorithm) -> bool:
        if not algorithm.Securities.ContainsKey("SPY"):
            return False
        benchmark = algorithm.Securities["SPY"]
        if not benchmark.HasData:
            return False
        history = history_frame(algorithm, benchmark.Symbol, 25, Resolution.Daily)
        if history is None:
            return False
        vol = float(history["close"].astype(float).pct_change().dropna().std() * (252 ** 0.5))
        return vol >= self._vol_spike_threshold

    def _enforce_caps(
        self,
        algorithm: QCAlgorithm,
        targets: list[PortfolioTarget],
        risk_notes: list[str],
    ) -> list[PortfolioTarget]:
        percents: list[float] = []
        for target in targets:
            weight = self._target_percent(algorithm, target)
            if abs(weight) > self._max_single_name_pct:
                risk_notes.append("single_name_cap")
                weight = (
                    self._max_single_name_pct if weight > 0 else -self._max_single_name_pct
                )
            percents.append(weight)

        gross = sum(abs(weight) for weight in percents)
        if gross > self._max_gross_exposure_pct:
            risk_notes.append("gross_exposure_cap")
            scale = self._max_gross_exposure_pct / gross
            percents = [weight * scale for weight in percents]

        return [
            PortfolioTarget.Percent(algorithm, target.Symbol, weight)
            for target, weight in zip(targets, percents)
        ]

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

    @staticmethod
    def _scale_target(
        algorithm: QCAlgorithm,
        target: PortfolioTarget,
        scalar: float,
    ) -> PortfolioTarget:
        percent = LinceiRiskManagementModel._target_percent(algorithm, target) * scalar
        return PortfolioTarget.Percent(algorithm, target.Symbol, percent)
