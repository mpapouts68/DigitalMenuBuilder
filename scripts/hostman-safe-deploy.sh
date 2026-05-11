#!/usr/bin/env bash
set -euo pipefail

# Safe deploy for Hostman/Docker Compose with SQLite persistence.
# - Backs up the live DB from the active /data volume
# - Rebuilds and starts app (migrations run on startup)
# - Health-checks /health
# - Restores DB backup automatically on failure
#
# Usage on server:
#   chmod +x scripts/hostman-safe-deploy.sh
#   ./scripts/hostman-safe-deploy.sh
#
# Optional env:
#   HEALTH_URL=http://localhost:5000/health
#   HEALTH_TIMEOUT_SECONDS=120
#   COMPOSE_FILE=docker-compose.yml

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
HEALTH_URL="${HEALTH_URL:-http://localhost:5000/health}"
HEALTH_TIMEOUT_SECONDS="${HEALTH_TIMEOUT_SECONDS:-120}"
ENV_FILE=".env"
APP_SERVICE="app"
BACKUP_DIR="backups"

log() { printf '[deploy] %s\n' "$*"; }
err() { printf '[deploy][error] %s\n' "$*" >&2; }

if ! command -v docker >/dev/null 2>&1; then
  err "docker is not installed."
  exit 1
fi

if [ ! -f "$COMPOSE_FILE" ]; then
  err "Compose file not found: $COMPOSE_FILE"
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  err ".env not found. Create it before deploy."
  exit 1
fi

mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/menu-db-$STAMP.tgz"

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

backup_volume_db() {
  local volume_name="$1"
  log "Creating DB backup: $BACKUP_FILE"
  docker run --rm \
    -v "$volume_name:/data" \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    alpine:3.20 \
    sh -lc 'set -e; cd /data; tar -czf "/backup/$(basename "'"$BACKUP_FILE"'")" menu.db menu.db-wal menu.db-shm 2>/dev/null || tar -czf "/backup/$(basename "'"$BACKUP_FILE"'")" menu.db'
}

restore_volume_db() {
  local volume_name="$1"
  local backup_file="$2"
  log "Restoring DB backup from $backup_file"
  docker run --rm \
    -v "$volume_name:/data" \
    -v "$(pwd)/$BACKUP_DIR:/backup" \
    alpine:3.20 \
    sh -lc 'set -e; cd /data; rm -f menu.db menu.db-wal menu.db-shm; tar -xzf "/backup/$(basename "'"$backup_file"'")"'
}

wait_for_health() {
  local deadline=$((SECONDS + HEALTH_TIMEOUT_SECONDS))
  while [ "$SECONDS" -lt "$deadline" ]; do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  return 1
}

rollback() {
  local volume_name="$1"
  log "Deploy failed. Starting rollback."
  compose down --remove-orphans || true
  restore_volume_db "$volume_name" "$BACKUP_FILE"
  compose up -d
  if wait_for_health; then
    log "Rollback succeeded and app is healthy."
  else
    err "Rollback completed but health check is still failing."
  fi
}

log "Resolving current app container and data volume"
CURRENT_CID="$(get_app_container_id || true)"
if [ -z "$CURRENT_CID" ]; then
  err "No running app container found. Start current stack first, then retry."
  exit 1
fi

DATA_VOLUME_NAME="$(get_data_volume_name_from_container "$CURRENT_CID")"
if [ -z "$DATA_VOLUME_NAME" ]; then
  err "Could not resolve /data volume name from running app container."
  exit 1
fi

backup_volume_db "$DATA_VOLUME_NAME"
log "Backup completed."

set +e
log "Rebuilding and starting containers (migrations run at startup)."
compose up -d --build
UP_EXIT=$?

if [ "$UP_EXIT" -ne 0 ]; then
  err "docker compose up failed."
  rollback "$DATA_VOLUME_NAME"
  exit 1
fi

log "Waiting for health: $HEALTH_URL"
if ! wait_for_health; then
  err "Health check failed after deploy."
  rollback "$DATA_VOLUME_NAME"
  exit 1
fi
set -e

log "Deployment succeeded."
log "Backup kept at: $BACKUP_FILE"
compose logs "$APP_SERVICE" --tail 120
