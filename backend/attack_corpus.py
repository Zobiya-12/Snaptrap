"""
Labelled attack generator for the red-team detection test.

These payloads are written independently of simulator.py's payload lists, so the
test is not just replaying strings the model was trained on. Service/score ranges
follow the simulator's conventions but are widened so the classes overlap a bit
(real traffic is not that tidy).

What the resulting score means: "how often the trained classifier assigns the right
attack type to freshly generated attacks". It is a self-test against synthetic
traffic, not a measurement of detection on real internet attacks.
"""
import random

TYPES = ['brute', 'cred', 'scan', 'sqli', 'slow']

_USERS = ['root', 'admin', 'oracle', 'postgres', 'ubuntu', 'git', 'jenkins', 'tomcat', 'svc_backup', 'student']
_PASSES = ['hunter2', 'Winter2024!', 'qwerty123', 'toor', 'Passw0rd', 'letmein1', 'sunshine', 'P@55word', 'admin@123', '000000']
_SQLI = [
    "' OR 'a'='a", "1' AND 1=1 UNION SELECT username,password FROM accounts--",
    "'; DROP TABLE sessions;--", "' OR 1=1 LIMIT 1 OFFSET 0--",
    "1 AND (SELECT COUNT(*) FROM information_schema.columns)>0",
    "admin' /*", "'; SELECT pg_sleep(5);--", "x' UNION ALL SELECT NULL,version(),NULL--",
]
_PROBES = ['SCAN probe:{p}', 'SCAN syn:{p}', 'SCAN banner-grab:{p}', 'SCAN tcp-connect:{p}']
_SLOW = ['GET / HTTP/1.1', 'GET /index.html HTTP/1.0', 'HEAD / HTTP/1.1', 'GET /favicon.ico HTTP/1.1', 'OPTIONS / HTTP/1.1']
_SERVICES = [('SSH', 2222), ('HTTP', 8080), ('FTP', 2121), ('DB', 3306)]


def _score(lo, hi):
    return max(0, min(100, random.randint(lo - 8, hi + 8)))


def _one(kind, ip):
    if kind == 'brute':
        svc, port = random.choice([('SSH', 2222), ('FTP', 2121)])
        payload = f"USER {random.choice(_USERS)} PASS {random.choice(_PASSES)}"
        score = _score(22, 55)
    elif kind == 'cred':
        svc, port = 'HTTP', 8080
        payload = f"username={random.choice(_USERS)}&password={random.choice(_PASSES)}"
        score = _score(40, 70)
    elif kind == 'scan':
        svc, port = random.choice(_SERVICES)
        payload = random.choice(_PROBES).format(p=port)
        score = _score(10, 25)
    elif kind == 'sqli':
        svc, port = random.choice([('DB', 3306), ('HTTP', 8080)])
        payload = random.choice(_SQLI)
        score = _score(65, 95)
    else:  # slow
        svc, port = 'HTTP', 8080
        payload = random.choice(_SLOW)
        score = _score(8, 22)
    return {'attack_type': kind, 'service': svc, 'port': port, 'payload': payload,
            'threat_score': score, 'attacker_ip': ip, 'port_diversity': 1}


def generate(n, seed=None):
    """n labelled attacks, spread evenly over TYPES, from a pool of ~20 attacker IPs."""
    rng_state = random.getstate()
    if seed is not None:
        random.seed(seed)
    try:
        ips = [f"198.51.{random.randint(0, 99)}.{random.randint(1, 250)}" for _ in range(20)]
        return [_one(TYPES[i % len(TYPES)], random.choice(ips)) for i in range(n)]
    finally:
        random.setstate(rng_state)
