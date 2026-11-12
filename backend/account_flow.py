"""
Email verification, terms acceptance and training-data consent for SNAPTRAP.

Wired in from app.py with:   init_account_flow(app, token_required)

Routes
    POST  /api/auth/verify-email          {token}               -> verifies the address
    POST  /api/auth/resend-verification   {email}               -> always 200 (no account enumeration)
    GET   /api/legal/terms-version                              -> current terms version (public)
    POST  /api/auth/accept-terms          (JWT) {terms_version, training_opt_out?}
    POST  /api/control/training-consent   (JWT) {opt_out: bool}

Design notes
  * Verification tokens are 256-bit random, only their SHA-256 is stored, single use, 24 h expiry.
  * The link opens a React page that POSTs the token. It is deliberately NOT a GET endpoint:
    mail scanners prefetch links and would burn a GET token before the human clicks.
  * Resend is throttled per account (60 s cooldown) and per source address; limits are stored in
    Postgres (see allow()), so they survive restarts and work across several workers.
"""
import hashlib
import os
import secrets
import time
from collections import defaultdict, deque

from flask import jsonify, request

from auth.password_security import login_check, register_user_password, PasswordStrengthError
from blocking import client_ip
from db import get_conn, rate_limit_hit
from mailer import send_mail, verification_email, _provider

# Bump this string whenever Terms/Privacy text changes in a way users must re-accept.
TERMS_VERSION = os.getenv("TERMS_VERSION", "2026-11-10")
TOKEN_TTL_HOURS = 24
RESEND_COOLDOWN_SECONDS = 60


def verification_required():
    """EMAIL_VERIFICATION_REQUIRED=1/0 forces it. Unset: required only when a real mail provider is
    configured — otherwise new users could never receive their link and would be locked out."""
    v = os.getenv("EMAIL_VERIFICATION_REQUIRED")
    if v is not None:
        return v.strip().lower() not in ("0", "false", "no", "")
    return _provider() != "console"


def _hash(token):
    return hashlib.sha256(token.encode()).hexdigest()


# ── rate limiter: shared (Postgres) with an in-memory fallback ─────────
# Postgres is the source of truth, so limits hold across restarts and several workers.
# If the DB call fails the in-memory sliding window below keeps limiting this process.
_hits = defaultdict(deque)


def _allow_local(key, limit, window_seconds):
    now = time.time()
    q = _hits[key]
    while q and now - q[0] > window_seconds:
        q.popleft()
    if len(q) >= limit:
        return False
    q.append(now)
    return True


def allow(key, limit, window_seconds):
    try:
        return rate_limit_hit(key, limit, window_seconds)
    except Exception:
        return _allow_local(key, limit, window_seconds)


def _app_url():
    """Public base URL for links in emails. Set APP_URL in production; the fallback is the request host
    (upgraded to https unless it is localhost, because proxies often hand Flask an http:// URL)."""
    base = (os.getenv("APP_URL") or request.host_url).rstrip("/")
    if base.startswith("http://") and not any(h in base for h in ("localhost", "127.0.0.1")):
        base = "https://" + base[len("http://"):]
    return base


def issue_verification(org_id, email, name):
    """Create a fresh token for the org and email the link. Returns True if the mail was accepted."""
    token = secrets.token_urlsafe(32)
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "UPDATE organisations SET verify_token_hash=%s, "
        "verify_expires=NOW() + (%s || ' hours')::interval, verify_sent_at=NOW() WHERE id=%s",
        (_hash(token), str(TOKEN_TTL_HOURS), org_id),
    )
    conn.commit()
    cur.close()
    conn.close()
    subject, html_body, text_body = verification_email(name, f"{_app_url()}/?verify={token}")
    return send_mail(email, subject, html_body, text_body)


