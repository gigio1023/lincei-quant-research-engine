import unittest
from datetime import datetime, timezone

from alpha.semantic_features import semantic_record_for_time


class SemanticFeaturesTest(unittest.TestCase):
    def test_future_available_feature_is_not_replayed(self) -> None:
        records = {
            "SPY": [
                {
                    "id": "future",
                    "symbol": "SPY",
                    "eventType": "event",
                    "availableAt": "2026-01-02T00:00:00Z",
                    "direction": "up",
                    "confidence": 0.9,
                },
            ],
        }

        result = semantic_record_for_time(
            records,
            "SPY",
            datetime(2026, 1, 1, tzinfo=timezone.utc),
        )

        self.assertIsNone(result)

    def test_available_features_become_meta_record(self) -> None:
        records = {
            "SPY": [
                {
                    "id": "event",
                    "symbol": "SPY",
                    "eventType": "event",
                    "availableAt": "2026-01-01T00:00:00Z",
                    "direction": "up",
                    "confidence": 0.8,
                },
                {
                    "id": "risk",
                    "symbol": "SPY",
                    "eventType": "risk",
                    "availableAt": "2026-01-01T00:00:00Z",
                    "direction": "down",
                    "confidence": 0.7,
                },
            ],
        }

        result = semantic_record_for_time(
            records,
            "SPY",
            datetime(2026, 1, 2, tzinfo=timezone.utc),
        )

        self.assertIsNotNone(result)
        self.assertEqual(result["eventScore"], 0.8)
        self.assertEqual(result["riskAdjustment"], 0.7)


if __name__ == "__main__":
    unittest.main()
