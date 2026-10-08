"""
SNAPTRAP — Password Security Module
Replaces plaintext / weak hashing with Argon2id (winner of Password Hashing Competition).
Falls back to bcrypt if argon2-cffi is not installed.

Install:
    pip install argon2-cffi bcrypt

Usage (drop-in for your existing app.py / auth routes):
    from auth.password_security import hash_password, verify_password, is_password_strong
"""

import re
import secrets
import string
from argon2 import PasswordHasher
from argon2.low_level import Type
from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

# ── Try Argon2id first (gold standard) ──────────────────────────────────────
try:
    from argon2 import PasswordHasher
    from argon2.exceptions import VerifyMismatchError, VerificationError, InvalidHashError

    # Argon2id — tuned for ~300 ms on a modest server (OWASP 2024 recommendation)
    _ph = PasswordHasher(
        time_cost=3,        # number of iterations
        memory_cost=65536,  # 64 MB RAM — makes GPU cracking extremely expensive
        parallelism=4,      # threads used during hashing
        hash_len=32,        # output hash length in bytes
        salt_len=16,        # random salt length in bytes
        encoding="utf-8",
        type=Type.ID,          # defaults to Argon2id
    )
    ALGORITHM = "argon2id"

    def hash_password(plain_password: str) -> str:
        """Hash a plaintext password. Returns an opaque Argon2id hash string."""
        return _ph.hash(plain_password)

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        Verify a password against its stored hash.
        Returns True on match, False on mismatch or bad hash.
        Also transparently rehashes if parameters have been upgraded.
        """
        try:
            return _ph.verify(hashed_password, plain_password)
        except VerifyMismatchError:
            return False
        except (VerificationError, InvalidHashError):
            return False

    def needs_rehash(hashed_password: str) -> bool:
        """True if the stored hash was made with older parameters and should be upgraded."""
        return _ph.check_needs_rehash(hashed_password)

# ── Fallback: bcrypt ─────────────────────────────────────────────────────────
except ImportError:
    import bcrypt  # pip install bcrypt
    ALGORITHM = "bcrypt"

    def hash_password(plain_password: str) -> str:
        """Hash with bcrypt (work factor 12 — ~250 ms, safe until ~2030)."""
        salt = bcrypt.gensalt(rounds=12)
        return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                hashed_password.encode("utf-8"),
            )
        except Exception:
            return False

    def needs_rehash(hashed_password: str) -> bool:
        return False  # bcrypt doesn't expose param-check; upgrade manually if needed


# ── Password strength validator ───────────────────────────────────────────────

class PasswordStrengthError(ValueError):
    pass


def is_password_strong(password: str, raise_on_fail: bool = False) -> tuple[bool, list[str]]:
    """
    Validate password strength.

    Rules (NIST SP 800-63B + OWASP):
      • Minimum 12 characters
      • At least one uppercase letter
      • At least one lowercase letter
      • At least one digit
      • At least one special character
      • Not in the common-passwords shortlist

    Returns (is_valid: bool, list_of_failures: list[str]).
    If raise_on_fail=True, raises PasswordStrengthError with failure messages joined.
    """
    failures = []

    if len(password) < 12:
        failures.append("Must be at least 12 characters long")
    if not re.search(r"[A-Z]", password):
        failures.append("Must contain at least one uppercase letter")
    if not re.search(r"[a-z]", password):
        failures.append("Must contain at least one lowercase letter")
    if not re.search(r"\d", password):
        failures.append("Must contain at least one digit")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{};:'\",.<>?/\\|`~]", password):
        failures.append("Must contain at least one special character")

    # Tiny blocklist — expand from haveibeenpwned top-1M if you want
    _COMMON = {
        "password123!", "Password123!", "Admin1234!", "Welcome1!",
        "Snaptrap123!", "Honeypot1!", "Qwerty123!", "Letmein1!",
    }
    if password in _COMMON:
        failures.append("Password is too common — choose something unique")

    ok = len(failures) == 0
    if not ok and raise_on_fail:
        raise PasswordStrengthError("; ".join(failures))
    return ok, failures


def generate_strong_password(length: int = 20) -> str:
    """Generate a cryptographically random strong password (for agent tokens etc.)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(length))
        ok, _ = is_password_strong(pwd)
        if ok:
            return pwd


# ── Flask integration helpers ─────────────────────────────────────────────────

def register_user_password(plain_password: str) -> str:
    """
    Call this during /signup.
    Validates strength, then returns the hash to store in the DB.

    Raises PasswordStrengthError if weak.
    """
    is_password_strong(plain_password, raise_on_fail=True)
    return hash_password(plain_password)


def login_check(plain_password: str, stored_hash: str) -> bool:
    """
    Call this during /login.
    Returns True if correct, False otherwise.
    Constant-time — safe against timing attacks.
    """
    return verify_password(plain_password, stored_hash)


# ── Quick self-test (run: python password_security.py) ───────────────────────
if __name__ == "__main__":
    print(f"[SNAPTRAP] Password security using: {ALGORITHM.upper()}")

    test_pw = "SnapTrap#Secure99!"
    hashed = hash_password(test_pw)
    print(f"Hash      : {hashed[:60]}...")
    print(f"Verify ✓  : {verify_password(test_pw, hashed)}")
    print(f"Verify ✗  : {verify_password('wrongpassword', hashed)}")

    weak = "abc123"
    ok, issues = is_password_strong(weak)
    print(f"\nWeak password '{weak}' → valid={ok}, issues={issues}")

    strong = generate_strong_password()
    print(f"\nGenerated strong password: {strong}")
