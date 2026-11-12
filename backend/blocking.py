"""
Shared, persistent blocking + real client IP for SNAPTRAP.

What changed compared with the old in-memory block set in honeypot.py:
  * Only SUSPICIOUS events count (not every TCP connection), inside a time window.
  * Every block has a TTL, doubled for repeat offenders (capped) - nothing is blocked forever.
  * Blocks live in Postgres (blocked_ips), so they survive restarts and are shared by processes.
    Each process keeps a small in-memory copy that is refreshed every few seconds, so the
    honeypot never touches the DB per connection.
  * A manual allow-list (allow_ips) is never blocked.
  * Everything is best-effort: if the DB is unreachable the honeypot keeps working with what it has.

Also here: client_ip() (honours X-Forwarded-For only when TRUSTED_PROXY_HOPS is set) and the
superadmin routes to inspect/unblock/allow-list.
"""
import ipaddress
import os
import threading
import time
from collections import deque

import db

# Payloads that mean "someone connected / looked", not "someone attacked".
NEUTRAL_PAYLOADS = {"no payload", "connection only", "port probe", "page scan", ""}


def is_suspicious_payload(payload):
    return (payload or "").strip().lower() not in NEUTRAL_PAYLOADS


def _valid_ip(value):
    try:
        return str(ipaddress.ip_address((value or "").strip()))
    except ValueError:
        return None


def client_ip(req=None):
    """The caller's IP. Behind a proxy request.remote_addr is the proxy, so set TRUSTED_PROXY_HOPS
    to the number of proxies you control/trust (Render: usually 1) and the entry that many places
    from the RIGHT of X-Forwarded-For is used. With 0 (default) the header is ignored, because
    anyone can send a forged X-Forwarded-For."""
    if req is None:
        from flask import request as req
    try:
        hops = int(os.getenv("TRUSTED_PROXY_HOPS", "0") or 0)
    except ValueError:
        hops = 0
    xff = req.headers.get("X-Forwarded-For", "")
    if hops > 0 and xff:
        parts = [p.strip() for p in xff.split(",") if p.strip()]
        if len(parts) >= hops:
            ip = _valid_ip(parts[-hops])
            if ip:
                return ip
    return req.remote_addr or "unknown"


class BlockManager:
    def __init__(self, threshold=5, window_s=600, base_ttl_s=3600, max_ttl_s=86400,
                 refresh_s=30, clock=time.time):
        self.threshold, self.window_s = threshold, window_s
        self.base_ttl_s, self.max_ttl_s, self.refresh_s = base_ttl_s, max_ttl_s, refresh_s
        self.clock = clock
        self._lock = threading.Lock()
        self._events = {}          # ip -> deque of timestamps of suspicious events
        self._blocks = {}          # ip -> blocked-until (epoch seconds)
        self._allow = set()
        self._pending = set()      # blocks whose DB write failed; kept locally until it succeeds
        self._last_purge = 0.0
        self._started = False

    @classmethod
    def from_env(cls):
        def num(name, default):
            try:
                return int(os.getenv(name, default))
            except ValueError:
                return default
        return cls(num("BLOCK_THRESHOLD", 5), num("BLOCK_WINDOW_S", 600),
                   num("BLOCK_TTL_S", 3600), num("BLOCK_MAX_TTL_S", 86400))

    # ── queries ──────────────────────────────────────────
    def is_blocked(self, ip):
        now = self.clock()
        with self._lock:
            if ip in self._allow:
                return False
            until = self._blocks.get(ip)
            if until is None:
                return False
            if until > now:
                return True
            del self._blocks[ip]
            return False

    def active_count(self):
        now = self.clock()
        with self._lock:
            return sum(1 for ip, u in self._blocks.items() if u > now and ip not in self._allow)

    # ── decisions ────────────────────────────────────────
    def record_bad_event(self, ip):
        """Count one suspicious event. Returns True if this event caused a new block."""
        now = self.clock()
        with self._lock:
            if ip in self._allow:
                return False
            if self._blocks.get(ip, 0) > now:
                return False
            q = self._events.setdefault(ip, deque())
            q.append(now)
            while q and now - q[0] > self.window_s:
                q.popleft()
            if len(q) < self.threshold:
                return False
            q.clear()

        try:                                   # repeat offenders get a longer block
            prior = db.block_offences(ip)
        except Exception:
            prior = 0
        ttl = min(self.base_ttl_s * (2 ** min(prior, 10)), self.max_ttl_s)
        with self._lock:
            self._blocks[ip] = now + ttl
        try:
            db.block_ip(ip, f"{self.threshold} suspicious events in {self.window_s}s", ttl)
        except Exception as e:
            self._pending.add(ip)
            print(f"[blocking] could not persist block for {ip}: {e}", flush=True)
        return True

    # ── sync with the database ───────────────────────────
    def refresh(self):
        """Pull active blocks + allow-list from the DB. Keeps the old state if the DB is down."""
        try:
            rows = db.active_blocks()
            allow = {r["ip"] for r in db.allowed_ips()}
        except Exception as e:
            print(f"[blocking] refresh failed, keeping current state: {e}", flush=True)
            return False
        now = self.clock()
        with self._lock:
            fresh = {r["ip"]: r["until"] for r in rows}
            for ip in list(self._pending):
                if self._blocks.get(ip, 0) > now:
                    fresh.setdefault(ip, self._blocks[ip])
                else:
                    self._pending.discard(ip)
            self._blocks = fresh
            self._allow = allow
            for ip in [i for i, q in self._events.items() if not q or now - q[-1] > self.window_s]:
                del self._events[ip]
        if now - self._last_purge > 3600:
            self._last_purge = now
            try:
                db.purge_stale()
            except Exception:
                pass
        return True

    def start(self):
        """Initial refresh, then a daemon thread that refreshes every refresh_s seconds."""
        if self._started:
            return
        self._started = True
        self.refresh()

        def loop():
            while True:
                time.sleep(self.refresh_s)
                self.refresh()
        threading.Thread(target=loop, name="BlockRefresh", daemon=True).start()


