#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:8792}"
ORIGIN="${SMOKE_ORIGIN:-$BASE_URL}"

cd "$(dirname "$0")/.."

cleanup_smoke_data() {
  npm run db:cleanup-smoke >/dev/null || true
}
trap cleanup_smoke_data EXIT

echo "== GroundCore local smoke =="
echo "Base URL: $BASE_URL"
echo "Origin:   $ORIGIN"
echo

echo "[0/7] reseed smoke users"
npm run db:cleanup-smoke
npm run db:seed-smoke-users

echo
echo "[1/7] auth-cookie"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:auth-cookie

echo
echo "[2/7] password-gate"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:password-gate

echo
echo "[3/7] login-throttle"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:login-throttle

echo
echo "[4/7] security-boundary"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:security-boundary

echo
echo "[5/7] pilot-path"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:pilot-path

echo
echo "[6/7] concurrency"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:concurrency

echo
echo "[7/7] checkin-throttle"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:checkin-throttle

echo
echo "Local smoke suite passed."
