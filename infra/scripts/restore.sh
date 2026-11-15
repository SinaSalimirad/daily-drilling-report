#!/usr/bin/env bash
# Restores a dump (docs/11, "Backups"). By default into a NEW scratch database, never over the
# live one:
#   infra/scripts/restore.sh backups/ddr-….dump                 -> scratch database ddr_restore_<stamp>
#   infra/scripts/restore.sh backups/ddr-….dump my_database     -> that database (must not exist)
# To replace the live database, stop the api first, drop it yourself and restore into the name
# it had; this script refuses to touch an existing database.
set -euo pipefail
# shellcheck source=infra/scripts/_lib.sh
. "$(dirname "$0")/_lib.sh"

DUMP="${1:?usage: restore.sh <dump> [database]}"
[ -f "$DUMP" ] || { echo "no such file: $DUMP" >&2; exit 2; }
TARGET="${2:-ddr_restore_$(date -u +%Y%m%dT%H%M%SZ)}"

exists="$("${PG[@]}" psql -U "$POSTGRES_USER" -d postgres -Atc "select 1 from pg_database where datname = '$TARGET'")"
if [ "$exists" = "1" ]; then
  echo "database $TARGET already exists; refusing to overwrite it" >&2
  exit 1
fi

log "creating $TARGET"
"${PG[@]}" createdb -U "$POSTGRES_USER" "$TARGET"
log "restoring $DUMP"
"${PG[@]}" pg_restore --no-owner -U "$POSTGRES_USER" -d "$TARGET" <"$DUMP"
log "restored into $TARGET"
echo "$TARGET"
