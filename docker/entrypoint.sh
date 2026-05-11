#!/bin/sh
set -e

apply_schema() {
  echo "[entrypoint] applying schema via prisma db push…"
  npx prisma db push --skip-generate --accept-data-loss
}

case "$1" in
  app)
    apply_schema
    echo "[entrypoint] starting next start on 0.0.0.0:3000"
    exec npx next start -p 3000 -H 0.0.0.0
    ;;
  worker)
    apply_schema
    echo "[entrypoint] starting bullmq worker"
    exec npm run worker
    ;;
  *)
    exec "$@"
    ;;
esac
