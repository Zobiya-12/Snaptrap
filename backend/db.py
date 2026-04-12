import psycopg2
import psycopg2.extras
import os
from dotenv import load_dotenv
from datetime import datetime
from colorama import Fore, init

init(autoreset=True)
load_dotenv()

# ─────────────────────────────────────────
# CONNECTION
# ─────────────────────────────────────────
def get_conn():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        database=os.getenv('DB_NAME', 'snaptrap'),
        user=os.getenv('DB_USER', 'snaptrap_user'),
        password=os.getenv('DB_PASS', 'snaptrap2024'),
        port=os.getenv('DB_PORT', 5432)
    )


# ─────────────────────────────────────────
# INITIALIZE ALL TABLES
# ─────────────────────────────────────────
def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # Table 1 — organisations (multi-user support)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS organisations (
            id           SERIAL PRIMARY KEY,
            name         TEXT NOT NULL,
            email        TEXT UNIQUE NOT NULL,
            password     TEXT NOT NULL,
            role         TEXT DEFAULT 'org',
            created_at   TIMESTAMP DEFAULT NOW(),
            agent_token  TEXT UNIQUE
        )
    """)

    # Table 2 — attacks (core honeypot data)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attacks (
            id            SERIAL PRIMARY KEY,
            timestamp     TIMESTAMP DEFAULT NOW(),
            attacker_ip   TEXT NOT NULL,
            service       TEXT NOT NULL,
            port          INTEGER,
            payload       TEXT,
            threat_score  INTEGER DEFAULT 0,
            attack_type   TEXT,
            org_id        INTEGER REFERENCES organisations(id)
        )
    """)

    # Table 3 — attackers (unique IP profiles)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS attackers (
            id           SERIAL PRIMARY KEY,
            ip_address   TEXT NOT NULL,
            first_seen   TIMESTAMP DEFAULT NOW(),
            last_seen    TIMESTAMP DEFAULT NOW(),
            total_hits   INTEGER DEFAULT 1,
            country      TEXT DEFAULT 'Unknown',
            risk_level   TEXT DEFAULT 'low',
            org_id       INTEGER REFERENCES organisations(id)
        )
    """)

    # ── Deduplicate attackers before creating unique index ──
    # Keeps the row with the highest total_hits; deletes the rest.
    cur.execute("""
        DELETE FROM attackers
        WHERE id NOT IN (
            SELECT DISTINCT ON (ip_address, org_id) id
            FROM attackers
            ORDER BY ip_address, org_id, total_hits DESC, id DESC
        )
    """)

    # ── Unique index so upserts work correctly ──
    # Placed HERE in init_db (not in insert_attack) so it only runs once,
    # never inside a per-row transaction loop.
    cur.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_attackers_ip_org
        ON attackers (ip_address, org_id)
    """)

    # Table 4 — ml_predictions (classifier output)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS ml_predictions (
            id              SERIAL PRIMARY KEY,
            attack_id       INTEGER REFERENCES attacks(id),
            predicted_type  TEXT,
            confidence      FLOAT,
            timestamp       TIMESTAMP DEFAULT NOW()
        )
    """)

    # Table 5 — benchmark_results (HPC speedup data)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS benchmark_results (
            id               SERIAL PRIMARY KEY,
            thread_count     INTEGER,
            events_per_sec   FLOAT,
            test_duration    FLOAT,
            mode             TEXT,
            timestamp        TIMESTAMP DEFAULT NOW()
        )
    """)

    # Table 6 — service_status (control panel data)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS service_status (
            id            SERIAL PRIMARY KEY,
            service_name  TEXT UNIQUE,
            port          INTEGER,
            status        TEXT DEFAULT 'running',
            started_at    TIMESTAMP DEFAULT NOW(),
            events_caught INTEGER DEFAULT 0,
            org_id        INTEGER REFERENCES organisations(id)
        )
    """)

    # Table 7 — red_team_accounts
    cur.execute("""
        CREATE TABLE IF NOT EXISTS red_team_accounts (
            id          SERIAL PRIMARY KEY,
            name        TEXT NOT NULL,
            email       TEXT UNIQUE NOT NULL,
            password    TEXT NOT NULL,
            role        TEXT DEFAULT 'redteam',
            org_id      INTEGER NOT NULL REFERENCES organisations(id),
            created_at  TIMESTAMP DEFAULT NOW()
        )
    """)

    # Table 8 — redteam_runs
    cur.execute("""
        CREATE TABLE IF NOT EXISTS redteam_runs (
            id               SERIAL PRIMARY KEY,
            redteam_id       INTEGER REFERENCES red_team_accounts(id),
            org_id           INTEGER REFERENCES organisations(id),
            mode             TEXT DEFAULT 'demo',
            status           TEXT DEFAULT 'running',
            total_attacks    INTEGER DEFAULT 0,
            detected         INTEGER DEFAULT 0,
            missed           INTEGER DEFAULT 0,
            detection_score  FLOAT,
            started_at       TIMESTAMP DEFAULT NOW(),
            completed_at     TIMESTAMP
        )
    """)

    # Insert default superadmin
    cur.execute("""
        INSERT INTO organisations (name, email, password, role, agent_token)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
    """, ('SNAPTRAP Admin', 'admin@snaptrap.io', 'admin2024', 'superadmin', 'ADMIN-TOKEN-001'))

    # Insert Demo Org
    cur.execute("""
        INSERT INTO organisations (name, email, password, role, agent_token)
        VALUES ('SNAPTRAP Demo', 'demo@snaptrap.io', 'Demo@2024', 'org', 'DEMO-TOKEN-001')
        ON CONFLICT (email) DO NOTHING
    """)

    # Seed default service_status rows for demo org once it exists
    cur.execute("SELECT id FROM organisations WHERE email='demo@snaptrap.io'")
    demo_row = cur.fetchone()
    if demo_row:
        demo_id = demo_row[0]
        for svc, port in [('SSH',2222),('HTTP',8080),('FTP',2121),('DB',3306)]:
            cur.execute("""
                INSERT INTO service_status(service_name,port,status,org_id)
                VALUES(%s,%s,'running',%s) ON CONFLICT DO NOTHING
            """, (svc, port, demo_id))

    conn.commit()
    cur.close()
    conn.close()
    print(f"{Fore.GREEN}Database initialized — all 8 tables ready")
    print(f"{Fore.CYAN}Demo org: demo@snaptrap.io / Demo@2024 (agent token: DEMO-TOKEN-001)")


# ─────────────────────────────────────────
# INSERT ATTACK
# ─────────────────────────────────────────
def insert_attack(attacker_ip, service, port, payload, threat_score, attack_type, org_id=1):
    conn = get_conn()
    cur = conn.cursor()

    # Insert the attack row
    cur.execute("""
        INSERT INTO attacks (attacker_ip, service, port, payload, threat_score, attack_type, org_id)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (attacker_ip, service, port, payload, threat_score, attack_type, org_id))
    attack_id = cur.fetchone()[0]

    # Upsert attacker profile — relies on uq_attackers_ip_org index created in init_db()
    cur.execute("""
        INSERT INTO attackers (ip_address, org_id, total_hits, risk_level)
        VALUES (%s, %s, 1,
            CASE WHEN %s >= 70 THEN 'high'
                 WHEN %s >= 40 THEN 'medium'
                 ELSE 'low' END)
        ON CONFLICT (ip_address, org_id) DO UPDATE
            SET total_hits = attackers.total_hits + 1,
                last_seen  = NOW(),
                risk_level = CASE
                    WHEN %s >= 70 THEN 'high'
                    WHEN %s >= 40 THEN 'medium'
                    ELSE 'low' END
    """, (attacker_ip, org_id,
          threat_score, threat_score,
          threat_score, threat_score))

    conn.commit()
    cur.close()
    conn.close()
    return attack_id


