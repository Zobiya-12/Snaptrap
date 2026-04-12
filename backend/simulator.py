"""
SNAPTRAP Attack Simulator v3 — Docker-safe edition

KEY CHANGES:
  - API-ONLY: no socket connections → Docker not overwhelmed
  - RATE LIMITER: max 8 concurrent requests via semaphore
  - 80 attackers in demo (enough for battlefield, safe for Docker)
  - Wave 1 fires instantly → battlefield activates immediately
  - --server and --token flags so you never hardcode anything
  - Server reachability check before launching

Usage:
    python3 simulator.py --mode demo
    python3 simulator.py --mode demo --server http://localhost:5000/api/agent/report --token YOUR_TOKEN
    python3 simulator.py --mode benchmark
"""

import threading, time, random, argparse, sys, requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from colorama import Fore, init

init(autoreset=True)

# ── defaults (overridden by CLI flags) ──────────────────────────
AGENT_TOKEN = "DEMO-TOKEN-SNAPTRAP-001"
SERVER_URL  = "http://localhost:5000/api/agent/report"

MAX_CONCURRENT = 8          # max simultaneous HTTP requests — keeps Docker cool
_sem = threading.Semaphore(MAX_CONCURRENT)

IS_BENCHMARK = '--mode' in sys.argv and 'benchmark' in sys.argv[sys.argv.index('--mode')+1:]

# ── payloads ─────────────────────────────────────────────────────
PASSWORDS = ["admin","password","123456","root","admin123","letmein","qwerty",
             "welcome","monkey","dragon","master","abc123","pass123","test",
             "guest","1234","12345","trustno1","P@ssw0rd","changeme","iloveyou"]
USERNAMES = ["admin","root","user","test","guest","administrator","ubuntu","pi",
             "oracle","mysql","www","ftp","mail","backup","deploy","kali",
             "vagrant","ec2-user","centos","debian","postgres","redis"]
SQL_PAYLOADS = ["' OR '1'='1","'; DROP TABLE users;--","' UNION SELECT * FROM users--",
                "admin'--","1; SELECT * FROM information_schema.tables","' OR 1=1--",
                "'; EXEC xp_cmdshell('dir');--","' AND SLEEP(5)--",
                "1' ORDER BY 1--","' UNION SELECT null,null,null--",
                "' OR 'x'='x","'; INSERT INTO users VALUES('hacked','hacked');--"]
IPS = ["185.220.101.42","45.142.212.100","194.165.16.77","103.251.167.10",
       "91.121.87.210","162.55.48.34","193.32.162.45","198.235.24.106",
       "77.83.140.22","159.65.92.118","80.66.64.10","45.95.146.222",
       "192.241.210.90","178.128.55.30","104.236.48.120","167.71.42.80",
       "64.227.100.44","138.197.188.60","159.89.200.90","206.189.80.100"]

def rip(): return random.choice(IPS)

# ── core sender ───────────────────────────────────────────────────
def send(ip, service, port, payload, score, atype):
    with _sem:   # rate limit — never more than MAX_CONCURRENT at once
        try:
            r = requests.post(SERVER_URL,
                json={"attacker_ip":ip,"service":service,"port":port,
                      "payload":payload,"threat_score":score,"attack_type":atype},
                headers={"X-Agent-Token": AGENT_TOKEN},
                timeout=8)
            if not IS_BENCHMARK:
                c = Fore.GREEN if r.status_code == 201 else Fore.YELLOW
                print(f"{c}  [{atype:5}] {service:4} | {ip:18} | score:{score:3} | {r.status_code}")
        except requests.exceptions.ConnectionError:
            print(f"{Fore.RED}  [ERR] Cannot reach {SERVER_URL}")
        except Exception as e:
            if not IS_BENCHMARK:
                print(f"{Fore.YELLOW}  [ERR] {e}")

# ── attack functions ──────────────────────────────────────────────
def brute_force_ssh(aid=0, attempts=None):
    ip = rip(); n = attempts or random.randint(2, 4)
    for _ in range(n):
        send(ip, "SSH", 2222, "USER "+random.choice(USERNAMES)+" PASS "+random.choice(PASSWORDS),
             random.randint(25,55), "brute")
        if not IS_BENCHMARK: time.sleep(random.uniform(0.05,0.12))

