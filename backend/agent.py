import asyncio
import threading
import queue
import time
import random
import argparse
import requests
import json
from datetime import datetime
from colorama import Fore, Style, init

init(autoreset=True)

# ─────────────────────────────────────────
# SNAPTRAP AGENT
# Lightweight honeypot agent for orgs
# Runs on org's own network
# Sends attack data to central server
# Custom port support — org chooses ports
# ─────────────────────────────────────────

event_queue = queue.Queue()
blocklist   = set()
blocklist_lock = threading.Lock()
ip_hit_count   = {}
ip_hit_lock    = threading.Lock()
BLOCK_THRESHOLD = 5


# ─────────────────────────────────────────
# PORT VALIDATION
# Only allow ports above 1024
# Prevents conflicts with system services
# ─────────────────────────────────────────
def validate_port(port, name):
    if port < 1024:
        raise ValueError(
            f"{name} port {port} is below 1024. "
            f"Use ports above 1024 to avoid system conflicts."
        )
    if port > 65535:
        raise ValueError(f"{name} port must be below 65535")
    return port


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
                    print(f"{Fore.RED}[BLOCKED] {ip}")


def compute_score(service, payload):
    score = 10
    p = payload.lower()
    if service == 'SSH':
        score += 20
        if 'root' in p: score += 10
    elif service == 'HTTP':
        score += 30
        if 'username' in p: score += 20
    elif service == 'FTP':
        score += 20
        if 'pass' in p: score += 15
    elif service == 'DB':
        score += 30
        for kw in ['select','union','drop','or 1=1']:
            if kw in p:
                score += 15
                break
    return min(score, 100)


def classify(payload, service):
    p = payload.lower()
    if any(k in p for k in ['select','union','drop','or 1=1']):
        return 'sqli'
    if service == 'SSH' and ('user' in p or 'pass' in p):
        return 'brute'
    if service == 'HTTP' and 'username' in p:
        return 'cred'
    if service == 'FTP' and 'pass' in p:
        return 'brute'
    return 'slow'


# ─────────────────────────────────────────
# REPORT TO CENTRAL SERVER
# Sends attack event to SNAPTRAP central
# Uses org's unique agent token
# ─────────────────────────────────────────
def report_to_central(event, server_url, token):
    try:
        resp = requests.post(
            f"{server_url}/api/agent/report",
            json=event,
            headers={'X-Agent-Token': token},
            timeout=5
        )
        if resp.status_code == 201:
            print(f"{Fore.GREEN}[REPORTED] {event['service']} attack from {event['attacker_ip']}")
        else:
            print(f"{Fore.YELLOW}[REPORT FAILED] {resp.status_code}")
    except Exception as e:
        print(f"{Fore.YELLOW}[REPORT ERROR] {e}")


# ─────────────────────────────────────────
# EVENT CONSUMER
# Reads from queue, reports to central
# ─────────────────────────────────────────
def event_consumer(server_url, token):
    print(f"{Fore.CYAN}[CONSUMER] Reporting to {server_url}")
    while True:
        try:
            event = event_queue.get(timeout=1)
            report_to_central(event, server_url, token)
            event_queue.task_done()
        except queue.Empty:
            continue
        except Exception as e:
            print(f"{Fore.YELLOW}[CONSUMER] {e}")


def push_event(service, ip, port, payload):
    score = compute_score(service, payload)
    atype = classify(payload, service)
    event = {
        'timestamp':   datetime.now().isoformat(),
        'service':     service,
        'attacker_ip': ip,
        'port':        port,
        'payload':     payload,
        'threat_score': score,
        'attack_type': atype
    }
    event_queue.put(event)
    print(f"{Fore.RED}[HIT] {service:5}|{ip:15}|Score:{score:3}|{atype}")


# ─────────────────────────────────────────
# HONEYPOT HANDLERS
# Same asyncio pattern as main honeypot
# But uses custom ports from org config
# ─────────────────────────────────────────
async def handle_ssh(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"SSH-2.0-OpenSSH_8.9p1\r\n")
        await writer.drain()
        await asyncio.sleep(random.uniform(2, 4))
        data = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'no payload'
        writer.write(b"Permission denied.\r\n")
        await writer.drain()
        push_event('SSH', ip, writer.get_extra_info('sockname')[1], payload)
    except Exception: pass
    finally: writer.close()


