#!/usr/bin/env bash
set -euo pipefail

# Backup live SQLite from the Docker menu_data volume.
#
# Usage on server (from project root):
#   chmod +x scripts/backup-db.sh
#   ./scripts/backup-db.sh
#
# Optional env:
#   COMPOSE_FILE=docker-compose.yml
#   ENV_FILE=.env
#   APP_SERVICE=app
#   BACKUP_DIR=backups

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-.env}"
APP_SERVICE="${APP_SERVICE:-app}"
BACKUP_DIR="${BACKUP_DIR:-backups}"

log() { printf '[backup] %s\n' "$*"; }
err() { printf '[backup][error] %s\n' "$*" >&2; }

if ! command -v docker >/dev/null 2>&1; then
  err "docker is not installed."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  err "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  err "$ENV_FILE not found."
  exit 1
fi

compose() {
  docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" "$@"
}

get_app_container_id() {
  compose ps -q "$APP_SERVICE"
}

get_data_volume_name_from_container() {
  local cid="$1"
  docker inspect -f '{{range .Mounts}}{{if eq .Destination "/data"}}{{.Name}}{{end}}{{end}}' "$cid"
}

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/menu-db-$STAMP.tgz"

log "Resolving app container and /data volume"
CURRENT_CID="$(get_app_container_id || true)"
if [ -z "$CURRENT_CID" ]; then
  err "No running app container found. Start the stack first, then retry."
  exit 1
fi

DATA_VOLUME_NAME="$(get_data_volume_name_from_container "$CURRENT_CID")"
if [ -z "$DATA_VOLUME_NAME" ]; then
  err "Could not resolve /data volume from running app container."
  exit 1
fi

log "Backing up volume: $DATA_VOLUME_NAME"
log "Writing: $BACKUP_FILE"
docker run --rm \
  -v "$DATA_VOLUME_NAME:/data" \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine:3.20 \
  sh -lc 'set -e; cd /data; tar -czf "/backup/$(basename "'"$BACKUP_FILE"'")" menu.db menu.db-wal menu.db-shm 2>/dev/null || tar -czf "/backup/$(basename "'"$BACKUP_FILE"'")" menu.db'

log "Backup completed: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
