# Shared by the backup scripts (docs/11, "Backups"). Source it; do not run it.
#
# How the scripts reach PostgreSQL: PG_EXEC is the command that runs a program inside the
# postgres container with stdin attached. Default: Docker Compose from the repository root.
#   PG_EXEC="podman exec -i postgres"            # a podman container named postgres
#   PG_EXEC="docker compose exec -T postgres"    # the default
# POSTGRES_USER and POSTGRES_DB come from the environment or from .env.

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$ROOT/.env"; set +a
fi

: "${PG_EXEC:=docker compose exec -T postgres}"
: "${POSTGRES_USER:?set POSTGRES_USER}"
: "${POSTGRES_DB:?set POSTGRES_DB}"
: "${BACKUP_DIR:=$ROOT/backups}"

# shellcheck disable=SC2206
PG=($PG_EXEC)

log() { printf '%s %s\n' "$(date -u +%FT%TZ)" "$*" >&2; }
