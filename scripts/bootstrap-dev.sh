#!/usr/bin/env bash
# First-time machine setup: venvs, Bun deps, optional HF baselines, Lean CLI login from .env.
# Does NOT create .env (secrets) or download QuantConnect market data (see README.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> lincei-quant-research-engine bootstrap"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_cmd python3
require_cmd bun

if ! command -v docker >/dev/null 2>&1; then
  echo "WARNING: docker not found — LEAN backtests need Docker Desktop." >&2
elif ! docker info >/dev/null 2>&1; then
  echo "WARNING: Docker daemon not running — start Docker before lean backtest." >&2
fi

chmod +x scripts/*.sh 2>/dev/null || true
for f in scripts/*; do
  if [[ -f "$f" && ! "$f" =~ \.sh$ ]]; then
    chmod +x "$f" 2>/dev/null || true
  fi
done

echo "==> Python ML venv (.venv-ml)"
./scripts/setup-ml-venv.sh

echo "==> Lean CLI venv (.venv-lean-cli)"
./scripts/setup-lean-cli.sh

echo "==> Bun dependencies (backend + frontend)"
(cd backend && bun install)
(cd frontend && bun install)

if [[ ! -f "$ROOT/.env" ]]; then
  if [[ -f "$ROOT/.env.example" ]]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    echo "Created .env from .env.example — edit secrets before LEAN validation runs."
  else
    echo "No .env — copy .env.example to .env and fill QUANTCONNECT_* / OPENAI_*." >&2
  fi
else
  echo ".env already exists (not overwritten)."
fi

echo "==> External ML baselines (Hugging Face download)"
if ./scripts/download-external-baselines; then
  echo "External baselines ready."
else
  echo "WARNING: download-external-baselines failed (network/HF?). Retry later." >&2
fi

if [[ -f "$ROOT/.env" ]] \
  && grep -qE '^QUANTCONNECT_USER_ID=.+' "$ROOT/.env" \
  && grep -qE '^QUANTCONNECT_API_TOKEN=.+' "$ROOT/.env"; then
  echo "==> QuantConnect CLI login from .env"
  ./scripts/lean-login-from-env.sh
else
  echo "Skip lean login — set QUANTCONNECT_USER_ID and QUANTCONNECT_API_TOKEN in .env, then run ./scripts/lean-login-from-env.sh"
fi

if [[ ! -f "$ROOT/engines/lean/lean.json" ]]; then
  echo "==> LEAN workspace (lean.json + sample data)"
  if [[ -f "$ROOT/.env" ]] \
    && grep -qE '^QUANTCONNECT_USER_ID=.+' "$ROOT/.env" \
    && grep -qE '^QUANTCONNECT_API_TOKEN=.+' "$ROOT/.env"; then
    ./scripts/setup-lean-workspace.sh
  else
    echo "Skip lean init — add QC credentials to .env, then run ./scripts/setup-lean-workspace.sh"
  fi
else
  echo "engines/lean/lean.json already exists."
fi

echo ""
echo "Bootstrap finished."
echo "  Next: edit .env, configure QuantConnect Cloud credentials, and run no-download smoke checks — see README.md § Clone on a new machine"
echo "  Smoke:  cd backend && bun run v1:cli -- run-alpha-cycle"
echo "  LEAN:   ./scripts/run-local-strategy-smoke   (Docker required; see docs/full-lean-backtest-setup.md)"
echo "  Cloud:  ./scripts/run-cloud-quality-backtest   (full quality-gated universe; avoids local QCC data-download charges)"
