<<<<<<< HEAD
# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
=======
# SNAPTRAP — Deployment Guide
### Setup: React on Laptop · Everything else on VM

---

## Architecture

```
💻 YOUR LAPTOP                    🖥️ YOUR VM (Kali)
──────────────────                ─────────────────────────────────
npm start                         Docker manages:
App.js                            ┌─────────────────────────────┐
  ↓                               │  snaptrap_db    :5432       │
const API =                  ───► │  snaptrap_api   :5000       │
"http://VM_IP:5000/api"           │  snaptrap_honeypot          │
                                  │    SSH  :2222               │
browser → localhost:3000          │    HTTP :8080               │
                                  │    FTP  :2121               │
                                  │    DB   :3306               │
Grafana → VM_IP:3001              │  snaptrap_prometheus :9090  │
                                  │  snaptrap_grafana    :3001  │
                                  └─────────────────────────────┘
```

---

## VM File Structure

```
~/snaptrap/
├── docker-compose.yml
├── .env.example  →  copy to .env
├── .gitignore
│
├── backend/
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── entrypoint-honeypot.sh
│   ├── requirements.txt
│   ├── app.py              ← Flask API (with /api/metrics route added)
│   ├── honeypot.py
│   ├── db.py
│   ├── classifier.py
│   ├── agent.py
│   └── simulator.py
│
└── monitoring/
    ├── prometheus.yml
    └── grafana/
        └── provisioning/
            ├── datasources/
            │   └── prometheus.yml
            └── dashboards/
                ├── dashboard.yml
                └── snaptrap.json
```

---

## Step 1 — Prepare the VM

```bash
# On your VM — create folder structure
mkdir -p ~/snaptrap/backend
mkdir -p ~/snaptrap/monitoring/grafana/provisioning/datasources
mkdir -p ~/snaptrap/monitoring/grafana/provisioning/dashboards

# Copy all your Python files into backend/
cp app.py honeypot.py db.py classifier.py agent.py simulator.py \
   ~/snaptrap/backend/

# Copy all the Docker config files from this folder into ~/snaptrap/
# (docker-compose.yml, .env.example, monitoring/*, backend/Dockerfile etc.)
```

---

## Step 2 — Add the metrics route to app.py

Open `~/snaptrap/backend/app.py` and add this route:

```python
@app.route('/api/metrics', methods=['GET'])
def prometheus_metrics():
    try:
        stats   = get_stats()
        conn    = get_conn()
        cur     = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM attackers WHERE risk_level = 'high'")
        blocked = cur.fetchone()[0]
        cur.close(); conn.close()

        lines = [
            "# TYPE snaptrap_attacks_total counter",
            f"snaptrap_attacks_total {stats.get('total_attacks',0)}",
            "# TYPE snaptrap_unique_ips_total gauge",
            f"snaptrap_unique_ips_total {stats.get('unique_ips',0)}",
            "# TYPE snaptrap_active_sessions gauge",
            "snaptrap_active_sessions 4",
            "# TYPE snaptrap_blocked_ips_total gauge",
            f"snaptrap_blocked_ips_total {blocked}",
            "# TYPE snaptrap_avg_threat_score gauge",
            f"snaptrap_avg_threat_score {stats.get('avg_threat_score',0)}",
        ]
        for svc, cnt in (stats.get('by_service') or {}).items():
            lines.append(f'snaptrap_attacks_by_service_total{{service="{svc}"}} {cnt}')
        for t, cnt in (stats.get('by_type') or {}).items():
            lines.append(f'snaptrap_attacks_by_type_total{{attack_type="{t}"}} {cnt}')

        return Response("\n".join(lines)+"\n", mimetype="text/plain; version=0.0.4")
    except Exception as e:
        return Response(f"# ERROR: {e}\n", mimetype="text/plain"), 500
```

Also update CORS to allow your laptop:

```python
# Find this line in app.py and replace it:
CORS(app, origins=["http://localhost:3000"])

# Replace with (use your actual VM IP):
CORS(app, origins=[
    "http://localhost:3000",
    "http://192.168.X.X:3000",   # ← your VM IP (run: hostname -I)
])

# Or for demo/testing, allow everything:
CORS(app)
```

---

## Step 3 — Launch the VM stack

```bash
cd ~/snaptrap
cp .env.example .env

# Start everything
docker compose up -d --build

# Watch logs — wait for these lines:
docker compose logs -f
# snaptrap_api | ✓ Tables ready
# snaptrap_api | ✓ Demo account ready: demo@snaptrap.io
# snaptrap_api | 🚀 Starting Flask API on port 5000
# snaptrap_honeypot | 🍯 Starting Honeypot engine...
```

---

## Step 4 — Update App.js on your laptop

