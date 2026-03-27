#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

case "${1:-}" in
  on)
    if grep -q '^HOST=' "$ENV_FILE"; then
      perl -0pi -e 's/^HOST=.*/HOST=0.0.0.0/m' "$ENV_FILE"
    else
      printf '\nHOST=0.0.0.0\n' >> "$ENV_FILE"
    fi
    echo "LAN test mode ON (HOST=0.0.0.0)"
    ;;
  off)
    if grep -q '^HOST=' "$ENV_FILE"; then
      perl -0pi -e 's/^HOST=.*/HOST=127.0.0.1/m' "$ENV_FILE"
    else
      printf '\nHOST=127.0.0.1\n' >> "$ENV_FILE"
    fi
    echo "LAN test mode OFF (HOST=127.0.0.1)"
    ;;
  status)
    grep '^HOST=' "$ENV_FILE" || echo 'HOST=127.0.0.1 (implicit default)'
    ;;
  *)
    echo "Usage: $0 {on|off|status}" >&2
    exit 1
    ;;
esac
