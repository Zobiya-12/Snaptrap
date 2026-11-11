"""Signup consent, email verification and training opt-out."""
import json
import re

import pytest

import account_flow

PW = "Str0ng-Passw0rd-2026!"


@pytest.fixture()
def outbox(monkeypatch):
    """Capture outgoing mail instead of sending; also reset the in-memory rate limiter."""
    sent = []
    monkeypatch.setenv("EMAIL_VERIFICATION_REQUIRED", "1")
    monkeypatch.setattr(account_flow, "send_mail",
                        lambda to, subject, html, text=None: sent.append({"to": to, "text": text}) or True)
    account_flow._hits.clear()
    return sent


def _token(mail):
    return re.search(r"\?verify=([\w-]+)", mail["text"]).group(1)


def _signup(client, email, **over):
    body = {"name": "Acme", "email": email, "password": PW,
            "accept_terms": True, "terms_version": account_flow.TERMS_VERSION}
    body.update(over)
    return client.post("/api/auth/signup", json=body)


def _cleanup(email):
    from db import get_conn
    conn = get_conn(); cur = conn.cursor()
    cur.execute("DELETE FROM service_status WHERE org_id IN (SELECT id FROM organisations WHERE email=%s)", (email,))
    cur.execute("DELETE FROM organisations WHERE email=%s", (email,))
    conn.commit(); cur.close(); conn.close()


def test_signup_requires_terms(client, db, outbox):
    assert _signup(client, "t1@test.dev", accept_terms=False).status_code == 400
    r = _signup(client, "t1@test.dev", terms_version="1999-01-01")
    assert r.status_code == 409 and r.get_json()["code"] == "terms_changed"
    assert not outbox


def test_signup_rejects_bad_email_and_huge_password(client, db, outbox):
    assert _signup(client, "not-an-email").status_code == 400
    assert _signup(client, "t2@test.dev", password="A1!" + "a" * 200).status_code == 422