def credential_stuffer(aid=0, attempts=None):
    ip = rip(); n = attempts or random.randint(2, 3)
    for _ in range(n):
        send(ip, "HTTP", 8080,
             "username="+random.choice(USERNAMES)+"&password="+random.choice(PASSWORDS),
             random.randint(40,70), "cred")
        if not IS_BENCHMARK: time.sleep(random.uniform(0.05,0.12))

def port_scanner(aid=0, attempts=None):
    ip = rip()
    for svc, port in [("SSH",2222),("HTTP",8080),("FTP",2121),("DB",3306)]:
        send(ip, svc, port, "SCAN probe:"+str(port), random.randint(10,25), "scan")
        if not IS_BENCHMARK: time.sleep(0.04)

def sql_injector(aid=0, attempts=None):
    ip = rip(); n = attempts or random.randint(2, 3)
    for _ in range(n):
        send(ip, "DB", 3306, random.choice(SQL_PAYLOADS), random.randint(65,95), "sqli")
        if not IS_BENCHMARK: time.sleep(random.uniform(0.05,0.12))

def slow_probe(aid=0, attempts=None):
    send(rip(), "HTTP", 8080, "GET / HTTP/1.1", random.randint(8,22), "slow")

def ftp_attacker(aid=0, attempts=None):
    ip = rip(); n = attempts or random.randint(2, 3)
    for _ in range(n):
        send(ip, "FTP", 2121, "USER anonymous PASS "+random.choice(PASSWORDS),
             random.randint(20,45), "brute")
        if not IS_BENCHMARK: time.sleep(random.uniform(0.05,0.12))

FUNS = [brute_force_ssh, credential_stuffer, port_scanner,
        sql_injector, slow_probe, ftp_attacker]

# ── health check ──────────────────────────────────────────────────
def check_server():
    health = SERVER_URL.replace("/agent/report","").replace("/api/agent","").rstrip("/") + "/api/health"
    try:
        r = requests.get(health, timeout=5)
        if r.status_code == 200:
            print(f"{Fore.GREEN}  Server reachable ✓  ({health})")
            return True
        print(f"{Fore.YELLOW}  Server returned {r.status_code} — continuing")
        return True
    except Exception:
        print(f"{Fore.RED}  Cannot reach server at {health}")
        print(f"{Fore.RED}  Check: docker compose ps")
        return False

# ── demo ──────────────────────────────────────────────────────────
def run_demo():
    print(f"\n{Fore.GREEN}DEMO MODE — 80 attackers")
    print(f"{Fore.CYAN}API-only (no sockets) | Rate limited to {MAX_CONCURRENT} concurrent\n")

    if not check_server():
        ans = input("\nContinue anyway? [y/N] ").strip().lower()
        if ans != 'y': return
    print()

    plan = [(brute_force_ssh,22),(credential_stuffer,18),(port_scanner,14),
            (sql_injector,12),(ftp_attacker,9),(slow_probe,5)]

    threads = []
    for fn, count in plan:
        for i in range(count):
            threads.append(threading.Thread(target=fn, args=(i,), daemon=True))
    random.shuffle(threads)
    total = len(threads)

    print(f"{Fore.YELLOW}  Wave 1 (first 20): fires instantly → battlefield activates now")
    print(f"{Fore.YELLOW}  Remaining {total-20}: staggered over ~35 seconds\n")

    for i, t in enumerate(threads):
        t.start()
        if i > 0 and i % 20 == 0:
            print(f"{Fore.CYAN}  Wave {i//20+1} — {i}/{total} launched")
        if i < 20:          time.sleep(0.04)          # wave 1: instant
        elif i < 50:        time.sleep(random.uniform(0.18,0.38))
        else:               time.sleep(random.uniform(0.30,0.60))

    print(f"\n{Fore.YELLOW}Waiting for all attackers to finish...")
    for t in threads: t.join(timeout=35)

    print(f"\n{Fore.GREEN}Demo complete — {total} attackers sent!")
    print(f"{Fore.GREEN}  Dashboard: http://localhost:3000")
    print(f"{Fore.GREEN}  Grafana:   http://localhost:3001")

