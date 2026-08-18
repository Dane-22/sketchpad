#!/bin/sh
set -e

echo "=== ENG PLANNER Backend Startup ==="

# Function to extract host and port from DATABASE_URL
# Example: mysql://user:pass@mysql:3306/eng_planner
if [ -n "$DATABASE_URL" ]; then
  # Strip protocol
  PROTO_REMOVED=$(echo "$DATABASE_URL" | sed -e 's|^[^/]*//||')
  # Extract host and port part
  HOST_PORT=$(echo "$PROTO_REMOVED" | sed -e 's|^.*@||' | cut -d'/' -f1)
  DB_HOST=$(echo "$HOST_PORT" | cut -d':' -f1)
  DB_PORT=$(echo "$HOST_PORT" | cut -s -d':' -f2)
  DB_PORT=${DB_PORT:-3306}
else
  DB_HOST=${DB_HOST:-mysql}
  DB_PORT=${DB_PORT:-3306}
fi

echo "Waiting for database at $DB_HOST:$DB_PORT to be ready..."

MAX_RETRIES=60
COUNT=0

while ! nc -z "$DB_HOST" "$DB_PORT" >/dev/null 2>&1; do
  COUNT=$((COUNT + 1))
  if [ $COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Timed out waiting for database at $DB_HOST:$DB_PORT"
    exit 1
  fi
  echo "Database not ready yet... retry $COUNT/$MAX_RETRIES (sleeping 2s)"
  sleep 2
done

echo "Database is reachable! Synchronizing Prisma schema..."

# Push Prisma schema (creates/updates tables if needed without data loss)
npx prisma db push --skip-generate || echo "Warning: prisma db push exited with non-zero code; proceeding..."

echo "Starting backend server..."
exec "$@"
