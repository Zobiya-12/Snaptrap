import asyncio
import threading
import queue
import time
import random
import sys
import os
from datetime import datetime
from colorama import Fore, Style, init
from db import insert_attack, insert_prediction, get_stats

# ── Wire in the ML classifier ──
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
try:
    from classifier import classify_single, load_model, check_retrain_needed
    _model = load_model()
    ML_ENABLED = True
    print(f"{Fore.GREEN}[ML] Classifier loaded successfully")
except Exception as e:
    _model = None
    ML_ENABLED = False
    print(f"{Fore.YELLOW}[ML] Classifier not available: {e}")
    print(f"{Fore.YELLOW}[ML] Run: python3 classifier.py --train")

init(autoreset=True)

event_queue = queue.Queue()
blocklist = set()
blocklist_lock = threading.Lock()
ip_hit_count = {}
ip_hit_lock = threading.Lock()

BLOCK_THRESHOLD = 5
TARPIT_MIN      = 2
TARPIT_MAX      = 5

# ── Novel attack counter for periodic warnings ──
novel_count     = 0
novel_count_lock= threading.Lock()


# ──────────────────────────────────────────────
# BLOCKING / TARPITTING
# ──────────────────────────────────────────────
def is_blocked(ip):
    with blocklist_lock:
        return ip in blocklist


def record_hit(ip):
    with ip_hit_lock:
        ip_hit_count[ip] = ip_hit_count.get(ip, 0) + 1
        if ip_hit_count[ip] >= BLOCK_THRESHOLD:
            with blocklist_lock:
                if ip not in blocklist:
                    blocklist.add(ip)
                    print(f"{Fore.RED}[BLOCKED] {ip} after {BLOCK_THRESHOLD} hits")


# ──────────────────────────────────────────────
# THREAT SCORING
# ──────────────────────────────────────────────
def compute_threat_score(service, payload):
    score = 10
    p = payload.lower()
    if service == 'SSH':
        score += 20
        if 'root'  in p: score += 10
        if 'admin' in p: score += 5
    elif service == 'HTTP':
        score += 30
        if 'username' in p: score += 20
    elif service == 'FTP':
        score += 20
        if 'pass' in p: score += 15
    elif service == 'DB':
        score += 30
        for kw in ['select', 'union', 'drop', 'insert', 'exec', 'or 1=1']:
            if kw in p:
                score += 15
                break
    return min(score, 100)


# ──────────────────────────────────────────────
# FALLBACK RULE-BASED CLASSIFIER
# (used only if ML model not loaded)
# ──────────────────────────────────────────────
def rule_classify(payload, service):
    p = payload.lower()
    if any(k in p for k in ['select', 'union', 'drop', 'or 1=1']):
        return 'sqli', 0.92
    if service == 'SSH' and ('user' in p or 'pass' in p):
        return 'brute', 0.88
    if service == 'HTTP' and 'username' in p:
        return 'cred', 0.85
    if service == 'FTP' and 'pass' in p:
        return 'brute', 0.83
    if payload in ['port probe', 'page scan', 'connection only']:
        return 'scan', 0.90
    return 'slow', 0.75


# ──────────────────────────────────────────────
# MAIN CLASSIFICATION ENTRY POINT
# ──────────────────────────────────────────────
def do_classify(attack_dict):
    """
    Returns (attack_type, confidence, is_novel, is_uncertain, warning)
    Uses ML classifier if available, falls back to rules.
    """
    global novel_count

    if ML_ENABLED and _model is not None:
        try:
            result = classify_single(attack_dict)
            if result['is_novel'] or result['is_uncertain']:
                with novel_count_lock:
                    novel_count += 1
                # Print warning immediately to terminal
                print(f"\n{Fore.RED}{'!'*60}")
                print(f"{Fore.RED}  ⚠ {'NOVEL' if result['is_novel'] else 'UNCERTAIN'} ATTACK DETECTED")
                print(f"{Fore.RED}  IP      : {attack_dict.get('attacker_ip','?')}")
                print(f"{Fore.RED}  Service : {attack_dict.get('service','?')} | Port: {attack_dict.get('port','?')}")
                print(f"{Fore.RED}  Payload : {str(attack_dict.get('payload',''))[:80]}")
                print(f"{Fore.RED}  Confidence: {result['confidence']:.1%} | Best guess: {result['top_class']}")
                print(f"{Fore.RED}  → Logged to novel_attacks.jsonl for manual review")
                print(f"{Fore.RED}{'!'*60}\n")
            return (
                result['attack_type'],
                result['confidence'],
                result['is_novel'],
                result['is_uncertain'],
                result['warning']
            )
        except Exception as e:
            print(f"{Fore.YELLOW}[ML] Classify error: {e} — falling back to rules")

    # Fallback
    atype, conf = rule_classify(attack_dict.get('payload', ''), attack_dict.get('service', ''))
    return atype, conf, False, False, None


