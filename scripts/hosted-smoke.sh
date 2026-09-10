#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-}"
ORIGIN="${SMOKE_ORIGIN:-${SMOKE_BASE_URL:-}}"

if [[ -z "$BASE_URL" ]]; then
  echo "SMOKE_BASE_URL is required (example: https://groundcore.onrender.com)" >&2
  exit 1
fi

if [[ -z "$ORIGIN" ]]; then
  echo "SMOKE_ORIGIN is required when it cannot be inferred from SMOKE_BASE_URL" >&2
  exit 1
fi

cleanup_smoke_data() {
  npm run db:cleanup-smoke >/dev/null || true
}
trap cleanup_smoke_data EXIT

echo "== GroundCore hosted smoke =="
echo "Base URL: $BASE_URL"
echo "Origin:   $ORIGIN"
echo

npm run db:cleanup-smoke

echo "[1/6] auth-cookie"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:auth-cookie

echo
echo "[2/6] password-gate"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:password-gate

echo
echo "[3/6] login-throttle"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:login-throttle

echo
echo "[4/6] security-boundary"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:security-boundary

echo
echo "[5/6] pilot-path"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:pilot-path

echo
echo "[6/6] concurrency"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:concurrency

echo
echo "Hosted smoke suite passed."
