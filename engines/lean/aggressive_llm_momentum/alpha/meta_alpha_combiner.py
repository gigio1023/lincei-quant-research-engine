"""Pure meta-alpha combiner shared by LEAN replay and parity tests."""

from __future__ import annotations

NUMERIC_WEIGHT = 0.50
EVENT_WEIGHT = 0.25
MACRO_WEIGHT = 0.15
RISK_WEIGHT = 0.10
UP_THRESHOLD = 0.65


def direction_score(direction: str | None, confidence: float = 0.5) -> float:
    if direction == "up":
        return confidence
    if direction == "down":
        return 1.0 - confidence
    return 0.5


def combine_meta_component_scores(
    numeric_score: float,
    event_score: float,
    macro_score: float,
    risk_adjustment: float,
) -> float:
    final_score = (
        NUMERIC_WEIGHT * numeric_score
        + EVENT_WEIGHT * event_score
        + MACRO_WEIGHT * macro_score
        + RISK_WEIGHT * risk_adjustment
    )
    return round(max(0.0, min(1.0, final_score)), 6)


def direction_from_meta_score(final_score: float) -> str:
    return "up" if final_score >= UP_THRESHOLD else "flat"


def resolve_component_scores(
    live_numeric_score: float,
    meta_record: dict | None,
) -> dict[str, float]:
    if meta_record is None:
        return {
            "numericScore": live_numeric_score,
            "eventScore": 0.5,
            "macroScore": 0.5,
            "riskAdjustment": 0.5,
            "finalScore": live_numeric_score,
        }

    llm_scores = meta_record.get("llmScores") or {}
    numeric_score = float(meta_record.get("numericScore", live_numeric_score))
    event_score = float(meta_record.get("eventScore", llm_scores.get("event", 0.5)))
    macro_score = float(meta_record.get("macroScore", llm_scores.get("macro", 0.5)))
    risk_adjustment = float(
        meta_record.get("riskAdjustment", llm_scores.get("riskAdjustment", 0.5)),
    )
    if meta_record.get("finalScore") is not None:
        final_score = float(meta_record["finalScore"])
    else:
        final_score = combine_meta_component_scores(
            numeric_score,
            event_score,
            macro_score,
            risk_adjustment,
        )

    return {
        "numericScore": numeric_score,
        "eventScore": event_score,
        "macroScore": macro_score,
        "riskAdjustment": risk_adjustment,
        "finalScore": final_score,
    }
