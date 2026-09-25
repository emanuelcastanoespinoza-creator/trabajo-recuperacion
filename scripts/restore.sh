#!/usr/bin/env bash
# Restaura la base de datos. Sin argumentos usa el backup más reciente.
#   ./scripts/restore.sh
#   ./scripts/restore.sh backups/securedesk-2026-09-25T10-00-00-000Z.db
set -euo pipefail
cd "$(dirname "$0")/.."
node --disable-warning=ExperimentalWarning scripts/restore.js "$@"
