import React, { useEffect, useRef, useState } from "react";
import { api } from "../constants";
import { KB, SUGGESTED } from "./kb";
import { findAnswer, byId, wantsLiveStats, describeStats } from "./engine";
import { TOUR_STEPS } from "./steps";
import Tour from "./Tour";
import "./snappy.css";

const TOUR_KEY = "st_tour_v1";
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode etc. */ } },
};

// Original mascot: a little spring-trap with two jaws and eyes.
function Mascot({ size = 28 }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="3" y="6" width="26" height="14" fill="var(--acc)" />
    <path d="M3 20 L7 27 L11 20 L15 27 L19 20 L23 27 L27 20 L29 20 Z" fill="var(--acc)" />
    <rect x="9" y="10" width="4" height="4" fill="var(--on-acc)" />
    <rect x="19" y="10" width="4" height="4" fill="var(--on-acc)" />
  </svg>;
}

export default function Snappy({ mod, setMod }) {
  const [open, setOpen] = useState(false);
  const [tour, setTour] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const ctx = KB.some(e => e.mod === mod) ? mod : "general";

  // First visit: start the tour once any blocking dialog (e.g. the terms gate) is out of the way.
  useEffect(() => {
    if (store.get(TOUR_KEY)) return;
    let n = 0;
    const t = setInterval(() => {
      if (++n > 20) return clearInterval(t);
      if (!document.querySelector(".lg-ov")) { clearInterval(t); setTour(true); store.set(TOUR_KEY, "1"); }
    }, 700);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [msgs, busy]);

  const say = (from, text, chips) => setMsgs(m => [...m, { from, text, chips }]);
  const chipsFor = ids => (ids || []).map(byId).filter(Boolean);

  function greet() {
    if (msgs.length) return;
    say("bot", "Hi, I'm Snappy. Ask me about anything on this dashboard — or pick one below.",
      (SUGGESTED[ctx] || ["what", "tabs", "types"]).concat(["tour"]));
  }
  function toggle() { setOpen(o => { if (!o) greet(); return !o; }); }

  function startTour() { setOpen(false); setTour(true); store.set(TOUR_KEY, "1"); }

  async function ask(q, entry) {
    if (!q.trim()) return;
    say("me", q);
    setBusy(true);
    try {
      if (entry) return reply(entry);
      if (wantsLiveStats(q)) { say("bot", describeStats(await api("/attacks/stats")), ["stats", "threatlevel"]); return; }
      const hit = findAnswer(q, ctx);
      if (hit) return reply(hit);
      // Optional: a free-form LLM answer if the server has one configured (503 = not enabled).
      const d = await api("/assistant/query", { method: "POST", body: JSON.stringify({ question: q.slice(0, 500), module: ctx }) });
      if (d.answer) say("bot", d.answer, []);
      else say("bot", "I don't have an answer for that yet. Try one of these:", (SUGGESTED[ctx] || ["what", "tabs"]).concat(["what"]));
    } finally { setBusy(false); }
  }
  function reply(e) {
    if (e.a === "__TOUR__") { startTour(); return; }
    say("bot", e.a, e.next);
  }
  function submit() { const q = text; setText(""); ask(q); }

  return <>
    {tour && <Tour steps={TOUR_STEPS} setMod={setMod} onClose={() => setTour(false)} />}

    {open && <div className="sn-panel" role="dialog" aria-label="Snappy assistant">
      <div className="sn-head">
        <Mascot size={22} /><strong>Snappy</strong><span className="sn-sub">dashboard guide</span>
        <button className="sn-x" onClick={() => setOpen(false)} aria-label="Close">×</button>
      </div>
      <div className="sn-msgs">
        {msgs.map((m, i) => <div key={i} className={`sn-m ${m.from}`}>
          <div className="sn-b">{m.text}</div>
          {m.chips && m.chips.length > 0 && <div className="sn-chips">
            {chipsFor(m.chips).map(c => <button key={c.id} className="sn-chip" onClick={() => ask(c.title, c)}>{c.title}</button>)}
          </div>}
        </div>)}
        {busy && <div className="sn-m bot"><div className="sn-b sn-dots">…</div></div>}
        <div ref={endRef} />
      </div>
      <div className="sn-in">
        <input className="inp" value={text} maxLength={500} placeholder="Ask about the dashboard…"
          onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} aria-label="Ask Snappy" />
        <button className="btn btn-1 solid" onClick={submit} disabled={!text.trim() || busy}>Ask</button>
      </div>
    </div>}

    <button className="sn-fab" onClick={toggle} aria-label={open ? "Close Snappy" : "Open Snappy, the dashboard guide"} title="Snappy">
      <Mascot />
    </button>
  </>;
}
