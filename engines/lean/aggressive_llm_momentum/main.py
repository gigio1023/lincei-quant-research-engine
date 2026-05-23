"""Aggressive LLM momentum V1 algorithm using LEAN Algorithm Framework."""

from __future__ import annotations

import os
from datetime import timedelta

from AlgorithmImports import *

from alpha.meta_alpha import LinceiMetaAlphaModel
from export.artifact_exporter import LinceiArtifactExporter
from portfolio.aggressive_top_k import AggressiveTopKPortfolioConstructionModel
from risk.lincei_risk import LinceiRiskManagementModel


class AggressiveLlmMomentum(QCAlgorithm):
    """Framework-based momentum strategy with numeric + meta alpha overlay."""

    UNIVERSE = ("SPY", "QQQ", "IWM", "TLT", "GLD")

    def Initialize(self) -> None:
        self.run_id = self.GetParameter("run-id") or "local-run"
        self.SetStartDate(2024, 1, 1)
        self.SetEndDate(2025, 12, 31)
        self.SetCash(100_000)
        self.SetBenchmark("SPY")

        for ticker in self.UNIVERSE:
            equity = self.AddEquity(ticker, Resolution.Daily)
            equity.SetDataNormalizationMode(DataNormalizationMode.Adjusted)

        universe_symbols = [
            Symbol.Create(ticker, SecurityType.Equity, Market.USA) for ticker in self.UNIVERSE
        ]
        self.SetUniverseSelection(ManualUniverseSelectionModel(universe_symbols))

        self._artifact_exporter = LinceiArtifactExporter(self)
        self._artifact_exporter.log("Initialized aggressive_llm_momentum V1")

        max_single_name_pct = float(self.GetParameter("max-single-name-pct") or "0.35")
        top_k = int(float(self.GetParameter("top-k") or "2"))
        vol_target = float(self.GetParameter("vol-target-annual") or "0.15")
        max_drawdown_pct = float(self.GetParameter("max-drawdown-pct") or "0.12")
        max_gross_exposure_pct = float(self.GetParameter("max-gross-exposure-pct") or "1.0")
        stale_data_hours = int(float(self.GetParameter("stale-data-hours") or "48"))
        meta_decisions_path = self.GetParameter("meta-decisions-path") or "input/meta_decisions.json"

        self._parameters = {
            "max-single-name-pct": max_single_name_pct,
            "top-k": top_k,
            "vol-target-annual": vol_target,
            "max-drawdown-pct": max_drawdown_pct,
            "max-gross-exposure-pct": max_gross_exposure_pct,
            "stale-data-hours": stale_data_hours,
            "meta-decisions-path": meta_decisions_path,
            "run-id": self.run_id,
        }

        self.SetAlpha(
            LinceiMetaAlphaModel(
                self,
                meta_decisions_path=meta_decisions_path,
                artifact_exporter=self._artifact_exporter,
            ),
        )
        self.SetPortfolioConstruction(
            AggressiveTopKPortfolioConstructionModel(
                top_k=top_k,
                max_single_name_pct=max_single_name_pct,
                vol_target_annual=vol_target,
                artifact_exporter=self._artifact_exporter,
            ),
        )
        self.SetRiskManagement(
            LinceiRiskManagementModel(
                max_single_name_pct=max_single_name_pct,
                max_gross_exposure_pct=max_gross_exposure_pct,
                max_drawdown_pct=max_drawdown_pct,
                stale_data_hours=stale_data_hours,
                artifact_exporter=self._artifact_exporter,
            ),
        )
        self.SetExecution(ImmediateExecutionModel())
        self.SetWarmUp(timedelta(days=220))

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
