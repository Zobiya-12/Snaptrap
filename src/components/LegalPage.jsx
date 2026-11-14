import React, { useEffect, useState } from "react";
import { TERMS, PRIVACY, TERMS_VERSION } from "../legal/legalContent";
import "../legal/legal.css";


function Section({ s }) {
  return <>
    <h3>{s.title}</h3>
    {s.body && s.body.map((p, i) => <p key={i}>{p}</p>)}
    {s.list && <ul>{s.list.map((li, i) => <li key={i}>{li}</li>)}</ul>}
  </>;
}

/* Full-screen overlay. Render it anywhere: <LegalPage tab="terms" onClose={...}/>.
   It is an overlay (not a route) so the signup form underneath keeps its state. */
export default function LegalPage({ tab = "terms", onClose }) {
  const [t, setT] = useState(tab);
  useEffect(() => {
    const k = e => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  return <div className="lg-ov" role="dialog" aria-modal="true" aria-label="Legal" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <div className="lg-box">
      <div className="lg-head">
        <div className="eyebrow" style={{ margin: 0 }}>Legal</div>
        <span className="lg-ver">Version {TERMS_VERSION}</span>
        <button className="lg-x" onClick={onClose} aria-label="Close">×</button>
      </div>
      <div className="lg-tabs">
        <button className={`lg-tab ${t === "terms" ? "on" : ""}`} onClick={() => setT("terms")}>Terms &amp; Conditions</button>
        <button className={`lg-tab ${t === "privacy" ? "on" : ""}`} onClick={() => setT("privacy")}>Privacy Notice</button>
      </div>
      <div className="lg-body">
        {(t === "terms" ? TERMS : PRIVACY).map(s => <Section key={s.id} s={s} />)}
      </div>
    </div>
  </div>;
}
