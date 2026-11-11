import React, { useEffect, useState } from "react";
import { api } from "../constants";
import { TERMS_VERSION, DATA_USE_SUMMARY } from "../legal/legalContent";
import LegalPage from "./LegalPage";
import "../legal/legal.css";

/* Shown to a signed-in org that hasn't accepted the CURRENT terms version (existing accounts that
   pre-date the terms, or after TERMS_VERSION is bumped). Blocks the dashboard until accepted. */
export default function TermsGate({ onLogout }) {
  const [need, setNeed] = useState(false);
  const [agree, setAgree] = useState(false);
  const [optOut, setOptOut] = useState(false);
  const [legal, setLegal] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/control/info").then(d => { if (d && !d.error) setNeed(d.terms_version !== TERMS_VERSION); });
  }, []);

  async function accept() {
    setBusy(true); setErr("");
    const d = await api("/auth/accept-terms", { method: "POST", body: JSON.stringify({ terms_version: TERMS_VERSION, training_opt_out: optOut }) });
    if (d.ok) setNeed(false);
    else setErr(d.error || "Could not save — try again");
    setBusy(false);
  }

  if (!need) return null;
  return <>
    <div className="lg-ov" role="dialog" aria-modal="true" aria-label="Accept terms">
      <div className="lg-box" style={{ width: "min(560px,100%)" }}>
        <div className="lg-head"><div className="eyebrow" style={{ margin: 0 }}>Updated terms</div><span className="lg-ver">Version {TERMS_VERSION}</span></div>
        <div className="lg-body">
          <p>Please review and accept the Terms &amp; Conditions and Privacy Notice to keep using SNAPTRAP.</p>
          <div className="lg-sum"><strong>In short</strong><ul>{DATA_USE_SUMMARY.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
          <div className="lg-consent">
            <label className="lg-check"><input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
              <span>I agree to the <button className="lg-link" onClick={() => setLegal("terms")}>Terms &amp; Conditions</button> and <button className="lg-link" onClick={() => setLegal("privacy")}>Privacy Notice</button>.</span></label>
            <label className="lg-check"><input type="checkbox" checked={optOut} onChange={e => setOptOut(e.target.checked)} />
              <span>Don’t use my organisation’s telemetry to train shared models (optional).</span></label>
          </div>
          {err && <div className="aerr" style={{ marginBottom: 10 }}>⚠ {err}</div>}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button className="abtn" style={{ flex: 1 }} disabled={!agree || busy} onClick={accept}>{busy ? "Saving…" : "Accept and continue →"}</button>
            <button className="btn btn-2" onClick={onLogout}>Log out</button>
          </div>
        </div>
      </div>
    </div>
    {legal && <LegalPage tab={legal} onClose={() => setLegal(null)} />}
  </>;
}
