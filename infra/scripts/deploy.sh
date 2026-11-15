#!/usr/bin/env bash
# Deploys a tag on the server (docs/11, "Release"): backup, migrations, new containers, health
# check, and the previous tag again if the health check fails. Run by the release workflow over
# SSH from /srv/ddr:   infra/scripts/deploy.sh v1.0.0
set -euo pipefail
cd "$(dirname "$0")/../.."
TAG="${1:?usage: deploy.sh <tag>}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"
export TAG
set -a
. ./.env
set +a
: "${DOMAIN:?}"
PREVIOUS="$(cat .deployed-tag 2>/dev/null || true)"

echo "== backup"
$COMPOSE up -d postgres
PG_EXEC="$COMPOSE exec -T postgres" infra/scripts/backup.sh predeploy

echo "== pull $TAG"
$COMPOSE pull

echo "== migrate"
# Migrations are backward compatible (docs/03): the old containers keep running meanwhile.
$COMPOSE run --no-deps api bun dist/migrate.js

echo "== start"
$COMPOSE up -d

healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS --max-time 5 --resolve "$DOMAIN:443:127.0.0.1" "https://$DOMAIN/api/health" >/dev/null; then
      return 0
    fi
    sleep 4
  done
  return 1
}

if healthy; then
  echo "$TAG" >.deployed-tag
  echo "== deployed $TAG"
  exit 0
fi

echo "== health check failed" >&2
if [ -n "$PREVIOUS" ]; then
  echo "== rolling back to $PREVIOUS" >&2
  TAG="$PREVIOUS" $COMPOSE up -d
fi
exit 1
