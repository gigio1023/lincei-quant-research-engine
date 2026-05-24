import json
import unittest
from pathlib import Path

from alpha.meta_alpha_combiner import (
    combine_meta_component_scores,
    direction_from_meta_score,
    direction_score,
    resolve_component_scores,
)


FIXTURE_PATH = Path(__file__).resolve().parents[1] / "fixtures" / "meta-alpha-parity.fixture.json"


def _direction_score_from_case(direction: str | None, confidence: float | None) -> float:
    return direction_score(direction, confidence if confidence is not None else 0.5)


class MetaAlphaCombinerParityTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        with FIXTURE_PATH.open(encoding="utf-8") as handle:
            cls.fixture = json.load(handle)

    def test_nest_formula_matches_fixture(self) -> None:
        for case in self.fixture["cases"]:
            with self.subTest(case=case["name"]):
                numeric = case.get("numeric") or {}
                llm_event = case.get("llmEvent") or {}
                llm_macro = case.get("llmMacro") or {}
                llm_risk = case.get("llmRisk") or {}

                numeric_score = _direction_score_from_case(
                    numeric.get("direction"),
                    numeric.get("confidence"),
                )
                event_score = _direction_score_from_case(
                    llm_event.get("direction"),
                    llm_event.get("confidence"),
                )
                macro_score = _direction_score_from_case(
                    llm_macro.get("direction"),
                    llm_macro.get("confidence"),
                )
                risk_adjustment = 1.0 - _direction_score_from_case(
                    llm_risk.get("direction"),
                    llm_risk.get("confidence"),
                )
                final_score = combine_meta_component_scores(
                    numeric_score,
                    event_score,
                    macro_score,
                    risk_adjustment,
                )
                expected = case["expected"]

                self.assertAlmostEqual(numeric_score, expected["numericScore"], places=4)
                self.assertAlmostEqual(event_score, expected["eventScore"], places=4)
                self.assertAlmostEqual(macro_score, expected["macroScore"], places=4)
                self.assertAlmostEqual(risk_adjustment, expected["riskAdjustment"], places=4)
                self.assertAlmostEqual(final_score, expected["finalScore"], places=4)
                self.assertEqual(direction_from_meta_score(final_score), expected["direction"])

    def test_lean_replay_uses_exported_scores(self) -> None:
        for case in self.fixture["cases"]:
            with self.subTest(case=case["name"]):
                expected = case["expected"]
                export_record = {
                    "id": f"meta-{case['name']}",
                    "symbol": "SPY",
                    "direction": expected["direction"],
                    "confidence": expected["finalScore"],
                    "numericScore": expected["numericScore"],
                    "eventScore": expected["eventScore"],
                    "macroScore": expected["macroScore"],
                    "riskAdjustment": expected["riskAdjustment"],
                    "finalScore": expected["finalScore"],
                    "llmScores": {
                        "event": expected["eventScore"],
                        "macro": expected["macroScore"],
                        "riskAdjustment": expected["riskAdjustment"],
                    },
                }
                resolved = resolve_component_scores(0.42, export_record)
                self.assertAlmostEqual(resolved["finalScore"], expected["finalScore"], places=4)
                self.assertEqual(
                    direction_from_meta_score(resolved["finalScore"]),
                    expected["direction"],
                )


if __name__ == "__main__":
    unittest.main()
