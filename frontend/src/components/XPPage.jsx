
import { api, calcLvl, xpL, ACHS } from "../constants";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function XPPage({xp}){
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("/attacks/stats").then(setStats);},[]);
  const level=calcLvl(xp);const tx=xpL(level),nx=xpL(level+1);const pct=((xp-tx)/(nx-tx))*100;
  const as={total:stats?.total_attacks||0,ips:stats?.unique_ips||0,level,bt:Object.fromEntries(Object.entries(stats?.by_type||{}).map(([k,v])=>[k,v]))};
  const unlocked=ACHS.filter(a=>a.req(as)).length;

  return <div className="content">
    <div className="panel c1 glow" style={{marginBottom:18}}>
      <div className="ph">Operator Status</div>
      <div style={{display:"flex",gap:24,alignItems:"center",marginBottom:20}}>
        <div style={{textAlign:"center",background:"var(--c1d)",border:"1px solid var(--c1b)",borderRadius:"var(--r)",padding:"18px 22px",flexShrink:0}}>
          <div style={{fontFamily:"var(--head)",fontSize:48,fontWeight:800,color:"var(--c1)",lineHeight:1}}>{level}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--txt3)",marginTop:4,letterSpacing:"2px"}}>LEVEL</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:8}}><span>Progress to Level {level+1}</span><span style={{color:"var(--c1)"}}>{xp.toLocaleString()} XP</span></div>
          <div className="xp-track" style={{marginBottom:16}}><div className="xp-fill" style={{width:`${pct}%`}}/></div>
          <div style={{display:"flex",gap:28}}>
            {[{v:`${unlocked}/${ACHS.length}`,l:"Badges Earned",c:"var(--c3)"},{v:as.total,l:"Total Caught",c:"var(--c2)"},{v:as.ips,l:"IPs Tracked",c:"var(--c4)"}].map(({v,l,c})=><div key={l}><div style={{fontFamily:"var(--head)",fontSize:24,fontWeight:700,color:c}}>{v}</div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:3,letterSpacing:"1px"}}>{l}</div></div>)}
          </div>
        </div>
      </div>
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)"}}>Next XP milestone: {nx.toLocaleString()} XP — earn XP by catching live attacks on the battlefield.</div>
    </div>
    <div className="panel">
      <div className="ph">Achievements ({unlocked}/{ACHS.length} Unlocked)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {ACHS.map(a=>{const won=a.req(as);return<div key={a.id} className={`ach ${won?"won":""}`}><div className="ach-ic">{a.icon}</div><div style={{flex:1}}><div className="ach-nm">{a.name}</div><div className="ach-ds">{a.desc}</div></div>{won&&<span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c3)",flexShrink:0}}>✓</span>}</div>;})}
      </div>
    </div>
  </div>;
}
export default XPPage;
/* ═══════════════════════════════════════════════════════════
   SIMULATOR BUTTON — triggers backend simulator + shows live log
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   NGROK PORTAL BUTTON — fetches live URL and opens it
═══════════════════════════════════════════════════════════ */