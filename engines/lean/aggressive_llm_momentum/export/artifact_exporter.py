"""Export LEAN run artifacts for backend ingestion."""

import json
import os
from datetime import datetime, timezone
from typing import Any

from AlgorithmImports import OrderStatus


class LinceiArtifactExporter:
    """Collects runtime events and writes importable JSON artifacts."""

    def __init__(self, algorithm) -> None:
        self._algorithm = algorithm
        self._numeric_scores: list[dict[str, Any]] = []
        self._insights: list[dict[str, Any]] = []
        self._latest_insight_ids_by_symbol: dict[str, list[str]] = {}
        self._portfolio_targets: list[dict[str, Any]] = []
        self._portfolio_meta: dict[str, Any] = {
            "grossExposurePct": 0.0,
            "maxSingleNamePct": 0.0,
            "riskNotes": [],
        }
        self._order_events: list[dict[str, Any]] = []
        self._fills: list[dict[str, Any]] = []
        self._logs: list[str] = []

    def log(self, message: str) -> None:
        timestamp = self._algorithm_time().isoformat()
        line = f"[{timestamp}] {message}"
        self._logs.append(line)
        self._algorithm.Debug(message)

    def record_numeric_score(
        self,
        symbol: str,
        score: float,
        direction: str,
        confidence: float,
    ) -> None:
        algorithm_time = self._algorithm_time()
        insight_id = f"insight-{symbol}-{algorithm_time:%Y%m%d%H%M%S}"
        self._latest_insight_ids_by_symbol[symbol] = [insight_id]
        self._numeric_scores.append(
            {
                "symbol": symbol,
                "numericScore": round(score, 6),
                "direction": direction,
                "confidence": round(confidence, 6),
                "recordedAt": algorithm_time.isoformat(),
            },
        )
        self._insights.append(
            {
                "id": insight_id,
                "symbol": symbol,
                "direction": direction,
                "periodDays": 21,
                "confidence": round(confidence, 6),
                "magnitude": round(score - 0.5, 6),
                "sourceModel": "LinceiNumericAlphaModel",
                "generatedTime": algorithm_time.isoformat(),
                "finalScore": round(score, 6),
                "conflictNotes": [],
                "metaDecisionId": None,
            },
        )

    def record_meta_insight(
        self,
        symbol: str,
        final_score: float,
        direction: str,
        confidence: float,
        conflict_notes: list[str],
        meta_record: dict[str, Any] | None,
        component_scores: dict[str, float] | None = None,
    ) -> None:
        algorithm_time = self._algorithm_time()
        insight_id = f"insight-{symbol}-{algorithm_time:%Y%m%d%H%M%S}"
        self._latest_insight_ids_by_symbol[symbol] = [insight_id]
        scores = component_scores or {}
        self._insights.append(
            {
                "id": insight_id,
                "symbol": symbol,
                "direction": direction,
                "periodDays": 21,
                "confidence": round(confidence, 6),
                "magnitude": round(final_score - 0.5, 6),
                "sourceModel": "LinceiMetaAlphaModel",
                "generatedTime": algorithm_time.isoformat(),
                "finalScore": round(final_score, 6),
                "numericScore": scores.get("numericScore"),
                "eventScore": scores.get("eventScore"),
                "macroScore": scores.get("macroScore"),
                "riskAdjustment": scores.get("riskAdjustment"),
                "conflictNotes": conflict_notes,
                "metaDecisionId": meta_record.get("id") if meta_record else None,
            },
        )

    def record_portfolio_targets(
        self,
        targets: list[dict[str, Any]],
        gross_exposure_pct: float,
        max_single_name_pct: float,
        risk_notes: list[str],
    ) -> None:
        previous_sources = {
            row.get("symbol"): row.get("sourceInsightIds", [])
            for row in self._portfolio_targets
        }
        normalized_targets: list[dict[str, Any]] = []
        for target in targets:
            row = dict(target)
            symbol = row.get("symbol")
            if symbol in self._latest_insight_ids_by_symbol:
                row["sourceInsightIds"] = self._latest_insight_ids_by_symbol[symbol]
            elif not row.get("sourceInsightIds") and symbol in previous_sources:
                row["sourceInsightIds"] = previous_sources[symbol]
            normalized_targets.append(row)

        self._portfolio_targets = normalized_targets
        self._portfolio_meta = {
            "grossExposurePct": round(gross_exposure_pct, 6),
            "maxSingleNamePct": round(max_single_name_pct, 6),
            "riskNotes": list(risk_notes),
        }

    def record_order_event(
        self,
        order_event,
    ) -> None:
        order_fee = self._money_amount(getattr(order_event, "OrderFee", None))
        self._order_events.append(
            {
                "id": str(order_event.OrderId),
                "symbol": str(order_event.Symbol.Value),
                "status": str(order_event.Status),
                "direction": str(order_event.Direction),
                "fillQuantity": float(order_event.FillQuantity),
                "fillPrice": float(order_event.FillPrice) if order_event.FillPrice else 0.0,
                "orderFee": order_fee,
                "utcTime": order_event.UtcTime.isoformat(),
            },
        )

        if order_event.Status == OrderStatus.Filled and order_event.FillQuantity:
            self._fills.append(
                {
                    "id": f"fill-{order_event.OrderId}-{len(self._fills) + 1}",
                    "orderId": str(order_event.OrderId),
                    "symbol": str(order_event.Symbol.Value),
                    "quantity": float(order_event.FillQuantity),
                    "price": float(order_event.FillPrice) if order_event.FillPrice else 0.0,
                    "fee": order_fee,
                    "filledAt": order_event.UtcTime.isoformat(),
                },
            )

    def export_all(self, output_dir: str, statistics: dict[str, Any], parameters: dict[str, Any]) -> None:
        os.makedirs(output_dir, exist_ok=True)
        run_id = getattr(self._algorithm, "run_id", "lean-run")
        as_of = self._algorithm_time().isoformat()

        insights_payload = {"runId": run_id, "asOf": as_of, "insights": self._insights}
        targets_payload = {
            "id": f"targets-{run_id}",
            "leanRunId": run_id,
            "asOf": as_of,
            "targets": self._portfolio_targets,
            "grossExposurePct": self._portfolio_meta["grossExposurePct"],
            "maxSingleNamePct": self._portfolio_meta["maxSingleNamePct"],
            "riskNotes": self._portfolio_meta["riskNotes"],
        }

        self._write_json(os.path.join(output_dir, "insights.json"), insights_payload)
        self._write_json(os.path.join(output_dir, "portfolio_targets.json"), targets_payload)
        self._write_json(os.path.join(output_dir, "order_events.json"), {"events": self._order_events})
        self._write_json(os.path.join(output_dir, "fills.json"), {"fills": self._fills})
        self._write_json(os.path.join(output_dir, "statistics.json"), statistics)
        self._write_json(
            os.path.join(output_dir, "config.json"),
            {
                "projectName": "aggressive_llm_momentum",
                "algorithmVersion": "v1",
                "parameters": parameters,
                "exportedAt": as_of,
            },
        )

        with open(os.path.join(output_dir, "logs.txt"), "w", encoding="utf-8") as handle:
            handle.write("\n".join(self._logs))

        self.log(f"Exported artifacts to {output_dir}")

    @staticmethod
    def _write_json(path: str, payload: dict[str, Any]) -> None:
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)

    @staticmethod
    def _money_amount(value: Any) -> float:
        if value is None:
            return 0.0
        raw_value = getattr(value, "Value", value)
        amount = getattr(raw_value, "Amount", raw_value)
        return float(amount or 0.0)

    def _algorithm_time(self) -> datetime:
        raw_time = getattr(self._algorithm, "UtcTime", None)
        if isinstance(raw_time, datetime):
            if raw_time.tzinfo is None:
                return raw_time.replace(tzinfo=timezone.utc)
            return raw_time.astimezone(timezone.utc)
        return datetime.now(timezone.utc)
