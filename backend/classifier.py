import math
import pickle
import os
import json
from datetime import datetime
from concurrent.futures import ProcessPoolExecutor
from colorama import Fore, init

init(autoreset=True)

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'models', 'classifier.pkl')
UNKNOWN_PATTERNS_PATH = os.path.join(os.path.dirname(__file__), 'data', 'unknown_patterns.json')

SQL_KEYWORDS = [
    'select', 'union', 'insert', 'update', 'delete', 'drop',
    'create', 'alter', 'exec', 'execute', 'cast', 'convert',
    'or 1=1', 'or 1 =1', "' or '", 'sleep(', 'benchmark(',
    'information_schema', 'pg_tables', 'sysobjects', 'xp_cmd'
]

SHELL_KEYWORDS = [
    '/bin/sh', '/bin/bash', 'cmd.exe', 'powershell', 'wget',
    'curl ', 'chmod', 'nc -e', 'ncat', '/etc/passwd',
    'id;', 'whoami', 'uname -a', '&&', '||', ';ls', ';id'
]

BRUTE_KEYWORDS = [
    'user ', 'pass ', 'username', 'password', 'login',
    'auth', 'credential', 'root', 'admin', 'administrator'
]

CONFIDENCE_THRESHOLD = 0.60


def shannon_entropy(text):
    if not text:
        return 0.0
    freq = {}
    for c in text:
        freq[c] = freq.get(c, 0) + 1
    total = len(text)
    entropy = 0.0
    for count in freq.values():
        p = count / total
        if p > 0:
            entropy -= p * math.log2(p)
    return round(entropy, 4)


def keyword_score(text, keywords):
    text_lower = text.lower()
    return sum(1 for kw in keywords if kw in text_lower)


def extract_features(attack, ip_history=None):
    payload     = str(attack.get('payload', '') or '')
    service     = str(attack.get('service', '') or '').upper()
    score       = int(attack.get('threat_score', 0) or 0)
    timestamp   = attack.get('timestamp')
    attacker_ip = str(attack.get('attacker_ip', '') or '')

    plen = len(payload)
    entropy      = shannon_entropy(payload)
    digits       = sum(1 for c in payload if c.isdigit())
    specials     = sum(1 for c in payload if not c.isalnum() and c != ' ')
    digit_ratio   = round(digits / plen, 4) if plen > 0 else 0
    special_ratio = round(specials / plen, 4) if plen > 0 else 0

    sql_score   = keyword_score(payload, SQL_KEYWORDS)
    shell_score = keyword_score(payload, SHELL_KEYWORDS)
    brute_score = keyword_score(payload, BRUTE_KEYWORDS)
    has_sql     = 1 if sql_score > 0 else 0
    has_shell   = 1 if shell_score > 0 else 0
    has_brute   = 1 if brute_score > 0 else 0

    is_ssh  = 1 if service == 'SSH'  else 0
    is_http = 1 if service == 'HTTP' else 0
    is_ftp  = 1 if service == 'FTP'  else 0
    is_db   = 1 if service == 'DB'   else 0

    hour_of_day = 0
    if timestamp:
        try:
            dt = datetime.fromisoformat(str(timestamp))
            hour_of_day = dt.hour
        except Exception:
            hour_of_day = 0

    is_repeat    = 0
    ip_hit_count = 1
    if ip_history and attacker_ip in ip_history:
        ip_hit_count = ip_history[attacker_ip]
        is_repeat = 1 if ip_hit_count > 1 else 0

    port_diversity = int(attack.get('port_diversity', 1) or 1)

    return [
        score, plen, entropy, digit_ratio, special_ratio,
        sql_score, shell_score, brute_score,
        has_sql, has_shell, has_brute,
        is_ssh, is_http, is_ftp, is_db,
        hour_of_day, is_repeat, ip_hit_count, port_diversity
    ]


FEATURE_NAMES = [
    'threat_score', 'payload_len', 'entropy',
    'digit_ratio', 'special_ratio',
    'sql_score', 'shell_score', 'brute_score',
    'has_sql', 'has_shell', 'has_brute',
    'is_ssh', 'is_http', 'is_ftp', 'is_db',
    'hour_of_day', 'is_repeat', 'ip_hit_count',
    'port_diversity'
]


