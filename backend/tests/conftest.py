"""
Shared fixtures. Needs a reachable Postgres (CI provides one; locally use docker compose db).
Env defaults below match the CI service container.
"""
import os
import sys

os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")
os.environ.setdefault("DB_NAME", "snaptrap")
os.environ.setdefault("DB_USER", "snaptrap_user")
os.environ.setdefault("DB_PASS", "snaptrap2024")
os.environ.setdefault("FLASK_SECRET", "test-secret-key-for-ci-0123456789abcdef")
os.environ.setdefault("NGROK_HOST", "localhost")

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

ORG_EMAIL,   ORG_PASSWORD   = "org@test.dev",   "Org-Passw0rd-2026!"
ADMIN_EMAIL, ADMIN_PASSWORD = "admin@test.dev", "Adm!n-Passw0rd-2026"
RT_EMAIL,    RT_PASSWORD    = "red@test.dev",   "Red-Passw0rd-2026!"
AGENT_TOKEN = "snt_test_agent_token"


@pytest.fixture(scope="session")
def db():
    from db import init_db, get_conn
    from auth.password_security import hash_password
    init_db()
    conn = get_conn(); cur = conn.cursor()
    for name, email, pw, role, tok in [
        ("Test Org",   ORG_EMAIL,   ORG_PASSWORD,   "org",        AGENT_TOKEN),
        ("Test Admin", ADMIN_EMAIL, ADMIN_PASSWORD, "superadmin", "snt_test_admin_token"),
    ]:
        cur.execute("""
            INSERT INTO organisations (name,email,password_hash,role,agent_token)
            VALUES (%s,%s,%s,%s,%s)
            ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash, agent_token=EXCLUDED.agent_token
        """, (name, email, hash_password(pw), role, tok))
    cur.execute("SELECT id FROM organisations WHERE email=%s", (ORG_EMAIL,))
    org_id = cur.fetchone()[0]
    cur.execute("""
        INSERT INTO red_team_accounts (name,email,password_hash,org_id) VALUES ('Red',%s,%s,%s)
        ON CONFLICT (email) DO UPDATE SET password_hash=EXCLUDED.password_hash
    """, (RT_EMAIL, hash_password(RT_PASSWORD), org_id))
    conn.commit(); cur.close(); conn.close()
    return {"org_id": org_id}


@pytest.fixture()
def client(db):
    import app as app_module
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


@pytest.fixture()
def login(client):
    def _login(email, password):
        r = client.post("/api/auth/login", json={"email": email, "password": password})
        assert r.status_code == 200, r.get_json()
        return {"Authorization": "Bearer " + r.get_json()["token"]}
    return _login


@pytest.fixture()
def isolated_model(tmp_path, monkeypatch):
    """Point classifier at an empty temp model dir so tests never touch a real model."""
    import classifier
    monkeypatch.setattr(classifier, "MODEL_PATH", str(tmp_path / "classifier.pkl"))
    monkeypatch.setattr(classifier, "METRICS_PATH", str(tmp_path / "metrics.json"))
    monkeypatch.setattr(classifier, "_model_cache", {"model": None, "mtime": None})
    return classifier


@pytest.fixture()
def seed_attacks(db):
    """Factory: wipe attack data, then insert labelled attacks {type: count}."""
    def _seed(counts):
        import random
        import attack_corpus
        from db import get_conn, insert_attack
        conn = get_conn(); cur = conn.cursor()
        cur.execute("TRUNCATE ml_predictions, attackers, attacks RESTART IDENTITY CASCADE")
        conn.commit(); cur.close(); conn.close()
        random.seed(7)
        for kind, n in counts.items():
            for _ in range(n):
                a = attack_corpus._one(kind, f"203.0.113.{random.randint(1, 250)}")
                insert_attack(a["attacker_ip"], a["service"], a["port"], a["payload"],
                              a["threat_score"], kind, db["org_id"])
    return _seed
