#!/usr/bin/env bash
# Installs Lean CLI into .venv-lean-cli (repo-local, no system pip).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VENV="$ROOT/.venv-lean-cli"

if [[ ! -d "$VENV" ]]; then
  python3 -m venv "$VENV"
fi

"$VENV/bin/pip" install -U pip wheel
# Python 3.14+ needs setuptools with pkg_resources for Lean CLI
"$VENV/bin/pip" install 'setuptools<81'
"$VENV/bin/pip" install -U lean

if ! command -v docker >/dev/null 2>&1; then
  echo "WARNING: Docker not found. Install Docker Desktop before running lean backtest." >&2
else
  docker info >/dev/null 2>&1 || echo "WARNING: Docker daemon not running." >&2
fi

echo "Lean CLI: $("$VENV/bin/lean" --version)"
echo "Add to shell profile (optional): export LEAN_CLI_PATH=$VENV/bin/lean"