# ──────────────────────────────────────────────
# EVENT CONSUMER (DB writer thread)
# ──────────────────────────────────────────────
def event_consumer():
    print(f"{Fore.CYAN}[CONSUMER] Started")
    while True:
        try:
            e = event_queue.get(timeout=1)

            # Build attack dict for classifier
            attack_dict = {
                'attacker_ip':  e['attacker_ip'],
                'service':      e['service'],
                'port':         e['port'],
                'payload':      e['payload'],
                'threat_score': e['threat_score'],
                'org_id':       1,
            }

            # Classify BEFORE inserting so we store the right attack_type
            atype, conf, is_novel, is_uncertain, warning = do_classify(attack_dict)

            # Insert attack with ML-determined type
            attack_id = insert_attack(
                e['attacker_ip'],
                e['service'],
                e['port'],
                e['payload'],
                e['threat_score'],
                atype,          # ← ML result, not rule-based
                1
            )

            # Save prediction details to ml_predictions table
            insert_prediction(attack_id, atype, conf)

            # If novel/uncertain, also log the warning to DB notes
            if warning and attack_id:
                try:
                    from db import get_db_connection
                    conn = get_db_connection()
                    cur  = conn.cursor()
                    cur.execute(
                        "UPDATE ml_predictions SET warning = %s WHERE attack_id = %s",
                        (warning[:500], attack_id)
                    )
                    conn.commit()
                    cur.close()
                    conn.close()
                except Exception:
                    pass

            event_queue.task_done()

        except queue.Empty:
            continue
        except Exception as ex:
            print(f"{Fore.YELLOW}[CONSUMER] {ex}")


# ──────────────────────────────────────────────
# HONEYPOT HANDLERS
# ──────────────────────────────────────────────
def push_event(service, ip, port, payload, score):
    """Push to queue — attack_type determined by classifier in consumer."""
    event_queue.put({
        'timestamp':    datetime.now().isoformat(),
        'service':      service,
        'attacker_ip':  ip,
        'port':         port,
        'payload':      payload,
        'threat_score': score,
    })
    print(f"{Fore.RED}[HIT] {service:5}|{ip:15}|Score:{score:3}|{payload[:40]}")


async def handle_ssh(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"SSH-2.0-OpenSSH_8.9p1 Ubuntu\r\n")
        await writer.drain()
        await asyncio.sleep(random.uniform(TARPIT_MIN, TARPIT_MAX))
        data    = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'no payload'
        score   = compute_threat_score('SSH', payload)
        writer.write(b"Permission denied.\r\n")
        await writer.drain()
        push_event('SSH', ip, 2222, payload, score)
    except Exception:
        pass
    finally:
        writer.close()


