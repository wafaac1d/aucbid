#!/bin/sh
set -e

mkdir -p /app/data
# Docker sets HOSTNAME to the container id, and Next.js standalone binds to it.
# Railway's proxy can only reach 0.0.0.0:$PORT.
export HOSTNAME=0.0.0.0

run() {
  if chown -R node:node /app/data 2>/dev/null; then
    exec runuser -u node -- "$@"
  fi
  exec "$@"
}

if [ "$1" = "sync" ]; then
  shift
  run /opt/tools/node_modules/.bin/tsx /app/scripts/sync.ts "$@"
fi

run node /app/server.js
