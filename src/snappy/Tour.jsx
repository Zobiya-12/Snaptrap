import React, { useEffect, useRef, useState, useCallback } from "react";
import "./snappy.css";

/* Spotlight tour. Dims the page, outlines the target and shows a card next to it.
   Esc closes, ←/→ move. Works even if a target is missing (card is centred). */
export default function Tour({ steps, setMod, onClose }) {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);
  const elRef = useRef(null);
  const step = steps[i];

  const measure = useCallback(() => {
    const el = elRef.current;
    setRect(el && document.contains(el) ? el.getBoundingClientRect() : null);
  }, []);

  useEffect(() => {
    elRef.current = null; setRect(null);
    if (step.mod) setMod(step.mod);
    if (!step.sel && !step.find) return;
    let tries = 0, timer;
    const look = () => {
      const el = step.find ? step.find() : document.querySelector(step.sel);
      if (el) {
        elRef.current = el;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
        setTimeout(measure, 350);
      } else if (++tries < 20) timer = setTimeout(look, 150);   // tab content may still be loading
    };
    timer = setTimeout(look, 120);
    return () => clearTimeout(timer);
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const key = e => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI(n => Math.min(n + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setI(n => Math.max(n - 1, 0));
    };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [measure, onClose, steps.length]);

  const last = i === steps.length - 1;
  const pad = 6;
  let cardStyle = { left: "50%", top: "50%", transform: "translate(-50%,-50%)" };
  if (rect) {
    const w = Math.min(340, window.innerWidth - 24);
    const below = rect.bottom + 200 < window.innerHeight;
    cardStyle = {
      width: w,
      left: Math.max(12, Math.min(rect.left, window.innerWidth - w - 12)),
      top: below ? Math.min(rect.bottom + 14, window.innerHeight - 190) : Math.max(12, rect.top - 190),
    };
  }

  return <div className="tr-root" role="dialog" aria-label="Dashboard tour">
    {rect
      ? <div className="tr-hole" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      : <div className="tr-dim" />}
    <div className="tr-card" style={cardStyle}>
      <div className="tr-step">Step {i + 1} of {steps.length}</div>
      <div className="tr-title">{step.title}</div>
      <div className="tr-body">{step.body}</div>
      <div className="tr-actions">
        <button className="btn btn-ghost" onClick={onClose}>Skip</button>
        <span style={{ flex: 1 }} />
        {i > 0 && <button className="btn btn-4" onClick={() => setI(i - 1)}>Back</button>}
        <button className="btn btn-1 solid" onClick={() => last ? onClose() : setI(i + 1)}>{last ? "Done" : "Next"}</button>
      </div>
    </div>
  </div>;
}
