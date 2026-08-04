#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${SMOKE_BASE_URL:-http://127.0.0.1:8792}"
ORIGIN="${SMOKE_ORIGIN:-$BASE_URL}"

cd "$(dirname "$0")/.."

echo "== GroundCore local smoke =="
echo "Base URL: $BASE_URL"
echo "Origin:   $ORIGIN"
echo

echo "[0/6] reseed smoke users"
npm run db:seed-users

echo
echo "[1/5] auth-cookie"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:auth-cookie

echo
echo "[2/5] password-gate"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:password-gate

echo
echo "[3/5] login-throttle"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:login-throttle

echo
echo "[4/5] pilot-path"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:pilot-path

echo
echo "[5/5] concurrency"
SMOKE_BASE_URL="$BASE_URL" SMOKE_ORIGIN="$ORIGIN" npm run smoke:concurrency

echo
echo "Local smoke suite passed."
