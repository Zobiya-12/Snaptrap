
import { api, calcLvl, xpL } from "../constants";
import LiveMonitor from "../components/LiveMonitor";
import IntelPage from "../components/IntelPage";
import XPPage from "../components/XPPage";
import ControlPanel from "../components/ControlPanel";
import AccountPage from "../components/AccountPage";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function OrgDashboard({user, onLogout, onTheme, theme}){
  const [mod,setMod]=useState("monitor");
  const [xp,setXp]=useState(()=>parseInt(localStorage.getItem("st_xp")||"0"));
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("/attacks/stats").then(setStats);},[]);
  const total=stats?.total_attacks||0;
  const tl=total>1000?"CRIT":total>200?"HIGH":total>50?"MED":"LOW";
  const tlC={CRIT:"var(--c2)",HIGH:"var(--c3)",MED:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRIT:5,HIGH:4,MED:3,LOW:2}[tl];
  const level=calcLvl(xp);const pct=((xp-xpL(level))/(xpL(level+1)-xpL(level)))*100;

  return <div className="page">
    <div className="topbar">
      <div className="logo">SNAP<em>TRAP</em></div>
      <div className="tb-div"/>
      <div className="hud-mid">
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="tl-lbl">Threat</div>
          <div className="tl-val" style={{color:tlC}}>{tl}</div>
          <div className="tl-segs">{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{background:i<=tlN?tlC:undefined}}/>)}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span className="xp-label">Lv{level} {user.name||"Operator"}</span><span className="xp-label" style={{color:"var(--c1)"}}>{xp.toLocaleString()} XP</span></div>
          <div className="xp-track" style={{width:140}}><div className="xp-fill" style={{width:`${pct}%`}}/></div>
        </div>
      </div>
      <div className="tb-r">
        <div className="live-chip"><div className="live-dot"/>LIVE</div>
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-4" style={{padding:"5px 12px",fontSize:10}} onClick={()=>setMod("account")}>⚙ Account</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>

    <div className="mnav">
      <button className={`mtab ${mod==="monitor"?"on":""}`} onClick={()=>setMod("monitor")}>◉ Live Monitor</button>
      <button className={`mtab ${mod==="intel"?"on":""}`} onClick={()=>setMod("intel")}>◈ Threat Intel</button>
      <button className={`mtab ${mod==="xp"?"on":""}`} onClick={()=>setMod("xp")}>⬡ Operator XP</button>
      <button className={`mtab ${mod==="control"?"on":""}`} onClick={()=>setMod("control")}>⚙ Control Panel</button>
    </div>

    {mod==="monitor"&&<LiveMonitor user={user} xp={xp} setXp={setXp}/>}
    {mod==="intel"&&<IntelPage user={user}/>}
    {mod==="xp"&&<XPPage xp={xp}/>}
    {mod==="control"&&<ControlPanel user={user}/>}
    {mod==="account"&&<div className="content"><AccountPage user={user} onLogout={onLogout} onBack={()=>setMod("monitor")}/></div>}
  </div>;
}
export { OrgDashboard };

/* ═══════════════════════════════════════════════════════════
   SUPERADMIN SHELL
═════════════════════*/