# SNAPTRAP

**Scalable Network Attack Parallel Trap & Response Platform** — a multi-tenant honeypot intelligence platform. Agents report attack telemetry to a central API, a Random Forest classifier labels each event, and a React dashboard shows what's hitting each organisation in near real time.

I built it solo, end to end: API, auth, ML pipeline, dashboard, CI/CD and deployment.

**Live demo:** `https://snaptrap-hsxn.onrender.com/` &nbsp;·&nbsp; the first load can take ~1 minute while the free instance wakes up.

> **What the hosted demo is (and isn't).** The attacks in the demo are *simulated*. A script posts synthetic events to the same ingestion endpoint a real sensor would use, so everything downstream (storage, classification, dashboards, multi-tenancy, red-team tooling) runs for real, but nothing in the demo is live internet traffic. The classifier is trained on that synthetic corpus, so its metrics describe how well it separates the simulated attack types, not how it would perform against real-world traffic. The honeypot sensor (`honeypot.py`) is in the repo but isn't part of the hosted deployment.

---

## What it does

- **Ingests attack events** from agents over a token-authenticated API (`POST /api/agent/report`). Each organisation gets its own agent token and only ever sees its own data.
- **Classifies every event** with a Random Forest over 19 features (payload entropy, SQL/shell/brute-force signal scores, protocol flags, per-IP history, time of day, port diversity). Output includes the predicted class, a confidence value, and flags for uncertain or novel inputs.
- **Retrains from the database.** A superadmin can trigger a retrain from the app or the API, and a scheduled GitHub Action does it nightly. Metrics (accuracy, holdout vs. training-data evaluation, timestamp) are read from the saved model, never hard-coded.
- **Dashboards:** live monitor, attacker profiles, blocklist management, per-organisation stats and benchmarks, an admin view across tenants with cross-org IP correlation, and CSV export.
- **Red-team mode:** generate labelled attack waves and run a detection self-test against the classifier. It's a self-test of the model on synthetic data and is labelled that way in the UI.
- **Observability:** Prometheus metrics endpoint with Grafana config in `monitoring/`.

## Architecture

```
 simulator / agents ──HTTPS──►  Flask API  ──►  PostgreSQL (Supabase)
                                  │  ▲
                                  │  └── classifier.py (scikit-learn Random Forest)
                                  ▼
                       React dashboard (served by Flask in production)
```

| Layer | Tech |
|---|---|
| API | Python, Flask, psycopg2, PyJWT |
| Auth | Argon2id password hashing, JWT sessions, role-based access (org / superadmin) |
| ML | scikit-learn RandomForest, multiprocessing for batch reclassification |
| Frontend | React (Create React App) |
| Database | PostgreSQL on Supabase (session pooler) |
| Hosting | Render (single Docker web service: API + built frontend) |
| CI/CD | GitHub Actions: backend tests against Postgres, frontend build, Docker build, nightly retrain, keep-alive |

In production the React app is built in the first stage of a multi-stage Docker build and served by Flask from the same origin, so the whole app is one service plus a database.

## Running it locally

```bash
git clone https://github.com/Zobiya-12/Snaptrap.git
cd Snaptrap
cp .env.example .env        # fill in DB + admin/demo credentials
docker compose up --build
```

Generate the values the backend needs:

```bash
# FLASK_SECRET
python -c "import secrets; print(secrets.token_urlsafe(32))"

#(hash of the password you'll log in with)
cd backend && python -c "from auth.password_security import hash_password; print(hash_password('your-password'))"
```

Then feed it some traffic:

```bash
cd backend
python simulator.py --mode demo \
  --server http://localhost:5000/api/agent/report \
  --token <DEMO_TOKEN>
```

Log in, open the Intel page, and run a retrain to train the first model.

## Deploying (Render + Supabase)

1. Create a Supabase project and copy the **session pooler** credentials. Render's network is IPv4-only, so the direct connection host won't work. The pooler username is `postgres.<project-ref>`.
2. On Render, create a **Web Service** from this repo: language Docker, root directory blank, Dockerfile path `./Dockerfile.render`, health check `/api/health`.
3. Set the environment variables: `PGSSLMODE=require`, `PORT=5000`, `FLASK_SECRET` values.
4. In GitHub, add the secrets `API_URL` for the nightly retrain and keep-alive workflows.

Tables are created and the accounts are seeded on boot (`backend/entrypoint.sh`). Free-tier hosts wipe the disk on every deploy, so the model is retrained on startup from whatever is in the database.

## Tests

```bash
cd backend
pip install -r requirements.txt pytest
pytest tests -q
```

19 tests cover login and token auth, agent ingestion, superadmin-only retraining, the classifier (including small-dataset handling and the in-process vs. worker-pool paths) and the red-team endpoints. They run against a real Postgres in CI.

## Project layout

```
backend/            Flask API, classifier, attack corpus, simulator, honeypot sensor, tests
src/                React dashboard
Dockerfile.render   single-service production image
docker-compose.yml  full local stack
.github/workflows/  CI, nightly retrain, keep-alive
```

## Known limitations

- The classifier is trained on synthetic data. Its accuracy figures aren't evidence of real-world detection performance. Evaluating it properly needs real labelled traffic and a held-out test set.
- Some dashboard visuals (battlefield animations, parts of the landing page) are illustrative rather than driven by live data.
- Free-tier hosting means cold starts and an ephemeral filesystem.

## Roadmap

- Deploy the honeypot sensor (SSH, HTTP, FTP, MySQL decoys) on a public-IP VPS and report to the hosted API.
- Collect real attack data and re-evaluate the classifier against it.
- File-system ransomware detector (entropy thresholds, mass-rename detection, canary files) as an additional module.

## Author

Zobiya, final-year B.Tech CSE student at SR University, Hyderabad.
