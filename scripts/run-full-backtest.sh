#!/usr/bin/env bash
# Production LEAN backtest pipeline (not the local simulator).
# Prerequisites: setup-lean-cli.sh, setup-lean-workspace.sh, download-external-baselines, QC data, Docker running.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LEAN_CLI_PATH="${LEAN_CLI_PATH:-$ROOT/.venv-lean-cli/bin/lean}"

ARGS=()
if [[ "${SKIP_ALPHA_CYCLE:-false}" == "true" ]]; then
  ARGS+=(--skip-alpha-cycle)
fi
if [[ "${LEAN_DOWNLOAD_DATA:-true}" == "false" ]]; then
  ARGS+=(--no-download-data)
fi
ARGS+=("$@")

cd "$ROOT/backend"
if ((${#ARGS[@]})); then
  bun run v1:cli -- run-full-backtest "${ARGS[@]}"
else
  bun run v1:cli -- run-full-backtest
fi
