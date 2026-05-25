#!/usr/bin/env bash
# Local LEAN backtest pipeline (not the local simulator).
# Prerequisites: setup-lean-cli.sh, setup-lean-workspace.sh, download-external-baselines, Docker running.
# Full quality universe validation should use QuantConnect Cloud to avoid local QCC data-download costs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export LEAN_CLI_PATH="${LEAN_CLI_PATH:-$ROOT/.venv-lean-cli/bin/lean}"

ARGS=()
ARG_DOWNLOAD_DATA=false
ARG_NO_DOWNLOAD_DATA=false
for arg in "$@"; do
  if [[ "$arg" == "--download-data" ]]; then
    ARG_DOWNLOAD_DATA=true
  elif [[ "$arg" == "--no-download-data" ]]; then
    ARG_NO_DOWNLOAD_DATA=true
  fi
done

if [[ "${SKIP_ALPHA_CYCLE:-false}" == "true" ]]; then
  ARGS+=(--skip-alpha-cycle)
fi

if [[ "${LEAN_DOWNLOAD_DATA:-false}" == "true" || "$ARG_DOWNLOAD_DATA" == "true" ]]; then
  if [[ "${ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD:-false}" != "true" ]]; then
    echo "Blocked: local QuantConnect --download-data can spend QCC. Use ./scripts/run-cloud-quality-backtest for full-universe validation, or set ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true after explicitly accepting local data costs." >&2
    exit 2
  fi
  if [[ "$ARG_DOWNLOAD_DATA" != "true" ]]; then
    ARGS+=(--download-data)
  fi
elif [[ "$ARG_NO_DOWNLOAD_DATA" != "true" ]]; then
  ARGS+=(--no-download-data)
fi
ARGS+=("$@")

cd "$ROOT/backend"
if ((${#ARGS[@]})); then
  bun run v1:cli -- run-full-backtest "${ARGS[@]}"
else
  bun run v1:cli -- run-full-backtest
fi
