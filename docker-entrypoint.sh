#!/bin/sh
set -e

mkdir -p /app/data
# Docker sets HOSTNAME to the container id, and Next.js standalone binds to it.
# Railway's proxy can only reach 0.0.0.0:$PORT.
export HOSTNAME=0.0.0.0

as_node() {
  if chown -R node:node /app/data 2>/dev/null; then
    runuser -u node -- "$@"
  else
    "$@"
  fi
}

if [ "$1" = "sync" ]; then
  shift
  as_node /opt/tools/node_modules/.bin/tsx /app/scripts/sync.ts "$@"
  exit $?
fi

if [ "$1" = "worker" ]; then
  shift
  as_node /opt/tools/node_modules/.bin/tsx /app/scripts/worker.ts "$@"
  exit $?
fi

as_node /bin/sh -c '
  /opt/tools/node_modules/.bin/tsx /app/scripts/worker.ts &
  worker=$!
  trap "kill $worker 2>/dev/null || true" TERM INT
  node /app/server.js &
  server=$!
  trap "kill $worker $server 2>/dev/null || true" TERM INT
  wait $server
  status=$?
  kill $worker 2>/dev/null || true
  wait $worker 2>/dev/null || true
  exit $status
' &
child=$!
trap 'kill "$child" 2>/dev/null || true' TERM INT
set +e
wait "$child"
status=$?
kill "$child" 2>/dev/null || true
exit "$status"
