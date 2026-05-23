"""Download and verify approved external tabular baselines (no local training required)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from huggingface_hub import HfApi, hf_hub_download

from ml.security.verify_artifact import (
    verify_file,
    verify_lightgbm_booster,
    write_manifest,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_PATH = REPO_ROOT / "ml/registry/external_baselines_catalog.json"
REGISTRY_PATH = REPO_ROOT / "ml/registry/model_registry.json"


def download_entry(entry: dict) -> dict:
    entry_id = entry["id"]
    hf_repo = entry["huggingfaceRepo"]
    hf_info = HfApi().model_info(hf_repo)
    artifact_dir = REPO_ROOT / entry["artifactDir"]
    artifact_dir.mkdir(parents=True, exist_ok=True)

    verified_files: list[dict[str, str | int]] = []
    for file_spec in entry["files"]:
        local_path = artifact_dir / file_spec["localRel"]
        local_path.parent.mkdir(parents=True, exist_ok=True)
        downloaded = hf_hub_download(
            repo_id=hf_repo,
            filename=file_spec["repoPath"],
            local_dir=str(artifact_dir),
        )
        path = Path(downloaded)
        if path.resolve() != local_path.resolve():
            local_path.write_bytes(path.read_bytes())
        verified_files.append(
            verify_file(local_path, int(file_spec["maxBytes"]), REPO_ROOT),
        )

    booster_path = artifact_dir / "boosters/live.txt"
    verify_lightgbm_booster(booster_path)
    manifest_path = write_manifest(REPO_ROOT, entry_id, verified_files)

    registry_record = {
        "modelName": entry.get("modelName", entry_id),
        "modelType": "lightgbm",
        "framework": entry["framework"],
        "status": "not_promoted",
        "featureVersion": "jc-stockprediction-v1",
        "featureColumns": list(
            json.loads((artifact_dir / "config.json").read_text(encoding="utf-8"))["feature_columns"],
        ),
        "target": "next_day_log_return",
        "horizonDays": 1,
        "artifactPath": str(Path(entry["artifactDir"]) / "boosters/live.txt"),
        "configPath": str(Path(entry["artifactDir"]) / "config.json"),
        "modelHash": f"sha256:{verified_files[0]['sha256']}",
        "dataSource": f"huggingface:{hf_repo}",
        "hfRepo": hf_repo,
        "hfSha": hf_info.sha,
        "hfLastModified": (
            hf_info.last_modified.isoformat() if hf_info.last_modified else None
        ),
        "artifactSha256": verified_files[0]["sha256"],
        "configSha256": verified_files[1]["sha256"],
        "trainingCutoff": entry.get("trainingCutoff"),
        "source": "external-download",
        "license": entry.get("license", "see model card"),
        "trainedAt": datetime.now(timezone.utc).isoformat(),
        "validation": {
            "mse": 0.0,
            "directionalAccuracy": 0.0,
            "walkForwardFolds": 0.0,
        },
        "promotionThreshold": {"directionalAccuracy": 0.0},
        "notes": f"{entry.get('notes', '')} Downloaded and hash-verified only; promote after local walk-forward validation.",
        "securityManifest": str(manifest_path.relative_to(REPO_ROOT)),
    }
    REGISTRY_PATH.write_text(json.dumps(registry_record, indent=2) + "\n", encoding="utf-8")
    return {
        "entryId": entry_id,
        "artifactDir": str(artifact_dir.relative_to(REPO_ROOT)),
        "manifest": str(manifest_path.relative_to(REPO_ROOT)),
        "registry": str(REGISTRY_PATH.relative_to(REPO_ROOT)),
        "files": verified_files,
    }


def main() -> None:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    results = [download_entry(entry) for entry in catalog["approved"]]
    json.dump({"downloaded": results}, sys.stdout, indent=2)
    sys.stdout.write("\n")


if __name__ == "__main__":
    main()