# ── superadmin routes ────────────────────────────────────
def init_blocking_routes(app, sa_required):
    from flask import jsonify, request

    def _ip_or_400():
        body = request.json or {}
        ip = _valid_ip(body.get("ip"))
        return ip, body

    @app.route("/api/admin/blocked-ips", methods=["GET"])
    @sa_required
    def admin_blocked_ips():
        return jsonify([{"ip": r["ip"], "reason": r["reason"], "times_blocked": r["hits"],
                         "blocked_until": r["until_iso"]} for r in db.active_blocks()])

    @app.route("/api/admin/blocked-ips/unblock", methods=["POST"])
    @sa_required
    def admin_unblock_ip():
        ip, _ = _ip_or_400()
        if not ip:
            return jsonify({"error": "Valid IP required"}), 400
        db.unblock_ip(ip)
        return jsonify({"message": f"{ip} unblocked (the honeypot picks this up within ~30 s)"})

    @app.route("/api/admin/allowlist", methods=["GET"])
    @sa_required
    def admin_allowlist():
        return jsonify(db.allowed_ips())

    @app.route("/api/admin/allowlist", methods=["POST"])
    @sa_required
    def admin_allowlist_add():
        ip, body = _ip_or_400()
        if not ip:
            return jsonify({"error": "Valid IP required"}), 400
        db.allow_ip_add(ip, str(body.get("note") or "")[:200])
        db.unblock_ip(ip)
        return jsonify({"message": f"{ip} will never be auto-blocked"}), 201

    @app.route("/api/admin/allowlist/remove", methods=["POST"])
    @sa_required
    def admin_allowlist_remove():
        ip, _ = _ip_or_400()
        if not ip:
            return jsonify({"error": "Valid IP required"}), 400
        db.allow_ip_remove(ip)
        return jsonify({"message": f"{ip} removed from the allow-list"})

    @app.route("/api/admin/client-ip", methods=["GET"])
    @sa_required
    def admin_client_ip():
        """Diagnostic: what IP does the server think you are? Use it to set TRUSTED_PROXY_HOPS."""
        return jsonify({"detected": client_ip(), "remote_addr": request.remote_addr,
                        "x_forwarded_for": request.headers.get("X-Forwarded-For"),
                        "trusted_proxy_hops": os.getenv("TRUSTED_PROXY_HOPS", "0")})
