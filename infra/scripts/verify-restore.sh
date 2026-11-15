#!/usr/bin/env bash
# "A backup that has never been restored does not count" (docs/11). Takes the newest backup
# (or the file given), restores it into a scratch database, compares the row count of every
# table with the live database, and drops the scratch database. Exit 0 only if every count
# matches. Counts can differ if the application wrote since the backup: run it right after a
# backup, or pass VERIFY_ALLOW_NEWER=1 to accept a live count that is higher than the dump's.
set -euo pipefail
# shellcheck source=infra/scripts/_lib.sh
. "$(dirname "$0")/_lib.sh"

# shellcheck disable=SC2012
DUMP="${1:-$(ls -1t "$BACKUP_DIR"/ddr-*.dump 2>/dev/null | head -n 1)}"
[ -n "$DUMP" ] && [ -f "$DUMP" ] || { echo "no backup to verify" >&2; exit 2; }

SCRATCH="$("$(dirname "$0")/restore.sh" "$DUMP" | tail -n 1)"
trap '"${PG[@]}" dropdb -U "$POSTGRES_USER" --if-exists "$SCRATCH"' EXIT

counts() { # database -> "table count" lines
  local db="$1" tables
  tables="$("${PG[@]}" psql -U "$POSTGRES_USER" -d "$db" -Atc "select tablename from pg_tables where schemaname = 'public' order by 1")"
  for t in $tables; do
    echo "$t $("${PG[@]}" psql -U "$POSTGRES_USER" -d "$db" -Atc "select count(*) from \"$t\"")"
  done
}

LIVE="$(counts "$POSTGRES_DB")"
RESTORED="$(counts "$SCRATCH")"
status=0
while read -r table live; do
  restored="$(printf '%s\n' "$RESTORED" | awk -v t="$table" '$1 == t { print $2 }')"
  if [ "$restored" != "$live" ]; then
    if [ "${VERIFY_ALLOW_NEWER:-0}" = "1" ] && [ -n "$restored" ] && [ "$live" -ge "$restored" ]; then
      continue
    fi
    echo "MISMATCH $table: live $live, restored ${restored:-missing}" >&2
    status=1
  fi
done <<<"$LIVE"

tables="$(printf '%s\n' "$LIVE" | wc -l | tr -d ' ')"
if [ "$status" -eq 0 ]; then log "restore verified: $tables tables match ($DUMP)"; fi
exit "$status"
