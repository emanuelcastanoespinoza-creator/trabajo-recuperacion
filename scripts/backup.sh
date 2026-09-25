#!/usr/bin/env bash
# Crea un respaldo de la base de datos. Programable con cron, por ejemplo cada día a las 2 a. m.:
#   0 2 * * * cd /ruta/securedesk-adso && ./scripts/backup.sh >> logs/backup.log 2>&1
set -euo pipefail
cd "$(dirname "$0")/.."
node --disable-warning=ExperimentalWarning scripts/backup.js
