import React, { useEffect, useRef, useState } from "react";
import { api } from "../constants";
import { KB, SUGGESTED } from "./kb";
import { matchAnswer, byId, wantsLiveStats, describeStats } from "./engine";
import { TOUR_STEPS } from "./steps";
import Tour from "./Tour";
import "./snappy.css";

const TOUR_KEY = "st_tour_v1";
const store = {
  get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private mode etc. */ } },
};

// ── Snappy's icon ─────────────────────────────────────────────────────────────
// Four image files in /public/snappy/ (transparent png/svg/webp, same size):
//   snappy.png / snappy-hover.png            light theme: the plain picture (resting / hover)
//   snappy-dark.png / snappy-hover-dark.png  dark theme: the same picture with its sticker outline baked in
// To change the icon replace those files (same names) or edit the paths below. snappy.css shows the
// right pair for the current theme and swaps resting <-> hover on :hover / keyboard focus.
const P = process.env.PUBLIC_URL || "";
const ICON_STATIC = `${P}/snappy/snappy.png`;
const ICON_HOVER  = `${P}/snappy/snappy-hover.png`;
const ICON_STATIC_DARK = `${P}/snappy/snappy-dark.png`;
const ICON_HOVER_DARK  = `${P}/snappy/snappy-hover-dark.png`;

// Built-in fallback (only shown if an icon file fails to load).
function Mascot({ size = 28 }) {
  return <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect x="3" y="6" width="26" height="14" fill="var(--acc)" />
    <path d="M3 20 L7 27 L11 20 L15 27 L19 20 L23 27 L27 20 L29 20 Z" fill="var(--acc)" />
    <rect x="9" y="10" width="4" height="4" fill="var(--on-acc)" />
    <rect x="19" y="10" width="4" height="4" fill="var(--on-acc)" />
  </svg>;
}

// hover=false: only the resting pictures are used (e.g. the small icon in the panel header).
function SnappyIcon({ size = 36, hover = true }) {
  const [broken, setBroken] = useState(false);
  if (broken) return <Mascot size={Math.round(size * 0.8)} />;
  const img = (cls, src) => <img className={cls} src={src} alt="" draggable={false} onError={() => setBroken(true)} />;
  return <span className={`sn-ico${hover ? " sn-ico-swap" : ""}`} style={{ width: size, height: size }} aria-hidden="true">
    {img("sn-l sn-s", ICON_STATIC)}
    {img("sn-d sn-s", ICON_STATIC_DARK)}
    {hover && img("sn-l sn-h", ICON_HOVER)}
    {hover && img("sn-d sn-h", ICON_HOVER_DARK)}
  </span>;
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
      const m = matchAnswer(q, ctx);
      if (m && m.strong) return reply(m.entry);
      // Not clearly about the dashboard: try the free-form AI if the server has one (503 = not enabled).
      const d = await api("/assistant/query", { method: "POST", body: JSON.stringify({ question: q.slice(0, 500), module: ctx }) });
      const more = (SUGGESTED[ctx] || ["what", "tabs"]).concat(["what"]);
      if (d.answer) say("bot", d.answer, []);
      else if (m) say("bot", "I'm not sure that's what you meant, but this is the closest topic I know:\n\n" + m.entry.a, m.entry.next);
      else if (d.code === "assistant_disabled") say("bot", "That's outside what I can answer from the dashboard guide (my free-form AI mode isn't switched on for this server). Try one of these:", more);
      else if (d.code === "rate_limited") say("bot", "I've answered a lot of questions this hour — try again a bit later. These topics still work:", more);
      else if (d.code === "assistant_unavailable") say("bot", `The AI service didn't answer (reason: ${d.reason || "unknown"}). I can still help with these:`, more);
      else say("bot", "I don't have an answer for that yet. Try one of these:", more);
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
        <SnappyIcon size={24} hover={false} /><strong>Snappy</strong><span className="sn-sub">dashboard guide</span>
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
      <SnappyIcon size={52} />
    </button>
  </>;
}
