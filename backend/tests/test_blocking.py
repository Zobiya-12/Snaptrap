"""Shared rate limiting, TTL blocking, allow-list, login throttling and client IP."""
import pytest

import blocking
import db as dbm
from blocking import BlockManager, client_ip, is_suspicious_payload

ORG = ("org@test.dev", "Org-Passw0rd-2026!")
ADMIN = ("admin@test.dev", "Adm!n-Passw0rd-2026")
IPS = ["198.51.100.%d" % i for i in range(10, 30)]


class Clock:
    def __init__(self): self.t = 1_000_000.0
    def __call__(self): return self.t


@pytest.fixture()
def clean_blocks(db):
    def wipe():
        conn = dbm.get_conn(); cur = conn.cursor()
        cur.execute("DELETE FROM blocked_ips WHERE ip << '198.51.100.0/24'::inet")
        cur.execute("DELETE FROM allow_ips WHERE ip << '198.51.100.0/24'::inet")
        conn.commit(); cur.close(); conn.close()
    wipe(); yield; wipe()


def _mgr(clock=None, **kw):
    return BlockManager(threshold=3, window_s=60, base_ttl_s=100, max_ttl_s=1000, clock=clock or Clock(), **kw)


# ── rate limiter ─────────────────────────────────────────
def test_rate_limit_window(db):
    assert [dbm.rate_limit_hit("t:a", 3, 60) for _ in range(4)] == [True, True, True, False]
    assert dbm.rate_limit_count("t:a", 60) == 4
    conn = dbm.get_conn(); cur = conn.cursor()
    cur.execute("UPDATE rate_limits SET window_start = NOW() - interval '2 minutes' WHERE key='t:a'")
    conn.commit(); cur.close(); conn.close()
    assert dbm.rate_limit_count("t:a", 60) == 0          # expired window reads as empty
    assert dbm.rate_limit_hit("t:a", 3, 60) is True      # and restarts at 1
    assert dbm.rate_limit_count("t:a", 60) == 1
    dbm.rate_limit_reset("t:a")
    assert dbm.rate_limit_count("t:a", 60) == 0


def test_account_flow_allow_falls_back_when_db_fails(monkeypatch):
    import account_flow
    monkeypatch.setattr(account_flow, "rate_limit_hit", lambda *a: (_ for _ in ()).throw(RuntimeError("db down")))
    account_flow._hits.clear()
    assert [account_flow.allow("fb", 2, 60) for _ in range(3)] == [True, True, False]


# ── BlockManager ─────────────────────────────────────────
def test_only_suspicious_events_count():
    assert not is_suspicious_payload("connection only") and not is_suspicious_payload("page scan")
    assert not is_suspicious_payload("no payload") and not is_suspicious_payload("port probe")
    assert is_suspicious_payload("USER root PASS toor")


def test_blocks_after_threshold_inside_window(clean_blocks):
    clock = Clock(); m = _mgr(clock); ip = IPS[0]
    assert [m.record_bad_event(ip) for _ in range(3)] == [False, False, True]
    assert m.is_blocked(ip)
    assert [r["ip"] for r in dbm.active_blocks()] == [ip]          # persisted


def test_slow_events_never_reach_the_threshold(clean_blocks):
    clock = Clock(); m = _mgr(clock); ip = IPS[1]
    for _ in range(10):
        assert m.record_bad_event(ip) is False
        clock.t += 61                                              # each event is alone in its window
    assert not m.is_blocked(ip)


def test_block_expires_and_repeat_offenders_wait_longer(clean_blocks):
    clock = Clock(); m = _mgr(clock); ip = IPS[2]
    for _ in range(3): m.record_bad_event(ip)
    clock.t += 99;  assert m.is_blocked(ip)
    clock.t += 2;   assert not m.is_blocked(ip)                    # 100 s TTL over
    for _ in range(3): m.record_bad_event(ip)                      # second offence
    clock.t += 150; assert m.is_blocked(ip)                        # TTL doubled to 200 s
    clock.t += 60;  assert not m.is_blocked(ip)


def test_allow_list_is_never_blocked(clean_blocks):
    m = _mgr(); ip = IPS[3]
    dbm.allow_ip_add(ip, "my monitor"); m.refresh()
    assert not any(m.record_bad_event(ip) for _ in range(10))
    assert not m.is_blocked(ip)


