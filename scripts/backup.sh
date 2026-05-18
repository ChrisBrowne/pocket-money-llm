#!/bin/bash
# Daily backup for Pocket Money Tracker (ADR-0008).
#
# Run by cron as root inside the LXC. Calls the app's export API over
# loopback and writes the JSON response to the network-mounted share at
# /mnt/backups (Windows host, Backblaze-backed). Filename is ISO-8601 UTC.

set -euo pipefail

# Load BACKUP_API_KEY from the app's env file.
# shellcheck disable=SC1091
set -a
source /opt/pocket-money/.env
set +a

BACKUP_DIR=/mnt/backups
TIMESTAMP=$(date -u +%Y-%m-%dT%H-%M-%S)
OUTPUT="${BACKUP_DIR}/pocket-money-${TIMESTAMP}.json"

curl --silent --show-error --fail \
  --header "Authorization: Bearer ${BACKUP_API_KEY}" \
  --output "${OUTPUT}" \
  http://127.0.0.1:3000/api/backup

echo "Backup written: ${OUTPUT}"
