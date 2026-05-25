import importlib.util
import shutil
import tempfile
import unittest
from pathlib import Path

from shared.universe_policy import resolve_universe_policy


MANIFEST = (
    Path(__file__).resolve().parents[4]
    / "config"
    / "universes"
    / "quality-gated-v2.json"
)


class UniversePolicyTest(unittest.TestCase):
    def test_default_profile_excludes_blocked_symbols(self) -> None:
        policy = resolve_universe_policy(
            manifest_path=str(MANIFEST),
            profile_name="quality_core_backtest_safe",
            override_symbols=(),
            allow_leveraged_etf=False,
        )

        self.assertIn("SMH", policy.active_symbols)
        self.assertIn("RKLB", policy.active_symbols)
        self.assertNotIn("INTC", policy.active_symbols)
        self.assertNotIn("SOXL", policy.active_symbols)
        self.assertEqual(policy.symbol_caps["RKLB"], 0.05)

    def test_hard_excluded_override_fails_closed(self) -> None:
        with self.assertRaisesRegex(RuntimeError, "hard excluded"):
            resolve_universe_policy(
                manifest_path=str(MANIFEST),
                profile_name="quality_core_backtest_safe",
                override_symbols=("SMH", "INTC"),
                allow_leveraged_etf=False,
            )

    def test_forward_nasa_profile_sets_minimum_start(self) -> None:
        policy = resolve_universe_policy(
            manifest_path=str(MANIFEST),
            profile_name="forward_nasa",
            override_symbols=(),
            allow_leveraged_etf=False,
        )

        self.assertIn("NASA", policy.active_symbols)
        self.assertEqual(str(policy.minimum_start_date), "2026-03-31")

    def test_embedded_manifest_boots_when_cloud_package_has_no_json_manifest(
        self,
    ) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            package_root = Path(temp_dir) / "project" / "shared"
            package_root.mkdir(parents=True)
            shutil.copyfile(
                Path(__file__).resolve().parents[1] / "shared" / "universe_policy.py",
                package_root / "universe_policy.py",
            )
            spec = importlib.util.spec_from_file_location(
                "cloud_package_universe_policy",
                package_root / "universe_policy.py",
            )
            module = importlib.util.module_from_spec(spec)
            assert spec and spec.loader
            spec.loader.exec_module(module)

            policy = module.resolve_universe_policy(
                manifest_path="input/universe_manifest.runtime.json",
                profile_name="quality_core_backtest_safe",
                override_symbols=(),
                allow_leveraged_etf=False,
            )

            self.assertEqual(policy.source_path, "embedded:quality-gated-v2")
            self.assertIn("SMH", policy.active_symbols)
            self.assertEqual(policy.symbol_caps["RKLB"], 0.05)


if __name__ == "__main__":
    unittest.main()
