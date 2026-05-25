"""Aggressive LLM momentum algorithm - LEAN Algorithm Framework entrypoint.

OpenAI is intentionally not called here; meta decisions are read from JSON produced by the
NestJS alpha cycle so backtests remain deterministic and network-free.
"""

import os
from datetime import date, timedelta

from AlgorithmImports import *

from alpha.meta_alpha import LinceiMetaAlphaModel
from alpha.numeric_alpha import LinceiNumericAlphaModel
from export.artifact_exporter import LinceiArtifactExporter
from portfolio.aggressive_top_k import AggressiveTopKPortfolioConstructionModel
from risk.lincei_risk import LinceiRiskManagementModel
from shared.universe_policy import UniversePolicy, resolve_universe_policy


class AggressiveLlmMomentum(QCAlgorithm):
    """Framework-based momentum strategy with numeric + meta alpha overlay."""

    @staticmethod
    def _parse_bool(value: str | None, *, default: bool = False) -> bool:
        if value is None or value == "":
            return default
        return value.strip().lower() in ("1", "true", "yes", "on")

    def _parse_date_param(self, key: str, default_year: int, default_month: int, default_day: int) -> tuple[int, int, int]:
        raw = self.GetParameter(key)
        if not raw:
            return default_year, default_month, default_day
        parts = raw.strip().split("-")
        if len(parts) != 3:
            return default_year, default_month, default_day
        return int(parts[0]), int(parts[1]), int(parts[2])

    def Initialize(self) -> None:
        self.run_id = self.GetParameter("run-id") or "local-run"
        universe_policy = self._resolve_universe_policy()
        start = self._effective_start_date(
            self._parse_date_param("backtest-start-date", 2024, 1, 1),
            universe_policy,
        )
        end = self._effective_end_date(
            start,
            self._parse_date_param("backtest-end-date", 2025, 12, 31),
        )
        self.SetStartDate(start[0], start[1], start[2])
        self.SetEndDate(end[0], end[1], end[2])
        self.SetCash(100_000)
        self.SetBenchmark("SPY")
        universe = universe_policy.active_symbols

        for ticker in universe:
            equity = self.AddEquity(ticker, Resolution.Daily)
            equity.SetDataNormalizationMode(DataNormalizationMode.Adjusted)

        universe_symbols = [
            Symbol.Create(ticker, SecurityType.Equity, Market.USA) for ticker in universe
        ]
        self.SetUniverseSelection(ManualUniverseSelectionModel(universe_symbols))

        self._artifact_exporter = LinceiArtifactExporter(self)
        self._artifact_exporter.log("Initialized aggressive_llm_momentum")

        max_single_name_pct = float(self.GetParameter("max-single-name-pct") or "0.08")
        top_k = int(float(self.GetParameter("top-k") or "3"))
        vol_target = float(self.GetParameter("vol-target-annual") or "0.15")
        max_drawdown_pct = float(self.GetParameter("max-drawdown-pct") or "0.12")
        max_gross_exposure_pct = float(self.GetParameter("max-gross-exposure-pct") or "1.0")
        stale_data_hours = int(float(self.GetParameter("stale-data-hours") or "48"))
        meta_decisions_path = self.GetParameter("meta-decisions-path") or "input/meta_decisions.json"
        llm_event_features_path = (
            self.GetParameter("llm-event-features-path")
            or "input/llm_event_features.json"
        )
        validation_mode = self.GetParameter("validation-mode") or ""
        uses_static_meta_overlay = self._parse_bool(
            self.GetParameter("uses-static-meta-overlay"),
            default=True,
        )
        uses_static_ml_predictions = self._parse_bool(
            self.GetParameter("uses-static-ml-predictions"),
            default=True,
        )
        no_static_meta = self._parse_bool(self.GetParameter("no-static-meta"))
        no_static_ml = self._parse_bool(self.GetParameter("no-static-ml"))
        alpha_mode = self.GetParameter("alpha-mode") or (
            "numeric-only" if no_static_meta else "meta-overlay"
        )
        if no_static_meta:
            uses_static_meta_overlay = False
        if no_static_ml:
            uses_static_ml_predictions = False

        self._parameters = {
            "max-single-name-pct": max_single_name_pct,
            "top-k": top_k,
            "vol-target-annual": vol_target,
            "max-drawdown-pct": max_drawdown_pct,
            "max-gross-exposure-pct": max_gross_exposure_pct,
            "stale-data-hours": stale_data_hours,
            "meta-decisions-path": meta_decisions_path,
            "llm-event-features-path": llm_event_features_path,
            "run-id": self.run_id,
            "validation-mode": validation_mode,
            "uses-static-meta-overlay": uses_static_meta_overlay,
            "uses-static-ml-predictions": uses_static_ml_predictions,
            "no-static-meta": no_static_meta,
            "no-static-ml": no_static_ml,
            "alpha-mode": alpha_mode,
            "universe-symbols": ",".join(universe),
            "universe-profile": universe_policy.profile,
            "universe-manifest-id": universe_policy.manifest_id,
            "universe-manifest-source": universe_policy.source_path,
            "sleeve-caps": universe_policy.sleeve_caps,
            "symbol-caps": universe_policy.symbol_caps,
        }

        if no_static_meta or alpha_mode == "numeric-only":
            self.SetAlpha(
                LinceiNumericAlphaModel(
                    artifact_exporter=self._artifact_exporter,
                    use_ml_predictions=uses_static_ml_predictions and not no_static_ml,
                ),
            )
        else:
            self.SetAlpha(
                LinceiMetaAlphaModel(
                    self,
                    meta_decisions_path=meta_decisions_path,
                    artifact_exporter=self._artifact_exporter,
                    use_ml_predictions=uses_static_ml_predictions and not no_static_ml,
                ),
            )
        self.SetPortfolioConstruction(
            AggressiveTopKPortfolioConstructionModel(
                top_k=top_k,
                max_single_name_pct=max_single_name_pct,
                vol_target_annual=vol_target,
                max_gross_exposure_pct=max_gross_exposure_pct,
                symbol_caps=universe_policy.symbol_caps,
                sleeve_by_symbol=universe_policy.sleeve_by_symbol,
                sleeve_caps=universe_policy.sleeve_caps,
                etf_symbols=universe_policy.etf_symbols,
                artifact_exporter=self._artifact_exporter,
            ),
        )
        self.SetRiskManagement(
            LinceiRiskManagementModel(
                max_single_name_pct=max_single_name_pct,
                max_gross_exposure_pct=max_gross_exposure_pct,
                max_drawdown_pct=max_drawdown_pct,
                stale_data_hours=stale_data_hours,
                symbol_caps=universe_policy.symbol_caps,
                sleeve_by_symbol=universe_policy.sleeve_by_symbol,
                sleeve_caps=universe_policy.sleeve_caps,
                blocked_symbols=universe_policy.blocked_symbols,
                investable_symbols=set(universe_policy.active_symbols),
                artifact_exporter=self._artifact_exporter,
            ),
        )
        self.SetExecution(ImmediateExecutionModel())
        self.SetWarmUp(timedelta(days=220))

    def _parse_universe_param(self) -> tuple[str, ...]:
        raw = self.GetParameter("universe-symbols")
        if not raw:
            return ()
        symbols = tuple(symbol.strip().upper() for symbol in raw.split(",") if symbol.strip())
        return symbols

    def _resolve_universe_policy(self) -> UniversePolicy:
        return resolve_universe_policy(
            manifest_path=self.GetParameter("universe-manifest-path"),
            profile_name=self.GetParameter("universe-profile"),
            override_symbols=self._parse_universe_param(),
            allow_leveraged_etf=self._parse_bool(
                self.GetParameter("allow-leveraged-etf"),
                default=False,
            ),
        )

    def _effective_start_date(
        self,
        requested: tuple[int, int, int],
        universe_policy: UniversePolicy,
    ) -> tuple[int, int, int]:
        if universe_policy.minimum_start_date is None:
            return requested
        requested_date = date(requested[0], requested[1], requested[2])
        if requested_date >= universe_policy.minimum_start_date:
            return requested
        minimum = universe_policy.minimum_start_date
        return minimum.year, minimum.month, minimum.day

    def _effective_end_date(
        self,
        start: tuple[int, int, int],
        requested: tuple[int, int, int],
    ) -> tuple[int, int, int]:
        start_date = date(start[0], start[1], start[2])
        requested_date = date(requested[0], requested[1], requested[2])
        if requested_date >= start_date:
            return requested
        today = date.today()
        fallback = today if today >= start_date else start_date
        return fallback.year, fallback.month, fallback.day

    def OnOrderEvent(self, orderEvent: OrderEvent) -> None:
        self._artifact_exporter.record_order_event(orderEvent)

    def OnEndOfAlgorithm(self) -> None:
        statistics = {
            "Total Orders": self.Transactions.OrdersCount,
            "Total Trades": len(list(self.Transactions.GetOrderTickets())),
            "Net Profit": float(self.Portfolio.TotalNetProfit),
            "Total Fees": float(self.Portfolio.TotalFees),
            "End Equity": float(self.Portfolio.TotalPortfolioValue),
            "Compounding Annual Return": float(self.Portfolio.TotalPortfolioValue / 100_000 - 1),
        }
        output_dir = self.GetParameter("artifact-output-dir") or os.path.join(
            "artifacts",
            "lean-runs",
            self.run_id,
        )
        self._artifact_exporter.export_all(output_dir, statistics, self._parameters)
