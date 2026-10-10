import time

from tests.conftest import (ADMIN_EMAIL, ADMIN_PASSWORD, AGENT_TOKEN, ORG_EMAIL, ORG_PASSWORD,
                            RT_EMAIL, RT_PASSWORD)

BALANCED = {"brute": 30, "cred": 30, "scan": 30, "sqli": 30, "slow": 30}


def test_health_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


def test_login_rejects_wrong_password(client, db):
    r = client.post("/api/auth/login", json={"email": ORG_EMAIL, "password": "definitely-wrong"})
    assert r.status_code == 401


def test_login_returns_token(client, db):
    r = client.post("/api/auth/login", json={"email": ORG_EMAIL, "password": ORG_PASSWORD})
    assert r.status_code == 200 and r.get_json()["token"]


def test_agent_report_needs_valid_token(client, db):
    body = {"attacker_ip": "203.0.113.9", "service": "SSH", "port": 22, "payload": "USER root PASS x",
            "threat_score": 40, "attack_type": "brute"}
    assert client.post("/api/agent/report", json=body).status_code == 401
    assert client.post("/api/agent/report", json=body, headers={"X-Agent-Token": "nope"}).status_code == 401
    r = client.post("/api/agent/report", json=body, headers={"X-Agent-Token": AGENT_TOKEN})
    assert r.status_code == 201 and r.get_json()["attack_id"]


def test_protected_routes_require_auth(client, db):
    for path in ("/api/predictions", "/api/attacks", "/api/redteam/runs"):
        assert client.get(path).status_code == 401


def test_predictions_has_no_fake_accuracy_before_training(client, login, isolated_model):
    r = client.get("/api/predictions", headers=login(ORG_EMAIL, ORG_PASSWORD))
    assert r.status_code == 200
    assert r.get_json()["accuracy"] is None


def test_classify_503_before_training_then_200(client, login, isolated_model, seed_attacks):
    h = login(ORG_EMAIL, ORG_PASSWORD)
    body = {"payload": "' OR 1=1--", "service": "HTTP", "threat_score": 70}
    assert client.post("/api/classify", json=body, headers=h).status_code == 503
    seed_attacks(BALANCED)
    isolated_model.train_model()
    r = client.post("/api/classify", json=body, headers=h)
    assert r.status_code == 200
    assert r.get_json()["predicted_type"] in isolated_model.load_model().classes_


def test_predictions_report_real_accuracy_after_training(client, login, isolated_model, seed_attacks):
    seed_attacks(BALANCED)
    _, acc = isolated_model.train_model()
    r = client.get("/api/predictions", headers=login(ORG_EMAIL, ORG_PASSWORD))
    assert r.get_json()["accuracy"] == acc
    assert r.get_json()["evaluated_on"] == "holdout"


def test_retrain_is_superadmin_only(client, login, isolated_model, seed_attacks):
    assert client.post("/api/admin/retrain", headers=login(ORG_EMAIL, ORG_PASSWORD)).status_code == 403
    seed_attacks(BALANCED)
    h = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    assert client.post("/api/admin/retrain", headers=h).status_code == 202
    for _ in range(60):
        st = client.get("/api/admin/retrain", headers=h).get_json()
        if not st["running"]:
            break
        time.sleep(0.5)
    assert st["last"]["ok"] is True, st
    assert st["last"]["predictions_saved"] == 150


def test_redteam_simulate_rules(client, login, isolated_model, seed_attacks):
    assert client.post("/api/redteam/simulate", json={"mode": "demo"},
                       headers=login(ORG_EMAIL, ORG_PASSWORD)).status_code == 403
    h = login(RT_EMAIL, RT_PASSWORD)
    assert client.post("/api/redteam/simulate", json={"mode": "nonsense"}, headers=h).status_code == 400
    assert client.post("/api/redteam/simulate", json={"mode": "demo"}, headers=h).status_code == 503


def test_redteam_simulate_scores_the_real_classifier(client, login, isolated_model, seed_attacks):
    seed_attacks(BALANCED)
    isolated_model.train_model()
    h = login(RT_EMAIL, RT_PASSWORD)
    r = client.post("/api/redteam/simulate", json={"mode": "demo"}, headers=h)
    assert r.status_code == 201
    d = r.get_json()
    assert d["total"] == 50 and d["detected"] + d["missed"] == 50
    assert d["detection_score"] == round(d["detected"] / 50 * 100, 1)
    assert sum(v["total"] for v in d["by_type"].values()) == 50
    runs = client.get("/api/redteam/runs", headers=h).get_json()
    assert any(run["id"] == d["run_id"] for run in runs)
