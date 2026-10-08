
import React, { useState, useRef, useCallback, useEffect } from 'react';
import Battlefield from './Battlefield';

let _simCounter = 0;

function PublicSimulatorPanel({ onSimBatch }) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState([]);
  const intervalRef = useRef(null);

  const ATTACK_TYPES = ["brute", "scan", "sqli", "cred", "slow"];
  const SERVICES = ["SSH", "HTTP", "FTP", "DB", "ML"];

  function randomIP() {
    return `${10 + Math.floor(Math.random() * 220)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
  }

  function runSim(count) {
    if (running) return;
    setRunning(true); setProgress(0); setLog([]);
    let fired = 0;
    intervalRef.current = setInterval(() => {
      const burst = Math.min(3, count - fired);
      const batch = [];
      for (let i = 0; i < burst; i++) {
        const type = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
        const svc = SERVICES[Math.floor(Math.random() * SERVICES.length)];
        const ip = randomIP();
        const score = 20 + Math.floor(Math.random() * 80);
        const uid = `demo-${Date.now()}-${++_simCounter}`;
        batch.push({ id: uid, attacker_ip: ip, attack_type: type, service: svc, threat_score: score, timestamp: new Date().toISOString() });
        setLog(prev => [`${ip} → ${svc} [${type}] ● ${score}`, ...prev].slice(0, 8));
      }
      onSimBatch(batch);
      fired += burst;
      setProgress(Math.round((fired / count) * 100));
      if (fired >= count) {
        clearInterval(intervalRef.current);
        setRunning(false);
        setProgress(100);
      }
    }, 400);
  }

  // Stays idle until the user presses Wave / Raid / Storm — no auto-start
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stop() { clearInterval(intervalRef.current); setRunning(false); setProgress(0); setLog([]); }

  return (
    <div style={{
      background: "var(--sur)", border: "1px solid var(--bdr2)", borderTop: "2px solid var(--c2)",
      borderRadius: "var(--r2)", padding: "10px 14px", boxShadow: "var(--sh)",
      height: 180, display: "flex", flexDirection: "column", overflow: "hidden"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "1px", textTransform: "uppercase", color: "var(--c2)", display: "flex", alignItems: "center", gap: 8 }}>
          ◈ Attack Simulator
          {running && <span style={{ color: "var(--c3)", animation: "pulse 1s infinite" }}>● LIVE</span>}
        </div>
        <span style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt4)" }}>DEMO — simulated data</span>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
        <button className="sim-btn sim-btn-run" style={{ padding: "4px 8px", fontSize: 10 }} onClick={() => runSim(20)} disabled={running}>▶ Wave</button>
        <button className="sim-btn sim-btn-run" style={{ padding: "4px 8px", fontSize: 10, borderColor: "var(--c3b)", color: "var(--c3)", background: "var(--c3d)" }} onClick={() => runSim(80)} disabled={running}>⚡ Raid</button>
        <button className="sim-btn sim-btn-run" style={{ padding: "4px 8px", fontSize: 10, borderColor: "var(--c5b)", color: "var(--c5)", background: "var(--c5d)" }} onClick={() => runSim(200)} disabled={running}>💥 Storm</button>
        {running && <button className="btn btn-ghost" style={{ fontSize: 10, padding: "4px 8px" }} onClick={stop}>■ Stop</button>}
      </div>

      {(running || progress > 0) && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt3)", marginBottom: 2 }}>
            <span>{running ? "Firing attacks..." : "Complete"}</span>
            <span style={{ color: running ? "var(--c2)" : "var(--c1)" }}>{progress}%</span>
          </div>
          <div className="sim-bar-track" style={{ marginBottom: 6, height: 4 }}>
            <div className="sim-bar-fill" style={{ width: `${progress}%`, height: '100%', background: running ? "var(--c2)" : "var(--c1)" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1, background: "rgba(0,0,0,0.2)", padding: "6px", borderRadius: "4px", fontFamily: "var(--mono)", fontSize: 10, lineHeight: "1.4" }}>
            {log.map((l, i) => (
              <div key={i} style={{ display: "flex", gap: 6, color: "var(--txt3)", marginBottom: 2 }}>
                <span style={{ color: "var(--c2)" }}>▸</span>{l}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PublicDemo({ onBack, theme, onTheme }) {
  const [newBatch, setNewBatch] = useState([]);
  const [historyFeed, setHistoryFeed] = useState([]);
  const [caught, setCaught] = useState(0);
  const [ips, setIps] = useState(new Set());
  const [byType, setByType] = useState({});

  const handleSimBatch = useCallback((batch) => {
    setNewBatch([...batch]);
    setHistoryFeed(prev => [...batch, ...prev].slice(0, 200));
    setCaught(prev => prev + batch.length);
    setIps(prev => {
      const s = new Set(prev);
      batch.forEach(a => s.add(a.attacker_ip));
      return s;
    });
    setByType(prev => {
      const n = { ...prev };
      batch.forEach(a => { n[a.attack_type] = (n[a.attack_type] || 0) + 1; });
      return n;
    });
    // Deliberately no API call here — this is a public, unauthenticated
    // page and must never write to the database.
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg1)", padding: "20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div style={{ fontFamily: "var(--head)", fontSize: 22, fontWeight: 800, color: "var(--c1)" }}>
          SNAPTRAP <span style={{ fontSize: 12, color: "var(--txt3)", fontWeight: 400 }}>— Live Demo (simulated data)</span>
        </div>
        <button className="btn btn-ghost" onClick={onBack}>← Back to landing</button>
      </div>

      <div style={{ display: "flex", gap: 16, marginBottom: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ width: 900, maxWidth: "100%", flexShrink: 0 }}>
          <Battlefield feed={newBatch} onHit={() => {}} isLive={true} />
        </div>

        <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
          <PublicSimulatorPanel onSimBatch={handleSimBatch} />

          <div style={{ display: "flex", flexDirection: "column", background: "var(--sur)", border: "1px solid var(--bdr2)", borderRadius: "var(--r2)", overflow: "hidden", boxShadow: "var(--sh)", height: 340 }}>
            <div className="raid-bar">
              <div className="raid-t">◉ Live Raid Feed</div>
              <div className="live-chip"><div className="live-dot" />LIVE</div>
            </div>
            <div style={{ overflowY: "scroll", flex: 1, minHeight: 0 }}>
              {!historyFeed.length && (
                <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)", padding: "24px 16px", textAlign: "center" }}>
                  Press ▶ Wave, ⚡ Raid, or 💥 Storm to begin.
                </div>
              )}
              {historyFeed.map((a, i) => (
                <div key={a.id || i} className={`ri ${i < 5 ? "fresh" : ""}`}>
                  <div className="rdot pulse" style={{ background: a.threat_score >= 70 ? "var(--c2)" : a.threat_score >= 40 ? "var(--c3)" : "var(--c1)" }} />
                  <span style={{ color: "var(--txt3)", fontSize: 10, width: 50, flexShrink: 0 }}>{a.timestamp?.slice(11, 19)}</span>
                  <span className="ri-ip">{a.attacker_ip}</span>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt3)", flexShrink: 0, width: 34, textAlign: "right" }}>{a.threat_score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="g4" style={{ marginBottom: 18 }}>
        {[
          { l: "Attacks Caught", v: caught, c: "var(--c2)" },
          { l: "Unique IPs", v: ips.size, c: "var(--c4)" },
          { l: "Avg Threat Score", v: historyFeed.length ? Math.round(historyFeed.reduce((a, b) => a + (b.threat_score || 0), 0) / historyFeed.length) : 0, c: "var(--c3)" },
          { l: "Attack Types", v: Object.keys(byType).length, c: "var(--c1)" },
        ].map(({ l, v, c }) => (
          <div key={l} className="panel"><div className="stat-v" style={{ color: c }}>{v}</div><div className="stat-l">{l}</div></div>
        ))}
      </div>

      <div style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt4)", marginBottom: 20 }}>
        This page runs on simulated attack data for public demo purposes — no login required, nothing here is written to a database.
        The honeypot engine captures real attack traffic identically when deployed with open ports.
      </div>
    </div>
  );
}