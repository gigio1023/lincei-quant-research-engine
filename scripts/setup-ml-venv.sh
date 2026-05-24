#!/usr/bin/env bash
# Creates .venv-ml for LightGBM/sklearn training and inference (see ml/README.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
python3 -m venv "$ROOT/.venv-ml"
"$ROOT/.venv-ml/bin/pip" install -r "$ROOT/ml/requirements.txt"
echo "ML venv ready at .venv-ml (LightGBM needs libomp on macOS: brew install libomp)"
