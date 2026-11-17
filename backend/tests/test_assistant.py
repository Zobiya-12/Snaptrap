import time

import pytest

import assistant
from tests.conftest import ORG_EMAIL, ORG_PASSWORD


@pytest.fixture(autouse=True)
def _reset_assistant_state(monkeypatch):
    """Cooldowns are module-level state: isolate every test, and never really sleep on 503 retries."""
    assistant._cooldown.clear()
    assistant.allow.__globals__["_hits"].clear()
    monkeypatch.setattr(assistant.time, "sleep", lambda s: None)
    yield
    assistant._cooldown.clear()


def _gemini_only(monkeypatch):
    for k in ("ANTHROPIC_API_KEY", "GOOGLE_API_KEY", "SNAPPY_MODEL", "SNAPPY_PROVIDER"):
        monkeypatch.delenv(k, raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "g")


def _model(url):
    return url.split("/models/")[1].split(":")[0]


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


class _EmptyResp:
    """200 with no text, e.g. blocked by a safety filter."""
    status_code = 200
    text = ""
    def json(self):
        return {"candidates": [{"finishReason": "SAFETY"}]}


def test_gemini_key_is_used_when_no_anthropic_key(client, login, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False); monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.setenv("GEMINI_API_KEY", "g-key")
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
    monkeypatch.delenv("GEMINI_API_KEY", raising=False); monkeypatch.delenv("SNAPPY_MODEL", raising=False)
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


def test_gemini_persistent_400_is_not_masked_by_trying_other_models(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(400)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "request"
    assert tried == ["gemini-3.8-flash"] * 2        # with and without thinkingConfig, then stop


def test_gemini_falls_through_retired_model_names_and_skips_them_afterwards(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(404) if tried[-1] != "gemini-3.5-flash-lite" else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    h = login(ORG_EMAIL, ORG_PASSWORD)
    assert client.post("/api/assistant/query", headers=h, json={"question": "q"}).status_code == 200
    assert tried == ["gemini-3.8-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]
    tried.clear()
    assert client.post("/api/assistant/query", headers=h, json={"question": "q2"}).status_code == 200
    assert tried == ["gemini-3.5-flash-lite"]          # 404'd models are cooling down, no wasted round trips


@pytest.mark.parametrize("status,calls_on_first", [(404, 1), (429, 1), (500, 2), (503, 2)])
def test_gemini_falls_back_on_model_quota_and_overload_errors(client, login, monkeypatch, status, calls_on_first):
    """503/500 (overloaded) used to raise immediately; now they get one quick retry, then the next model."""
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(status) if tried[-1] == "gemini-3.8-flash" else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 200 and r.get_json()["answer"] == "Open the Control Panel tab."
    assert tried == ["gemini-3.8-flash"] * calls_on_first + ["gemini-3.6-flash"]


def test_gemini_failing_model_is_skipped_then_preferred_model_is_retried_after_cooldown(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    down = {"gemini-3.8-flash"}
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(503) if tried[-1] in down else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    h = login(ORG_EMAIL, ORG_PASSWORD)

    assert client.post("/api/assistant/query", headers=h, json={"question": "q1"}).status_code == 200
    assert tried == ["gemini-3.8-flash", "gemini-3.8-flash", "gemini-3.6-flash"]

    tried.clear()                                        # still cooling down: straight to the working model
    assert client.post("/api/assistant/query", headers=h, json={"question": "q2"}).status_code == 200
    assert tried == ["gemini-3.6-flash"]

    tried.clear()                                        # cooldown over and the model has recovered
    down.clear()
    assistant._cooldown["gemini-3.8-flash"] = time.monotonic() - 1
    assert client.post("/api/assistant/query", headers=h, json={"question": "q3"}).status_code == 200
    assert tried == ["gemini-3.8-flash"]                 # back on the preferred model, nothing is stuck


def test_gemini_empty_response_falls_through_to_next_model(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _EmptyResp() if tried[-1] == "gemini-3.8-flash" else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 200
    assert tried == ["gemini-3.8-flash", "gemini-3.6-flash"]     # no pointless retry of an empty answer


def test_gemini_network_error_falls_through_to_next_model(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        if tried[-1] == "gemini-3.8-flash":
            raise assistant.requests.ConnectionError("boom")
        return _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 200
    assert tried == ["gemini-3.8-flash", "gemini-3.6-flash"]


def test_snappy_model_env_is_first_choice_not_the_only_choice(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    monkeypatch.setenv("SNAPPY_MODEL", "gemini-custom")
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(404) if tried[-1] == "gemini-custom" else _GemResp(200)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 200
    assert tried == ["gemini-custom", "gemini-3.8-flash"]


def test_every_model_missing_reports_reason_model(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    monkeypatch.setattr(assistant.requests, "post", lambda *a, **k: _GemResp(404))
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "model"


def test_every_model_overloaded_reports_upstream_after_bounded_attempts(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    tried = []
    def fake_post(url, headers=None, json=None, timeout=None):
        tried.append(_model(url))
        return _GemResp(503)
    monkeypatch.setattr(assistant.requests, "post", fake_post)
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "upstream"
    assert len(tried) == 2 * len(assistant.GEMINI_MODELS)        # one retry per model, then give up


def test_gemini_total_time_budget_stops_the_loop(client, login, monkeypatch):
    _gemini_only(monkeypatch)
    monkeypatch.setattr(assistant, "_DEADLINE_S", 0)
    tried = []
    monkeypatch.setattr(assistant.requests, "post", lambda url, **k: tried.append(url) or _GemResp(200))
    r = client.post("/api/assistant/query", headers=login(ORG_EMAIL, ORG_PASSWORD), json={"question": "q"})
    assert r.status_code == 502 and r.get_json()["reason"] == "network"
    assert tried == []                                           # out of budget: no upstream call at all


def test_gemini_models_still_tries_everything_when_all_are_cooling_down(monkeypatch):
    monkeypatch.delenv("SNAPPY_MODEL", raising=False)
    now = time.monotonic()
    for m in assistant.GEMINI_MODELS:
        assistant._cooldown[m] = now + 100
    assert assistant._gemini_models() == assistant.GEMINI_MODELS
