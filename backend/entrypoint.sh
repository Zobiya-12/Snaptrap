#!/bin/env bash
set -e # Exit immediately if a command exits with a non-zero status

echo "⏳ Waiting for PostgreSQL at ${DB_HOST}:${DB_PORT} ..."

# We use a Here-Doc 'EOF' to prevent Bash from expanding anything inside this Python script
python << 'EOF'
import psycopg2, os, sys

db_port = os.getenv('DB_PORT')
# Fallback to 5432 if DB_PORT is empty or unset
port = int(db_port) if db_port and db_port.strip() else 5432

try:
    psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        port=port
    ).close()
    sys.exit(0)
except Exception as e:
    print('REASON:', e, flush=True)
    sys.exit(1)
EOF

until [ $? -eq 0 ]; do
  echo "  DB not ready yet — retrying in 2s ..."
  sleep 2
  # Re-run connection check
  python << 'EOF'
import psycopg2, os, sys
db_port = os.getenv('DB_PORT')
port = int(db_port) if db_port and db_port.strip() else 5432
try:
    psycopg2.connect(
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        port=port
    ).close()
    sys.exit(0)
except Exception as e:
    sys.exit(1)
EOF
done

echo "✓ PostgreSQL ready"
echo "🛠  Initialising database tables ..."

python << 'EOF'
from db import init_db
init_db()
print('✓ Tables ready')
EOF

echo "👤 Seeding admin and demo accounts ..."

python << 'EOF'
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

print(f"DEBUG: admin_hash tail = ...{(admin_hash or 'NONE')[-10:]}")

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
EOF

echo "🚀 Starting Flask API on port ${FLASK_PORT:-5000} ..."
exec python app.py
