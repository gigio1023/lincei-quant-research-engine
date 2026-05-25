"""Point-in-time LLM semantic-alpha feature replay helpers."""

from datetime import datetime, timezone
import json
import os
from typing import Any

from alpha.meta_alpha_combiner import (
    combine_meta_component_scores,
    direction_score,
)


def load_semantic_feature_records(path: str) -> dict[str, list[dict[str, Any]]]:
    payload = _read_json_candidates(path)
    if payload is None:
        return {}
    records = payload.get("features", []) if isinstance(payload, dict) else payload
    by_symbol: dict[str, list[dict[str, Any]]] = {}
    for record in records:
        symbol = str(record.get("symbol", "")).upper()
        if not symbol:
            continue
        by_symbol.setdefault(symbol, []).append(record)
    for items in by_symbol.values():
        items.sort(key=lambda item: str(item.get("availableAt", "")))
    return by_symbol


def semantic_record_for_time(
    records: dict[str, list[dict[str, Any]]],
    symbol: str,
    algorithm_time: object,
) -> dict[str, Any] | None:
    eligible = [
        record
        for record in records.get(symbol.upper(), [])
        if _is_available(record.get("availableAt"), algorithm_time)
    ]
    if not eligible:
        return None

    latest_by_type: dict[str, dict[str, Any]] = {}
    for record in eligible:
        latest_by_type[str(record.get("eventType", "event"))] = record

    event_score = _component_score(latest_by_type.get("event"))
    macro_score = _component_score(latest_by_type.get("macro"))
    risk_adjustment = 1.0 - _component_score(latest_by_type.get("risk"))
    confidence = max(
        float(record.get("confidence", 0.0))
        for record in latest_by_type.values()
    )
    final_score = combine_meta_component_scores(
        0.5,
        event_score,
        macro_score,
        risk_adjustment,
    )
    return {
        "eventScore": event_score,
        "macroScore": macro_score,
        "riskAdjustment": risk_adjustment,
        "confidence": confidence,
        "direction": "up" if final_score >= 0.65 else "flat",
        "llmFeatureRefs": [
            str(record.get("id", "unknown")) for record in latest_by_type.values()
        ],
    }


def _component_score(record: dict[str, Any] | None) -> float:
    if record is None:
        return 0.5
    return direction_score(
        str(record.get("direction", "flat")).lower(),
        float(record.get("confidence", 0.5)),
    )


def _read_json_candidates(path: str) -> dict[str, Any] | list[dict[str, Any]] | None:
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
        with open(normalized, encoding="utf-8") as handle:
            return json.load(handle)
    return None


def _is_available(available_at: object, algorithm_time: object) -> bool:
    if available_at is None:
        return False
    try:
        available = datetime.fromisoformat(str(available_at).replace("Z", "+00:00"))
    except ValueError:
        return False
    current = _to_datetime(algorithm_time)
    return available <= current


def _to_datetime(value: object) -> datetime:
    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
