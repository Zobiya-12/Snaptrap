#!/usr/bin/env bash
# SNAPTRAP CPU-scaling benchmark for GitHub Codespaces.
#
#   1. github.com/Zobiya-12/Snaptrap -> Code -> Codespaces -> "..." -> New with options
#      -> Machine type: 16-core (or 8-core) -> Create
#   2. In the Codespace terminal:   bash benchmarks/codespaces_benchmark.sh
#   3. Download benchmarks/results/*.json, then DELETE THE CODESPACE (it bills while running).
#
# Runs two experiments on the same machine:
#   live   : 1 event per predict_proba call (what the live sensor does)   -> compare with your laptop
#   batch  : 64 events per call (what batch reclassification could do)     -> shows how far scaling can go
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

echo "== Experiment 1: live path, 1 event per call =="
python3 cpu_benchmark.py --label "$LABEL" --events 8000 --repeats 3 \
  --out "results/bench_codespaces_${VCPU}vcpu_live.json"
echo

echo "== Experiment 2: batched, 64 events per call =="
python3 cpu_benchmark.py --label "$LABEL batch64" --events 400000 --repeats 3 --batch 64 \
  --out "results/bench_codespaces_${VCPU}vcpu_batch64.json"
echo

echo "Done. Files in benchmarks/results/:"
ls -1 results/bench_codespaces_*
echo
echo "Next: download them, run  python3 cpu_benchmark.py merge results/bench_*.json --out ../public/benchmark_reference.json"
echo "Then STOP/DELETE this Codespace: github.com/codespaces"
