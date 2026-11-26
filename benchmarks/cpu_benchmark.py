#!/usr/bin/env python3
"""
SNAPTRAP reference CPU benchmark: how well does attack classification scale across CPU cores?

Run it on any machine (Colab, a laptop, a VM, a cloud box). It needs only numpy and scikit-learn.

    python cpu_benchmark.py --label "Colab (2 vCPU)"              # writes bench_colab_2_vcpu.json
    python cpu_benchmark.py --label "Windows laptop" --events 6000
    python cpu_benchmark.py --label "Colab (2 vCPU)" --sweep             # live path + batch 16/64/256, one JSON each
    python cpu_benchmark.py --label "Colab (2 vCPU)" --sweep --fast      # same, with optimized inference
    python cpu_benchmark.py merge bench_*.json --out ../public/benchmark_reference.json

What it measures
    CPU-bound inference only: a 100-tree Random Forest (the same size as the production classifier)
    classifies synthetic 12-feature events, ONE event per predict_proba() call, exactly like the live
    path. Work is split across 1, 2, 4, ... worker PROCESSES (processes, not threads, so Python's GIL
    is out of the way). There is no database and no network, so the result is the machine's CPU
    scaling and nothing else.

What it does not measure
    The ingest pipeline (DB writes + HTTP), which is dominated by waiting on the database. That is
    what the in-app "Run Benchmark" button measures on the server it runs on.

Honesty notes
    * Events are synthetic and the forest is trained on random data, so absolute events/s will differ
      from production. Compare machines to each other, not to the live numbers.
    * Each worker count is timed `--repeats` times (after a warm-up) and the median is reported.
    * The cores count is what Python is allowed to use (it honours container/affinity limits).
"""
import argparse
import datetime
import glob
import json
import os
import platform
import re
import statistics
import sys
import time
from concurrent.futures import ProcessPoolExecutor

import numpy as np

N_FEATURES, N_CLASSES, N_TREES = 12, 5, 100
_model = None
_batch = 1
_fast = False


def _init_worker(model, batch=1, fast=False):
    global _model, _batch, _fast
    _model = model
    _batch = batch
    _fast = fast


def fast_predict_proba(model, x):
    """Same numbers as RandomForestClassifier.predict_proba, minus its per-call overhead.

    The forest's own predict_proba re-validates the input and spins up joblib on every call, which
    dominates when calls are small. Here the input is converted to float32 once and each tree is
    called directly with check_input=False; the results are averaged exactly as the forest does."""
    x = np.ascontiguousarray(x, dtype=np.float32)
    trees = model.estimators_
    acc = trees[0].predict_proba(x, check_input=False)
    for t in trees[1:]:
        acc += t.predict_proba(x, check_input=False)
    acc /= len(trees)
    return acc


def _classify_chunk(chunk):
    """Classify a chunk. Default: sklearn's predict_proba, one event per call (like the live path)."""
    m = _model
    n = 0
    predict = (lambda x: fast_predict_proba(m, x)) if _fast else m.predict_proba
    if _batch > 1:                              # optional: score `_batch` events per call
        for i in range(0, len(chunk), _batch):
            n += len(predict(chunk[i:i + _batch]))
        return n
    for row in chunk:
        predict(row.reshape(1, -1))
        n += 1
    return n


def usable_cores():
    try:
        return len(os.sched_getaffinity(0))   # respects cgroup/taskset limits on Linux
    except AttributeError:
        return os.cpu_count() or 1


def cpu_name():
    try:
        with open("/proc/cpuinfo") as f:
            for line in f:
                if line.lower().startswith("model name"):
                    return line.split(":", 1)[1].strip()
    except OSError:
        pass
    return platform.processor() or platform.machine() or "unknown"


def worker_counts(cores, max_workers=None):
    cap = min(cores, max_workers) if max_workers else cores
    counts, w = [], 1
    while w <= cap:
        counts.append(w)
        w *= 2
    if counts[-1] != cap:
        counts.append(cap)
    return counts


def build_model(seed=0):
    from sklearn.ensemble import RandomForestClassifier
    rng = np.random.default_rng(seed)
    X = rng.random((3000, N_FEATURES))
    y = rng.integers(0, N_CLASSES, 3000)
    return RandomForestClassifier(n_estimators=N_TREES, n_jobs=1, random_state=seed).fit(X, y)


def time_run(model, events, workers, batch=1, fast=False):
    chunks = [c for c in np.array_split(events, workers) if len(c)]
    with ProcessPoolExecutor(max_workers=workers, initializer=_init_worker, initargs=(model, batch, fast)) as pool:
        list(pool.map(_classify_chunk, [c[:20] for c in chunks]))      # warm-up: start workers, load model
        t0 = time.perf_counter()
        done = sum(pool.map(_classify_chunk, chunks))
        dt = time.perf_counter() - t0
    assert done == len(events)
    return dt


