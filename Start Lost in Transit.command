#!/bin/zsh
cd "$(dirname "$0")" || exit 1
if [[ ! -x .venv/bin/python ]]; then
  echo 'Run the setup steps in README.md first.'
  read -r '?Press Return to close.'
  exit 1
fi
.venv/bin/python -m uvicorn main:app --app-dir backend --host 127.0.0.1 --port 8001 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT INT TERM
sleep 1
if kill -0 "$server_pid" 2>/dev/null; then
  open 'http://127.0.0.1:8001/'
  echo 'Lost in Transit is running. Close this window or press Control-C to stop.'
  wait "$server_pid"
else
  echo 'The server could not start. Check whether port 8001 is already in use.'
  read -r '?Press Return to close.'
fi
