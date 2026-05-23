#!/usr/bin/env bash
# Writes QuantConnect credentials from backend/.env into ~/.lean/credentials (for lean init / backtest).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -n "${LINCEI_ENV_FILE:-}" ]]; then
  ENV_FILE="$LINCEI_ENV_FILE"
elif [[ -f "$ROOT/.env" ]]; then
  ENV_FILE="$ROOT/.env"
else
  ENV_FILE="$ROOT/backend/.env"
fi
LEAN_BIN="${LEAN_CLI_PATH:-$ROOT/.venv-lean-cli/bin/lean}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy backend/.env.example to backend/.env and fill QUANTCONNECT_*." >&2
  exit 1
fi

if [[ ! -x "$LEAN_BIN" ]]; then
  echo "Run ./scripts/setup-lean-cli.sh first." >&2
  exit 1
fi

QUANTCONNECT_USER_ID="$(grep -E '^QUANTCONNECT_USER_ID=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')"
QUANTCONNECT_API_TOKEN="$(grep -E '^QUANTCONNECT_API_TOKEN=' "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//')"

if [[ -z "$QUANTCONNECT_USER_ID" || -z "$QUANTCONNECT_API_TOKEN" ]]; then
  echo "Set QUANTCONNECT_USER_ID and QUANTCONNECT_API_TOKEN in $ENV_FILE" >&2
  exit 1
fi

printf '%s\n%s\n' "$QUANTCONNECT_USER_ID" "$QUANTCONNECT_API_TOKEN" | "$LEAN_BIN" login
echo "Lean CLI logged in (credentials in ~/.lean/credentials)."