def test_full_verification_flow(client, db, outbox):
    email = "verify-me@test.dev"
    _cleanup(email)
    r = _signup(client, email)
    assert r.status_code == 201
    body = r.get_json()
    assert body["verification_required"] is True
    assert "token" not in body and "agent_token" not in body   # nothing usable before verifying
    assert len(outbox) == 1 and outbox[0]["to"] == email

    # correct password but unverified -> 403 with a machine-readable code
    r = client.post("/api/auth/login", json={"email": email, "password": PW})
    assert r.status_code == 403 and r.get_json()["code"] == "email_not_verified"
    # wrong password must NOT reveal verification state
    r = client.post("/api/auth/login", json={"email": email, "password": "wrong-password-1A!"})
    assert r.status_code == 401

    tok = _token(outbox[0])
    assert client.post("/api/auth/verify-email", json={"token": "garbage"}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": tok}).status_code == 200
    # single use
    assert client.post("/api/auth/verify-email", json={"token": tok}).status_code == 400

    r = client.post("/api/auth/login", json={"email": email, "password": PW})
    assert r.status_code == 200
    j = r.get_json()
    assert j["token"] and j["terms_current"] is True and j["training_opt_out"] is False
    _cleanup(email)


def test_expired_token_is_rejected(client, db, outbox):
    from db import get_conn
    email = "expired@test.dev"
    _cleanup(email)
    _signup(client, email)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE organisations SET verify_expires = NOW() - interval '1 minute' WHERE email=%s", (email,))
    conn.commit(); cur.close(); conn.close()
    assert client.post("/api/auth/verify-email", json={"token": _token(outbox[0])}).status_code == 400
    _cleanup(email)


def test_resend_cooldown_and_token_rotation(client, db, outbox):
    from db import get_conn
    email = "resend@test.dev"
    _cleanup(email)
    _signup(client, email)
    first = _token(outbox[0])

    # unknown address: same generic answer, no mail
    assert client.post("/api/auth/resend-verification", json={"email": "nobody@test.dev"}).status_code == 200
    # inside the 60 s cooldown: generic answer, no new mail
    assert client.post("/api/auth/resend-verification", json={"email": email}).status_code == 200
    assert len(outbox) == 1

    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE organisations SET verify_sent_at = NOW() - interval '5 minutes' WHERE email=%s", (email,))
    conn.commit(); cur.close(); conn.close()
    assert client.post("/api/auth/resend-verification", json={"email": email}).status_code == 200
    assert len(outbox) == 2
    # the old link stops working, the new one works
    assert client.post("/api/auth/verify-email", json={"token": first}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": _token(outbox[1])}).status_code == 200
    _cleanup(email)


def test_seeded_and_existing_accounts_are_grandfathered(client, db):
    from db import get_conn
    conn = get_conn(); cur = conn.cursor()
    cur.execute("UPDATE organisations SET terms_version=NULL, training_opt_out=FALSE WHERE email='org@test.dev'")
    conn.commit(); cur.close(); conn.close()
    r = client.post("/api/auth/login", json={"email": "org@test.dev", "password": "Org-Passw0rd-2026!"})
    assert r.status_code == 200
    assert r.get_json()["terms_current"] is False   # legacy org: must accept terms once


def test_accept_terms_and_training_consent(client, db, login):
    h = login("org@test.dev", "Org-Passw0rd-2026!")
    r = client.post("/api/auth/accept-terms", headers=h, json={"terms_version": "old"})
    assert r.status_code == 409
    r = client.post("/api/auth/accept-terms", headers=h,
                    json={"terms_version": account_flow.TERMS_VERSION, "training_opt_out": True})
    assert r.status_code == 200
    info = client.get("/api/control/info", headers=h).get_json()
    assert info["training_opt_out"] is True and info["terms_version"] == account_flow.TERMS_VERSION
    assert client.post("/api/control/training-consent", headers=h, json={"opt_out": "yes"}).status_code == 400
    assert client.post("/api/control/training-consent", headers=h, json={"opt_out": False}).status_code == 200
    assert client.post("/api/control/training-consent", json={"opt_out": True}).status_code == 401


def test_training_excludes_opted_out_orgs(isolated_model, seed_attacks, db):
    from db import get_conn, insert_attack
    seed_attacks({"brute": 5, "cred": 5, "scan": 5, "slow": 5})          # 20 rows, test org (opted in)
    conn = get_conn(); cur = conn.cursor()
    cur.execute("""INSERT INTO organisations(name,email,password_hash,role,agent_token,training_opt_out)
                   VALUES('Opt Out','optout@test.dev','x','org','snt_optout_tok',TRUE)
                   ON CONFLICT (email) DO UPDATE SET training_opt_out=TRUE RETURNING id""")
    other = cur.fetchone()[0]
    conn.commit(); cur.close(); conn.close()
    for _ in range(10):
        insert_attack("198.51.100.7", "SSH", 2222, "USER root PASS x", 40, "brute", other)
    isolated_model.train_model()
    assert json.load(open(isolated_model.METRICS_PATH))["samples"] == 20   # the 10 opted-out rows are not used


def test_change_password(client, db, login, outbox):
    from tests.conftest import RT_EMAIL, RT_PASSWORD
    email, old, new = "chpw@test.dev", PW, "Another-Str0ng-Pass-2027!"
    _cleanup(email)
    _signup(client, email)
    client.post("/api/auth/verify-email", json={"token": _token(outbox[0])})
    h = login(email, old)
    assert client.post("/api/auth/change-password", headers=h,
                       json={"old_password": "nope", "new_password": new}).status_code == 401
    assert client.post("/api/auth/change-password", headers=h,
                       json={"old_password": old, "new_password": "weak"}).status_code == 422
    assert client.post("/api/auth/change-password", headers=h,
                       json={"old_password": old, "new_password": new}).status_code == 200
    assert client.post("/api/auth/login", json={"email": email, "password": old}).status_code == 401
    assert client.post("/api/auth/login", json={"email": email, "password": new}).status_code == 200
    # a red-team token carries the org's id: it must not be able to touch the org's password
    rt = login(RT_EMAIL, RT_PASSWORD)
    assert client.post("/api/auth/change-password", headers=rt,
                       json={"old_password": "x", "new_password": new}).status_code == 403
    _cleanup(email)


def test_request_delete_is_recorded(client, db, login):
    from db import get_conn
    h = login("org@test.dev", "Org-Passw0rd-2026!")
    assert client.post("/api/control/request-delete", headers=h).status_code == 200
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT deletion_requested_at FROM organisations WHERE email='org@test.dev'")
    assert cur.fetchone()[0] is not None
    cur.execute("UPDATE organisations SET deletion_requested_at=NULL WHERE email='org@test.dev'")
    conn.commit(); cur.close(); conn.close()


def test_attack_source_is_recorded_and_can_be_excluded_from_training(client, db, login, isolated_model,
                                                                     seed_attacks, monkeypatch):
    from db import get_conn
    from tests.conftest import AGENT_TOKEN
    seed_attacks({})                                    # empty the table
    body = {"attacker_ip": "203.0.113.5", "service": "SSH", "port": 22, "payload": "USER a PASS b",
            "threat_score": 30, "attack_type": "brute"}
    for _ in range(6):
        client.post("/api/agent/report", json=body, headers={"X-Agent-Token": AGENT_TOKEN})
    for _ in range(4):
        client.post("/api/agent/report", json={**body, "source": "simulated"}, headers={"X-Agent-Token": AGENT_TOKEN})
    h = login("org@test.dev", "Org-Passw0rd-2026!")
    client.post("/api/attacks/simulate", headers=h, json=[body, body])
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT source, COUNT(*) FROM attacks GROUP BY source")
    assert dict(cur.fetchall()) == {"real": 6, "simulated": 6}
    cur.close(); conn.close()

    monkeypatch.setenv("TRAIN_INCLUDE_SIMULATED", "0")
    isolated_model.train_model()
    assert json.load(open(isolated_model.METRICS_PATH))["samples"] == 6


def test_verification_defaults_to_off_without_a_mail_provider(monkeypatch):
    for k in ("EMAIL_VERIFICATION_REQUIRED", "BREVO_API_KEY", "RESEND_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    assert account_flow.verification_required() is False            # console mailer: would lock users out
    monkeypatch.setenv("BREVO_API_KEY", "x")
    assert account_flow.verification_required() is True
    monkeypatch.setenv("EMAIL_VERIFICATION_REQUIRED", "0")
    assert account_flow.verification_required() is False
