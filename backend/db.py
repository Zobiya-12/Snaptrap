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
        host=os.getenv('DB_HOST'),
        database=os.getenv('DB_NAME'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASS'),
        port=os.getenv('DB_PORT', 5432)
    )


# ─────────────────────────────────────────
# INITIALIZE ALL TABLES
# ─────────────────────────────────────────
def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # Table 1 — organisations (multi-user support)
    # password_hash stores Argon2id hash — password col kept for migration safety
    cur.execute("""
        CREATE TABLE IF NOT EXISTS organisations (
            id            SERIAL PRIMARY KEY,
            name          TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password      TEXT,
            password_hash TEXT,
            role          TEXT DEFAULT 'org',
            created_at    TIMESTAMP DEFAULT NOW(),
            agent_token   TEXT UNIQUE,
            ngrok_url     TEXT
        )
    """)

    # Add password_hash and ngrok_url if upgrading from old schema
    cur.execute("""
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS password_hash TEXT
    """)
    cur.execute("""
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS ngrok_url TEXT
    """)

    # Email verification + terms / training-data consent.
    # email_verified DEFAULT TRUE grandfathers every existing and seeded account;
    # the signup route explicitly inserts FALSE for new self-registered orgs.
    cur.execute("""
        ALTER TABLE organisations
        ADD COLUMN IF NOT EXISTS email_verified    BOOLEAN NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS verify_token_hash TEXT,
        ADD COLUMN IF NOT EXISTS verify_expires   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS verify_sent_at   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS terms_version     TEXT,
        ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP,
        ADD COLUMN IF NOT EXISTS training_opt_out  BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMP
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

    # Where did the row come from? Pre-existing rows are 'unlabelled' because nobody recorded it;
    # new rows are 'real' (honeypot sensor / agents) or 'simulated' (simulator, dashboard waves).
    cur.execute("""
        ALTER TABLE attacks
        ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'unlabelled'
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

    # Deduplicate attackers before creating unique index
    cur.execute("""
        DELETE FROM attackers
        WHERE id NOT IN (
            SELECT DISTINCT ON (ip_address, org_id) id
            FROM attackers
            ORDER BY ip_address, org_id, total_hits DESC, id DESC
        )
    """)

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
            service_name  TEXT,
            port          INTEGER,
            status        TEXT DEFAULT 'running',
            started_at    TIMESTAMP DEFAULT NOW(),
            events_caught INTEGER DEFAULT 0,
            org_id        INTEGER REFERENCES organisations(id),
            UNIQUE (service_name, org_id)
        )
    """)

    # Table 7 — red_team_accounts
    cur.execute("""
        CREATE TABLE IF NOT EXISTS red_team_accounts (
            id            SERIAL PRIMARY KEY,
            name          TEXT NOT NULL,
            email         TEXT UNIQUE NOT NULL,
            password      TEXT,
            password_hash TEXT,
            role          TEXT DEFAULT 'redteam',
            org_id        INTEGER NOT NULL REFERENCES organisations(id),
            created_at    TIMESTAMP DEFAULT NOW()
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

    # Table 9 — agents (NetworkAgentConsole)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id            SERIAL PRIMARY KEY,
            org_id        INTEGER NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
            agent_id      TEXT NOT NULL UNIQUE,
            org_name      TEXT,
            location      TEXT DEFAULT 'Unknown',
            status        TEXT DEFAULT 'offline',
            events_today  INTEGER DEFAULT 0,
            version       TEXT DEFAULT '1.0.0',
            iface         TEXT DEFAULT 'eth0',
            last_seen     TIMESTAMP,
            last_ip       TEXT,
            created_at    TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("CREATE INDEX IF NOT EXISTS idx_agents_org_id ON agents (org_id)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_agents_status  ON agents (status)")

    # Table 10-12 — shared rate limits and honeypot blocking (survive restarts, shared by processes)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS rate_limits (
            key          TEXT PRIMARY KEY,
            window_start TIMESTAMPTZ NOT NULL,
            hits         INTEGER NOT NULL
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS blocked_ips (
            ip            INET PRIMARY KEY,
            reason        TEXT,
            hits          INTEGER NOT NULL DEFAULT 1,
            blocked_until TIMESTAMPTZ NOT NULL,
            created_at    TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS allow_ips (
            ip   INET PRIMARY KEY,
            note TEXT
        )
    """)

    # ── Admin and demo accounts are created by entrypoint.sh from ADMIN_* / DEMO_* env vars.
    #    (They used to be hardcoded here as admin@snaptrap.io / demo@snaptrap.io with public tokens
    #    ADMIN-TOKEN-001 / DEMO-TOKEN-001, which anyone reading the repo could use.)

    # Seed default service_status for the demo org, if it exists
    demo_email = (os.getenv('DEMO_EMAIL') or '').strip().lower()
    if demo_email:
        cur.execute("SELECT id FROM organisations WHERE email=%s", (demo_email,))
        demo_row = cur.fetchone()
        if demo_row:
            for svc, port in [('SSH', 2222), ('HTTP', 8080), ('FTP', 2121), ('DB', 3306)]:
                cur.execute("""
                    INSERT INTO service_status(service_name, port, status, org_id)
                    VALUES(%s, %s, 'running', %s)
                    ON CONFLICT (service_name, org_id) DO NOTHING
                """, (svc, port, demo_row[0]))

    conn.commit()
    cur.close()
    conn.close()
    print(f"{Fore.GREEN}Database initialized — all 9 tables ready")
# ─────────────────────────────────────────
# INSERT ATTACK
# ─────────────────────────────────────────
def insert_attack(attacker_ip, service, port, payload, threat_score, attack_type, org_id=1, source='real'):
    conn = get_conn()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO attacks (attacker_ip, service, port, payload, threat_score, attack_type, org_id, source)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
    """, (attacker_ip, service, port, payload, threat_score, attack_type, org_id, source))
    attack_id = cur.fetchone()[0]

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
        cur.execute("SELECT service, COUNT(*) FROM attacks WHERE org_id = %s GROUP BY service ORDER BY COUNT(*) DESC", (org_id,))
        by_service = dict(cur.fetchall())
        cur.execute("SELECT attack_type, COUNT(*) FROM attacks WHERE org_id = %s GROUP BY attack_type ORDER BY COUNT(*) DESC", (org_id,))
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
    cur.execute("SELECT * FROM benchmark_results ORDER BY timestamp DESC LIMIT 20")
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
        SELECT id, name, email, role, created_at, email_verified, training_opt_out,
               deletion_requested_at,
               (SELECT COUNT(*) FROM attacks WHERE org_id = organisations.id) as attack_count
        FROM organisations
        ORDER BY created_at DESC
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return [dict(r) for r in rows]


# ─────────────────────────────────────────
# RATE LIMITS (fixed window, atomic, shared across processes)
# ─────────────────────────────────────────
def rate_limit_hit(key, limit, window_s):
    """Count one hit for `key`. Returns True while the caller is within `limit` per `window_s`."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO rate_limits (key, window_start, hits) VALUES (%s, NOW(), 1)
        ON CONFLICT (key) DO UPDATE SET
            hits = CASE WHEN rate_limits.window_start < NOW() - (%s * interval '1 second')
                        THEN 1 ELSE rate_limits.hits + 1 END,
            window_start = CASE WHEN rate_limits.window_start < NOW() - (%s * interval '1 second')
                        THEN NOW() ELSE rate_limits.window_start END
        RETURNING hits
    """, (key[:200], window_s, window_s))
    hits = cur.fetchone()[0]
    conn.commit()
    cur.close()
    conn.close()
    return hits <= limit


