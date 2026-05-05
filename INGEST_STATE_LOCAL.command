#!/bin/bash
# ============================================================
# PA STATE & LOCAL INGESTION
# Double-click to run
# ============================================================
cd "$(dirname "$0")"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/govcon-app/.env.local"

echo "=================================================="
echo " PA State & Local Opportunities Ingestion"
echo "=================================================="
echo ""
echo "Script dir: $SCRIPT_DIR"
echo "Env file:   $ENV_FILE"
echo ""

# Check .env.local
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: .env.local not found at:"
  echo "  $ENV_FILE"
  echo ""
  echo "Looking for .env files..."
  find "$SCRIPT_DIR" -name ".env*" -not -path "*/node_modules/*" -not -path "*/.next/*" 2>/dev/null
  echo ""
  echo "Press Enter to close."
  read
  exit 1
fi
echo "✓ .env.local found"

# Find python3
PYTHON=""
for candidate in python3 /usr/bin/python3 /usr/local/bin/python3 /opt/homebrew/bin/python3; do
  if command -v "$candidate" &>/dev/null; then
    PYTHON="$candidate"
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "ERROR: python3 not found. Install it from python.org or via Homebrew:"
  echo "  brew install python3"
  echo ""
  echo "Press Enter to close."
  read
  exit 1
fi
echo "✓ Python: $($PYTHON --version 2>&1)"

# Install packages (no venv — use --user to avoid permission issues)
echo ""
echo "Installing required packages..."
$PYTHON -m pip install --quiet --user requests openpyxl 2>&1 | tail -3
echo "✓ Packages ready"

echo ""
echo "Starting ingestion..."
echo "--------------------------------------------------"
$PYTHON "$SCRIPT_DIR/ingest_state_local.py" "$ENV_FILE"
STATUS=$?
echo "--------------------------------------------------"
echo ""

if [ $STATUS -eq 0 ]; then
  echo "✅ Ingestion complete!"
else
  echo "⚠️  Script exited with code $STATUS"
fi

echo ""
echo "Press Enter to close."
read
