import React, { useEffect, useRef, useState, useCallback } from "react";
import "./snappy.css";

/* Spotlight tour. Dims the page, outlines the target and docks the card in whichever screen corner
   covers the target least (never in the middle, and it doesn't move while you read).
   Esc closes, left/right arrows move. If a target can't be found the step is shown without a spotlight. */
const M = 16, FAB = 92, CARD_H = 210, PAD = 6;   // FAB: keep clear of the Snappy button in the bottom-right

function pickCorner(rect) {
  const W = window.innerWidth, H = window.innerHeight, w = Math.min(340, W - 24);
  const cands = [   // first = preferred when several corners are equally free
    { style: { left: M, bottom: M },   l: M,         t: H - CARD_H - M },
    { style: { right: M, bottom: FAB }, l: W - w - M, t: H - CARD_H - FAB },
    { style: { left: M, top: M },      l: M,         t: M },
    { style: { right: M, top: M },     l: W - w - M, t: M },
  ];
  if (!rect) return cands[0].style;
  let best = cands[0], bestOverlap = Infinity;
  for (const c of cands) {
    const ox = Math.max(0, Math.min(c.l + w, rect.left + rect.width + PAD) - Math.max(c.l, rect.left - PAD));
    const oy = Math.max(0, Math.min(c.t + CARD_H, rect.top + rect.height + PAD) - Math.max(c.t, rect.top - PAD));
    if (ox * oy < bestOverlap) { best = c; bestOverlap = ox * oy; }
  }
  return best.style;
}

const same = (a, b) => a && b && Math.abs(a.left - b.left) < 1 && Math.abs(a.top - b.top) < 1 &&
  Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1;
const box = r => ({ left: r.left, top: r.top, width: r.width, height: r.height });

export default function Tour({ steps, setMod, onClose }) {
  const [i, setI] = useState(0);
  // One state object tagged with the step it belongs to: on the render right after "Next" the old step's
  // spotlight/corner is ignored, so the new card never flashes at the previous position.
  const [view, setView] = useState({ i: -1, rect: null, corner: null });
  const elRef = useRef(null);
  const raf = useRef(0);
  const step = steps[i];

  const measure = useCallback(() => {            // cheap: runs at most once per frame, only re-renders if it moved
    raf.current = 0;
    const el = elRef.current;
    if (!el || !document.contains(el)) return;
    const r = box(el.getBoundingClientRect());
    setView(v => (v.rect && same(v.rect, r) ? v : { ...v, rect: r }));
  }, []);
  const schedule = useCallback(() => { if (!raf.current) raf.current = requestAnimationFrame(measure); }, [measure]);

  useEffect(() => {
    let cancelled = false, tries = 0, timer;
    elRef.current = null;
    const targeted = !!(step.sel || step.find);
    if (step.mod) setMod(step.mod);
    if (!targeted) { setView({ i, rect: null, corner: pickCorner(null) }); return; }
    const look = () => {
      if (cancelled) return;
      const el = step.find ? step.find() : document.querySelector(step.sel);
      if (el) {
        elRef.current = el;
        el.scrollIntoView({ block: "nearest" });                 // instant: smooth scrolling made the card chase the target
        requestAnimationFrame(() => {
          if (cancelled) return;
          const r = box(el.getBoundingClientRect());
          setView({ i, rect: r, corner: pickCorner(r) });
        });
      } else if (++tries < 25) timer = setTimeout(look, 120);    // tab content may still be loading
      else setView({ i, rect: null, corner: pickCorner(null) });                        // give up: card without a spotlight
    };
    // another tab has to mount first; on the same tab the element is already there
    timer = setTimeout(look, steps[i - 1]?.mod === step.mod ? 0 : 140);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI(n => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI(n => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, true);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule, true);
      cancelAnimationFrame(raf.current);
    };
  }, [schedule, onClose, steps.length]);

  const ready = view.i === i;
  const rect = view.rect, corner = ready ? view.corner : null;   // spotlight may linger a moment; the card waits
  const last = i === steps.length - 1;
  return <div className="tr-root" role="dialog" aria-label="Dashboard tour">
    {rect
      ? <div className="tr-hole" style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      : <div className="tr-dim" />}
    {corner && <div className="tr-card" key={i} style={corner}>
      <div className="tr-step">Step {i + 1} of {steps.length}</div>
      <div className="tr-title">{step.title}</div>
      <div className="tr-body">{step.body}</div>
      <div className="tr-actions">
        <button className="btn btn-ghost" onClick={onClose}>Skip</button>
        <span style={{ flex: 1 }} />
        {i > 0 && <button className="btn btn-4" onClick={() => setI(i - 1)}>Back</button>}
        <button className="btn btn-1 solid" onClick={() => last ? onClose() : setI(i + 1)}>{last ? "Done" : "Next"}</button>
      </div>
    </div>}
  </div>;
}
