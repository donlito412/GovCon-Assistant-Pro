#!/bin/bash
# ============================================================
# PA STATE & LOCAL OPPORTUNITIES INGESTION
# Sources:
#   1. PA eMarketplace — active solicitations (state_pa_emarketplace)
#   2. PA eMarketplace — awarded contracts (state_pa_emarketplace)
#   3. City of Pittsburgh BonfireHub (local_pittsburgh)
# Double-click to run
# ============================================================
cd "$(dirname "$0")"

SCRIPT_DIR="$(dirname "$0")"
ENV_FILE="$SCRIPT_DIR/govcon-app/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.local not found at $ENV_FILE"
  echo "Press Enter to close."
  read
  exit 1
fi

echo "=== GovCon Assistant Pro — PA State & Local Ingestion ==="
echo ""

# Check for Python 3
if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 not found."
  echo "Press Enter to close."
  read
  exit 1
fi

# Install dependencies into a temp venv
echo "Setting up Python environment..."
VENV_DIR="/tmp/govcon_ingest_venv"
if [ ! -d "$VENV_DIR" ]; then
  python3 -m venv "$VENV_DIR" 2>/dev/null
fi
source "$VENV_DIR/bin/activate"
pip install --quiet requests openpyxl 2>/dev/null

echo "Running ingestion..."
python3 "$SCRIPT_DIR/ingest_state_local.py" "$ENV_FILE"

deactivate
echo ""
echo "Press Enter to close."
read