def run(args):
    import sklearn
    cores = usable_cores()
    counts = worker_counts(cores, args.max_workers)
    print(f"Machine: {args.label} | {cpu_name()} | {cores} usable cores")
    print(f"Training a {N_TREES}-tree forest and timing {args.events} events at workers={counts} "
          f"({args.repeats} repeats each) ...")
    model = build_model()
    events = np.random.default_rng(1).random((args.events, N_FEATURES))
    if args.fast:                               # never time a path that gives different answers
        probe = events[:200]
        assert np.allclose(fast_predict_proba(model, probe), model.predict_proba(probe), atol=1e-6), "fast path disagrees with sklearn"
        print("  optimized inference verified: same probabilities as sklearn predict_proba (atol 1e-6)")
    rows = []
    for w in counts:
        secs = statistics.median(time_run(model, events, w, args.batch, args.fast) for _ in range(args.repeats))
        rows.append({"workers": w, "seconds": round(secs, 3), "events_per_sec": round(args.events / secs, 1)})
        print(f"  {w:>2} worker(s): {rows[-1]['events_per_sec']:>9.1f} events/s  ({secs:.2f}s)")
    base = rows[0]["events_per_sec"] or 1
    for r in rows:
        r["speedup"] = round(r["events_per_sec"] / base, 2)
    out = {
        "label": args.label,
        "cpu": cpu_name(),
        "cores": cores,
        "platform": f"{platform.system()} {platform.release()}",
        "python": platform.python_version(),
        "sklearn": sklearn.__version__,
        "date": datetime.date.today().isoformat(),
        "events": args.events,
        "repeats": args.repeats,
        "workload": ("RandomForest 100 trees, 1 event per predict_proba, worker processes" if args.batch <= 1
                     else f"RandomForest 100 trees, {args.batch} events per predict_proba, worker processes")
                    + (", optimized inference (float32, per-tree, no re-validation)" if args.fast else ""),
        "results": rows,
    }
    path = args.out or "bench_" + re.sub(r"[^a-z0-9]+", "_", args.label.lower()).strip("_") + ".json"
    with open(path, "w") as f:
        json.dump(out, f, indent=2)
    print(f"Saved {path}")


def merge(args):
    runs = {}
    if os.path.exists(args.out):
        with open(args.out) as f:
            for r in json.load(f).get("runs", []):
                runs[r["label"]] = r
    paths = [q for pat in args.files for q in (sorted(glob.glob(pat)) or [pat])]   # Windows cmd doesn't expand *
    for p in paths:
        with open(p) as f:
            r = json.load(f)
        runs[r["label"]] = r            # same label = replace the older run
    with open(args.out, "w") as f:
        json.dump({"updated": datetime.date.today().isoformat(), "runs": list(runs.values())}, f, indent=2)
    print(f"{args.out}: {len(runs)} run(s): {', '.join(runs)}")


def main():
    if len(sys.argv) > 1 and sys.argv[1] == "merge":
        ap = argparse.ArgumentParser(prog="cpu_benchmark.py merge")
        ap.add_argument("merge")
        ap.add_argument("files", nargs="+")
        ap.add_argument("--out", default="../public/benchmark_reference.json")
        return merge(ap.parse_args())
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--label", required=True, help='Name shown on the chart, e.g. "Colab (2 vCPU)"')
    ap.add_argument("--events", type=int, default=4000, help="events classified per run (default 4000)")
    ap.add_argument("--repeats", type=int, default=3, help="timed repeats per worker count; median is kept")
    ap.add_argument("--batch", type=int, default=1, help="events per predict_proba call (default 1 = live path)")
    ap.add_argument("--max-workers", type=int, default=None, help="cap on worker processes")
    ap.add_argument("--out", default=None, help="output JSON path")
    ap.add_argument("--fast", action="store_true",
                    help="optimized inference (float32, per-tree, no re-validation). Same probabilities, verified at start; labelled in the JSON")
    ap.add_argument("--sweep", action="store_true",
                    help="run every batch size in --batches back to back, one JSON per size (ignores --batch/--out)")
    ap.add_argument("--batches", default="1,16,64,256", help="batch sizes for --sweep (default 1,16,64,256)")
    args = ap.parse_args()
    if not args.sweep:
        return run(args)
    base_label = args.label + (" fast" if args.fast else "")
    for b in [int(x) for x in args.batches.split(",")]:
        a = argparse.Namespace(**vars(args))
        a.batch, a.out = b, None
        a.label = base_label if b == 1 else f"{base_label} batch{b}"
        a.events = args.events if b == 1 else args.events * min(b, 50)   # big batches are fast: give them more events so timings stay stable
        print(f"\n=== {'optimized ' if args.fast else ''}batch size {b} ===")
        run(a)


if __name__ == "__main__":      # required on Windows (spawn) so workers don't re-run the benchmark
    main()
