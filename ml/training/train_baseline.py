"""Deprecated entrypoint — use train_lightgbm_baseline.py."""

from __future__ import annotations

from pathlib import Path

from ml.training.train_lightgbm_baseline import train_and_register


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    train_and_register(root)
