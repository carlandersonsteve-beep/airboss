#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PID_FILE="$ROOT_DIR/.airboss-server.pid"
LOG_FILE="$ROOT_DIR/.airboss-server.log"
PORT_VALUE="${PORT:-}"

if [[ -f "$ROOT_DIR/.env" ]] && [[ -z "$PORT_VALUE" ]]; then
  PORT_VALUE="$(grep '^PORT=' "$ROOT_DIR/.env" | tail -n 1 | cut -d= -f2- || true)"
fi
PORT_VALUE="${PORT_VALUE:-8792}"

is_running() {
  [[ -f "$PID_FILE" ]] || return 1
  local pid
  pid="$(cat "$PID_FILE")"
  kill -0 "$pid" 2>/dev/null
}

start_server() {
  if is_running; then
    echo "AirBoss already running on PID $(cat "$PID_FILE")"
    exit 0
  fi

  cd "$ROOT_DIR"
  nohup env PORT="$PORT_VALUE" node --env-file-if-exists=.env server/index.js >>"$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
  sleep 1

  if is_running; then
    echo "AirBoss started on http://localhost:$PORT_VALUE (PID $(cat "$PID_FILE"))"
    echo "Log: $LOG_FILE"
  else
    echo "AirBoss failed to start. Check $LOG_FILE" >&2
    exit 1
  fi
}

stop_server() {
  if ! is_running; then
    echo "AirBoss is not running"
    rm -f "$PID_FILE"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  kill "$pid" 2>/dev/null || true
  sleep 1
  rm -f "$PID_FILE"
  echo "AirBoss stopped"
}

status_server() {
  if is_running; then
    echo "AirBoss running on http://localhost:$PORT_VALUE (PID $(cat "$PID_FILE"))"
    echo "Log: $LOG_FILE"
    return 0
  else
    echo "AirBoss is not running"
    return 1
  fi
}

restart_server() {
  stop_server || true
  start_server
}

case "${1:-}" in
  start) start_server ;;
  stop) stop_server ;;
  restart) restart_server ;;
  status) status_server ;;
  *)
    echo "Usage: $0 {start|stop|restart|status}" >&2
    exit 1
    ;;
esac
