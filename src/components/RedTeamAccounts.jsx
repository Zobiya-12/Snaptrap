import React, { useState, useEffect } from "react";
import { api } from "../constants";
import { PWBar } from "./shared";

/* Create / list / delete the Red Team logins that belong to this organisation.
   Red Team users sign in on the "Red Team" tab of the login page with the email + password set here. */
export default function RedTeamAccounts() {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);

  const load = () => api("/redteam").then(d => setList(Array.isArray(d) ? d : []));
  useEffect(() => { load(); }, []);

  async function create() {
    setMsg(""); setErr("");
    if (!f.name.trim() || !f.email.trim() || !f.password) { setErr("Name, email and password are required"); return; }
    setBusy(true);
    const d = await api("/redteam", { method: "POST", body: JSON.stringify(f) });
    setBusy(false);
    if (d.redteam_id) { setMsg(`Created ${d.email}. They can sign in on the Red Team tab.`); setF({ name: "", email: "", password: "" }); load(); }
    else setErr(d.error || "Could not create the account");
  }
  async function remove(r) {
    if (!window.confirm(`Delete Red Team account ${r.email}?`)) return;
    const d = await api(`/redteam/${r.id}`, { method: "DELETE" });
    if (d.error) setErr(d.error); else load();
  }

  return <div className="acc-section">
    <div className="acc-head">Red Team accounts</div>
    <div className="acc-body">
      <div style={{ fontSize: 12, color: "var(--txt3)", marginBottom: 12 }}>
        Logins for people who run attack simulations against your organisation. They sign in on the <b>Red Team</b> tab.
      </div>
      {list === null ? <div style={{ color: "var(--txt4)", fontSize: 12 }}>Loading…</div>
        : !list.length ? <div style={{ color: "var(--txt4)", fontSize: 12, marginBottom: 12 }}>No Red Team accounts yet.</div>
        : <div style={{ marginBottom: 14 }}>
            {list.map(r => <div key={r.id} className="acc-row">
              <span className="acc-lk">{r.name}</span>
              <span className="acc-rv" style={{ flex: 1 }}>{r.email} · {r.run_count} run{+r.run_count === 1 ? "" : "s"}</span>
              <button className="btn btn-2" onClick={() => remove(r)}>Delete</button>
            </div>)}
          </div>}
      <div className="afield"><label className="lbl">Name</label>
        <input className="inp" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="e.g. Red Team Alpha" /></div>
      <div className="afield"><label className="lbl">Email</label>
        <input className="inp" type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="redteam@yourorg.com" /></div>
      <div className="afield"><label className="lbl">Password</label>
        <input className="inp" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="12+ chars, upper, lower, digit, symbol" />
        <PWBar pw={f.password} /></div>
      {err && <div style={{ color: "var(--c2)", fontSize: 12, margin: "6px 0" }}>{err}</div>}
      {msg && <div style={{ color: "var(--c1)", fontSize: 12, margin: "6px 0" }}>{msg}</div>}
      <button className="btn btn-1 solid" disabled={busy} onClick={create}>{busy ? "Creating…" : "Create Red Team account"}</button>
    </div>
  </div>;
}