# ─────────────────────────────────────────
# STORE UNKNOWN PATTERN
# Called when confidence is below threshold
# Saves pattern to JSON for manual labeling
# ─────────────────────────────────────────
def store_unknown_pattern(payload, service, threat_score,
                           attacker_ip, features, confidence):
    pattern = {
        'timestamp':    datetime.now().isoformat(),
        'attacker_ip':  attacker_ip or 'unknown',
        'service':      service,
        'threat_score': threat_score,
        'payload':      payload[:200],
        'confidence':   confidence,
        'features': {
            name: round(float(val), 4)
            for name, val in zip(FEATURE_NAMES, features)
        },
        'labeled_as': None,
        'notes':      ''
    }

    patterns = []
    if os.path.exists(UNKNOWN_PATTERNS_PATH):
        try:
            with open(UNKNOWN_PATTERNS_PATH, 'r') as f:
                patterns = json.load(f)
        except Exception:
            patterns = []

    patterns.append(pattern)
    os.makedirs(os.path.dirname(UNKNOWN_PATTERNS_PATH), exist_ok=True)
    with open(UNKNOWN_PATTERNS_PATH, 'w') as f:
        json.dump(patterns, f, indent=2)

    print(f"{Fore.YELLOW}[UNKNOWN] Pattern stored — "
          f"service:{service} score:{threat_score} conf:{confidence}")


# ─────────────────────────────────────────
# PARALLEL CLASSIFICATION
# ProcessPoolExecutor — Layer 3 HPC
# ─────────────────────────────────────────
def classify_single(args):
    features, model_path = args
    try:
        with open(model_path, 'rb') as f:
            model = pickle.load(f)
        pred  = model.predict([features])[0]
        proba = model.predict_proba([features])[0]
        conf  = round(float(max(proba)), 4)
        return pred, conf
    except Exception:
        return 'unknown', 0.0


def classify_batch_parallel(attacks, max_workers=4):
    if not os.path.exists(MODEL_PATH):
        return [('unknown', 0.0)] * len(attacks)

    ip_history = {}
    for a in attacks:
        ip = str(a.get('attacker_ip', ''))
        ip_history[ip] = ip_history.get(ip, 0) + 1

    args_list = [
        (extract_features(a, ip_history), MODEL_PATH)
        for a in attacks
    ]

    results = []
    with ProcessPoolExecutor(max_workers=max_workers) as executor:
        for result in executor.map(classify_single, args_list):
            results.append(result)
    return results


# ─────────────────────────────────────────
# REAL-TIME CLASSIFICATION
# With confidence threshold
# Unknown patterns stored for later labeling
# ─────────────────────────────────────────
def classify_realtime(payload, service, threat_score,
                       attacker_ip=None, ip_history=None):
    if not os.path.exists(MODEL_PATH):
        return 'unknown', 0.0

    attack = {
        'payload':       payload,
        'service':       service,
        'threat_score':  threat_score,
        'attacker_ip':   attacker_ip or '',
        'timestamp':     datetime.now().isoformat(),
        'port_diversity': 1
    }
    features = extract_features(attack, ip_history or {})

    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)

        pred  = model.predict([features])[0]
        proba = model.predict_proba([features])[0]
        conf  = round(float(max(proba)), 4)

        # Low confidence — unknown attack type
        if conf < CONFIDENCE_THRESHOLD:
            store_unknown_pattern(
                payload, service, threat_score,
                attacker_ip, features, conf
            )
            return 'unknown', conf

        return pred, conf

    except Exception:
        return 'unknown', 0.0


