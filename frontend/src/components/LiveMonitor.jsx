
import { api } from "../constants";
import NgrokPortalButton from './NgrokPortalButton';
import Battlefield from './Battlefield';
import { Badge, TRing } from "./shared";
import { tc, sc } from "../constants";
import { BarChart, TLChart, Loader } from "./shared";
import { SVC_CLS, TYPE_CLS } from "../constants";

import React, { useState, useEffect, useRef, useCallback } from 'react';
let _simCounter = 0;
function LiveSimulatorPanel({onSimBatch}){
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState(0);
  const [log,setLog]=useState([]);
  const intervalRef=useRef(null);

  const ATTACK_TYPES=["brute","scan","sqli","cred","slow"];
  const SERVICES=["SSH","HTTP","FTP","DB","ML"];

  function randomIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}

  function runSim(count){
    if(running) return;
    setRunning(true);setProgress(0);setLog([]);
    let fired=0;
    intervalRef.current=setInterval(()=>{
      // fire 1-3 attacks per tick for visual density
      const burst=Math.min(3,count-fired);
      const batch=[];
      for(let i=0;i<burst;i++){
        const type=ATTACK_TYPES[Math.floor(Math.random()*ATTACK_TYPES.length)];
        const svc=SERVICES[Math.floor(Math.random()*SERVICES.length)];
        const ip=randomIP();
        const score=20+Math.floor(Math.random()*80);
        const uid = `sim-${Date.now()}-${++_simCounter}`;
        batch.push({id: uid, attacker_ip:ip, attack_type:type, service:svc, threat_score:score, timestamp:new Date().toISOString()});
        setLog(prev=>[`${ip} → ${svc} [${type}] ● ${score}`,...prev].slice(0,8));
      }
      onSimBatch(batch);
      fired+=burst;
      setProgress(Math.round((fired/count)*100));
      if(fired>=count){
        clearInterval(intervalRef.current);
        setRunning(false);
        setProgress(100);
      }
    },400);
  }

  function stop(){clearInterval(intervalRef.current);setRunning(false);setProgress(0);setLog([]);}
