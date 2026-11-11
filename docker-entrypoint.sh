#!/bin/sh
set -e

mkdir -p /app/data
chown -R node:node /app/data

if [ "$1" = "sync" ]; then
  shift
  exec runuser -u node -- /opt/tools/node_modules/.bin/tsx /app/scripts/sync.ts "$@"
fi

exec runuser -u node -- node /app/server.js