Open your `App.js` and change the very first API line:

```javascript
// Find this at the top of App.js:
const API = "http://localhost:5000/api";

// Change to your VM's IP:
const API = "http://192.168.X.X:5000/api";   // ← get VM IP with: hostname -I
```

Then run React as normal:

```bash
npm start   # still works exactly the same on your laptop
```

---

## Step 5 — Open everything

| What | URL | Login |
|------|-----|-------|
| SNAPTRAP Dashboard | http://localhost:3000 (your laptop) | admin@snaptrap.io / admin2024 |
| SNAPTRAP Demo | http://localhost:3000 | demo@snaptrap.io / Demo@2024 |
| Grafana | http://VM_IP:3001 | admin / snaptrap2024 |
| Prometheus | http://VM_IP:9090 | (no login) |
| Flask API direct | http://VM_IP:5000/api/health | (no login) |

---

## Step 6 — Run the Simulator

```bash
# On your VM, inside the backend container:
docker compose run --rm api python simulator.py --mode demo

# Or from your laptop if you have Python + requests installed:
# (change SERVER_URL in simulator.py to http://VM_IP:5000/api/agent/report)
python3 simulator.py --mode demo
```

---

## Step 7 — Train the ML model

```bash
# Run inside the api container (has DB access + sklearn)
docker compose exec api python classifier.py
```

---

## ngrok — Share your demo with the world

ngrok gives your VM a public HTTPS URL so anyone can see your dashboard.

### Install ngrok on the VM

```bash
# Download ngrok
curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok.asc | sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null
echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | sudo tee /etc/apt/sources.list.d/ngrok.list
sudo apt update && sudo apt install ngrok

# OR just download the binary directly:
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

### Sign up and authenticate (free tier is enough)

```bash
# Sign up at https://ngrok.com (free)
# Copy your authtoken from the dashboard

ngrok config add-authtoken YOUR_TOKEN_HERE
```

### Expose your API

```bash
# In one terminal — expose Flask API publicly
ngrok http 5000
# → gives you: https://abc123.ngrok-free.app

# In another terminal — expose Grafana publicly  
ngrok http 3001
# → gives you: https://def456.ngrok-free.app
```

### Update App.js for the public URL

```javascript
// Change this line in App.js on your laptop:
const API = "https://abc123.ngrok-free.app/api";
// Then npm start — your dashboard now uses the public API
```

### Update CORS in app.py for ngrok

```python
CORS(app, origins=[
    "http://localhost:3000",
    "https://abc123.ngrok-free.app",   # ← your ngrok URL
])
```

Then rebuild: `docker compose up -d --build api`

---

## Useful Commands

```bash
# Container status
docker compose ps

# Logs
docker compose logs -f              # all services
docker compose logs -f api          # Flask only
docker compose logs -f honeypot     # honeypot hits
docker compose logs -f grafana      # grafana

# Restart single service after code change
docker compose build api && docker compose up -d api

# Connect to DB directly
docker exec -it snaptrap_db psql -U snaptrap_user -d snaptrap

# Check Prometheus is scraping correctly
curl http://VM_IP:9090/api/v1/targets
# Should show snaptrap_api as "UP"

# Check metrics endpoint manually
curl http://VM_IP:5000/api/metrics

# Stop everything
docker compose down

# Stop and wipe all data (fresh start)
docker compose down -v
```

---

## Disk space on VM

Total Docker images pulled:
- postgres:15-alpine      ~80MB
- prom/prometheus         ~90MB
- grafana/grafana         ~380MB
- python:3.11-slim build  ~300MB (shared between api + honeypot)

**Total: ~850MB** — no Node.js, no React build on the VM.

If disk is very tight, skip Grafana:

```bash
# Start without Grafana/Prometheus
docker compose up -d db api honeypot
```

---

## Troubleshooting

**"Connection refused" from laptop React**
```bash
# VM firewall might be blocking port 5000
sudo ufw allow 5000
sudo ufw allow 3001
sudo ufw allow 9090
```

**Prometheus shows snaptrap_api as DOWN**
```bash
# Check metrics endpoint is reachable inside Docker network
docker exec snaptrap_prometheus wget -qO- http://api:5000/api/metrics
```

**Grafana shows "No data"**
```bash
# Give it 1-2 minutes after first boot
# Prometheus needs at least one successful scrape before data appears
# Check: http://VM_IP:9090/targets — should show "UP"
```

**Port 3306 conflict (MySQL running on VM)**
```bash
sudo systemctl stop mysql
# Or change the honeypot DB port in docker-compose.yml:
# "3307:3306"  ← host:container
```
>>>>>>> 8233ba56efb5daa520982a47071e129f5225596c
