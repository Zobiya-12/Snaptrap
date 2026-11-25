#!/usr/bin/env bash
# SNAPTRAP CPU-scaling benchmark for GitHub Codespaces.
#
#   1. github.com/Zobiya-12/Snaptrap -> Code -> Codespaces -> "..." -> New with options
#      -> Machine type: 16-core (or 8-core) -> Create
#   2. In the Codespace terminal:   bash benchmarks/codespaces_benchmark.sh
#   3. Download benchmarks/results/*.json, then DELETE THE CODESPACE (it bills while running).
#
# Runs two sweeps on the same machine (about 20-30 minutes in total on 4 vCPUs):
#   standard  : sklearn predict_proba at batch 1 (live path), 16, 64, 256
#   optimized : same, with --fast (float32, per-tree calls, no re-validation; output verified identical)
set -euo pipefail
cd "$(dirname "$0")"

echo "== Machine =="
lscpu | grep -E "^(Model name|CPU\(s\)|Thread\(s\) per core|Core\(s\) per socket|Socket\(s\)|L3 cache)" || true
VCPU=$(nproc)
TPC=$(lscpu | awk -F: '/Thread\(s\) per core/{gsub(/ /,"",$2); print $2}')
PHYS=$(( VCPU / ${TPC:-1} ))
echo "Usable vCPUs: $VCPU | threads/core: ${TPC:-?} | estimated physical cores: $PHYS"
echo

echo "== Dependencies =="
python3 -m pip install --quiet --user numpy scikit-learn
python3 -c "import sklearn, sys; print('python', sys.version.split()[0], '| scikit-learn', sklearn.__version__)"
echo

mkdir -p results
LABEL="Codespaces (${VCPU} vCPU, ~${PHYS} physical)"

# Each sweep runs batch sizes 1 (live), 16, 64, 256 and writes one JSON per size into the current folder.
echo "== Experiment 1: sklearn predict_proba (what the live sensor runs today) =="
python3 cpu_benchmark.py --label "$LABEL" --sweep --events 8000 --repeats 3
echo

echo "== Experiment 2: optimized inference (same probabilities, verified at start) =="
python3 cpu_benchmark.py --label "$LABEL" --sweep --fast --events 8000 --repeats 3
echo

mv -f bench_codespaces_*.json results/

echo "Done. Files in benchmarks/results/:"
ls -1 results/bench_codespaces_*
echo
echo "Next: download them, run  python3 cpu_benchmark.py merge results/bench_*.json --out ../public/benchmark_reference.json"
echo "Then STOP/DELETE this Codespace: github.com/codespaces"
