#!/bin/bash
# Start the MSSQL test server in Docker
# Uses port 21433 to avoid conflicts with any local MSSQL instance
# Uses linux/amd64 platform (runs under Rosetta on Apple Silicon)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting MSSQL test server on port 21433..."
docker compose -f "${SCRIPT_DIR}/docker-compose.yml" up -d

echo "Initializing database (will retry until MSSQL is ready)..."
node "${SCRIPT_DIR}/test/docker-init/init-db.js"

if [ $? -ne 0 ]; then
	echo "ERROR: Database initialization failed"
	exit 1
fi

echo ""
echo "MSSQL test server is ready on port 21433"
echo "  Host: 127.0.0.1"
echo "  Port: 21433"
echo "  User: sa"
echo "  Password: Retold1234567890!"
echo "  Database: bookstore"