async def handle_http(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    fake = ("HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n"
            "<html><body><h2>Admin Login</h2>"
            "<form method='POST'><input name='username'/>"
            "<input name='password' type='password'/>"
            "<button>Login</button></form></body></html>")
    try:
        await asyncio.sleep(random.uniform(2, 4))
        data = await asyncio.wait_for(reader.read(4096), timeout=10)
        raw = data.decode('utf-8', errors='ignore')
        if 'POST' in raw and 'username' in raw.lower():
            payload = raw.split('\r\n\r\n')[-1][:100]
        elif 'GET' in raw:
            payload = 'page scan'
        else:
            payload = 'connection only'
        writer.write(fake.encode())
        await writer.drain()
        push_event('HTTP', ip, writer.get_extra_info('sockname')[1], payload)
    except Exception: pass
    finally: writer.close()


async def handle_ftp(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"220 FTP Server Ready\r\n")
        await writer.drain()
        await asyncio.sleep(random.uniform(2, 4))
        data = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'connection only'
        writer.write(b"530 Login incorrect.\r\n")
        await writer.drain()
        push_event('FTP', ip, writer.get_extra_info('sockname')[1], payload)
    except Exception: pass
    finally: writer.close()


async def handle_db(reader, writer):
    ip = writer.get_extra_info('peername')[0]
    if is_blocked(ip): writer.close(); return
    record_hit(ip)
    try:
        writer.write(b"\xff\x00\x00\x00\x0aMySQL 8.0\x00")
        await writer.drain()
        await asyncio.sleep(random.uniform(1, 2))
        data = await asyncio.wait_for(reader.read(1024), timeout=10)
        payload = data.decode('utf-8', errors='ignore').strip() or 'port probe'
        push_event('DB', ip, writer.get_extra_info('sockname')[1], payload)
    except Exception: pass
    finally: writer.close()


# ─────────────────────────────────────────
# ASYNC RUNNER
# Starts all 4 honeypots on custom ports
# ─────────────────────────────────────────
def run_honeypots(ssh_port, http_port, ftp_port, db_port):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    async def main():
        servers = await asyncio.gather(
            asyncio.start_server(handle_ssh,  '0.0.0.0', ssh_port),
            asyncio.start_server(handle_http, '0.0.0.0', http_port),
            asyncio.start_server(handle_ftp,  '0.0.0.0', ftp_port),
            asyncio.start_server(handle_db,   '0.0.0.0', db_port),
        )
        print(f"{Fore.YELLOW}[AGENT] Listening on ports:")
        print(f"{Fore.YELLOW}  SSH  → {ssh_port}")
        print(f"{Fore.YELLOW}  HTTP → {http_port}")
        print(f"{Fore.YELLOW}  FTP  → {ftp_port}")
        print(f"{Fore.YELLOW}  DB   → {db_port}")
        await asyncio.gather(*[s.serve_forever() for s in servers])

    loop.run_until_complete(main())


# ─────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description='SNAPTRAP Agent — deploy on your network'
    )
    parser.add_argument('--token',
        required=True,
        help='Your organisation agent token from dashboard'
    )
    parser.add_argument('--server',
        default='http://localhost:5000',
        help='SNAPTRAP central server URL'
    )
    parser.add_argument('--ssh-port',
        type=int, default=2222,
        help='Port for fake SSH honeypot (default 2222)'
    )
    parser.add_argument('--http-port',
        type=int, default=8080,
        help='Port for fake HTTP honeypot (default 8080)'
    )
    parser.add_argument('--ftp-port',
        type=int, default=2121,
        help='Port for fake FTP honeypot (default 2121)'
    )
    parser.add_argument('--db-port',
        type=int, default=3306,
        help='Port for fake DB honeypot (default 3306)'
    )
    args = parser.parse_args()

    # Validate all ports
    try:
        ssh_port  = validate_port(args.ssh_port,  'SSH')
        http_port = validate_port(args.http_port, 'HTTP')
        ftp_port  = validate_port(args.ftp_port,  'FTP')
        db_port   = validate_port(args.db_port,   'DB')
    except ValueError as e:
        print(f"{Fore.RED}[ERROR] {e}")
        exit(1)

    print(f"{Fore.RED}")
    print("  ███████╗███╗   ██╗ █████╗ ██████╗ ████████╗██████╗  █████╗ ██████╗")
    print("  ██╔════╝████╗  ██║██╔══██╗██╔══██╗╚══██╔══╝██╔══██╗██╔══██╗██╔══██╗")
    print("  ███████╗██╔██╗ ██║███████║██████╔╝   ██║   ██████╔╝███████║██████╔╝")
    print("  ╚════██║██║╚██╗██║██╔══██║██╔═══╝    ██║   ██╔══██╗██╔══██║██╔═══╝")
    print("  ███████║██║ ╚████║██║  ██║██║        ██║   ██║  ██║██║  ██║██║")
    print("  ╚══════╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝        ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝")
    print(f"{Style.RESET_ALL}")
    print(f"  SNAPTRAP Agent v1.0")
    print(f"  Server : {args.server}")
    print(f"  Token  : {args.token[:8]}...")
    print()

    threads = [
        threading.Thread(
            target=run_honeypots,
            args=(ssh_port, http_port, ftp_port, db_port),
            daemon=True
        ),
        threading.Thread(
            target=event_consumer,
            args=(args.server, args.token),
            daemon=True
        ),
    ]

    for t in threads:
        t.start()

    print(f"{Fore.GREEN}Agent is live — reporting to {args.server}")
    print(f"{Fore.YELLOW}Press Ctrl+C to stop\n")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Fore.RED}Agent shutting down.")
