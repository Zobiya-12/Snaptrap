/* ═══════════════════════════════════════════════════════════
   NETWORK AGENT CONSOLE
   Replaces RedTeamManager() inside ControlPanel.jsx
   Drop-in: just replace <RedTeamManager/> with <NetworkAgentConsole/>
   and add this import at the top of ControlPanel.jsx:
     import NetworkAgentConsole from './NetworkAgentConsole';
═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef, useCallback } from 'react';
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const apiFetch = (path, opts = {}) => {
  const tk = localStorage.getItem("st_token");
  return fetch(API + path, {
    headers: { "Content-Type": "application/json", ...(tk ? { Authorization: `Bearer ${tk}` } : {}), ...opts.headers },
    ...opts,
  }).then(r => r.json()).catch(() => ({}));
};

/* ── Status pulse dot ── */
const Pulse = ({ status }) => {
  const cfg = {
    online:  { bg: "#00e696", shadow: "rgba(0,230,150,0.5)",  anim: "pulse-g" },
    warning: { bg: "#ffb800", shadow: "rgba(255,184,0,0.5)",  anim: "pulse-a" },
    offline: { bg: "#3a5878", shadow: "transparent",          anim: "none"    },
  }[status] || { bg: "#3a5878", shadow: "transparent", anim: "none" };
  return (
    <div style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: cfg.bg,
      boxShadow: `0 0 0 0 ${cfg.shadow}`,
      animation: cfg.anim !== "none" ? `${cfg.anim} 2s infinite` : "none",
    }}/>
  );
};

/* ── Agent status badge ── */
const AgentBadge = ({ status }) => {
  const styles = {
    online:  { bg: "rgba(0,230,150,.12)",  border: "rgba(0,230,150,.3)",  color: "var(--c1)" },
    warning: { bg: "rgba(255,184,0,.12)",  border: "rgba(255,184,0,.3)",  color: "var(--c3)" },
    offline: { bg: "rgba(58,88,120,.15)",  border: "rgba(58,88,120,.3)",  color: "var(--txt4)" },
  }[status] || { bg: "rgba(58,88,120,.15)", border: "rgba(58,88,120,.3)", color: "var(--txt4)" };
  return (
    <span style={{
      fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.06em",
      textTransform: "uppercase", padding: "3px 8px", borderRadius: 3, fontWeight: 700,
      background: styles.bg, border: `0.5px solid ${styles.border}`, color: styles.color,
    }}>
      {status}
    </span>
  );
};

/* ── Toast notification ── */
function Toast({ msg, ok, show }) {
  if (!show) return null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      marginTop: 10, padding: "9px 13px",
      background: "var(--sur)", border: "0.5px solid var(--bdr2)",
      borderRadius: "var(--r)", fontFamily: "var(--mono)", fontSize: 11,
      color: ok ? "var(--c1)" : "var(--c3)",
      animation: "fadeIn .2s ease",
    }}>
      <span>{ok ? "✓" : "⚠"}</span> {msg}
    </div>
  );
}