def rate_limit_count(key, window_s):
    """Hits recorded for `key` in the current window, without counting a new one."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT hits FROM rate_limits
        WHERE key = %s AND window_start >= NOW() - (%s * interval '1 second')
    """, (key[:200], window_s))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else 0


def rate_limit_reset(key):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM rate_limits WHERE key = %s", (key[:200],))
    conn.commit()
    cur.close()
    conn.close()


# ─────────────────────────────────────────
# HONEYPOT BLOCKING (with TTL) + ALLOW-LIST
# ─────────────────────────────────────────
def block_ip(ip, reason, ttl_s):
    """Block `ip` for ttl_s seconds. `hits` counts how many times it has been blocked (repeat offenders)."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO blocked_ips (ip, reason, hits, blocked_until)
        VALUES (%s, %s, 1, NOW() + (%s * interval '1 second'))
        ON CONFLICT (ip) DO UPDATE SET
            reason = EXCLUDED.reason,
            hits = blocked_ips.hits + 1,
            blocked_until = EXCLUDED.blocked_until
    """, (ip, reason[:200], ttl_s))
    conn.commit()
    cur.close()
    conn.close()


def block_offences(ip):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT hits FROM blocked_ips WHERE ip = %s", (ip,))
    row = cur.fetchone()
    cur.close()
    conn.close()
    return row[0] if row else 0


def unblock_ip(ip):
    """Ends the block now but keeps the offence count, so a repeat offender still gets a longer TTL."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE blocked_ips SET blocked_until = NOW() WHERE ip = %s AND blocked_until > NOW()", (ip,))
    n = cur.rowcount
    conn.commit()
    cur.close()
    conn.close()
    return n


def active_blocks():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT host(ip), reason, hits, EXTRACT(EPOCH FROM blocked_until), blocked_until
        FROM blocked_ips WHERE blocked_until > NOW() ORDER BY blocked_until DESC
    """)
    rows = [{"ip": r[0], "reason": r[1], "hits": r[2], "until": float(r[3]),
             "until_iso": r[4].isoformat()} for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def allowed_ips():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT host(ip), note FROM allow_ips ORDER BY ip")
    rows = [{"ip": r[0], "note": r[1]} for r in cur.fetchall()]
    cur.close()
    conn.close()
    return rows


def allow_ip_add(ip, note=""):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO allow_ips (ip, note) VALUES (%s, %s) "
                "ON CONFLICT (ip) DO UPDATE SET note = EXCLUDED.note", (ip, note))
    conn.commit()
    cur.close()
    conn.close()


def allow_ip_remove(ip):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM allow_ips WHERE ip = %s", (ip,))
    conn.commit()
    cur.close()
    conn.close()


def purge_stale():
    """Housekeeping: old rate-limit windows and long-expired blocks."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM rate_limits WHERE window_start < NOW() - interval '1 day'")
    cur.execute("DELETE FROM blocked_ips WHERE blocked_until < NOW() - interval '7 days'")
    conn.commit()
    cur.close()
    conn.close()


if __name__ == "__main__":
    init_db()
