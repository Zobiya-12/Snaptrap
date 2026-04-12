#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  SNAPTRAP Honeypot Entrypoint
#  Waits for DB and API to be ready, then starts honeypot.py
# ═══════════════════════════════════════════════════════════════

set -e

echo "⏳ Waiting for PostgreSQL..."
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(
        host=os.getenv('DB_HOST','db'),
        database=os.getenv('DB_NAME','snaptrap'),
        user=os.getenv('DB_USER','snaptrap_user'),
        password=os.getenv('DB_PASS','snaptrap2024'),
        port=int(os.getenv('DB_PORT',5432))
    ).close()
    sys.exit(0)
except Exception as e:
    import sys
    print('DB ERROR:', e, flush=True)
    sys.exit(1)
"; do
  sleep 2
done
echo "✓ PostgreSQL ready"

echo "⏳ Waiting for API (http://api:5000/api/health)..."
until curl -sf http://api:5000/api/health > /dev/null 2>&1; do
  sleep 2
done
echo "✓ API ready"

echo "🍯 Starting Honeypot engine..."
exec python honeypot.py