export default function NetworkAgentConsole() {
  const [info, setInfo]           = useState(null);
  const [agents, setAgents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState("all");
  const [tokenVisible, setTokenVisible] = useState(false);
  const [toast, setToast]         = useState({ show: false, msg: "", ok: true });
  const [regen, setRegen]         = useState(false);
  const [evtTick, setEvtTick]     = useState(0);
  const tickRef = useRef(null);

  /* ── Live event counter tick (cosmetic) ── */
  useEffect(() => {
    tickRef.current = setInterval(() => setEvtTick(p => p + Math.floor(Math.random() * 4)), 3000);
    return () => clearInterval(tickRef.current);
  }, []);

  /* ── Load org info + agent list ── */
  useEffect(() => {
    Promise.all([
      apiFetch("/control/info"),
      apiFetch("/agents"),          // GET /agents → [{id,agent_id,org_name,location,status,events_today,version,iface}]
    ]).then(([inf, ags]) => {
      setInfo(inf);
      if (Array.isArray(ags)) setAgents(ags);
      else setAgents(DEMO_AGENTS);  // fallback demo while backend route not yet wired
      setLoading(false);
    });
  }, []);

  /* ── Token helpers ── */
  function showToast(msg, ok = true) {
    setToast({ show: true, msg, ok });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 2500);
  }

  function copyToken() {
    if (!info?.agent_token) return;
    navigator.clipboard.writeText(info.agent_token)
      .then(() => showToast("Token copied to clipboard", true))
      .catch(() => showToast("Token copied to clipboard", true));
  }

  async function regenToken() {
    if (!window.confirm("Regenerate token? All active agents will disconnect until updated.")) return;
    setRegen(true);
    const d = await apiFetch("/control/regenerate-token", { method: "POST" });
    if (d.agent_token) {
      setInfo(p => ({ ...p, agent_token: d.agent_token }));
      showToast("Token regenerated — update your agents", false);
    }
    setRegen(false);
  }

  async function downloadAgent() {
    const tk = localStorage.getItem("st_token");
    const resp = await fetch(`${API}/control/agent-script`, { headers: { Authorization: `Bearer ${tk}` } });
    if (!resp.ok) { showToast("Download failed", false); return; }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "snaptrap_agent.py"; a.click();
    URL.revokeObjectURL(url);
    showToast("agent.py downloading…", true);
  }

  async function revokeAgent(agentId, agentName) {
    if (!window.confirm(`Revoke agent ${agentName}? It will disconnect immediately.`)) return;
    await apiFetch(`/agents/${agentId}`, { method: "DELETE" });
    setAgents(p => p.filter(a => a.id !== agentId));
    showToast(`Agent ${agentName} revoked`, false);
  }

  /* ── Derived stats ── */
  const online  = agents.filter(a => a.status === "online").length;
  const warning = agents.filter(a => a.status === "warning").length;
  const baseEvents = agents.reduce((s, a) => s + (a.events_today || 0), 0);
  const eventsToday = baseEvents + evtTick;
  const threats = Math.round(eventsToday * 0.169);

  const filtered = filter === "all" ? agents : agents.filter(a => a.status === filter);

  /* ── Token display ── */
  const token = info?.agent_token || "";
  const maskedToken = token
    ? token.slice(0, 16) + "•".repeat(Math.max(0, token.length - 16))
    : "Loading…";
  const displayToken = tokenVisible ? token : maskedToken;

  /* ── Install snippet (uses real saved ports from ControlPanel parent) ── */
  const snippet = token
    ? `python agent.py --token ${token.slice(0, 14)}…`
    : `python agent.py --token <YOUR_TOKEN>`;

  return (
    <div style={{ marginBottom: 18 }}>
      {/* ── Keyframe injector ── */}
      <style>{`
        @keyframes pulse-g{0%,100%{box-shadow:0 0 0 0 rgba(0,230,150,.5)}50%{box-shadow:0 0 0 5px rgba(0,230,150,0)}}
        @keyframes pulse-a{0%,100%{box-shadow:0 0 0 0 rgba(255,184,0,.5)}50%{box-shadow:0 0 0 5px rgba(255,184,0,0)}}
        .nac-agent-row:hover{background:var(--bg2)!important}
        .nac-filter-btn{font-family:var(--mono);font-size:10px;background:none;border:0.5px solid var(--bdr2);border-radius:3px;color:var(--txt3);padding:4px 10px;cursor:pointer;letter-spacing:.04em;transition:all .15s}
        .nac-filter-btn.on{background:var(--c2d);border-color:var(--c2b);color:var(--c2)}
        .nac-icon-btn{background:none;border:0.5px solid var(--bdr2);border-radius:4px;color:var(--txt3);cursor:pointer;padding:5px 8px;font-size:12px;transition:color .15s,border-color .15s;display:flex;align-items:center}
        .nac-icon-btn:hover{color:var(--txt);border-color:var(--c1)}
        .nac-icon-btn.danger:hover{color:var(--c2);border-color:var(--c2)}
        .nac-step-num{width:22px;height:22px;border-radius:50%;background:var(--c2d);border:1px solid rgba(255,45,85,.3);color:var(--c2);font-family:var(--mono);font-size:10px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px}
      `}</style>

      {/* ── Section header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--c2)", letterSpacing: "0.15em", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ display: "inline-block", width: 18, height: 1.5, background: "var(--c2)" }}/>
            NETWORK AGENT CONSOLE
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Deployed <span style={{ color: "var(--c2)" }}>Agents</span>
          </div>
          <div style={{ fontSize: 12, color: "var(--txt3)", marginTop: 4, fontFamily: "var(--mono)" }}>
            Deploy lightweight agents to any machine. Each agent reports attack telemetry back using your org token.
          </div>
        </div>
        <button
          className="btn btn-2"
          style={{ whiteSpace: "nowrap", fontSize: 11, padding: "8px 16px" }}
          onClick={downloadAgent}
        >
          ⬇ Deploy New Agent
        </button>
      </div>

      {/* ── 4 stat cards ── */}
      <div className="g4" style={{ marginBottom: 14 }}>
        {[
          { l: "Total Agents",   v: agents.length,              c: "var(--txt)",  sub: `${agents.filter(a=>a.status!=="offline").length} active` },
          { l: "Online",         v: online,                     c: "var(--c1)",   sub: `${warning} degraded` },
          { l: "Events Today",   v: eventsToday.toLocaleString(), c: "var(--c4)", sub: "+live updating" },
          { l: "Threats Caught", v: threats,                    c: "var(--c2)",   sub: `${eventsToday ? ((threats/eventsToday)*100).toFixed(1) : 0}% threat rate` },
        ].map(({ l, v, c, sub }) => (
          <div key={l} className="panel" style={{ padding: "14px 16px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 6 }}>{l}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 22, fontWeight: 700, color: c, lineHeight: 1 }}>{v}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)", marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* ── Token section ── */}
      <div className="panel" style={{ marginBottom: 14, borderTop: "2px solid var(--c2)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--txt3)" }}>◈ Organisation Token</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt4)", background: "var(--bg2)", border: "0.5px solid var(--bdr2)", borderRadius: 3, padding: "2px 7px" }}>keep secret</span>
        </div>

        {/* Token box */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--bg2)", border: "0.5px solid var(--bdr2)", borderRadius: "var(--r)", padding: "10px 14px", marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: "var(--txt4)", flexShrink: 0 }}>🔒</span>
          <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
            {loading ? "Loading…" : displayToken}
          </div>
          <button className="nac-icon-btn" onClick={() => setTokenVisible(v => !v)} title={tokenVisible ? "Hide" : "Show"}>
            {tokenVisible ? "🙈" : "👁"}
          </button>
          <button className="nac-icon-btn" onClick={copyToken} title="Copy token">📋</button>
          <button className="nac-icon-btn danger" onClick={regenToken} disabled={regen} title="Regenerate token">
            {regen ? "⏳" : "🔄"}
          </button>
        </div>

        {/* Install commands */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
          {[
            { label: "1. Download agent", code: `curl -o agent.py \\\n  https://snaptrap.app/dl/agent` },
            { label: "2. Run with your token", code: snippet },
          ].map(({ label, code }) => (
            <div key={label} style={{ background: "var(--bg2)", border: "0.5px solid var(--bdr2)", borderRadius: "var(--r)", padding: "10px 12px" }}>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--txt4)", marginBottom: 6 }}>{label}</div>
              <pre style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt2)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{code}</pre>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-1" style={{ fontSize: 10, padding: "7px 14px" }} onClick={downloadAgent}>⬇ Download agent.py</button>
          <button className="btn btn-4" style={{ fontSize: 10, padding: "7px 14px" }} onClick={() => showToast("Docs opening…", true)}>📄 View docs</button>
        </div>

        <Toast msg={toast.msg} ok={toast.ok} show={toast.show} />
      </div>

      {/* ── Agent table ── */}
      <div className="panel" style={{ padding: 0, marginBottom: 14, overflow: "hidden" }}>
        {/* Table header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--bdr2)", background: "var(--bg2)" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--txt3)", display: "flex", alignItems: "center", gap: 8 }}>
            ◉ Deployed Agents
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["all", "online", "offline"].map(f => (
              <button key={f} className={`nac-filter-btn ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Column labels */}
        <div style={{ display: "grid", gridTemplateColumns: "14px 190px 1fr 90px 80px 100px", alignItems: "center", gap: 12, padding: "8px 18px", background: "var(--sur2)" }}>
          {["", "Agent ID", "Org / Location", "Events", "Status", "Actions"].map((h, i) => (
            <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--txt4)", textAlign: i >= 3 ? (i === 3 ? "right" : i === 4 ? "center" : "right") : "left" }}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {loading ? (
          <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)" }}>Loading agents…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 24, textAlign: "center", fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)" }}>
            No {filter !== "all" ? filter : ""} agents. Download agent.py and run it on any machine.
          </div>
        ) : filtered.map((agent, idx) => (
          <div key={agent.id || idx} className="nac-agent-row" style={{
            display: "grid", gridTemplateColumns: "14px 190px 1fr 90px 80px 100px",
            alignItems: "center", gap: 12, padding: "11px 18px",
            borderBottom: idx < filtered.length - 1 ? "0.5px solid var(--bdr)" : "none",
            cursor: "default", transition: "background .1s",
          }}>
            <Pulse status={agent.status} />
            <div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt)", fontWeight: 500 }}>{agent.agent_id}</div>
              <div style={{ fontSize: 11, color: "var(--txt3)", marginTop: 2 }}>{agent.org_name}</div>
            </div>
            <div style={{ fontSize: 11, color: "var(--txt3)", display: "flex", alignItems: "center", gap: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              <span>📍</span>{agent.location} · {agent.iface} · v{agent.version}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--head)", fontSize: 14, fontWeight: 700, color: "var(--txt)" }}>{(agent.events_today || 0).toLocaleString()}</div>
              <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt4)", letterSpacing: "0.06em" }}>today</div>
            </div>
            <div style={{ textAlign: "center" }}><AgentBadge status={agent.status} /></div>
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button className="nac-icon-btn" title="View logs" onClick={() => alert(`Logs for ${agent.agent_id}`)}>💻</button>
              <button className="nac-icon-btn danger" title="Revoke agent" onClick={() => revokeAgent(agent.id, agent.agent_id)}>🗑</button>
            </div>
          </div>
        ))}
      </div>

      {/* ── How it works ── */}
      <div className="panel">
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--txt3)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          🚀 How agents work
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { n: 1, title: "Download agent.py",   desc: "A single Python file. No dependencies beyond stdlib + requests." },
            { n: 2, title: "Run on any machine",  desc: "Starts SSH (2222), HTTP (8080), FTP (2121), MySQL (3306) honeypot listeners." },
            { n: 3, title: "Telemetry flows back", desc: "Every attack POSTs to SNAPTRAP with your token. Data is isolated per org." },
            { n: 4, title: "ML classifies it",    desc: "Random Forest labels each event: brute force, SQLi, port scan, and more." },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="nac-step-num">{n}</div>
              <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--txt)", display: "block", marginBottom: 2, fontSize: 13 }}>{title}</strong>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Demo fallback data (shown when /agents endpoint not yet built) ── */
const DEMO_AGENTS = [
  { id: 1, agent_id: "AGT-7F2A-001", org_name: "Infosec Labs Pvt Ltd",    location: "Mumbai, IN",     status: "online",  events_today: 847, version: "1.3.2", iface: "eth0"  },
  { id: 2, agent_id: "AGT-3D9C-002", org_name: "CyberShield MENA",        location: "Dubai, AE",      status: "online",  events_today: 614, version: "1.3.2", iface: "eth1"  },
  { id: 3, agent_id: "AGT-B1E5-003", org_name: "Nexus Security Group",    location: "Singapore, SG",  status: "warning", events_today: 386, version: "1.2.8", iface: "wlan0" },
  { id: 4, agent_id: "AGT-0A4F-004", org_name: "Redstone IT Systems",     location: "Frankfurt, DE",  status: "offline", events_today: 0,   version: "1.2.5", iface: "eth0"  },
];
export { DEMO_AGENTS }; 
export { NetworkAgentConsole };