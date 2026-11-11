import { api, pwStr, isPasswordStrong } from "../constants";
import { PWBar } from "./shared";
import React, { useState, useEffect } from 'react';
import { TERMS_VERSION, DATA_USE_SUMMARY } from "../legal/legalContent";
import "../legal/legal.css";

/* ═══════════════════════════════════════════════════════════
   AUTH — sign in / sign up
   Editorial layout matching the landing page: serif headline,
   § kicker, hairline card, uppercase tracked labels.
   Light (cream) + dark via tokens.
═══════════════════════════════════════════════════════════ */
function Auth({ onLogin, onBack, onTheme, theme, initialMode = "login", onLegal = () => {}, notice = "" }) {
  const [tab, setTab] = useState("org");        // org | red | admin
  const [mode, setMode] = useState(initialMode); // login | signup (org only)

  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false);
  const [rtEmail, setRtEmail] = useState(""); const [rtPass, setRtPass] = useState("");
  const [rtErr, setRtErr] = useState(""); const [rtBusy, setRtBusy] = useState(false);
  const [sName, setSName] = useState(""); const [sEmail, setSEmail] = useState("");
  const [sPass, setSPass] = useState(""); const [sPass2, setSPass2] = useState("");
  const [sErr, setSErr] = useState(""); const [sOk, setSOk] = useState(""); const [sBusy, setSBusy] = useState(false);
  const [sAgree, setSAgree] = useState(false); const [sOptOut, setSOptOut] = useState(false);
  const [pending, setPending] = useState(null);      // email awaiting verification (after signup)
  const [unverified, setUnverified] = useState(""); // login blocked: email not verified yet
  const [resendMsg, setResendMsg] = useState(""); const [cooldown, setCooldown] = useState(0);
  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);
  const str = pwStr(sPass);
  const { ok: pwOk, issues: pwIssues } = typeof isPasswordStrong === "function" ? isPasswordStrong(sPass) : { ok: str.s >= 3, issues: [] };

  function switchTab(t) { setTab(t); setErr(""); setRtErr(""); }

  async function resend(addr) {
    setResendMsg("");
    const d = await api("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email: addr }) });
    setResendMsg(d.error || "If that account is waiting for verification, a new link is on its way.");
    setCooldown(60);
  }
  async function doLogin() {
    setBusy(true); setErr(""); setUnverified(""); setResendMsg("");
    const d = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password: pass }) });
    if (d.token) { localStorage.setItem("st_token", d.token); onLogin(d); }
    else {
      if (d.code === "email_not_verified") setUnverified(d.email || email);
      setErr(d.error || "Login failed"); setBusy(false);
    }
  }
  async function doRedLogin() {
    setRtBusy(true); setRtErr("");
    const d = await api("/auth/login", { method: "POST", body: JSON.stringify({ email: rtEmail, password: rtPass }) });
    if (d.token && d.role === "redteam") { localStorage.setItem("st_token", d.token); onLogin(d); }
    else if (d.token) { setRtErr("This account is not a Red Team account"); setRtBusy(false); }
    else { setRtErr(d.error || "Login failed"); setRtBusy(false); }
  }
  async function doSignup() {
    if (!sName.trim()) { setSErr("Organisation name required"); return; }
    if (!pwOk) { setSErr("Password needs: " + pwIssues.join(", ")); return; }
    if (sPass !== sPass2) { setSErr("Passwords do not match"); return; }
    if (!sAgree) { setSErr("Please accept the Terms & Conditions to continue"); return; }
    setSBusy(true); setSErr(""); setSOk("");
    const d = await api("/auth/signup", { method: "POST", body: JSON.stringify({
      email: sEmail, password: sPass, name: sName,
      accept_terms: true, terms_version: TERMS_VERSION, training_opt_out: sOptOut }) });
    if (d.verification_required) {
      setPending(sEmail); setResendMsg(d.mail_sent === false ? "We couldn't send the email just now — use “Resend” below." : ""); setCooldown(60);
    } else if (d.org_id || d.token) {
      setSOk("Account created! Please sign in.");
      setTimeout(() => { setMode("login"); setEmail(sEmail); setPass(""); setSOk(""); }, 2000);
    } else { setSErr(d.error || "Registration failed"); }
    setSBusy(false);
  }

  const TABS = [
    { id: "org", cls: "", label: "Organisation" },
    { id: "red", cls: "t-red", label: "Red Team" },
    { id: "admin", cls: "t-admin", label: "Superadmin" },
  ];
  const signup = mode === "signup" && tab === "org";

  return <div className="au">
    <nav className="au-nav">
      <div className="logo">Snap<em>trap</em></div>
      <div className="tb-div" />
      {onBack && <button className="au-back" onClick={onBack}>← Back to landing</button>}
      <div className="tb-r">
        <button className="theme-btn" onClick={onTheme} title="Toggle theme" aria-label="Toggle theme">{theme === "dark" ? "☀" : "☾"}</button>
      </div>
    </nav>

    <div className="au-main">
      {/* ── LEFT: editorial copy ── */}
      <div className="au-left">
        <div>
          <div className="eyebrow">{signup ? "Create account" : "Secure sign in"}</div>
          <h1 className="au-h1">{signup ? <>Leave the door open. <em>See who walks in.</em></> : <>Catch attackers <em>before</em> they strike.</>}</h1>
          <p className="au-p">
            {signup
              ? <>Register your organisation and deploy agents in minutes. Every brute force, SQL injection and credential guess is <strong>caught, classified and plotted live</strong>.</>
              : <>Sign in to your dashboard. Attacks are <strong>caught, classified by a self-retraining model and plotted live</strong> — built on three layers of parallel computing.</>}
          </p>
        </div>
        <div className="au-facts">
          {[
            { v: "3", l: "HPC paradigms combined" },
            { v: "5", l: "Attack classes detected" },
            { v: "24h", l: "ML auto-retrain cycle" },
            { v: "7.4×", l: "Speedup at 8 threads" },
          ].map(({ v, l }) => <div key={l}>
            <div className="au-fact-v">{v}</div>
            <div className="au-fact-l">{l}</div>
          </div>)}
        </div>
      </div>

      {/* ── RIGHT: form card ── */}
      <div className="au-right">
        <div className="au-card" data-tab={tab}>
          <div className="au-card-top">
            <span>Secure session — JWT HS256</span>
            <span className="live-chip"><span className="live-dot" />Online</span>
          </div>

          <div className="au-tabs">
            {TABS.map(t => <button key={t.id} className={`au-tab ${t.cls} ${tab === t.id ? "on" : ""}`} onClick={() => switchTab(t.id)}>{t.label}</button>)}
          </div>

          <div className="au-body">

            {tab === "org" && <>
              <div className="au-seg">
                <button className={mode === "login" ? "on" : ""} onClick={() => setMode("login")}>Sign in</button>
                <button className={mode === "signup" ? "on" : ""} onClick={() => setMode("signup")}>Sign up</button>
              </div>
              {mode === "login" ? <>
                <div className="au-role">Org analyst / admin</div>
                <div className="afield"><label className="lbl">Email</label><input className="inp" value={email} onChange={e => setEmail(e.target.value)} placeholder="analyst@yourorg.com" /></div>
                <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" /></div>
                <button className="abtn" onClick={doLogin} disabled={busy}>{busy ? "Authenticating…" : "Access dashboard →"}</button>
                {notice && !err && <div className="aok">✓ {notice}</div>}
                {err && <div className="aerr">⚠ {err}</div>}
                {unverified && <div style={{ marginTop: 10 }}>
                  <button className="btn btn-4" disabled={cooldown > 0} onClick={() => resend(unverified)}>
                    {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend verification email"}
                  </button>
                  {resendMsg && <div className="acc-note" style={{ marginTop: 8, fontSize: 11 }}>{resendMsg}</div>}
                </div>}
                <div className="au-links">
                  <span>Forgot password?</span>
                  <button className="au-link" onClick={() => setMode("signup")}>Register organisation →</button>
                </div>
              </> : pending ? <div className="au-pending">
                <div className="au-role">Almost there</div>
                <h2>Check your inbox</h2>
                <p>We sent a verification link to <strong>{pending}</strong>. Open it to activate your account (it expires in 24 hours). Check spam if you don’t see it.</p>
                <button className="btn btn-4" disabled={cooldown > 0} onClick={() => resend(pending)}>
                  {cooldown > 0 ? `Resend email (${cooldown}s)` : "Resend email"}
                </button>
                {resendMsg && <div className="acc-note" style={{ marginTop: 10, fontSize: 11 }}>{resendMsg}</div>}
                <div className="au-links">
                  <button className="au-link muted" onClick={() => { setPending(null); setMode("login"); setEmail(pending); }}>← Back to sign in</button>
                </div>
              </div> : <>
                <div className="au-role">New organisation</div>
                <div className="afield"><label className="lbl">Organisation name</label><input className="inp" placeholder="Your company or project name" value={sName} onChange={e => setSName(e.target.value)} /></div>
                <div className="afield"><label className="lbl">Email</label><input className="inp" placeholder="you@example.com" value={sEmail} onChange={e => setSEmail(e.target.value)} /></div>
                <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" placeholder="12+ chars, upper, lower, number, symbol" value={sPass} onChange={e => setSPass(e.target.value)} /><PWBar pw={sPass} /></div>
                <div className="afield"><label className="lbl">Confirm password</label><input className="inp" type="password" value={sPass2} onChange={e => setSPass2(e.target.value)} onKeyDown={e => e.key === "Enter" && doSignup()} />{sPass2 && <div style={{ fontSize: 10, marginTop: 4, letterSpacing: ".12em", textTransform: "uppercase", color: sPass === sPass2 ? "var(--c1)" : "var(--c2)" }}>{sPass === sPass2 ? "✓ Match" : "✗ No match"}</div>}</div>
                <div className="lg-sum" style={{ marginBottom: 10 }}><strong>How your data is used</strong><ul>{DATA_USE_SUMMARY.map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                <div className="lg-consent">
                  <label className="lg-check"><input type="checkbox" checked={sAgree} onChange={e => setSAgree(e.target.checked)} />
                    <span>I agree to the <button type="button" className="lg-link" onClick={() => onLegal("terms")}>Terms &amp; Conditions</button> and <button type="button" className="lg-link" onClick={() => onLegal("privacy")}>Privacy Notice</button>.</span></label>
                  <label className="lg-check"><input type="checkbox" checked={sOptOut} onChange={e => setSOptOut(e.target.checked)} />
                    <span>Don’t use my organisation’s telemetry to train shared models (optional).</span></label>
                </div>
                <button className="abtn" onClick={doSignup} disabled={sBusy || !sEmail || !pwOk || !sAgree}>{sBusy ? "Creating…" : "Create account →"}</button>
                {sErr && <div className="aerr">⚠ {sErr}</div>}
                {sOk && <div className="aok">✓ {sOk}</div>}
                <div className="au-links">
                  <button className="au-link muted" onClick={() => setMode("login")}>← Back to sign in</button>
                </div>
              </>}
            </>}

            {tab === "red" && <>
              <div className="au-role" style={{ color: "var(--c2)" }}>Red team operator</div>
              <div className="au-warn">
                <strong>⚠ Authorized personnel only</strong>
                Red team access is restricted to approved security testers. All sessions are logged and monitored.
              </div>
              <div className="afield"><label className="lbl">Operator email</label><input className="inp" value={rtEmail} onChange={e => setRtEmail(e.target.value)} placeholder="operator@redteam.io" autoComplete="off" /></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={rtPass} onChange={e => setRtPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doRedLogin()} placeholder="••••••••" autoComplete="off" /></div>
              <button className="abtn" onClick={doRedLogin} disabled={rtBusy}>{rtBusy ? "Authenticating…" : "Enter red team ops →"}</button>
              {rtErr && <div className="aerr">⚠ {rtErr}</div>}
            </>}

            {tab === "admin" && <>
              <div className="au-role" style={{ color: "var(--c3)" }}>Superadmin — global access</div>
              <div className="afield"><label className="lbl">Admin email</label><input className="inp" value={email} onChange={e => setEmail(e.target.value)} placeholder="Admin Account" autoComplete="off" /></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && doLogin()} placeholder="••••••••" autoComplete="off" /></div>
              <button className="abtn" onClick={doLogin} disabled={busy}>{busy ? "Authenticating…" : "Enter superadmin →"}</button>
              {err && <div className="aerr">⚠ {err}</div>}
            </>}

          </div>
        </div>

        <div className="au-strip">
          <span>JWT // HS256</span><span>TLS 1.3</span><span>Snaptrap v2.1</span>
        </div>
      </div>
    </div>
  </div>;
}
export default Auth;
