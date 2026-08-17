#!/usr/bin/env bash
set -euo pipefail
umask 077
: "${DATABASE_BACKUP_URL:?}" "${PGPASSWORD:?}" "${BACKUP_AGE_RECIPIENT:?}" "${RESTIC_REPOSITORY:?}" "${RESTIC_PASSWORD_FILE:?}"
case "$DATABASE_BACKUP_URL" in
  postgresql://*:*@*|postgres://*:*@*)
    echo "DATABASE_BACKUP_URL must not contain a password; provide it through PGPASSWORD." >&2
    exit 1
    ;;
esac
backup_root="${BACKUP_LOCAL_DIR:-/var/backups/arknights-infra}"
install -d -m 0700 "$backup_root"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="$backup_root/auth-$stamp.dump.age"
partial="$target.partial"
trap 'rm -f -- "$partial"' EXIT
pg_dump --format=custom --no-owner --no-acl "$DATABASE_BACKUP_URL" | age -r "$BACKUP_AGE_RECIPIENT" -o "$partial"
mv -- "$partial" "$target"
restic backup "$target"
restic forget --keep-daily 14 --keep-weekly 8 --prune
find "$backup_root" -type f -name 'auth-*.dump.age' -mtime +14 -delete
