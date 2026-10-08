import { api } from "../constants";
import AdminPanel from "../components/AdminPanel";
import AccountPage from "../components/AccountPage";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function SuperAdminShell({user, onLogout, onTheme, theme}){
  const [gs,setGs]=useState(null);const [mod,setMod]=useState("admin");
  useEffect(()=>{api("/admin/global-stats").then(setGs);},[]);
  const total=gs?.total_attacks||0;
  const tl=total>1000?"CRIT":total>200?"HIGH":total>50?"MED":"LOW";
  const tlC={CRIT:"var(--c2)",HIGH:"var(--c3)",MED:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRIT:5,HIGH:4,MED:3,LOW:2}[tl];

  return <div className="page">
    <div className="topbar">
      <div className="logo">SNAP<em>TRAP</em></div>
      <div className="tb-div"/>
      <div className="hud-mid">
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="tl-lbl">Global Threat</div>
          <div className="tl-val" style={{color:tlC}}>{tl}</div>
          <div className="tl-segs">{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{background:i<=tlN?tlC:undefined}}/>)}</div>
        </div>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c5)",border:"1px solid var(--c5b)",padding:"3px 12px",borderRadius:"var(--r)",letterSpacing:"1.5px"}}>SUPERADMIN</span>
      </div>
      <div className="tb-r">
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-5" style={{padding:"5px 12px",fontSize:10}} onClick={()=>setMod("account")}>⚙ Account</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>
    {tl==="CRIT"&&<div className="alert-bar crit"><span style={{animation:"blink 1s infinite"}}>⚠</span>GLOBAL CRITICAL — coordinated campaign detected across organisations</div>}
    {mod==="admin"&&<AdminPanel/>}
    {mod==="account"&&<div className="content"><AccountPage user={user} onLogout={onLogout} onBack={()=>setMod("admin")}/></div>}
  </div>;
}
export { SuperAdminShell };
/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════*/