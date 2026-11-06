/* ═══════════════════════════════════════════════════════════
   NETWORK AGENT CONSOLE — fleet view inside the Control Panel
   (token + port config live in ControlPanel.jsx; this is stats,
   the deployed-agents table and the how-it-works steps)

   Props (all optional)
     onDownload  () => void   "Deploy new agent" button
     onDocs      () => void   opens the agent docs drawer
═══════════════════════════════════════════════════════════ */
import React, { useState, useEffect } from 'react';
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
    online:  { bg: "var(--c1)",   anim: "pulse-g" },
    warning: { bg: "var(--c3)",   anim: "pulse-a" },
    offline: { bg: "var(--txt4)", anim: "none"    },
  }[status] || { bg: "var(--txt4)", anim: "none" };
  return (
    <div style={{
      width: 8, height: 8, flexShrink: 0, background: cfg.bg,
      animation: cfg.anim !== "none" ? `${cfg.anim} 2s infinite` : "none",
    }}/>
  );
};

/* ── Agent status badge (uses the shared .badge classes) ── */
const BADGE = { online: "b1", warning: "b3", offline: "bd" };
const AgentBadge = ({ status }) => <span className={`badge ${BADGE[status] || "bd"}`}>{status}</span>;

const COLS = "14px minmax(150px,190px) 1fr 90px 90px 80px";

