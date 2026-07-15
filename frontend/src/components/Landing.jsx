import Battlefield from "./Battlefield";
import LandingHeroBattlefield from "./LandingHeroBattlefield";
import React, { useState, useEffect, useRef, useCallback } from 'react';

const REPO_URL = "https://github.com/Zobiya-12/Snaptrap";

// ── Self-contained hero simulator — no API calls, no auth, no persistence ──
let _heroSimCounter = 0;
const HERO_ATTACK_TYPES = ["brute", "scan", "sqli", "cred", "slow"];
const HERO_SERVICES = ["SSH", "HTTP", "FTP", "DB", "ML"];
function heroRandomIP() {
  return `${10 + Math.floor(Math.random() * 220)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${1 + Math.floor(Math.random() * 254)}`;
}

function useHeroSim() {
  const [newBatch, setNewBatch] = useState([]);
  const [historyFeed, setHistoryFeed] = useState([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);

  const runSim = useCallback((count) => {
    if (running) return;
    setRunning(true); setProgress(0);
    let fired = 0;
    intervalRef.current = setInterval(() => {
      const burst = Math.min(3, count - fired);
      const batch = [];
      for (let i = 0; i < burst; i++) {
        const type = HERO_ATTACK_TYPES[Math.floor(Math.random() * HERO_ATTACK_TYPES.length)];
        const svc = HERO_SERVICES[Math.floor(Math.random() * HERO_SERVICES.length)];
        batch.push({
          id: `hero-${Date.now()}-${++_heroSimCounter}`,
          attacker_ip: heroRandomIP(), attack_type: type, service: svc,
          threat_score: 20 + Math.floor(Math.random() * 80),
          timestamp: new Date().toISOString(),
        });
      }
      setNewBatch([...batch]);
      setHistoryFeed(prev => [...batch, ...prev].slice(0, 6));
      fired += burst;
      setProgress(Math.round((fired / count) * 100));
      if (fired >= count) { clearInterval(intervalRef.current); setRunning(false); setProgress(100); }
    }, 400);
  }, [running]);

  const stop = useCallback(() => { clearInterval(intervalRef.current); setRunning(false); setProgress(0); }, []);

  // Auto-start on mount, then keep firing a small wave periodically
  useEffect(() => {
    const startT = setTimeout(() => runSim(15), 600);
    const loopT = setInterval(() => runSim(15), 10000);
    return () => { clearTimeout(startT); clearInterval(loopT); clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { newBatch, historyFeed, running, progress, runSim, stop };
}

function Landing({ onSignup, onLogin, onDemo, onTheme, theme }) {
  const [count, setCount] = useState({ hpc: 0, classes: 0, retrain: 0 });
  const heroSim = useHeroSim();

  useEffect(() => {
    const targets = { hpc: 3, classes: 5, retrain: 24 };
    const dur = 1400, fps = 50, interval = dur / fps;
    let frame = 0;
    const t = setInterval(() => {
      frame++; const p = Math.min(frame / fps, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setCount({
        hpc: Math.round(targets.hpc * ease),
        classes: Math.round(targets.classes * ease),
        retrain: Math.round(targets.retrain * ease),
      });
      if (p >= 1) clearInterval(t);
    }, interval);
    return () => clearInterval(t);
  }, []);

  const TICKER_ITEMS = ["🔴 SSH Brute Force Detected", "💉 SQL Injection Caught", "🔭 Port Scan Logged", "🔑 Credential Stuffing Blocked", "🐢 Slow-Loris Trapped", "⚡ ML Classifier Running", "🧵 8 Threads → 7.4x Speedup", "🛡 Tarpit Deployed"];

  return <div className="lp" style={{ background: "var(--bg)" }}>
    {/* ── NAV ── */}
    <nav style={{
      height: 62, display: "flex", alignItems: "center", padding: "0 24px",
      background: "rgba(13,18,37,0.96)", backdropFilter: "blur(12px)",
      borderBottom: "1px solid var(--bdr2)", position: "sticky", top: 0, zIndex: 200, gap: 16
    }}>
      <div className="logo" style={{ fontSize: 14, letterSpacing: 3 }}>SNAP<em>TRAP</em></div>
      <div style={{ width: 1, height: 22, background: "var(--bdr2)" }} />

      <div style={{ display: "flex", gap: 4, marginLeft: 4 }}>
        {[
          { lbl: "Features", target: "features" },
          { lbl: "Architecture", target: "how" },
          { lbl: "Docs", href: REPO_URL },
        ].map(({ lbl, target, href }) => (
          <button
            key={lbl}
            className="lp-nl"
            style={{ fontWeight: 600 }}
            onClick={() => href ? window.open(href, "_blank", "noopener") : document.getElementById(target)?.scrollIntoView({ behavior: "smooth" })}
          >
            {lbl}{href && " ↗"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
        <button
          onClick={onDemo}
          style={{
            fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700, padding: "6px 14px", borderRadius: 6,
            border: "1px solid var(--c2b, #ff2d55)", background: "rgba(255,45,85,.1)", color: "#ff2d55",
            cursor: "pointer", display: "flex", alignItems: "center", gap: 6
          }}
        >
          <span className="live-dot" style={{ background: "#ff2d55" }} /> Live Demo
        </button>
        <button className="theme-btn" onClick={onTheme} title="Toggle theme">{theme === "dark" ? "☀" : "🌙"}</button>
        <div style={{ width: 1, height: 22, background: "var(--bdr2)" }} />
        <button onClick={onLogin} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "5px 14px", borderRadius: 6, border: "1px solid var(--bdr2)", background: "transparent", color: "var(--txt2)", cursor: "pointer", transition: "all .15s" }}
          onMouseEnter={e => e.target.style.borderColor = "var(--c1)"}
          onMouseLeave={e => e.target.style.borderColor = "var(--bdr2)"}
        >Sign in</button>
        <button onClick={onSignup} style={{ fontFamily: "var(--mono)", fontSize: 11, padding: "5px 14px", borderRadius: 6, border: "1px solid rgba(0,230,150,.4)", background: "rgba(0,230,150,.12)", color: "var(--c1)", cursor: "pointer", fontWeight: 700, transition: "all .15s" }}
          onMouseEnter={e => { e.target.style.background = "var(--c1)"; e.target.style.color = "#000"; }}
          onMouseLeave={e => { e.target.style.background = "rgba(0,230,150,.12)"; e.target.style.color = "var(--c1)"; }}
        >Sign up</button>
      </div>
    </nav>

    {/* ── HERO ── */}
    <div style={{
      display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
      minHeight: "calc(100vh - 62px)", borderBottom: "1px solid var(--bdr2)",
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", opacity: .5 }} />
      {[{ cls: "tl" }, { cls: "tr" }, { cls: "bl" }, { cls: "br" }].map(c => <div key={c.cls} className={`hero-corner ${c.cls}`} />)}

      {/* LEFT: text + CTA */}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "72px 60px 72px 72px", position: "relative", zIndex: 1 }}>

        <h1 style={{
          fontFamily: "var(--head)", fontSize: "clamp(32px,4vw,58px)", fontWeight: 800,
          lineHeight: 1.1, marginBottom: 20, letterSpacing: "1px",
          color: "var(--c1)"
        }}>
          Catch attackers<br />
          <span style={{ color: "var(--txt)", fontSize: "0.72em", letterSpacing: "3px", fontWeight: 600 }}>before they strike</span>
        </h1>

        <p style={{ fontFamily: "var(--sans)", fontSize: 17, color: "var(--txt2)", lineHeight: 1.75, marginBottom: 32, maxWidth: 500 }}>
          A multi-tenant honeypot intelligence platform. Every brute force, SQL injection, and credential guess is <strong style={{ color: "var(--txt)" }}>caught, classified by a self-retraining ML pipeline, and visualised live</strong> — built on three layers of parallel computing.
        </p>

        {/* CTA — Live Demo leads, since that's the one thing that needs zero setup */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 36 }}>
          <button onClick={onDemo} style={{
            fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, letterSpacing: "1px",
            padding: "12px 28px", borderRadius: 6, border: "1px solid #ff2d55",
            background: "#ff2d55", color: "#fff", cursor: "pointer", transition: "all .2s", display: "flex", alignItems: "center", gap: 8
          }}
            onMouseEnter={e => e.currentTarget.style.background = "transparent"}
            onMouseLeave={e => { e.currentTarget.style.background = "#ff2d55"; e.currentTarget.style.color = "#fff"; }}
          >
            ▶ Watch It Live — No Signup
          </button>
          <button onClick={() => window.open(REPO_URL, "_blank", "noopener")} style={{
            fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, letterSpacing: "1px",
            padding: "12px 28px", borderRadius: 6, border: "1px solid var(--bdr3)",
            background: "transparent", color: "var(--txt2)", cursor: "pointer", transition: "all .2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--c1)"; e.currentTarget.style.color = "var(--c1)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bdr3)"; e.currentTarget.style.color = "var(--txt2)"; }}
          >
            View Source ↗
          </button>
        </div>

        {/* Real engineering facts, not vanity metrics */}
        <div style={{ display: "flex", gap: 28, borderTop: "1px solid var(--bdr2)", paddingTop: 24, flexWrap: "wrap" }}>
          {[
            { v: count.hpc, l: "HPC Paradigms Combined", c: "var(--c2)" },
            { v: count.classes, l: "Attack Classes Detected", c: "var(--c4)" },
            { v: `${count.retrain}h`, l: "ML Auto-Retrain Cycle", c: "var(--c1)" },
            { v: "7.4x", l: "Speedup @ 8 Threads", c: "var(--c3)" },
          ].map(({ v, l, c }) => <div key={l}>
            <div style={{ fontFamily: "var(--head)", fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt3)", marginTop: 3, letterSpacing: "1.5px", textTransform: "uppercase" }}>{l}</div>
          </div>)}
        </div>
      </div>

      {/* RIGHT: the real battlefield, full-bleed so the fixed 900px canvas actually fits */}
      <div style={{
        display: "flex", flexDirection: "column",
        borderLeft: "1px solid var(--bdr2)", background: "var(--sur)",
        position: "relative", zIndex: 1, overflow: "hidden"
      }}>
        {/* window chrome */}
        <div style={{
          padding: "10px 16px", background: "var(--bg2)", borderBottom: "1px solid var(--bdr2)",
          fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt3)", letterSpacing: "2px",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0
        }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: 8 }}>live battlefield — try it</span>
          </div>
          <div className="live-chip"><div className="live-dot" />LIVE</div>
        </div>

        {/* battlefield — fixed compact height like the original, not stretched to fill the column */}
        <div style={{ height: 340, position: "relative", flexShrink: 0 }}>
          <LandingHeroBattlefield feed={heroSim.newBatch} />
        </div>

        {/* real mini feed — flexes to absorb remaining space so the button lands flush at the bottom */}
        <div style={{ borderTop: "1px solid var(--bdr2)", background: "var(--bg2)", padding: "10px 20px", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--txt3)", letterSpacing: "2px", marginBottom: 6, display: "flex", justifyContent: "space-between", flexShrink: 0 }}>
            <span>◉ RAID FEED</span>
            <span style={{ color: "var(--c1)" }}>live</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", overflowY: "auto" }}>
            {!heroSim.historyFeed.length && (
              <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt4)", padding: "8px 0" }}>Waiting for the first wave…</div>
            )}
            {heroSim.historyFeed.slice(0, 6).map((a, i) => (
              <div key={a.id || i} style={{ display: "flex", gap: 8, alignItems: "center", fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt3)", padding: "4px 0" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: a.threat_score >= 70 ? "var(--c2)" : a.threat_score >= 40 ? "var(--c3)" : "var(--c1)", flexShrink: 0 }} />
                <span style={{ color: "var(--c4)" }}>{a.attacker_ip}</span>
                <span>→ {a.service} [{a.attack_type}]</span>
                <span style={{ marginLeft: "auto" }}>{a.threat_score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* single clear CTA */}
        <div style={{ padding: "14px 20px", flexShrink: 0 }}>
          <button onClick={onDemo} style={{
            width: "100%", fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, letterSpacing: "1px",
            padding: "10px 16px", borderRadius: 6, border: "1px solid var(--c1)",
            background: "var(--c1)", color: "#000", cursor: "pointer", transition: "all .2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--c1)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "var(--c1)"; e.currentTarget.style.color = "#000"; }}
          >
            Open Full Demo — Fire Real Attacks →
          </button>
        </div>

        {/* sign-in path kept, subtle */}
        <div style={{ borderTop: "1px solid var(--bdr2)", padding: "8px 20px", textAlign: "center", flexShrink: 0 }}>
          <span onClick={onLogin} style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)", cursor: "pointer" }}>Have an account? Sign in →</span>
        </div>
      </div>
    </div>

    {/* ── TICKER ── */}
    <div className="ticker" style={{ background: "var(--bg2)", borderBottom: "1px solid var(--bdr2)" }}>
      <div className="ticker-inner">
        {[...TICKER_ITEMS, ...TICKER_ITEMS].map((t, i) => <div key={i} className="ticker-item"><span style={{ color: "var(--c1)" }}>◈</span>{t}</div>)}
      </div>
    </div>

    {/* ── FEATURES — reframed around engineering depth ── */}
    <div id="features" style={{ padding: "80px 72px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
      <div style={{ textAlign: "center", marginBottom: 56 }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--c1)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>◈ Under the Hood</div>
        <h2 style={{ fontFamily: "var(--head)", fontSize: "clamp(24px,3vw,40px)", fontWeight: 800, color: "var(--txt)", letterSpacing: "1px", marginBottom: 14 }}>Not just a honeypot — a systems project</h2>
        <p style={{ fontFamily: "var(--sans)", fontSize: 16, color: "var(--txt3)", maxWidth: 620, margin: "0 auto", lineHeight: 1.7 }}>
          Three concurrency paradigms, a self-retraining classifier, and a full DevOps chain — built and shipped solo.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 1, border: "1px solid var(--bdr2)", borderRadius: 10, overflow: "hidden" }}>
        {[
          { icon: "🧵", t: "Three-Layer HPC", d: "asyncio for concurrent I/O, threading for per-service isolation with a lock-free producer/consumer queue, multiprocessing for CPU-bound ML — benchmarked at 7.4x speedup with 8 threads across 700 simulated attackers.", c: "var(--c1)" },
          { icon: "🤖", t: "Self-Retraining ML", d: "Random Forest classifier separates brute force, SQLi, port scans, credential stuffing, and slow probes — auto-retrains every 24h and won't deploy a model that fails its accuracy gate.", c: "var(--c5)" },
          { icon: "🔐", t: "Real Multi-Tenancy", d: "JWT-scoped, row-level org isolation in Postgres. Argon2id password hashing with constant-time verification — no cross-org data leakage possible.", c: "var(--c2)" },
          { icon: "📡", t: "Live Battlefield", d: "A canvas-rendered visual of attacks moving toward honeypot nodes in real time, driven by an actual WebSocket event stream, not a polling hack.", c: "var(--c4)" },
          { icon: "🐳", t: "Full DevOps Chain", d: "One command deploys the entire stack via Docker Compose. GitHub Actions handles CI/CD; Prometheus and Grafana handle observability.", c: "var(--c3)" },
          { icon: "🪤", t: "Three Honeypot Traps", d: "Fake SSH, HTTP, FTP, and MySQL services with a deliberate tarpit delay to waste attacker time and extract more behavioral signal before they disconnect.", c: "var(--c1)" },
        ].map((f, i) => <div key={f.t} style={{
          background: "var(--sur)", padding: "32px 28px",
          borderRight: i % 3 !== 2 ? "1px solid var(--bdr2)" : "none",
          borderBottom: i < 3 ? "1px solid var(--bdr2)" : "none",
          transition: "background .2s", cursor: "default",
        }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--bg2)"}
          onMouseLeave={e => e.currentTarget.style.background = "var(--sur)"}
        >
          <div style={{ fontSize: 26, marginBottom: 14 }}>{f.icon}</div>
          <div style={{ fontFamily: "var(--head)", fontSize: 15, fontWeight: 700, marginBottom: 10, color: "var(--txt)", letterSpacing: ".3px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 3, height: 14, background: f.c, borderRadius: 2, display: "inline-block", flexShrink: 0 }} />
            {f.t}
          </div>
          <div style={{ fontFamily: "var(--sans)", fontSize: 14, color: "var(--txt3)", lineHeight: 1.65 }}>{f.d}</div>
        </div>)}
      </div>
    </div>

    {/* ── ARCHITECTURE — replaces the generic SaaS onboarding flow ── */}
    <div id="how" style={{ borderTop: "1px solid var(--bdr2)", background: "var(--sur)", padding: "80px 72px" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--c1)", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 12 }}>◉ Data Flow</div>
          <h2 style={{ fontFamily: "var(--head)", fontSize: "clamp(22px,2.8vw,36px)", fontWeight: 800, color: "var(--txt)", letterSpacing: "1px" }}>From attacker to dashboard, end to end</h2>
        </div>

        <div style={{ position: "relative", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 0 }}>
          <div style={{ position: "absolute", top: 28, left: "12.5%", right: "12.5%", height: 2, background: "linear-gradient(to right,var(--c1),var(--c4))", opacity: .35, zIndex: 0 }} />
          {[
            { n: "01", t: "Attacker Connects", d: "asyncio event loop accepts thousands of concurrent connections across SSH, HTTP, FTP, and DB traps.", icon: "🎯" },
            { n: "02", t: "Event Queue", d: "A thread-safe producer/consumer queue logs every payload, IP, and timestamp to PostgreSQL.", icon: "🧵" },
            { n: "03", t: "ML Classifies", d: "A ProcessPoolExecutor runs Random Forest inference — attack type identified in milliseconds.", icon: "🤖" },
            { n: "04", t: "Dashboard Updates", d: "Flask serves it over the API; React renders it live on the battlefield canvas via WebSocket.", icon: "📡" },
          ].map((s, i) => <div key={s.n} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "0 20px", position: "relative", zIndex: 1 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--bg)", border: "2px solid var(--c1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--head)", fontSize: 18, fontWeight: 800, color: "var(--c1)",
              marginBottom: 20, boxShadow: "0 0 20px rgba(0,230,150,.15)",
              flexShrink: 0
            }}>{s.icon}</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 9, color: "var(--c1)", letterSpacing: "2px", marginBottom: 6 }}>{s.n}</div>
            <div style={{ fontFamily: "var(--head)", fontSize: 14, fontWeight: 700, color: "var(--txt)", marginBottom: 8, letterSpacing: ".3px" }}>{s.t}</div>
            <div style={{ fontFamily: "var(--sans)", fontSize: 13, color: "var(--txt3)", lineHeight: 1.6 }}>{s.d}</div>
          </div>)}
        </div>
      </div>
    </div>

    {/* ── CTA BANNER ── */}
    <div style={{
      borderTop: "1px solid var(--bdr2)", borderBottom: "1px solid var(--bdr2)",
      background: "var(--bg)", padding: "72px 72px", textAlign: "center",
      position: "relative", overflow: "hidden"
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px)", backgroundSize: "36px 36px", opacity: .4, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 60% at 50% 50%,rgba(0,230,150,.06),transparent)", pointerEvents: "none" }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <h2 style={{ fontFamily: "var(--head)", fontSize: "clamp(24px,3.5vw,44px)", fontWeight: 800, color: "var(--c1)", marginBottom: 16, letterSpacing: "2px", lineHeight: 1.15 }}>
          See it catch attacks in real time
        </h2>
        <p style={{ fontFamily: "var(--sans)", fontSize: 17, color: "var(--txt2)", marginBottom: 32, maxWidth: 500, margin: "0 auto 32px" }}>
          No signup required for the demo. Full source is on GitHub if you want to see how it's built.
        </p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={onDemo} style={{
            fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, letterSpacing: "1.5px",
            padding: "14px 36px", borderRadius: 6, border: "1px solid #ff2d55",
            background: "#ff2d55", color: "#fff", cursor: "pointer", transition: "all .2s",
          }}
            onMouseEnter={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#ff2d55"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "#ff2d55"; e.currentTarget.style.color = "#fff"; }}
          >
            ▶ Watch It Live →
          </button>
          <button onClick={() => window.open(REPO_URL, "_blank", "noopener")} style={{
            fontFamily: "var(--mono)", fontSize: 13, fontWeight: 700, letterSpacing: "1.5px",
            padding: "14px 36px", borderRadius: 6, border: "1px solid var(--bdr3)",
            background: "transparent", color: "var(--txt3)", cursor: "pointer", transition: "all .2s"
          }}
            onMouseEnter={e => { e.currentTarget.style.color = "var(--c1)"; e.currentTarget.style.borderColor = "var(--c1b)"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "var(--txt3)"; e.currentTarget.style.borderColor = "var(--bdr3)"; }}
          >
            View Source ↗
          </button>
        </div>
      </div>
    </div>

    {/* ── FOOTER ── */}
    <footer style={{
      padding: "32px 72px", borderTop: "1px solid var(--bdr2)",
      background: "var(--sur)",
      display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16
    }}>
      <div style={{ fontFamily: "var(--head)", color: "var(--c1)", letterSpacing: "4px", fontSize: 14 }}>SNAPTRAP</div>
      <div style={{ display: "flex", gap: 24, fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)" }}>
        {[
          { l: "Features", fn: () => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" }) },
          { l: "Architecture", fn: () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }) },
          { l: "Live Demo", fn: onDemo },
          { l: "GitHub", fn: () => window.open(REPO_URL, "_blank", "noopener") },
          { l: "Login", fn: onLogin },
        ].map(({ l, fn }) => <span key={l} style={{ cursor: "pointer", transition: "color .15s" }}
          onMouseEnter={e => e.target.style.color = "var(--c1)"}
          onMouseLeave={e => e.target.style.color = "var(--txt4)"}
          onClick={fn}
        >{l}</span>)}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)" }}>
        Built by Zobiya · Honeypot Intelligence Platform
      </div>
    </footer>
  </div>;
}
export default Landing;