#!/bin/sh
set -e

echo "Waiting for PostgreSQL..."
until python - <<'PY'
import os, sys
import psycopg
url = os.environ.get("DATABASE_URL", "").replace("postgresql+psycopg://", "postgresql://")
try:
    with psycopg.connect(url, connect_timeout=3):
        pass
except Exception:
    sys.exit(1)
PY
do
  sleep 2
done

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
