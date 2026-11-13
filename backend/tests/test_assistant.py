import assistant
from tests.conftest import ORG_EMAIL, ORG_PASSWORD


class _Resp:
    status_code = 200
    def json(self):
        return {"content": [{"type": "text", "text": "Open the Threat Intel tab."}]}


def test_assistant_disabled_without_key(client, login, monkeypatch):
    for k in ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY"):
        monkeypatch.delenv(k, raising=False)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "hi"})
    assert r.status_code == 503 and r.get_json()["code"] == "assistant_disabled"


def test_assistant_requires_auth(client):
    assert client.post("/api/assistant/query", json={"question": "hi"}).status_code == 401


def test_assistant_sends_only_aggregates_and_caps_input(client, login, monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False); monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
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


class _GemResp:
    def __init__(self, status=200, text="Open the Control Panel tab."):
        self.status_code, self._t = status, text
        self.text = "err"
    def json(self):
        return {"candidates": [{"content": {"parts": [{"text": self._t}]}}]}


def test_gemini_key_is_used_when_no_anthropic_key(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
    assistant.allow.__globals__["_hits"].clear()
    seen = {}
    def fake_post(url, headers=None, json=None, timeout=None):
        seen.update(url=url, headers=headers, json=json)
        return _GemResp()
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD),
                    json={"question": "x" * 900, "module": "control"})
    assert r.status_code == 200 and r.get_json()["answer"] == "Open the Control Panel tab."
    assert "generativelanguage.googleapis.com" in seen["url"] and "g-key" not in seen["url"]   # key in header, not URL
    assert seen["headers"]["x-goog-api-key"] == "g-key"
    assert len(seen["json"]["contents"][0]["parts"][0]["text"]) == 500
    assert "Context (numbers only): tab=control" in seen["json"]["systemInstruction"]["parts"][0]["text"]


def test_gemini_retries_without_thinking_config_on_400_and_reports_failure(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.setenv("GOOGLE_API_KEY", "g")
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assistant.allow.__globals__["_hits"].clear()
    calls = []
    def fake_post(url, headers=None, json=None, timeout=None):
        calls.append("thinkingConfig" in json["generationConfig"])
        return _GemResp(400) if len(calls) == 1 else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    h = login(ORG_EMAIL, ORG_PASSWORD)
    assert client.post("/api/assistant/query", headers=h, json={"question": "q"}).status_code == 200
    assert calls == [True, False]
    monkeypatch.setattr(assistant.requests, "post", lambda *a, **k: _GemResp(403))
    r = client.post("/api/assistant/query", headers=h, json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "auth"


def test_gemini_falls_through_retired_model_names_and_remembers_the_working_one(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("SNAPPY_MODEL", raising=False); monkeypatch.setenv("GEMINI_API_KEY", "g")
    assistant._gemini_ok.clear(); assistant.allow.__globals__["_hits"].clear()
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(url.split("/models/")[1].split(":")[0])
        return _GemResp(404) if tried[-1] != "gemini-3.5-flash-lite" else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    h = login(ORG_EMAIL, ORG_PASSWORD)
    assert client.post("/api/assistant/query", headers=h, json={"question": "q"}).status_code == 200
    assert tried == ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]
    tried.clear()
    assert client.post("/api/assistant/query", headers=h, json={"question": "q2"}).status_code == 200
    assert tried == ["gemini-3.5-flash-lite"]          # remembered, no more 404 round trips
    assistant._gemini_ok.clear()


def test_every_model_missing_reports_reason_model(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("SNAPPY_MODEL", raising=False); monkeypatch.setenv("GEMINI_API_KEY", "g")
    assistant._gemini_ok.clear(); assistant.allow.__globals__["_hits"].clear()
    monkeypatch.setattr(assistant.requests, "post", lambda *a, **k: _GemResp(404))
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "model"
