#!/usr/bin/env bash
# Scaffold engines/lean/lean.json + data/ (interactive QC login). Run once per machine.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LEAN_ROOT="$ROOT/engines/lean"
LEAN_BIN="${LEAN_CLI_PATH:-$ROOT/.venv-lean-cli/bin/lean}"

if [[ ! -x "$LEAN_BIN" ]]; then
  echo "Run ./scripts/setup-lean-cli.sh first." >&2
  exit 1
fi

if [[ -f "$LEAN_ROOT/lean.json" ]]; then
  echo "lean.json already exists at $LEAN_ROOT/lean.json"
  exit 0
fi

echo "This will open QuantConnect login (user id + API token from https://www.quantconnect.com/account)."
echo "Free account works for lean init and local backtests with downloaded data."
cd "$LEAN_ROOT"
"$LEAN_BIN" init -l python

echo ""
echo "Next: use ./scripts/run-local-strategy-smoke for local no-download validation."
echo "For the full quality-gated universe, prefer ./scripts/run-cloud-quality-backtest to avoid local QCC data-download charges."
echo "Local QuantConnect data downloads require explicit cost approval plus ALLOW_PAID_QC_LOCAL_DATA_DOWNLOAD=true."