def test_blocks_survive_restart_and_unblock_propagates(clean_blocks):
    ip = IPS[4]; a = _mgr()
    for _ in range(3): a.record_bad_event(ip)
    b = _mgr(); b.refresh()                                        # "restarted process"
    assert b.is_blocked(ip)
    dbm.unblock_ip(ip); b.refresh()
    assert not b.is_blocked(ip)


def test_db_outage_keeps_the_block_locally(clean_blocks, monkeypatch):
    m = _mgr(); ip = IPS[5]
    monkeypatch.setattr(dbm, "block_ip", lambda *a: (_ for _ in ()).throw(RuntimeError("db down")))
    monkeypatch.setattr(dbm, "block_offences", lambda ip: (_ for _ in ()).throw(RuntimeError("db down")))
    for _ in range(3): m.record_bad_event(ip)
    assert m.is_blocked(ip)
    monkeypatch.setattr(dbm, "active_blocks", lambda: (_ for _ in ()).throw(RuntimeError("db down")))
    assert m.refresh() is False and m.is_blocked(ip)               # failed refresh changes nothing


# ── admin routes ─────────────────────────────────────────
def test_admin_block_routes(client, login, clean_blocks):
    admin = login(*ADMIN); org = login(*ORG); ip = IPS[6]
    m = _mgr()
    for _ in range(3): m.record_bad_event(ip)
    assert client.get("/api/admin/blocked-ips", headers=org).status_code == 403
    rows = client.get("/api/admin/blocked-ips", headers=admin).get_json()
    assert ip in [r["ip"] for r in rows]
    assert client.post("/api/admin/blocked-ips/unblock", headers=admin, json={"ip": "not-an-ip"}).status_code == 400
    assert client.post("/api/admin/blocked-ips/unblock", headers=admin, json={"ip": ip}).status_code == 200
    assert ip not in [r["ip"] for r in client.get("/api/admin/blocked-ips", headers=admin).get_json()]
    assert client.post("/api/admin/allowlist", headers=admin, json={"ip": IPS[7], "note": "me"}).status_code == 201
    assert IPS[7] in [r["ip"] for r in client.get("/api/admin/allowlist", headers=admin).get_json()]
    assert client.post("/api/admin/allowlist/remove", headers=admin, json={"ip": IPS[7]}).status_code == 200


# ── client IP ────────────────────────────────────────────
def test_client_ip_ignores_forged_header_by_default(client, login, monkeypatch):
    admin = login(*ADMIN)
    monkeypatch.delenv("TRUSTED_PROXY_HOPS", raising=False)
    h = {**admin, "X-Forwarded-For": "6.6.6.6"}
    assert client.get("/api/admin/client-ip", headers=h).get_json()["detected"] == "127.0.0.1"
    monkeypatch.setenv("TRUSTED_PROXY_HOPS", "1")
    h = {**admin, "X-Forwarded-For": "6.6.6.6, 203.0.113.9"}      # attacker prepends, proxy appends
    assert client.get("/api/admin/client-ip", headers=h).get_json()["detected"] == "203.0.113.9"
    h = {**admin, "X-Forwarded-For": "garbage"}
    assert client.get("/api/admin/client-ip", headers=h).get_json()["detected"] == "127.0.0.1"


# ── login throttling ─────────────────────────────────────
def test_login_throttle_after_repeated_failures_and_reset_on_success(client):
    bad = {"email": ORG[0], "password": "Wrong-Passw0rd-1!"}
    assert [client.post("/api/auth/login", json=bad).status_code for _ in range(5)] == [401] * 5
    r = client.post("/api/auth/login", json=bad)
    assert r.status_code == 429 and r.get_json()["code"] == "rate_limited"
    # even the right password is refused while throttled (prevents guessing through the limiter)
    assert client.post("/api/auth/login", json={"email": ORG[0], "password": ORG[1]}).status_code == 429
    # other accounts from the same IP are only blocked by the per-IP limit, which is higher
    assert client.post("/api/auth/login", json={"email": ADMIN[0], "password": ADMIN[1]}).status_code == 200


def test_successful_login_clears_the_failure_counter(client):
    bad = {"email": ORG[0], "password": "Wrong-Passw0rd-1!"}
    for _ in range(4): client.post("/api/auth/login", json=bad)
    assert client.post("/api/auth/login", json={"email": ORG[0], "password": ORG[1]}).status_code == 200
    assert [client.post("/api/auth/login", json=bad).status_code for _ in range(4)] == [401] * 4
