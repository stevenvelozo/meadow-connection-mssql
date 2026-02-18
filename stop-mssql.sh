#!/bin/bash
# Stop and remove the MSSQL test server Docker container

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Stopping MSSQL test server..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" down -v

echo "MSSQL test server stopped and volumes removed."
