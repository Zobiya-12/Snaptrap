"""
In-app HPC benchmark (superadmin: ML & Benchmarks panel -> "Run Benchmark").

What it measures: ingest-pipeline throughput as thread count scales. Each event goes
through the same work as a live report: write the attack row, upsert the attacker
profile, classify with the trained Random Forest, write the prediction. Every event
is rolled back, so the benchmark leaves nothing in attacks / attackers / ml_predictions.
Only one summary row per thread count is written to benchmark_results.

A second mode, "cpu", measures CPU scaling on whatever machine the API runs on (Render's CPU when
hosted): the production-size Random Forest classifies events one per predict_proba() call across
1, 2, 4 ... worker PROCESSES. No database, no network. Same method as benchmarks/cpu_benchmark.py,
so hosted numbers can be compared with the reference machines. Rows are stored with mode='cpu'
(thread_count holds the worker count).

What it does not measure: HTTP and JWT/token overhead, or the network between a sensor
and the API. (simulator.py --mode benchmark measures the HTTP path end to end.)
"""
import os
import platform
import statistics
import threading
import time
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor

import attack_corpus
import classifier as ml
from db import get_conn, insert_benchmark

THREAD_COUNTS = [1, 2, 4, 8, 16]
EVENTS_PER_ROUND = 700
MODE_LABEL = 'pipeline'

CPU_WORKER_COUNTS = [1, 2, 4]       # kept small: free-tier hosts have little RAM and CPU
CPU_EVENTS = 600                    # events classified per timed run
CPU_REPEATS = 2                     # median of this many timed runs per worker count

state = {'running': False, 'progress': None, 'last': None, 'mode': None}
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


def start(org_id, mode='pipeline'):
    """Start a run in the background. Returns False if one is already running."""
    if mode not in ('pipeline', 'cpu'):
        mode = 'pipeline'
    with _lock:
        if state['running']:
            return False
        state['running'] = True
        state['mode'] = mode
        n = len(CPU_WORKER_COUNTS) if mode == 'cpu' else len(THREAD_COUNTS)
        state['progress'] = {'round': 0, 'of': n, 'threads': None, 'mode': mode}
    threading.Thread(target=_job, args=(org_id, mode), name='Benchmark', daemon=True).start()
    return True


def _job(org_id, mode='pipeline'):
    try:
        res = _run_cpu() if mode == 'cpu' else _run(org_id)
        state['last'] = {'ok': True, 'mode': mode, **res}
    except BaseException as e:
        state['last'] = {'ok': False, 'mode': mode, 'error': str(e) or e.__class__.__name__}
    finally:
        state['running'] = False
        state['progress'] = None


def _run(org_id):
    use_model = ml.load_model() is not None
    rows, stopped = [], None
    for i, tc in enumerate(THREAD_COUNTS, 1):
        state['progress'] = {'round': i, 'of': len(THREAD_COUNTS), 'threads': tc, 'mode': 'pipeline'}
        events = attack_corpus.generate(EVENTS_PER_ROUND)
        try:
            dur = _round(events, tc, org_id, use_model)
        except Exception as e:
            if not rows:
                raise                      # even 1 thread failed: a real fault, report it
            # Later rounds open one DB connection per thread. A pooler with a client cap
            # (Supabase session mode: 15) refuses the extra ones. Keep the rounds already
            # measured and say why the run stopped, instead of failing the whole run.
            stopped = f'stopped at {tc} threads: {str(e).strip().splitlines()[0][:160]}'
            break
        eps = round(EVENTS_PER_ROUND / dur, 2)
        insert_benchmark(tc, eps, round(dur, 3), MODE_LABEL)
        rows.append({'threads': tc, 'events_per_sec': eps, 'seconds': round(dur, 3)})
        if tc != THREAD_COUNTS[-1]:
            time.sleep(1)  # let the DB settle between rounds
    base = rows[0]['events_per_sec'] or 1
    for r in rows:
        r['speedup'] = round(r['events_per_sec'] / base, 2)
    return {'events_per_round': EVENTS_PER_ROUND, 'classified': use_model, 'rounds': rows, 'stopped': stopped,
            'finished_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}


# ── CPU mode: classification scaling across worker processes ──────────────────
_cpu_model = None


def _cpu_init(model):
    global _cpu_model
    _cpu_model = model


def _cpu_chunk(rows):
    """Score rows one predict_proba() call at a time, like the live path."""
    m = _cpu_model
    for r in rows:
        m.predict_proba([r])
    return len(rows)


def _usable_cores():
    try:
        return len(os.sched_getaffinity(0))      # honours container / cgroup affinity
    except AttributeError:
        return os.cpu_count() or 1


def _cpu_name():
    try:
        with open('/proc/cpuinfo') as f:
            for line in f:
                if line.lower().startswith('model name'):
                    return line.split(':', 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or platform.machine() or 'unknown'


def _cpu_time(model, feats, workers):
    import numpy as np
    chunks = [c for c in np.array_split(np.asarray(feats), workers) if len(c)]
    with ProcessPoolExecutor(max_workers=workers, initializer=_cpu_init, initargs=(model,)) as pool:
        list(pool.map(_cpu_chunk, [c[:10] for c in chunks]))     # warm-up: start workers
        t0 = time.perf_counter()
        done = sum(pool.map(_cpu_chunk, chunks))
        dt = time.perf_counter() - t0
    if done != len(feats):
        raise RuntimeError('worker returned a short result')
    return dt


def _run_cpu():
    import numpy as np
    model = ml.load_model()
    trained = model is not None
    if not trained:
        # No trained model yet (fresh deploy): time a same-size forest on random data instead.
        from sklearn.ensemble import RandomForestClassifier
        rng = np.random.default_rng(0)
        model = RandomForestClassifier(n_estimators=100, max_depth=10, n_jobs=1, random_state=0)
        model.fit(rng.random((1500, len(ml.extract_features(attack_corpus.generate(1)[0], {})))),
                  rng.integers(0, 5, 1500))
    model.n_jobs = 1
    feats = [ml.extract_features(ev, {}) for ev in attack_corpus.generate(CPU_EVENTS)]
    cores = _usable_cores()
    rows = []
    for i, w in enumerate(CPU_WORKER_COUNTS, 1):
        state['progress'] = {'round': i, 'of': len(CPU_WORKER_COUNTS), 'threads': w, 'mode': 'cpu'}
        secs = statistics.median(_cpu_time(model, feats, w) for _ in range(CPU_REPEATS))
        eps = round(len(feats) / secs, 2)
        insert_benchmark(w, eps, round(secs, 3), 'cpu')
        rows.append({'workers': w, 'events_per_sec': eps, 'seconds': round(secs, 3)})
    base = rows[0]['events_per_sec'] or 1
    for r in rows:
        r['speedup'] = round(r['events_per_sec'] / base, 2)
    return {'events': len(feats), 'repeats': CPU_REPEATS, 'classified': trained, 'rounds': rows,
            'cpu': _cpu_name(), 'cores': cores, 'platform': f'{platform.system()} {platform.release()}',
            'python': platform.python_version(),
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
