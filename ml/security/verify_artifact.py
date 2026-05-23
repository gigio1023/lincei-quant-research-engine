"""Verify downloaded external ML artifacts before registry promotion."""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path

ALLOWED_SUFFIXES = {".txt", ".json"}
DENIED_SUFFIXES = {
    ".pkl",
    ".pickle",
    ".pt",
    ".pth",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
    ".sh",
    ".bat",
    ".zip",
    ".tar",
    ".gz",
}
SUSPICIOUS_PATTERNS = re.compile(
    r"(__import__|exec\s*\(|eval\s*\(|os\.system|subprocess\.|pickle\.loads)",
    re.IGNORECASE,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def verify_file(path: Path, max_bytes: int, repo_root: Path | None = None) -> dict[str, str | int]:
    if not path.is_file():
        raise FileNotFoundError(f"Missing artifact: {path}")
    suffix = path.suffix.lower()
    if suffix in DENIED_SUFFIXES:
        raise ValueError(f"Denied artifact type: {path.name}")
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"Extension not allowlisted: {path.name}")
    size = path.stat().st_size
    if size <= 0:
        raise ValueError(f"Empty artifact: {path}")
    if size > max_bytes:
        raise ValueError(f"Artifact too large ({size} > {max_bytes}): {path}")
    if suffix in {".txt", ".json"}:
        text = path.read_text(encoding="utf-8", errors="replace")[:2_000_000]
        if SUSPICIOUS_PATTERNS.search(text):
            raise ValueError(f"Suspicious content in {path.name}")
    stored_path = path
    if repo_root is not None:
        try:
            stored_path = path.resolve().relative_to(repo_root.resolve())
        except ValueError:
            stored_path = path
    return {"path": str(stored_path), "sha256": sha256_file(path), "bytes": size}


def verify_lightgbm_booster(booster_path: Path) -> None:
    import lightgbm as lgb

    booster = lgb.Booster(model_file=str(booster_path))
    if booster.num_feature() <= 0:
        raise ValueError("LightGBM booster has no features")


def write_manifest(repo_root: Path, entry_id: str, files: list[dict[str, str | int]]) -> Path:
    manifest_path = repo_root / "ml/registry/external_artifact_manifest.json"
    existing: dict = {}
    if manifest_path.is_file():
        existing = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing[entry_id] = {
        "verifiedAt": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "files": files,
    }
    manifest_path.write_text(json.dumps(existing, indent=2) + "\n", encoding="utf-8")
    return manifest_path
