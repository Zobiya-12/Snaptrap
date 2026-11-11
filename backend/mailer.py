"""
SNAPTRAP mailer — sends transactional email over an HTTPS API.

Why HTTPS and not SMTP: Render's free web services block outbound SMTP ports, so
smtplib silently times out in production. Both providers below are plain HTTPS POSTs.

Provider is picked from the environment (first match wins):
    BREVO_API_KEY   -> Brevo   (free tier ~300 mails/day; a verified *single sender* address
                                is enough, no domain needed — easiest for a student project)
    RESEND_API_KEY  -> Resend  (needs a verified domain to mail arbitrary recipients)
    (neither)       -> console (prints the mail, including the link, to the server log — dev only)

Required for real sending:
    MAIL_FROM       e.g. "SNAPTRAP <no-reply@yourdomain.tld>"  (must be verified at the provider)
"""
import os
import re
import html
import requests

TIMEOUT = 10


def _provider():
    if os.getenv("BREVO_API_KEY"):
        return "brevo"
    if os.getenv("RESEND_API_KEY"):
        return "resend"
    return "console"


def _split_from(addr):
    """'Name <a@b.c>' -> ('Name', 'a@b.c')"""
    m = re.match(r"^\s*(.*?)\s*<([^>]+)>\s*$", addr or "")
    return (m.group(1) or "SNAPTRAP", m.group(2)) if m else ("SNAPTRAP", (addr or "").strip())


def send_mail(to_email, subject, html_body, text_body=None):
    """Returns True if the provider accepted the message. Never raises."""
    provider = _provider()
    mail_from = os.getenv("MAIL_FROM", "SNAPTRAP <no-reply@example.invalid>")
    text_body = text_body or re.sub(r"<[^>]+>", "", html_body)

    if provider == "console":
        print(f"\n[mailer:console] To: {to_email}\nSubject: {subject}\n{text_body}\n", flush=True)
        return True

    try:
        if provider == "brevo":
            name, addr = _split_from(mail_from)
            r = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={"api-key": os.environ["BREVO_API_KEY"], "accept": "application/json"},
                json={"sender": {"name": name, "email": addr}, "to": [{"email": to_email}],
                      "subject": subject, "htmlContent": html_body, "textContent": text_body},
                timeout=TIMEOUT,
            )
        else:  # resend
            r = requests.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {os.environ['RESEND_API_KEY']}"},
                json={"from": mail_from, "to": [to_email], "subject": subject,
                      "html": html_body, "text": text_body},
                timeout=TIMEOUT,
            )
        ok = 200 <= r.status_code < 300
        if not ok:
            print(f"[mailer:{provider}] HTTP {r.status_code}: {r.text[:200]}", flush=True)
        return ok
    except Exception as e:  # network / config errors must never break signup
        print(f"[mailer:{provider}] send failed: {e}", flush=True)
        return False


def verification_email(name, link):
    """(subject, html, text) for the verify-your-email message."""
    safe = html.escape(name or "there")
    subject = "Verify your SNAPTRAP email"
    body = (
        f"<p>Hi {safe},</p>"
        f"<p>Confirm this email address to activate your SNAPTRAP account:</p>"
        f'<p><a href="{html.escape(link)}">Verify my email</a></p>'
        f"<p>This link expires in 24 hours. If you didn't sign up, ignore this message.</p>"
    )
    text = (f"Hi {name or 'there'},\n\nConfirm your email to activate your SNAPTRAP account:\n{link}\n\n"
            "This link expires in 24 hours. If you didn't sign up, ignore this message.\n")
    return subject, body, text