return (
  <div style={{
    background: "var(--sur)",
    border: "1px solid var(--bdr2)",
    borderTop: "2px solid var(--c2)",
    borderRadius: "var(--r2)",
    padding: "10px 14px",
    boxShadow: "var(--sh)", 
    height: 180, 
    display: "flex",
    flexDirection: "column", 
    overflow: "hidden" 
  }}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",color:"var(--c2)",display:"flex",alignItems:"center",gap:8}}>
        ◈ Attack Simulator
        {running && <span style={{color:"var(--c3)",animation:"pulse 1s infinite"}}>● LIVE</span>}
      </div>
      <NgrokPortalButton compact/>
    </div>
    
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10}} onClick={()=>runSim(20)} disabled={running}>▶ Wave</button>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10, borderColor:"var(--c3b)",color:"var(--c3)",background:"var(--c3d)"}} onClick={()=>runSim(80)} disabled={running}>⚡ Raid</button>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10, borderColor:"var(--c5b)",color:"var(--c5)",background:"var(--c5d)"}} onClick={()=>runSim(200)} disabled={running}>💥 Storm</button>
      {running && <button className="btn btn-ghost" style={{fontSize:10, padding:"4px 8px"}} onClick={stop}>■ Stop</button>}
    </div>

    {(running || progress > 0) && (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:2}}>
          <span>{running ? "Firing attacks..." : "Complete"}</span>
          <span style={{color:running?"var(--c2)":"var(--c1)"}}>{progress}%</span>
        </div>
        <div className="sim-bar-track" style={{marginBottom:6, height: 4}}>
          <div className="sim-bar-fill" style={{width:`${progress}%`, height: '100%', background:running?"var(--c2)":"var(--c1)"}}/>
        </div>

        <div style={{ 
            overflowY: "auto", 
            flex: 1, 
            background: "rgba(0,0,0,0.2)", 
            padding: "6px", 
            borderRadius: "4px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            lineHeight: "1.4"
          }}>
          {log.map((l, i) => (
            <div key={i} style={{display:"flex", gap:6, color: "var(--txt3)", marginBottom: 2}}>
              <span style={{color:"var(--c2)"}}>▸</span>{l}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}

function LiveMonitor({user, xp, setXp}){
  const [stats,setStats]=useState(null);const [timeline,setTimeline]=useState([]);
  const [historyFeed,setHistoryFeed]=useState([]);
  const [newBatch,setNewBatch]=useState([]);
  const [sel,setSel]=useState(null);
  const cursorRef=useRef(0);const initRef=useRef(false);

  // Local counters — update instantly from simulator, no Flask polling lag
  const [localCaught,setLocalCaught]=useState(0);
  const [localIPs,setLocalIPs]=useState(new Set());
  const [localByType,setLocalByType]=useState({});
  const [localByService,setLocalByService]=useState({});

  const handleHit=useCallback(v=>{
    setXp(c=>{const n=c+v;localStorage.setItem("st_xp",n);return n;});
  },[setXp]);

  // THE FIX: handleSimBatch now updates ALL sinks — battlefield, raid feed,
  // and the stat counters — so every button click is reflected immediately
const handleSimBatch = useCallback(async (batch) => {
  // 1. Update UI immediately (existing behaviour)
  setNewBatch([...batch]);
  setHistoryFeed(prev => [...batch, ...prev].slice(0, 300));
  setLocalCaught(prev => prev + batch.length);
  setLocalIPs(prev => {
    const s = new Set(prev);
    batch.forEach(a => { if (a.attacker_ip) s.add(a.attacker_ip); });
    return s;
  });
  setLocalByType(prev => {
    const n = {...prev};
    batch.forEach(a => { n[a.attack_type] = (n[a.attack_type] || 0) + 1; });
    return n;
  });
  setLocalByService(prev => {
    const n = {...prev};
    batch.forEach(a => { n[a.service] = (n[a.service] || 0) + 1; });
    return n;
  });

  // 2. Persist to DB so Intel, Threat Level, timeline, etc. all update
  try {
    await api("/attacks/simulate", {
      method: "POST",
      body: JSON.stringify(batch)
    });
  } catch(e) {
    console.warn("Sim persist failed:", e);
  }
}, []);

  useEffect(()=>{
    async function init(){
      const tk = localStorage.getItem("st_token");
      if (!tk) return;  // ← add this
      const m=await api("/attacks/max-id");
      cursorRef.current=m.max_id||0;
      initRef.current=true;
      // History feed for display list only — these do NOT go to battlefield
      const d=await api("/attacks?limit=80");
      if(Array.isArray(d)) setHistoryFeed(d.slice(0,80));
      api("/attacks/stats").then(setStats);
      api("/stats/timeline?interval=day").then(d=>Array.isArray(d)&&setTimeline(d));
    }
    init();
  },[]);

  useEffect(()=>{
    const t=setInterval(async()=>{
      if(!initRef.current) return;
      // limit=500 so a full 200-attacker simulator wave is never truncated
      const fresh=await api(`/attacks/since?since_id=${cursorRef.current}&limit=500`);
      if(Array.isArray(fresh)&&fresh.length){
        cursorRef.current=Math.max(...fresh.map(a=>a.id));
        setHistoryFeed(prev=>[...fresh,...prev].slice(0,300));
        // Send ONLY this batch to battlefield — new array ref every time
        setNewBatch([...fresh]);
      }
    },2000);
    const t2=setInterval(()=>{
      api("/attacks/stats").then(setStats);
      api("/stats/timeline?interval=day").then(d=>Array.isArray(d)&&setTimeline(d));
    },8000);
    return()=>{clearInterval(t);clearInterval(t2);};
  },[]);

  // Merge local (instant from simulator) with Flask (polled every 8s)
  const displayCaught = Math.max(stats?.total_attacks||0, localCaught);
  const displayIPs    = Math.max(stats?.unique_ips||0, localIPs.size);
  const displayAvg    = stats?.avg_threat_score||0;
  const mergedByType  = {...(stats?.by_type||{})};
  Object.entries(localByType).forEach(([k,v])=>{mergedByType[k]=(mergedByType[k]||0)+v;});
  const mergedBySvc   = {...(stats?.by_service||{})};
  Object.entries(localByService).forEach(([k,v])=>{mergedBySvc[k]=(mergedBySvc[k]||0)+v;});
  const svcData  = Object.entries(mergedBySvc).map(([l,c])=>({label:l,count:c}));
  const typeData = Object.entries(mergedByType).map(([l,c])=>({label:l,count:c}));
  const total    = displayCaught;
  const tl=total>1000?"CRITICAL":total>200?"HIGH":total>50?"MEDIUM":"LOW";
  const tlC={CRITICAL:"var(--c2)",HIGH:"var(--c3)",MEDIUM:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRITICAL:5,HIGH:4,MEDIUM:3,LOW:2}[tl];

  return <div>
    {tl==="CRITICAL"&&<div className="alert-bar crit"><span style={{animation:"blink 1s infinite"}}>⚠</span>CRITICAL — sustained attack campaign detected</div>}
    {tl==="HIGH"&&<div className="alert-bar warn">⚠ HIGH — elevated threat activity</div>}
    <div className="content">
      {/* Row: Battlefield (900px fixed) + right column (raid feed + simulator) */}
      <div style={{display:"flex",gap:16,marginBottom:18,alignItems:"flex-start"}}>

        {/* Fixed 900px battlefield */}
        <div style={{width:900,flexShrink:0}}>
          <Battlefield feed={newBatch} onHit={handleHit} isLive={true}/>
        </div>

        {/* Right column — same width as remaining space, capped height */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>

          {/* Simulator panel — sits above raid feed, matches its width */}
          <LiveSimulatorPanel onSimBatch={handleSimBatch}/>

          {/* Raid feed — fixed height, internal scroll */}
          <div style={{display:"flex",flexDirection:"column",background:"var(--sur)",border:"1px solid var(--bdr2)",borderRadius:"var(--r2)",overflow:"hidden",boxShadow:"var(--sh)",height:340}}>
            <div className="raid-bar">
              <div className="raid-t">◉ Live Raid Feed</div>
              <div className="live-chip"><div className="live-dot"/>LIVE</div>
            </div>
            {/* scrollable area — fixed height, never grows */}
            <div style={{overflowY:"scroll",flex:1,minHeight:0}}>
              {!historyFeed.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:"24px 16px",textAlign:"center"}}>No attacks yet.<br/><span style={{fontSize:11,color:"var(--txt3)"}}>Run your agent or hit a simulator button to begin.</span></div>}
              {historyFeed.map((a,i)=><div key={a.id||i} className={`ri ${i<5?"fresh":""}`} onClick={()=>setSel(sel?.id===a.id?null:a)}>
                <div className="rdot pulse" style={{background:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)",color:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}/>
                <span style={{color:"var(--txt3)",fontSize:10,width:50,flexShrink:0}}>{a.timestamp?.slice(11,19)}</span>
                <span className="ri-ip">{a.attacker_ip}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",flexShrink:0,width:34,textAlign:"right"}}>{a.threat_score}</span>
              </div>)}
            </div>
            {sel&&<div style={{padding:10,borderTop:"1px solid var(--bdr2)",background:"var(--bg2)",flexShrink:0,maxHeight:110,overflowY:"auto"}}>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                <TRing score={sel.threat_score||0} size={44}/>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--c4)"}}>{sel.attacker_ip}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:2,display:"flex",gap:6}}>
                    <Badge v={sel.service} map={SVC_CLS}/>
                    <Badge v={sel.attack_type} map={TYPE_CLS}/>
                  </div>
                </div>
              </div>
              {sel.payload&&<div className="pbox" style={{maxHeight:50,fontSize:11}}>{sel.payload}</div>}
            </div>}
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="g4" style={{marginBottom:18}}>
        {[{l:"Attacks Caught",v:displayCaught,c:"var(--c2)",acc:"c2"},{l:"Unique IPs",v:displayIPs,c:"var(--c4)",acc:"c4"},{l:"Avg Threat Score",v:displayAvg,c:"var(--c3)",acc:"c3"},{l:"Attack Types",v:typeData.length||0,c:"var(--c1)",acc:"c1"}].map(({l,v,c,acc})=><div key={l} className={`panel ${acc}`}><div className="stat-v" style={{color:c}}>{v}</div><div className="stat-l">{l}</div></div>)}
      </div>

      {/* Timeline + Threat level + By Service + By Attack Type */}
      <div className="g2" style={{marginBottom:18}}>
        <div className="panel"><div className="ph">Attack Timeline</div>{timeline.length?<TLChart data={timeline}/>:<Loader/>}</div>
        <div className={`panel ${tl==="CRITICAL"?"c2":""}`}>
          <div className="ph">Threat Level</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
            <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:tlC,letterSpacing:2}}>{tl}</div>
            <div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{width:16,height:5,background:i<=tlN?tlC:"var(--bg3)"}}/>)}</div>
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:14}}>{displayCaught.toLocaleString()} attacks on your network</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:8,textTransform:"uppercase"}}>By Service</div>{svcData.length?<BarChart data={svcData} ak="svc"/>:<Loader/>}</div>
            <div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:8,textTransform:"uppercase"}}>By Attack Type</div>{typeData.length?<BarChart data={typeData} ak="type"/>:<Loader/>}</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}
export default LiveMonitor;