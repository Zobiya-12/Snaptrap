/**
 * SNAPTRAP — server.js
 * Place in PROJECT ROOT (same folder as package.json), NOT in src/.
 *
 * WHAT IT DOES:
 *   • WebSocket on port 5001 — broadcasts attacks to all dashboard tabs
 *   • POST /api/track-attack — simulator calls this per attack
 *   • GET  /api/ngrok-url   — returns live ngrok tunnel URL
 *   • Starts ngrok tunnel → your React dev server (port 3000)
 *
 * HOW TO RUN:
 *   node server.js
 *   (or: npm run server  after adding to package.json scripts)
 *
 * REQUIREMENTS:
 *   npm install ws uuid ngrok
 *
 * NGROK SETUP (free):
 *   1. Sign up at https://dashboard.ngrok.com
 *   2. export NGROK_AUTHTOKEN=ngrok config add-authtoken 3C5Qw7SeBD1gs4YIqb4Q9yY7xxQ_6yH4PXXZj7HCG4Kn57Dec
 *   3. node server.js
 */

const http = require("http");
const { WebSocketServer } = require("ws");
const { v4: uuidv4 } = require("uuid");

const WS_PORT    = 5001;
const REACT_PORT = 3000; // ngrok tunnels this port

// ─── In-memory state ──────────────────────────────────────────────────────────
const state = {
  attackLog : [],
  uniqueIPs : new Set(),
  raidFeed  : [],
  ngrokUrl  : null,
};

// ─── HTTP + REST server ───────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin",  "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  const url = req.url.split("?")[0];

  if (req.method === "GET" && url === "/api/ngrok-url") {
    res.writeHead(200);
    res.end(JSON.stringify({ url: state.ngrokUrl || null }));
    return;
  }

  if (req.method === "GET" && url === "/api/stats") {
    res.writeHead(200);
    res.end(JSON.stringify({
      totalAttacks: state.attackLog.length,
      uniqueIPs:    state.uniqueIPs.size,
    }));
    return;
  }

  if (req.method === "GET" && url === "/api/raid-feed") {
    res.writeHead(200);
    res.end(JSON.stringify(state.raidFeed.slice(0, 50)));
    return;
  }

  // POST /api/track-attack — called by LiveSimulatorPanel per attack burst
  if (req.method === "POST" && url === "/api/track-attack") {
    let body = "";
    req.on("data", c => { body += c; });
    req.on("end", () => {
      try {
        const data  = JSON.parse(body);
        const event = {
          id          : uuidv4(),
          timestamp   : data.timestamp || new Date().toISOString(),
          attacker_ip : data.ip || data.attacker_ip || "0.0.0.0",
          attack_type : data.attackType || data.attack_type || "unknown",
          service     : data.service || "HTTP",
          threat_score: data.threat_score || 50,
        };
        state.attackLog.push(event);
        state.uniqueIPs.add(event.attacker_ip);
        state.raidFeed.unshift(event);
        if (state.raidFeed.length > 100) state.raidFeed.pop();
        broadcast({ type: "ATTACK", data: event });
        res.writeHead(200);
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Bad JSON" }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const wss     = new WebSocketServer({ server });
const clients = new Set();

wss.on("connection", ws => {
  clients.add(ws);
  console.log(`[WS] + connected  (${clients.size} total)`);

  ws.send(JSON.stringify({
    type: "SNAPSHOT",
    data: {
      attackLog    : state.attackLog.slice(-50),
      uniqueIPCount: state.uniqueIPs.size,
      raidFeed     : state.raidFeed.slice(0, 20),
    },
  }));

  ws.on("close", () => { clients.delete(ws); console.log(`[WS] - disconnected (${clients.size} total)`); });
  ws.on("error", () =>  clients.delete(ws));
});

function broadcast(payload) {
  const msg = JSON.stringify(payload);
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
server.listen(WS_PORT, async () => {
  console.log(`\n🪤  SNAPTRAP server.js running`);
  console.log(`🔌  WS   →  ws://localhost:${WS_PORT}`);
  console.log(`🌐  REST →  http://localhost:${WS_PORT}/api\n`);

  try {
    const ngrok = require("ngrok");
    const token = process.env.NGROK_AUTHTOKEN;
    if (token) await ngrok.authtoken(token);
    const url = await ngrok.connect(REACT_PORT);
    state.ngrokUrl = url;
    console.log(`✅  NGROK → ${url}`);
    console.log(`   (tunnels your React dashboard at :${REACT_PORT})\n`);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.log(`⚠️  ngrok not installed — npm install ngrok`);
    } else {
      console.log(`⚠️  ngrok skipped: ${e.message}`);
      console.log(`   Set NGROK_AUTHTOKEN env var, or run: npx ngrok http ${REACT_PORT}`);
    }
  }
});
