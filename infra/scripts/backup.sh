#!/usr/bin/env bash
# Backup of the whole database (docs/11, "Backups").
#   infra/scripts/backup.sh [daily|predeploy]
# pg_dump --format=custom into BACKUP_DIR, checked with pg_restore --list. Keeps the newest 14
# "daily" files and 8 weekly copies (the first backup of each ISO week). With BACKUP_COPY_CMD
# set (for example 'rclone copy "$FILE" remote:ddr-backups'), the file is also copied off the
# server; $FILE is the path of the new dump. A failed copy fails the script.
set -euo pipefail
# shellcheck source=infra/scripts/_lib.sh
. "$(dirname "$0")/_lib.sh"

KIND="${1:-daily}"
case "$KIND" in daily | predeploy) ;; *) echo "usage: backup.sh [daily|predeploy]" >&2; exit 2 ;; esac

mkdir -p "$BACKUP_DIR/weekly"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$BACKUP_DIR/ddr-$STAMP-$KIND.dump"

log "dumping $POSTGRES_DB to $FILE"
"${PG[@]}" pg_dump --format=custom --no-owner -U "$POSTGRES_USER" "$POSTGRES_DB" >"$FILE.partial"

# A dump that cannot be listed is not a backup.
if ! "${PG[@]}" pg_restore --list <"$FILE.partial" >/dev/null; then
  rm -f "$FILE.partial"
  log "the dump cannot be read back; nothing was kept"
  exit 1
fi
mv "$FILE.partial" "$FILE"
log "backup ok: $(du -h "$FILE" | cut -f1)"

# Weekly copy: the first backup of an ISO week.
WEEK="$(date -u +%G-W%V)"
if ! ls "$BACKUP_DIR/weekly/ddr-$WEEK"-*.dump >/dev/null 2>&1; then
  cp "$FILE" "$BACKUP_DIR/weekly/ddr-$WEEK-$STAMP.dump"
fi

# Retention: 14 daily (the pre-deploy dumps are kept with them), 8 weekly.
# shellcheck disable=SC2012
ls -1t "$BACKUP_DIR"/ddr-*.dump 2>/dev/null | tail -n +15 | xargs -r rm -f --
# shellcheck disable=SC2012
ls -1t "$BACKUP_DIR"/weekly/ddr-*.dump 2>/dev/null | tail -n +9 | xargs -r rm -f --

if [ -n "${BACKUP_COPY_CMD:-}" ]; then
  log "copying off the server"
  FILE="$FILE" bash -c "$BACKUP_COPY_CMD"
fi

echo "$FILE"