# ─────────────────────────────────────────
# INSERT ML PREDICTION
# ─────────────────────────────────────────
def insert_prediction(attack_id, predicted_type, confidence):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO ml_predictions (attack_id, predicted_type, confidence)
        VALUES (%s, %s, %s)
    """, (attack_id, predicted_type, confidence))
    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────
# INSERT BENCHMARK RESULT
# ─────────────────────────────────────────
def insert_benchmark(thread_count, events_per_sec, duration, mode='threading'):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO benchmark_results (thread_count, events_per_sec, test_duration, mode)
        VALUES (%s, %s, %s, %s)
    """, (thread_count, events_per_sec, duration, mode))
    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────
# FETCH ATTACKS (for API)
# ─────────────────────────────────────────
def get_recent_attacks(limit=50, org_id=None):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    if org_id:
        cur.execute("""
            SELECT * FROM attacks
            WHERE org_id = %s
            ORDER BY timestamp DESC LIMIT %s
        """, (org_id, limit))
    else:
        cur.execute("""
            SELECT * FROM attacks
            ORDER BY timestamp DESC LIMIT %s
        """, (limit,))
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# FETCH STATS
# ─────────────────────────────────────────
def get_stats(org_id=None):
    conn = get_conn()
    cur = conn.cursor()

    if org_id:
        cur.execute("SELECT COUNT(*) FROM attacks WHERE org_id = %s", (org_id,))
        total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT attacker_ip) FROM attacks WHERE org_id = %s", (org_id,))
        unique_ips = cur.fetchone()[0]

        cur.execute("""
            SELECT service, COUNT(*) FROM attacks
            WHERE org_id = %s
            GROUP BY service ORDER BY COUNT(*) DESC
        """, (org_id,))
        by_service = dict(cur.fetchall())

        cur.execute("""
            SELECT attack_type, COUNT(*) FROM attacks
            WHERE org_id = %s
            GROUP BY attack_type ORDER BY COUNT(*) DESC
        """, (org_id,))
        by_type = dict(cur.fetchall())

        cur.execute("SELECT AVG(threat_score) FROM attacks WHERE org_id = %s", (org_id,))
        avg_score = round(cur.fetchone()[0] or 0, 1)
    else:
        cur.execute("SELECT COUNT(*) FROM attacks")
        total = cur.fetchone()[0]

        cur.execute("SELECT COUNT(DISTINCT attacker_ip) FROM attacks")
        unique_ips = cur.fetchone()[0]

        cur.execute("SELECT service, COUNT(*) FROM attacks GROUP BY service ORDER BY COUNT(*) DESC")
        by_service = dict(cur.fetchall())

        cur.execute("SELECT attack_type, COUNT(*) FROM attacks GROUP BY attack_type ORDER BY COUNT(*) DESC")
        by_type = dict(cur.fetchall())

        cur.execute("SELECT AVG(threat_score) FROM attacks")
        avg_score = round(cur.fetchone()[0] or 0, 1)

    cur.close()
    conn.close()

    return {
        'total_attacks':    total,
        'unique_ips':       unique_ips,
        'by_service':       by_service,
        'by_type':          by_type,
        'avg_threat_score': avg_score,
    }


# ─────────────────────────────────────────
# FETCH BENCHMARK RESULTS
# ─────────────────────────────────────────
def get_benchmarks():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT * FROM benchmark_results
        ORDER BY timestamp DESC LIMIT 20
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# FETCH ORGANISATIONS (superadmin only)
# ─────────────────────────────────────────
def get_organisations():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("""
        SELECT id, name, email, role, created_at,
               (SELECT COUNT(*) FROM attacks WHERE org_id = organisations.id) as attack_count
        FROM organisations
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


if __name__ == "__main__":
    init_db()
