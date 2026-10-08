import { api, pwStr, isPasswordStrong } from "../constants";
import {PWBar} from "./shared";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function Auth({onLogin, onBack, initialMode="login"}){
  const [tab,setTab]=useState("org"); // org | red | admin
  const [mode,setMode]=useState(initialMode); // login | signup (org only)

  // org/admin login state
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  const [err,setErr]=useState("");const [busy,setBusy]=useState(false);
  // red team login state
  const [rtEmail,setRtEmail]=useState("");const [rtPass,setRtPass]=useState("");
  const [rtErr,setRtErr]=useState("");const [rtBusy,setRtBusy]=useState(false);
  // signup state
  const [sName,setSName]=useState("");const [sEmail,setSEmail]=useState("");
  const [sPass,setSPass]=useState("");const [sPass2,setSPass2]=useState("");
  const [sErr,setSErr]=useState("");const [sOk,setSOk]=useState("");const [sBusy,setSBusy]=useState(false);
  const str=pwStr(sPass);
  // isPasswordStrong imported from constants — enforces 12-char Argon2-grade rules
  const { ok: pwOk, issues: pwIssues } = typeof isPasswordStrong === "function" ? isPasswordStrong(sPass) : {ok:str.s>=3,issues:[]};

  function switchTab(t){setTab(t);setErr("");setRtErr("");}

  async function doLogin(){
    setBusy(true);setErr("");
    const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email,password:pass})});
    if(d.token){localStorage.setItem("st_token",d.token);onLogin(d);}
    else{setErr(d.error||"Login failed");setBusy(false);}
  }
  async function doRedLogin(){
    setRtBusy(true);setRtErr("");
    const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:rtEmail,password:rtPass})});
    if(d.token&&d.role==="redteam"){localStorage.setItem("st_token",d.token);onLogin(d);}
    else if(d.token){setRtErr("This account is not a Red Team account");setRtBusy(false);}
    else{setRtErr(d.error||"Login failed");setRtBusy(false);}
  }
  async function doSignup(){
    if(!sName.trim()){setSErr("Organisation name required");return;}
    if(!pwOk){setSErr("Password needs: " + pwIssues.join(", "));return;}
    if(sPass!==sPass2){setSErr("Passwords do not match");return;}
    setSBusy(true);setSErr("");setSOk("");
    const d=await api("/auth/signup",{method:"POST",body:JSON.stringify({email:sEmail,password:sPass,name:sName})});
    if(d.org_id||d.token){
      setSOk("Account created! Please sign in.");
      setTimeout(()=>{setMode("login");setEmail(sEmail);setPass("");setSOk("");},2000);
    } else {setSErr(d.error||"Registration failed");}
    setSBusy(false);
  }

  return <div className="auth-page">
    <div className="auth-grid"/>
    <div className="auth-scan"/>
    <div style={{width:"100%",maxWidth:460,padding:"0 20px",position:"relative",zIndex:10}}>

      {/* Logo above card */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div className="a-logo">SNAPTRAP</div>
        <div className="a-sub">Scalable Network Attack Parallel Trap &amp; Response</div>
        <div className="a-logo-divider"/>
      </div>

      <div className="a-status" style={{marginBottom:16,borderRadius:"var(--r)"}}>
        <div className="a-status-dot"/>
        SYSTEM ONLINE &nbsp;|&nbsp; HONEYPOT ACTIVE &nbsp;|&nbsp; JWT AUTH v2
      </div>

      <div className="abox">
        {/* 3-tab switcher */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab==="org"?"tab-org":""}`} onClick={()=>switchTab("org")}>
            <span className="atab-icon">🏢</span>Organisation
          </button>
          <button className={`auth-tab ${tab==="red"?"tab-red":""}`} onClick={()=>switchTab("red")}>
            <span className="atab-icon">🎯</span>Red Team
          </button>
          <button className={`auth-tab ${tab==="admin"?"tab-admin":""}`} onClick={()=>switchTab("admin")}>
            <span className="atab-icon">⚡</span>Superadmin
          </button>
        </div>

        <div className="auth-form-body">

          {/* ── ORG PANEL ── */}
          {tab==="org"&&<>
            {mode==="login"?<>
              <div className="auth-role-badge org">● ORG ANALYST / ADMIN</div>
              <div className="afield"><label className="lbl">Email</label><input className="inp" value={email} onChange={e=>setEmail(e.target.value)} placeholder="analyst@yourorg.com" style={{borderColor:"rgba(0,230,150,.2)"}}/></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••" style={{borderColor:"rgba(0,230,150,.2)"}}/></div>
              <button className="abtn btn-org" onClick={doLogin} disabled={busy}>{busy?"Authenticating…":"ACCESS DASHBOARD →"}</button>
              {err&&<div className="aerr">⚠ {err}</div>}
              <div className="auth-footer-links">
                <span style={{color:"var(--txt4)",cursor:"default"}}>Forgot password?</span>
                <button className="btn-link" onClick={()=>setMode("signup")} style={{color:"var(--c1)",cursor:"pointer",background:"none",border:"none",padding:0,fontFamily:"var(--mono)",fontSize:"inherit"}}>Register organisation →</button>
              </div>
             
            </>:<>
              <div className="auth-role-badge org">+ NEW ORGANISATION</div>
              <div className="afield"><label className="lbl">Organisation Name</label><input className="inp" placeholder="Your company or project name" value={sName} onChange={e=>setSName(e.target.value)}/></div>
              <div className="afield"><label className="lbl">Email</label><input className="inp" placeholder="you@example.com" value={sEmail} onChange={e=>setSEmail(e.target.value)}/></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" placeholder="Min 8 chars, uppercase + number" value={sPass} onChange={e=>setSPass(e.target.value)}/><PWBar pw={sPass}/></div>
              <div className="afield"><label className="lbl">Confirm Password</label><input className="inp" type="password" value={sPass2} onChange={e=>setSPass2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSignup()}/>{sPass2&&<div style={{fontFamily:"var(--mono)",fontSize:10,marginTop:4,color:sPass===sPass2?"var(--c1)":"var(--c2)"}}>{sPass===sPass2?"✓ Match":"✗ No match"}</div>}</div>
              <button className="abtn btn-org" onClick={doSignup} disabled={sBusy||!sEmail||!pwOk}>{sBusy?"Creating…":"CREATE ACCOUNT →"}</button>
              {sErr&&<div className="aerr">⚠ {sErr}</div>}
              {sOk&&<div className="aok">✓ {sOk}</div>}
              <div className="auth-footer-links"><button onClick={()=>setMode("login")} style={{color:"var(--txt3)",cursor:"pointer",background:"none",border:"none",padding:0,fontFamily:"var(--mono)",fontSize:"inherit"}}>← Back to login</button></div>
            </>}
          </>}

          {/* ── RED TEAM PANEL ── */}
          {tab==="red"&&<>
            <div className="auth-role-badge red">⚠ RED TEAM OPERATOR</div>
            <div className="auth-warn">
              <strong>⚠ AUTHORIZED PERSONNEL ONLY</strong>
              Red team access is restricted to approved security testers. All sessions are logged and monitored.
            </div>
            <div className="afield"><label className="lbl">Operator Email</label><input className="inp" value={rtEmail} onChange={e=>setRtEmail(e.target.value)} placeholder="operator@redteam.io" autoComplete="off" style={{borderColor:"rgba(255,45,85,.2)"}}/></div>
            <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={rtPass} onChange={e=>setRtPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doRedLogin()} placeholder="••••••••" autoComplete="off" style={{borderColor:"rgba(255,45,85,.2)"}}/></div>
            <button className="abtn btn-red" onClick={doRedLogin} disabled={rtBusy}>{rtBusy?"Authenticating…":"ENTER RED TEAM OPS →"}</button>
            {rtErr&&<div className="aerr">⚠ {rtErr}</div>}
            <div className="auth-footer-links"><span style={{color:"var(--txt4)"}}>Engagement brief</span><span style={{color:"var(--txt4)"}}>Request access</span></div>
          </>}

          {/* ── SUPERADMIN PANEL ── */}
          {tab==="admin"&&<>
            <div className="auth-role-badge admin">★ SUPERADMIN — GLOBAL ACCESS</div>
            <div className="afield"><label className="lbl">Admin Email</label><input className="inp" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@snaptrap.io" autoComplete="off" style={{borderColor:"rgba(255,184,0,.2)"}}/></div>
            <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••" autoComplete="off" style={{borderColor:"rgba(255,184,0,.2)"}}/></div>
            <button className="abtn btn-admin" onClick={doLogin} disabled={busy}>{busy?"Authenticating…":"ENTER SUPERADMIN →"}</button>
            {err&&<div className="aerr">⚠ {err}</div>}
            <div className="auth-footer-links"><span style={{color:"var(--txt4)"}}>Admin docs</span><span style={{color:"var(--txt4)"}}>Audit log</span></div>
          </>}

        </div>
      </div>

      <div className="auth-info-strip">
        <span>JWT // HS256</span><span>TLS 1.3</span><span>SNAPTRAP v2.1</span>
        {onBack&&<span style={{color:"var(--c1)",cursor:"pointer"}} onClick={onBack}>← Back to landing</span>}
      </div>
    </div>
  </div>;
}
export default Auth;
/* ═══════════════════════════════════════════════════════════
   ACCOUNT PAGE
═══════════════════════════════════════════════════════════ */