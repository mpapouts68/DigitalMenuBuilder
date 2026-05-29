#!/usr/bin/env bash
# Run on the server before deploy to confirm Viva vars are set (does not print secrets).
set -euo pipefail

ENV_FILE="${1:-.env}"
if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE — copy from .env.example and add VIVA_CLIENT_ID / VIVA_CLIENT_SECRET."
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

missing=0
for key in VIVA_CLIENT_ID VIVA_CLIENT_SECRET VIVA_SOURCE_CODE; do
  val="${!key:-}"
  if [ -z "$val" ]; then
    echo "NOT SET: $key"
    missing=1
  else
    echo "OK: $key"
  fi
done

echo "VIVA_ENVIRONMENT=${VIVA_ENVIRONMENT:-demo}"
echo "VIVA_SUCCESS_URL=${VIVA_SUCCESS_URL:-https://www.shishapoint.site/payment/success}"
echo "VIVA_FAILURE_URL=${VIVA_FAILURE_URL:-https://www.shishapoint.site/payment/failed}"

if [ "$missing" -ne 0 ]; then
  exit 1
fi
echo "Viva env looks ready for docker compose."