async def handle_http(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    fake = (
        "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
        "<html><body><h2>Admin Login</h2>"
        "<form method='POST'><input name='username'/>"
        "<input name='password' type='password'/>"
        "<button>Login</button></form></body></html>"
    )
    try:
        await asyncio.sleep(random.uniform(TARPIT_MIN, TARPIT_MAX))
        data = await asyncio.wait_for(reader.read(4096), timeout=10)
        raw  = data.decode('utf-8', errors='ignore')
        if 'POST' in raw and 'username' in raw.lower():
            payload = raw.split('\r\n\r\n')[-1][:100]
        elif 'GET' in raw:
            payload = 'page scan'
        else:
            payload = 'connection only'
        score = compute_threat_score('HTTP', payload)
        writer.write(fake.encode())
        await writer.drain()
        push_event('HTTP', ip, 8080, payload, score)
    except Exception:
        pass
    finally:
        writer.close()


async def handle_ftp(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"220 FTP Server Ready\r\n")
        await writer.drain()
        await asyncio.sleep(random.uniform(TARPIT_MIN, TARPIT_MAX))
        data    = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'connection only'
        score   = compute_threat_score('FTP', payload)
        writer.write(b"530 Login incorrect.\r\n")
        await writer.drain()
        push_event('FTP', ip, 2121, payload, score)
    except Exception:
        pass
    finally:
        writer.close()


async def handle_db(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"\xff\x00\x00\x00\x0aMySQL 8.0.35\x00")
        await writer.drain()
        await asyncio.sleep(random.uniform(1, 2))
        data    = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'port probe'
        score   = compute_threat_score('DB', payload)
        push_event('DB', ip, 3306, payload, score)
    except Exception:
        pass
    finally:
        writer.close()


# ──────────────────────────────────────────────
# ASYNC HONEYPOT RUNNER
# ──────────────────────────────────────────────
def run_async_honeypots():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def main():
        servers = await asyncio.gather(
            asyncio.start_server(handle_ssh,  '0.0.0.0', 2222),
            asyncio.start_server(handle_http, '0.0.0.0', 8080),
            asyncio.start_server(handle_ftp,  '0.0.0.0', 2121),
            asyncio.start_server(handle_db,   '0.0.0.0', 3306),
        )
        print(f"{Fore.YELLOW}[ASYNC] SSH:2222 HTTP:8080 FTP:2121 DB:3306 all listening")
        await asyncio.gather(*[s.serve_forever() for s in servers])

    loop.run_until_complete(main())


# ──────────────────────────────────────────────
# STATS PRINTER (every 30s)
# ──────────────────────────────────────────────
def stats_printer():
    while True:
        time.sleep(30)
        try:
            s = get_stats()
            print(f"\n{Fore.CYAN}{'─'*55}")
            print(f"{Fore.CYAN}  SNAPTRAP  {datetime.now().strftime('%H:%M:%S')}")
            print(f"{Fore.CYAN}  Attacks : {s['total_attacks']}  |  IPs: {s['unique_ips']}  |  Blocked: {len(blocklist)}")
            print(f"{Fore.CYAN}  Services: {s['by_service']}")
            print(f"{Fore.CYAN}  Types   : {s['by_type']}")
            with novel_count_lock:
                nc = novel_count
            if nc > 0:
                print(f"{Fore.RED}  ⚠ Novel/Uncertain attacks this session: {nc}")
                print(f"{Fore.RED}    → Review: backend/model/novel_attacks.jsonl")
            ml_status = "✓ ML Active" if ML_ENABLED else "✗ Rules only"
            print(f"{Fore.CYAN}  ML      : {ml_status}")
            print(f"{Fore.CYAN}{'─'*55}\n")
        except Exception as e:
            print(f"{Fore.YELLOW}[STATS] {e}")


# ──────────────────────────────────────────────
# RETRAIN WATCHER (every 10 min)
# ──────────────────────────────────────────────
def retrain_watcher():
    """
    Checks every 10 minutes if enough new labeled data has arrived
    to trigger an automatic retrain.
    """
    if not ML_ENABLED:
        return
    time.sleep(600)   # wait 10 min before first check
    while True:
        try:
            if check_retrain_needed():
                print(f"{Fore.YELLOW}[ML] Retrain triggered — {ML_ENABLED} new samples accumulated")
                print(f"{Fore.YELLOW}[ML] Run: python3 classifier.py --train")
                # Non-blocking: just notify, don't retrain in-process
                # (retraining takes CPU and would affect honeypot performance)
        except Exception as e:
            print(f"{Fore.YELLOW}[RETRAIN] {e}")
        time.sleep(600)


# ──────────────────────────────────────────────
# MAIN
# ──────────────────────────────────────────────
if __name__ == "__main__":
    print(f"{Fore.RED}")
    print("  ███████╗███╗   ██╗ █████╗ ██████╗ ████████╗██████╗  █████╗ ██████╗ ")
    print("  ██╔════╝████╗  ██║██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗")
    print("  ███████╗██╔██╗ ██║███████║██████╔╝   ██║   ██████╔╝███████║██████╔╝ ")
    print("  ╚════██║██║╚██╗██║██╔══██║██╔═══╝    ██║   ██╔══██╗██╔══██║██╔═══╝  ")
    print("  ███████║██║ ╚████║██║  ██║██║        ██║   ██║  ██║██║  ██║██║      ")
    print("  ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝    ")
    print(f"{Style.RESET_ALL}")
    print("  ML-Powered Honeypot | Asyncio + Threading\n")

    from db import init_db
    init_db()

    threads = [
        threading.Thread(target=run_async_honeypots, name="AsyncHoneypots", daemon=True),
        threading.Thread(target=event_consumer,      name="EventConsumer",  daemon=True),
        threading.Thread(target=stats_printer,       name="StatsPrinter",   daemon=True),
        threading.Thread(target=retrain_watcher,     name="RetrainWatcher", daemon=True),
    ]

    for t in threads:
        t.start()
        print(f"{Fore.GREEN}[START] {t.name}")

    print(f"\n{Fore.GREEN}  SNAPTRAP is live!")
    print(f"{Fore.YELLOW}  SSH:2222 | HTTP:8080 | FTP:2121 | DB:3306")
    ml_msg = "ML classifier active" if ML_ENABLED else "Rules-only mode (train classifier first)"
    print(f"{Fore.YELLOW}  {ml_msg}")
    print(f"{Fore.YELLOW}  Ctrl+C to stop\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Fore.RED}  SNAPTRAP shutting down.")
