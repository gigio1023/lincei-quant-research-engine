import sys
import types
import unittest
from datetime import datetime, timezone


algorithm_imports = types.ModuleType("AlgorithmImports")


class OrderStatus:
    Filled = "Filled"


algorithm_imports.OrderStatus = OrderStatus
sys.modules.setdefault("AlgorithmImports", algorithm_imports)

from export.artifact_exporter import LinceiArtifactExporter  # noqa: E402


class CashAmount:
    def __init__(self, amount: float) -> None:
        self.Amount = amount


class OrderFee:
    def __init__(self, value) -> None:
        self.Value = value


class Symbol:
    Value = "SPY"


class OrderEvent:
    OrderId = 42
    Symbol = Symbol()
    Status = OrderStatus.Filled
    Direction = "Buy"
    FillQuantity = 1
    FillPrice = 100.25
    OrderFee = OrderFee(CashAmount(1.23))
    UtcTime = datetime(2026, 5, 24, tzinfo=timezone.utc)


class Algorithm:
    def Debug(self, _message: str) -> None:
        pass


class ArtifactExporterTest(unittest.TestCase):
    def test_record_order_event_serializes_cash_amount_fees(self) -> None:
        exporter = LinceiArtifactExporter(Algorithm())

        exporter.record_order_event(OrderEvent())

        self.assertEqual(exporter._order_events[0]["orderFee"], 1.23)
        self.assertEqual(exporter._fills[0]["fee"], 1.23)


if __name__ == "__main__":
    unittest.main()
