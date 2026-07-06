#!/bin/bash
set -e

echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT} ..."
# Inside entrypoint.sh
until python -c "
import psycopg2, os, sys
try:
    psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        port=int(os.getenv('DB_PORT', 5432))
    ).close()
    sys.exit(0)
except Exception as e:
    print('REASON:', e, flush=True)
    sys.exit(1)
"; do
  echo "  DB not ready yet — retrying in 2s ..."
  sleep 2
done

echo "✓ PostgreSQL ready"
echo "🛠  Initialising database tables ..."

python -c "
from db import init_db
init_db()
print('✓ Tables ready')
"

echo "👤 Seeding admin and demo accounts ..."

python -c "
import os
from db import get_conn

conn = get_conn()
cur = conn.cursor()

# ── Demo account ──────────────────────────────────────────────
demo_name  = os.getenv('DEMO_NAME',  'SNAPTRAP Demo')
demo_email = os.getenv('DEMO_EMAIL')
demo_token = os.getenv('DEMO_TOKEN')
demo_hash  = os.getenv('DEMO_HASH')

# ── Admin account ─────────────────────────────────────────────
admin_name  = os.getenv('ADMIN_NAME',  'SNAPTRAP Admin')
admin_email = os.getenv('ADMIN_EMAIL')
admin_role  = os.getenv('ADMIN_ROLE',  'superadmin')
admin_token = os.getenv('ADMIN_TOKEN')
admin_hash  = os.getenv('ADMIN_HASH')

if not all([demo_email, demo_token, demo_hash]):
    print('WARNING: Demo account env vars missing — skipping demo seed')
else:
    cur.execute('''
        INSERT INTO organisations (name, email, password_hash, role, agent_token)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                agent_token = EXCLUDED.agent_token
    ''', (demo_name, demo_email, demo_hash, 'org', demo_token))
    print(f'✓ Demo account ready: {demo_email}')

if not all([admin_email, admin_token, admin_hash]):
    print('WARNING: Admin account env vars missing — skipping admin seed')
else:
    cur.execute('''
        INSERT INTO organisations (name, email, password_hash, role, agent_token)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (email) DO UPDATE
            SET password_hash = EXCLUDED.password_hash,
                agent_token = EXCLUDED.agent_token
    ''', (admin_name, admin_email, admin_hash, admin_role, admin_token))
    print(f'✓ Admin account ready: {admin_email}')

conn.commit()
cur.close()
conn.close()
"

echo "🚀 Starting Flask API on port ${FLASK_PORT:-5000} ..."
exec python app.py