export default function NetworkAgentConsole({ onDownload, onDocs }) {
  const [agents, setAgents]   = useState([]);
  const [isDemo, setIsDemo]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("all");
  const [note, setNote]       = useState({ show: false, msg: "", ok: true });

  /* ── Load agent list ── */
  useEffect(() => {
    apiFetch("/agents").then(ags => {
      if (Array.isArray(ags)) { setAgents(ags); setIsDemo(false); }
      else { setAgents(DEMO_AGENTS); setIsDemo(true); }   // backend unreachable → clearly-labelled sample data
      setLoading(false);
    });
  }, []);

  function showNote(msg, ok = true) {
    setNote({ show: true, msg, ok });
    setTimeout(() => setNote(n => ({ ...n, show: false })), 2500);
  }

  async function revokeAgent(agentId, agentName) {
    if (isDemo) return;
    if (!window.confirm(`Revoke agent ${agentName}? It will disconnect immediately.`)) return;
    await apiFetch(`/agents/${agentId}`, { method: "DELETE" });
    setAgents(p => p.filter(a => a.id !== agentId));
    showNote(`Agent ${agentName} revoked`, false);
  }

  /* ── Derived stats (all real, from the agent list) ── */
  const count = s => agents.filter(a => a.status === s).length;
  const eventsToday = agents.reduce((s, a) => s + (a.events_today || 0), 0);
  const filtered = filter === "all" ? agents : agents.filter(a => a.status === filter);

  const STATS = [
    { l: "Total Agents",  v: agents.length,                c: "var(--txt)", sub: `${agents.length - count("offline")} active` },
    { l: "Online",        v: count("online"),              c: "var(--c1)",  sub: `${count("warning")} degraded` },
    { l: "Offline",       v: count("offline"),             c: count("offline") ? "var(--c2)" : "var(--txt)", sub: "not reporting" },
    { l: "Events Today",  v: eventsToday.toLocaleString(), c: "var(--c4)",  sub: "across all agents" },
  ];

  return (
    <div style={{ marginBottom: 18 }}>
      <style>{`
        @keyframes pulse-g{0%,100%{box-shadow:0 0 0 0 var(--c1b)}50%{box-shadow:0 0 0 5px transparent}}
        @keyframes pulse-a{0%,100%{box-shadow:0 0 0 0 var(--c3b)}50%{box-shadow:0 0 0 5px transparent}}
        .nac-row:hover{background:var(--acc-d)}
        .nac-chip{font-family:var(--mono);font-size:10px;background:transparent;border:1px solid var(--bdr3);color:var(--txt3);padding:5px 10px;text-transform:uppercase;cursor:pointer;letter-spacing:.14em;transition:background .15s,color .15s}
        .nac-chip+.nac-chip{border-left:0}
        .nac-chip:hover{color:var(--txt)}
        .nac-chip.on{background:var(--txt);color:var(--bg);border-color:var(--txt)}
        .nac-step-num{width:24px;height:24px;border:1px solid var(--acc-b);color:var(--acc);font-family:var(--head);font-size:16px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .nac-scroll{overflow-x:auto}
        .nac-min{min-width:720px}
      `}</style>

      {/* ── section header ── */}
      <div className="page-head" style={{ marginTop: 6 }}>
        <div>
          <div className="eyebrow">◉ Network agent console</div>
          <div className="sec-title">Deployed <em>agents</em></div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {onDocs && <button className="btn btn-ghost" onClick={onDocs}>Docs</button>}
          {onDownload && <button className="btn btn-1" onClick={onDownload}>⬇ Deploy new agent</button>}
        </div>
      </div>

      {/* ── stat cards ── */}
      <div className="g4" style={{ marginBottom: 18 }}>
        {STATS.map(({ l, v, c, sub }) => (
          <div key={l} className="panel">
            <div className="stat-v" style={{ color: c }}>{v}</div>
            <div className="stat-l">{l}</div>
            <div className="stat-sub">{sub}</div>
          </div>
        ))}
      </div>

      {/* ── agent table ── */}
      <div className="panel" style={{ padding: 0, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: "12px 18px", borderBottom: "1px solid var(--bdr2)" }}>
          <div className="ph" style={{ margin: 0, flex: 1 }}>
            Agent fleet
            {isDemo && <span className="badge b3" style={{ marginLeft: 4 }}>sample data</span>}
          </div>
          <div style={{ display: "flex" }}>
            {["all", "online", "warning", "offline"].map(f => (
              <button key={f} className={`nac-chip ${filter === f ? "on" : ""}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </div>

        <div className="nac-scroll">
          <div className="nac-min">
            {/* column labels */}
            <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: 12, padding: "9px 18px", borderBottom: "1px solid var(--rule)" }}>
              {["", "Agent ID", "Org / Location", "Events", "Status", ""].map((h, i) => (
                <div key={i} className="stat-l" style={{ fontSize: 9, textAlign: i === 3 ? "right" : i === 4 ? "center" : "left" }}>{h}</div>
              ))}
            </div>

            {loading ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--txt4)" }}>Loading agents…</div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--txt4)" }}>
                No {filter !== "all" ? filter : ""} agents. Download agent.py and run it on any machine.
              </div>
            ) : filtered.map((agent, idx) => (
              <div key={agent.id || idx} className="nac-row" style={{
                display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: 12, padding: "12px 18px",
                borderBottom: idx < filtered.length - 1 ? "1px solid var(--bdr)" : "none", transition: "background .1s",
              }}>
                <Pulse status={agent.status} />
                <div>
                  <div style={{ fontSize: 12, color: "var(--txt)", fontWeight: 500 }}>{agent.agent_id}</div>
                  <div style={{ fontSize: 11, color: "var(--txt3)", marginTop: 2 }}>{agent.org_name}</div>
                </div>
                <div style={{ fontSize: 11, color: "var(--txt3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {agent.location} · {agent.iface} · v{agent.version}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--head)", fontSize: 22, color: "var(--txt)", lineHeight: 1 }}>{(agent.events_today || 0).toLocaleString()}</div>
                  <div className="stat-l" style={{ fontSize: 9, marginTop: 2 }}>today</div>
                </div>
                <div style={{ textAlign: "center" }}><AgentBadge status={agent.status} /></div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button className="btn btn-2" style={{ padding: "4px 10px", fontSize: 9 }} disabled={isDemo}
                    title={isDemo ? "Sample data can't be revoked" : "Revoke agent"}
                    onClick={() => revokeAgent(agent.id, agent.agent_id)}>Revoke</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {note.show && <div className={note.ok ? "aok" : "aerr"} style={{ margin: 12 }}>{note.msg}</div>}
      </div>

      {/* ── How it works ── */}
      <div className="panel">
        <div className="ph">How agents work</div>
        <div className="g2" style={{ gap: 14 }}>
          {[
            { n: 1, title: "Download agent.py",    desc: "A single Python file. Needs Python 3 plus requests and colorama." },
            { n: 2, title: "Run on any machine",   desc: "Starts SSH, HTTP, FTP and database honeypot listeners on the ports you configured." },
            { n: 3, title: "Telemetry flows back", desc: "Every attack POSTs to SNAPTRAP with your token. Data is isolated per org." },
            { n: 4, title: "ML classifies it",     desc: "A Random Forest labels each event: brute force, SQLi, port scan, and more." },
          ].map(({ n, title, desc }) => (
            <div key={n} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div className="nac-step-num">{n}</div>
              <div style={{ fontSize: 12, color: "var(--txt3)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--txt)", display: "block", marginBottom: 2, fontSize: 12, letterSpacing: ".04em", textTransform: "uppercase" }}>{title}</strong>
                {desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Sample data (shown, and labelled, only when the /agents request fails) ── */
const DEMO_AGENTS = [
  { id: 1, agent_id: "AGT-7F2A-001", org_name: "Infosec Labs Pvt Ltd",    location: "Mumbai, IN",     status: "online",  events_today: 847, version: "1.3.2", iface: "eth0"  },
  { id: 2, agent_id: "AGT-3D9C-002", org_name: "CyberShield MENA",        location: "Dubai, AE",      status: "online",  events_today: 614, version: "1.3.2", iface: "eth1"  },
  { id: 3, agent_id: "AGT-B1E5-003", org_name: "Nexus Security Group",    location: "Singapore, SG",  status: "warning", events_today: 386, version: "1.2.8", iface: "wlan0" },
  { id: 4, agent_id: "AGT-0A4F-004", org_name: "Redstone IT Systems",     location: "Frankfurt, DE",  status: "offline", events_today: 0,   version: "1.2.5", iface: "eth0"  },
];
export { DEMO_AGENTS };
export { NetworkAgentConsole };