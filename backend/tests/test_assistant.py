import assistant
from tests.conftest import ORG_EMAIL, ORG_PASSWORD


class _Resp:
    status_code = 200
    def json(self):
        return {"content": [{"type": "text", "text": "Open the Threat Intel tab."}]}


def test_assistant_disabled_without_key(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "hi"})
    assert r.status_code == 503 and r.get_json()["code"] == "assistant_disabled"


def test_assistant_requires_auth(client):
    assert client.post("/api/assistant/query", json={"question": "hi"}).status_code == 401


def test_assistant_sends_only_aggregates_and_caps_input(client, login, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assistant.allow.__globals__["_hits"].clear()
    seen = {}
    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(json=json, headers=headers)
        return _Resp()
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD),
                    json={"question": "x" * 900, "module": "not-a-tab"})
    assert r.status_code == 200 and r.get_json()["answer"] == "Open the Threat Intel tab."
    sent = seen["json"]
    assert len(sent["messages"][0]["content"]) == 500                  # question capped
    assert "Context (numbers only): tab=general" in sent["system"]      # unknown module -> general
    assert "payload" not in sent["system"].lower().split("context (numbers only)")[1]  # no payloads in context
    assert seen["headers"]["x-api-key"] == "test-key"


def test_assistant_rate_limited(client, login, monkeypatch):
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    assistant.allow.__globals__["_hits"].clear()
    monkeypatch.setattr(assistant.requests, "post", lambda *a, **k: _Resp())
    h = login(ORG_EMAIL, ORG_PASSWORD)
    codes = [client.post("/api/assistant/query", headers=h, json={"question": "q"}).status_code for _ in range(17)]
    assert codes[:15] == [200] * 15 and codes[15:] == [429, 429]