def init_account_flow(app, token_required):

    @app.route("/api/legal/terms-version", methods=["GET"])
    def terms_version():
        return jsonify({"terms_version": TERMS_VERSION})

    @app.route("/api/auth/verify-email", methods=["POST"])
    def verify_email():
        if not allow(f"verify:{client_ip()}", 20, 600):
            return jsonify({"error": "Too many attempts. Try again later."}), 429
        token = ((request.json or {}).get("token") or "").strip()
        if not token or len(token) > 200:
            return jsonify({"error": "Link invalid or expired", "code": "token_invalid"}), 400
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE organisations SET email_verified=TRUE, verify_token_hash=NULL, verify_expires=NULL "
            "WHERE verify_token_hash=%s AND verify_expires > NOW() AND email_verified=FALSE "
            "RETURNING email",
            (_hash(token),),
        )
        row = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()
        if not row:
            return jsonify({"error": "Link invalid or expired", "code": "token_invalid"}), 400
        return jsonify({"ok": True, "email": row[0]})

    @app.route("/api/auth/resend-verification", methods=["POST"])
    def resend_verification():
        generic = jsonify({"ok": True, "message": "If that account exists and is unverified, a new link was sent."})
        email = ((request.json or {}).get("email") or "").strip().lower()
        if not email or len(email) > 254:
            return generic
        if not allow(f"resend-ip:{client_ip()}", 10, 3600) or not allow(f"resend:{email}", 3, 3600):
            return jsonify({"error": "Too many requests. Try again later."}), 429
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT id, name, email_verified, "
            "COALESCE(EXTRACT(EPOCH FROM (NOW() - verify_sent_at)), 1e9) "
            "FROM organisations WHERE email=%s",
            (email,),
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row and not row[2] and row[3] >= RESEND_COOLDOWN_SECONDS:
            issue_verification(row[0], email, row[1])
        return generic

    @app.route("/api/auth/accept-terms", methods=["POST"])
    @token_required
    def accept_terms():
        d = request.json or {}
        if d.get("terms_version") != TERMS_VERSION:
            return jsonify({"error": "Terms were updated. Reload the page and try again.", "code": "terms_changed"}), 409
        conn = get_conn()
        cur = conn.cursor()
        cur.execute(
            "UPDATE organisations SET terms_version=%s, terms_accepted_at=NOW(), "
            "training_opt_out=COALESCE(%s, training_opt_out) WHERE id=%s",
            (TERMS_VERSION, d.get("training_opt_out"), request.org_id),
        )
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"ok": True, "terms_version": TERMS_VERSION})

    @app.route("/api/auth/change-password", methods=["POST"])
    @token_required
    def change_password():
        # Red-team tokens carry the *org's* id, so they must never reach an org-level credential change.
        if request.role not in ("org", "superadmin"):
            return jsonify({"error": "Not allowed for this account type"}), 403
        if not allow(f"chpw:{request.org_id}", 5, 900):
            return jsonify({"error": "Too many attempts. Try again later."}), 429
        d = request.json or {}
        old, new = d.get("old_password") or "", d.get("new_password") or ""
        if len(new) > 128:
            return jsonify({"error": "Password too long (max 128 characters)"}), 422
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("SELECT password_hash FROM organisations WHERE id=%s", (request.org_id,))
        row = cur.fetchone()
        if not row or not row[0] or not login_check(old, row[0]):
            cur.close(); conn.close()
            return jsonify({"error": "Current password is incorrect"}), 401
        try:
            new_hash = register_user_password(new)
        except PasswordStrengthError as e:
            cur.close(); conn.close()
            return jsonify({"error": str(e)}), 422
        cur.execute("UPDATE organisations SET password_hash=%s WHERE id=%s", (new_hash, request.org_id))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"ok": True})

    @app.route("/api/control/request-delete", methods=["POST"])
    @token_required
    def request_delete():
        if request.role != "org":
            return jsonify({"error": "Only organisation accounts can request deletion"}), 403
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE organisations SET deletion_requested_at=COALESCE(deletion_requested_at, NOW()) "
                    "WHERE id=%s", (request.org_id,))
        conn.commit(); cur.close(); conn.close()
        return jsonify({"ok": True})

    @app.route("/api/control/training-consent", methods=["POST"])
    @token_required
    def training_consent():
        opt_out = (request.json or {}).get("opt_out")
        if not isinstance(opt_out, bool):
            return jsonify({"error": "opt_out must be true or false"}), 400
        conn = get_conn()
        cur = conn.cursor()
        cur.execute("UPDATE organisations SET training_opt_out=%s WHERE id=%s", (opt_out, request.org_id))
        conn.commit()
        cur.close()
        conn.close()
        return jsonify({"ok": True, "training_opt_out": opt_out})
