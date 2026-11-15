#!/usr/bin/env bash
# First certificate for the domain (docs/11, "TLS and domain"). Run once on the server, before
# the first deploy, with port 80 free and DOMAIN and LETSENCRYPT_EMAIL set in .env. The
# certbot service renews it afterwards.
set -euo pipefail
cd "$(dirname "$0")/../.."
set -a
. ./.env
set +a
: "${DOMAIN:?}" "${LETSENCRYPT_EMAIL:?}"
COMPOSE="${COMPOSE:-docker compose -f docker-compose.prod.yml}"
# shellcheck disable=SC2086
$COMPOSE run --service-ports --entrypoint certbot certbot certonly --standalone \
  -d "$DOMAIN" --email "$LETSENCRYPT_EMAIL" --agree-tos --no-eff-email
