"""Export LEAN run artifacts for backend ingestion."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any


class LinceiArtifactExporter:
    """Collects runtime events and writes importable JSON artifacts."""

    def __init__(self, algorithm) -> None:
        self._algorithm = algorithm
        self._numeric_scores: list[dict[str, Any]] = []
        self._insights: list[dict[str, Any]] = []
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
        timestamp = datetime.now(timezone.utc).isoformat()
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
        self._numeric_scores.append(
            {
                "symbol": symbol,
                "numericScore": round(score, 6),
                "direction": direction,
                "confidence": round(confidence, 6),
                "recordedAt": datetime.now(timezone.utc).isoformat(),
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
    ) -> None:
        insight_id = f"insight-{symbol}-{datetime.now(timezone.utc):%Y%m%d%H%M%S}"
        self._insights.append(
            {
                "id": insight_id,
                "symbol": symbol,
                "direction": direction,
                "periodDays": 21,
                "confidence": round(confidence, 6),
                "magnitude": round(final_score - 0.5, 6),
                "sourceModel": "LinceiMetaAlphaModel",
                "generatedTime": datetime.now(timezone.utc).isoformat(),
                "finalScore": round(final_score, 6),
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
        self._portfolio_targets = targets
        self._portfolio_meta = {
            "grossExposurePct": round(gross_exposure_pct, 6),
            "maxSingleNamePct": round(max_single_name_pct, 6),
            "riskNotes": list(risk_notes),
        }

    def record_order_event(
        self,
        order_event,
    ) -> None:
        self._order_events.append(
            {
                "id": str(order_event.OrderId),
                "symbol": str(order_event.Symbol.Value),
                "status": str(order_event.Status),
                "direction": str(order_event.Direction),
                "fillQuantity": float(order_event.FillQuantity),
                "fillPrice": float(order_event.FillPrice) if order_event.FillPrice else 0.0,
                "orderFee": float(getattr(order_event.OrderFee, "Value", 0.0) or 0.0),
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
                    "fee": float(getattr(order_event.OrderFee, "Value", 0.0) or 0.0),
                    "filledAt": order_event.UtcTime.isoformat(),
                },
            )

    def export_all(self, output_dir: str, statistics: dict[str, Any], parameters: dict[str, Any]) -> None:
        os.makedirs(output_dir, exist_ok=True)
        run_id = getattr(self._algorithm, "run_id", "lean-run")
        as_of = datetime.now(timezone.utc).isoformat()

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
