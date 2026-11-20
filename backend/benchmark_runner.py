"""
In-app HPC benchmark (superadmin: ML & Benchmarks panel -> "Run Benchmark").

What it measures: ingest-pipeline throughput as thread count scales. Each event goes
through the same work as a live report: write the attack row, upsert the attacker
profile, classify with the trained Random Forest, write the prediction. Every event
is rolled back, so the benchmark leaves nothing in attacks / attackers / ml_predictions.
Only one summary row per thread count is written to benchmark_results.

What it does not measure: HTTP and JWT/token overhead, or the network between a sensor
and the API. (simulator.py --mode benchmark measures the HTTP path end to end.)
"""
import threading
import time
from concurrent.futures import ThreadPoolExecutor

import attack_corpus
import classifier as ml
from db import get_conn, insert_benchmark

THREAD_COUNTS = [1, 2, 4, 8, 16]
EVENTS_PER_ROUND = 700
MODE_LABEL = 'pipeline'

state = {'running': False, 'progress': None, 'last': None}
_lock = threading.Lock()

# Same SQL as db.insert_attack / db.insert_prediction. Keep in sync if those change.
_SQL_ATTACK = """
    INSERT INTO attacks (attacker_ip, service, port, payload, threat_score, attack_type, org_id, source)
    VALUES (%s, %s, %s, %s, %s, %s, %s, 'simulated') RETURNING id
"""
_SQL_ATTACKER = """
    INSERT INTO attackers (ip_address, org_id, total_hits, risk_level)
    VALUES (%s, %s, 1, CASE WHEN %s >= 70 THEN 'high' WHEN %s >= 40 THEN 'medium' ELSE 'low' END)
    ON CONFLICT (ip_address, org_id) DO UPDATE
        SET total_hits = attackers.total_hits + 1, last_seen = NOW()
"""
_SQL_PRED = "INSERT INTO ml_predictions (attack_id, predicted_type, confidence) VALUES (%s, %s, %s)"


def start(org_id):
    """Start a run in the background. Returns False if one is already running."""
    with _lock:
        if state['running']:
            return False
        state['running'] = True
        state['progress'] = {'round': 0, 'of': len(THREAD_COUNTS), 'threads': None}
    threading.Thread(target=_job, args=(org_id,), name='Benchmark', daemon=True).start()
    return True


def _job(org_id):
    try:
        state['last'] = {'ok': True, **_run(org_id)}
    except BaseException as e:
        state['last'] = {'ok': False, 'error': str(e)}
    finally:
        state['running'] = False
        state['progress'] = None


def _run(org_id):
    use_model = ml.load_model() is not None
    rows = []
    for i, tc in enumerate(THREAD_COUNTS, 1):
        state['progress'] = {'round': i, 'of': len(THREAD_COUNTS), 'threads': tc}
        events = attack_corpus.generate(EVENTS_PER_ROUND)
        dur = _round(events, tc, org_id, use_model)
        eps = round(EVENTS_PER_ROUND / dur, 2)
        insert_benchmark(tc, eps, round(dur, 3), MODE_LABEL)
        rows.append({'threads': tc, 'events_per_sec': eps, 'seconds': round(dur, 3)})
        if tc != THREAD_COUNTS[-1]:
            time.sleep(1)  # let the DB settle between rounds
    base = rows[0]['events_per_sec'] or 1
    for r in rows:
        r['speedup'] = round(r['events_per_sec'] / base, 2)
    return {'events_per_round': EVENTS_PER_ROUND, 'classified': use_model, 'rounds': rows,
            'finished_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}


def _round(events, tc, org_id, use_model):
    local = threading.local()
    conns, conns_lock = [], threading.Lock()

    def one(ev):
        # One connection per worker thread, reused across events (like a pooled server).
        conn = getattr(local, 'conn', None)
        if conn is None:
            conn = local.conn = get_conn()
            with conns_lock:
                conns.append(conn)
        cur = conn.cursor()
        try:
            cur.execute(_SQL_ATTACK, (ev['attacker_ip'], ev['service'], ev['port'], ev['payload'],
                                      ev['threat_score'], ev['attack_type'], org_id))
            aid = cur.fetchone()[0]
            s = ev['threat_score']
            cur.execute(_SQL_ATTACKER, (ev['attacker_ip'], org_id, s, s))
            if use_model:
                res = ml.classify_single(ev)
                cur.execute(_SQL_PRED, (aid, res['attack_type'], res['confidence']))
        finally:
            conn.rollback()  # nothing from the benchmark is kept
            cur.close()

    start = time.perf_counter()
    try:
        with ThreadPoolExecutor(max_workers=tc) as pool:
            for f in [pool.submit(one, ev) for ev in events]:
                f.result()  # surface the first error instead of timing a broken run
        return time.perf_counter() - start
    finally:
        for c in conns:
            try:
                c.close()
            except Exception:
                pass