# ─────────────────────────────────────────
# TRAIN MODEL
# ─────────────────────────────────────────
def train_model():
    from db import get_conn

    print(f"\n{Fore.CYAN}[ML] Loading attack data from database...")

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT
            a.id, a.attacker_ip, a.service, a.port,
            a.payload, a.threat_score, a.attack_type, a.timestamp,
            COUNT(a2.id) as ip_hit_count
        FROM attacks a
        LEFT JOIN attacks a2 ON a2.attacker_ip = a.attacker_ip
        WHERE a.attack_type IS NOT NULL
        GROUP BY a.id, a.attacker_ip, a.service, a.port,
                 a.payload, a.threat_score, a.attack_type, a.timestamp
        ORDER BY a.timestamp DESC
    """)
    rows = cur.fetchall()

    cur.execute("""
        SELECT attacker_ip, COUNT(DISTINCT service) as diversity
        FROM attacks GROUP BY attacker_ip
    """)
    diversity_map = {r[0]: r[1] for r in cur.fetchall()}
    cur.close()
    conn.close()

    if len(rows) < 10:
        print(f"{Fore.YELLOW}[ML] Only {len(rows)} samples — run simulator first")
        print(f"{Fore.YELLOW}[ML] Training anyway...\n")

    attacks, labels = [], []
    ip_history = {}
    for r in rows:
        ip = r[1]
        ip_history[ip] = ip_history.get(ip, 0) + 1

    for r in rows:
        attack = {
            'attacker_ip':    r[1],
            'service':        r[2],
            'port':           r[3],
            'payload':        r[4],
            'threat_score':   r[5],
            'attack_type':    r[6],
            'timestamp':      r[7],
            'port_diversity': diversity_map.get(r[1], 1)
        }
        attacks.append(extract_features(attack, ip_history))
        labels.append(r[6])

    unique_classes = list(set(labels))
    print(f"{Fore.CYAN}[ML] {len(attacks)} samples, {len(unique_classes)} classes")
    print(f"{Fore.CYAN}[ML] Classes: {unique_classes}")

    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import classification_report, accuracy_score
    import numpy as np

    X = np.array(attacks)
    y = np.array(labels)

    if len(attacks) >= 20:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        print(f"{Fore.CYAN}[ML] Split: {len(X_train)} train / {len(X_test)} test")
    else:
        X_train, X_test = X, X
        y_train, y_test = y, y
        print(f"{Fore.YELLOW}[ML] Small dataset — using all for train+test")

    print(f"{Fore.CYAN}[ML] Training Random Forest...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    acc    = round(accuracy_score(y_test, y_pred) * 100, 2)

    print(f"{Fore.GREEN}[ML] Accuracy: {acc}%")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred, zero_division=0))

    importances = model.feature_importances_
    fi_pairs    = sorted(zip(FEATURE_NAMES, importances), key=lambda x: x[1], reverse=True)
    print(f"Feature Importance:")
    for name, imp in fi_pairs[:10]:
        bar = '█' * int(imp * 40)
        print(f"  {name:20} {imp:.3f}  {bar}")

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    print(f"\n{Fore.GREEN}[ML] Model saved → {MODEL_PATH}")
    return model, acc


# ─────────────────────────────────────────
# RECLASSIFY UNCLASSIFIED ATTACKS
# ─────────────────────────────────────────
def reclassify_unclassified():
    if not os.path.exists(MODEL_PATH):
        print(f"{Fore.YELLOW}[ML] No model found — train first")
        return

    from db import get_conn, insert_prediction
    print(f"\n{Fore.CYAN}[ML] Finding unclassified attacks...")

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("""
        SELECT a.id, a.attacker_ip, a.service, a.port,
               a.payload, a.threat_score, a.timestamp
        FROM attacks a
        LEFT JOIN ml_predictions p ON p.attack_id = a.id
        WHERE p.id IS NULL
        LIMIT 500
    """)
    rows = cur.fetchall()

    cur.execute("""
        SELECT attacker_ip, COUNT(DISTINCT service)
        FROM attacks GROUP BY attacker_ip
    """)
    diversity_map = {r[0]: r[1] for r in cur.fetchall()}

    ip_history = {}
    for r in rows:
        ip = r[1]
        ip_history[ip] = ip_history.get(ip, 0) + 1

    cur.close()
    conn.close()

    if not rows:
        print(f"{Fore.YELLOW}[ML] No unclassified attacks found")
        return

    print(f"{Fore.CYAN}[ML] Classifying {len(rows)} attacks in parallel...")

    attacks = [{
        'attacker_ip':    r[1],
        'service':        r[2],
        'port':           r[3],
        'payload':        r[4],
        'threat_score':   r[5],
        'timestamp':      r[6],
        'port_diversity': diversity_map.get(r[1], 1)
    } for r in rows]

    results = classify_batch_parallel(attacks, max_workers=4)

    conn = get_conn()
    cur  = conn.cursor()
    saved = 0
    for i, (pred, conf) in enumerate(results):
        attack_id = rows[i][0]
        final_pred = pred if conf >= CONFIDENCE_THRESHOLD else 'unknown'
        try:
            cur.execute("""
                INSERT INTO ml_predictions (attack_id, predicted_type, confidence)
                VALUES (%s, %s, %s)
                ON CONFLICT DO NOTHING
            """, (attack_id, final_pred, conf))
            saved += 1
        except Exception:
            pass
    conn.commit()
    cur.close()
    conn.close()
    print(f"{Fore.GREEN}[ML] Saved {saved} predictions")


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
if __name__ == "__main__":
    from db import get_conn

    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM attacks WHERE attack_type IS NOT NULL")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT attack_type) FROM attacks WHERE attack_type IS NOT NULL")
    types = cur.fetchone()[0]
    cur.close()
    conn.close()

    print(f"{Fore.CYAN}Database: {total} attacks, {types} distinct types")

    if total < 5:
        print(f"{Fore.YELLOW}Too few samples. Run simulator first:")
        print(f"{Fore.YELLOW}  python3 simulator.py --mode demo")
        exit(1)

    model, acc = train_model()

    print(f"\n{Fore.CYAN}Running batch reclassification...")
    reclassify_unclassified()

    print(f"\n{Fore.GREEN}All done! ML pipeline ready.")
    print(f"{Fore.GREEN}Unknown patterns stored in data/unknown_patterns.json")
