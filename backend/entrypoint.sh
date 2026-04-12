#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  SNAPTRAP API Entrypoint
#  - Waits for Postgres to be truly ready
#  - Runs db init (creates tables + default accounts)
#  - Then starts Flask
# ═══════════════════════════════════════════════════════════════

set -e

echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT}..."

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
    print('REASON:', e, flush=True)
    sys.exit(1)
"; do
  echo "   DB not ready yet — retrying in 2s..."
  sleep 2
done

echo "✓ PostgreSQL is ready"
echo "⚙  Initialising database tables..."

python -c "
from db import init_db
init_db()
print('✓ Tables ready')

# Create demo account if it does not exist
import os, secrets
from db import get_conn
conn = get_conn()
cur  = conn.cursor()

demo_email = os.getenv('DEMO_EMAIL','demo@snaptrap.io')
demo_pass  = os.getenv('DEMO_PASS','Demo@2024')
demo_token = os.getenv('DEMO_TOKEN','DEMO-TOKEN-SNAPTRAP-001')

cur.execute(\"\"\"
    INSERT INTO organisations (name, email, password, role, agent_token)
    VALUES ('SNAPTRAP Demo', %s, %s, 'org', %s)
    ON CONFLICT (email) DO NOTHING
\"\"\", (demo_email, demo_pass, demo_token))

conn.commit()
cur.close()
conn.close()
print(f'✓ Demo account ready: {demo_email}')
"

echo "🚀 Starting Flask API on port ${FLASK_PORT:-5000}..."
exec python app.py