# ── benchmark ────────────────────────────────────────────────────
def run_benchmark_round(tc, n=700):
    print(f"\n{Fore.YELLOW}  Round: {tc} thread(s) | {n} attackers...")
    tasks = [(i % len(FUNS), i) for i in range(n)]
    random.shuffle(tasks)
    done = 0
    start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=tc) as pool:
        futs = {pool.submit(FUNS[fi], ai, 1): i for i,(fi,ai) in enumerate(tasks)}
        for f in as_completed(futs):
            done += 1
            if done % 100 == 0:
                print(f"{Fore.CYAN}    {done}/{n} ({time.perf_counter()-start:.1f}s)", end="\r")
    dur = round(time.perf_counter()-start, 3)
    eps = round(n/dur, 2)
    print(f"\n{Fore.GREEN}    Done: {dur:.3f}s | {eps:.1f} events/sec")
    try:
        from db import insert_benchmark
        insert_benchmark(tc, eps, dur, 'threadpool')
        print(f"{Fore.CYAN}    Saved to DB")
    except Exception as e:
        print(f"{Fore.YELLOW}    DB save skipped ({e})")
    return eps, dur

def run_benchmark():
    print(f"\n{Fore.RED}{'='*52}")
    print(f"{Fore.RED}  SNAPTRAP HPC BENCHMARK — 700 attackers x 5 threads")
    print(f"{Fore.RED}{'='*52}\n")
    if not check_server(): return
    print()
    tcs = [1, 2, 4, 8, 16]
    results = []
    for tc in tcs:
        eps, dur = run_benchmark_round(tc)
        results.append((tc, eps, dur))
        if tc < 16:
            print(f"{Fore.CYAN}  Cooling 3s...\n"); time.sleep(3)

    base = results[0][1]
    print(f"\n{Fore.CYAN}{'='*58}")
    print(f"{Fore.CYAN}  SPEEDUP RESULTS  (ThreadPoolExecutor, I/O parallelism)")
    print(f"{Fore.CYAN}{'='*58}")
    print(f"{Fore.CYAN}  {'Threads':>8} | {'Events/s':>10} | {'Time(s)':>8} | {'Speedup':>8}")
    print(f"{Fore.CYAN}  {'-'*52}")
    for tc, eps, dur in results:
        sp = round(eps/base,2)
        bar = '█'*min(int(sp*3),35)
        c = Fore.GREEN if sp>=4 else Fore.YELLOW if sp>=2 else Fore.WHITE
        print(f"{c}  {tc:>8} | {eps:>10.1f} | {dur:>8.3f} | {sp:>7.2f}x  {bar}")
    print(f"{Fore.CYAN}{'='*58}")
    print(f"\n{Fore.GREEN}  Peak speedup: {round(results[-1][1]/base,2)}x at {tcs[-1]} threads")

# ── main ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    p = argparse.ArgumentParser(description='SNAPTRAP Simulator v3')
    p.add_argument('--mode',   choices=['demo','benchmark'], default='demo')
    p.add_argument('--server', default='http://localhost:5000/api/agent/report',
                   help='Full agent/report URL')
    p.add_argument('--token',  default='DEMO-TOKEN-SNAPTRAP-001',
                   help='Your agent token (from Control Panel)')
    args = p.parse_args()

    SERVER_URL  = args.server
    AGENT_TOKEN = args.token

    print(f"{Fore.RED}╔══════════════════════════════════════════════╗")
    print(f"{Fore.RED}║   SNAPTRAP — Attack Simulator v3             ║")
    print(f"{Fore.RED}║   Mode  : {args.mode:<35}║")
    print(f"{Fore.RED}║   Server: {SERVER_URL[:35]:<35}║")
    print(f"{Fore.RED}║   Token : {AGENT_TOKEN[:8]}...{' '*26}║")
    print(f"{Fore.RED}╚══════════════════════════════════════════════╝")

    if args.mode == 'demo':   run_demo()
    else:                     run_benchmark()
