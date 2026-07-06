import { api, SVC_CLS, TYPE_CLS } from "../constants";
import Badge from "./Badge";
import Loader from "./Loader";
import Battlefield from "./Battlefield";
import NgrokPortalButton from "./NgrokPortalButton";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function RedTeamDashboard({user, onLogout, onTheme, theme}){
  const [tab,setTab]=useState("simulate");
  const [runs,setRuns]=useState([]);
  const [selRun,setSelRun]=useState(null);
  const [loadingRuns,setLoadingRuns]=useState(true);

  // Live feed state — driven by sim batches directly, not polling
  const [liveFeed,setLiveFeed]=useState([]);
  const [rtBatch,setRtBatch]=useState([]);
  const [rtCaught,setRtCaught]=useState(0);
  const [rtIPs,setRtIPs]=useState(new Set());

  // Attack My Website state
  const [targetURL,setTargetURL]=useState("https://");
  const [atkRunning,setAtkRunning]=useState(false);
  const [atkLog,setAtkLog]=useState([]);
  const [atkProgress,setAtkProgress]=useState(0);
  const [atkReport,setAtkReport]=useState(null);
  const atkRef=useRef(null);

  useEffect(()=>{
    api("/redteam/runs").then(d=>{if(Array.isArray(d)){setRuns(d);if(d[0])setSelRun(d[0]);}setLoadingRuns(false);});
  },[]);

  function refreshRuns(){
    setLoadingRuns(true);
    api("/redteam/runs").then(d=>{if(Array.isArray(d)){setRuns(d);if(d[0])setSelRun(d[0]);}setLoadingRuns(false);});
  }

  // handleRTBatch — updates all sinks at once (feed, battlefield, counters)
  const handleRTBatch=useCallback(batch=>{
    setRtBatch([...batch]);
    setLiveFeed(prev=>[...batch,...prev].slice(0,300));
    setRtCaught(prev=>prev+batch.length);
    setRtIPs(prev=>{const s=new Set(prev);batch.forEach(a=>{if(a.attacker_ip)s.add(a.attacker_ip);});return s;});
  },[]);

  // Attack My Website — 6-phase simulated pentest (no real traffic sent)
  const ATK_PHASES=[
    {id:"recon", label:"Reconnaissance", icon:"🔭", probes:["Resolving target hostname","Fetching HTTP headers","Server fingerprint check","Scanning for robots.txt","X-Powered-By disclosure","Security headers audit"]},
    {id:"scan",  label:"Port Scan",       icon:"📡", probes:["Probing port 80 (HTTP)","Probing port 443 (HTTPS)","Probing port 8080","Probing port 22 (SSH)","Probing port 3306 (MySQL)","Probing port 5432 (Postgres)"]},
    {id:"sqli",  label:"SQL Injection",   icon:"💉", probes:["Login: OR 1=1--","Query param injection","UNION SELECT probe","Cookie tampering","Blind SQLi time-delay","Error-based SQLi"]},
    {id:"xss",   label:"XSS Probe",       icon:"📜", probes:["Reflected XSS script tag","DOM XSS via hash","Stored XSS comment field","XSS img onerror","XSS svg onload","XSS User-Agent header"]},
    {id:"fuzz",  label:"Dir Fuzzing",     icon:"📂", probes:["GET /.env","GET /admin","GET /wp-admin","GET /config.php","GET /.git/config","GET /api/keys","GET /phpmyadmin","GET /backup.zip"]},
    {id:"report",label:"Report",          icon:"📋", probes:["Scoring findings","Detection rate calc","Vulnerability map","CVSS scoring","Severity assessment","Finalising report"]},
  ];

  function rIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}

  function launchWebAttack(){
    if(atkRunning||!targetURL||targetURL==="https://") return;
    setAtkRunning(true);setAtkLog([]);setAtkProgress(0);setAtkReport(null);
    const allProbes=ATK_PHASES.flatMap(ph=>ph.probes.map(p=>({phase:ph.label,icon:ph.icon,probe:p,phaseId:ph.id})));
    let idx=0;
    const findings={sqli:0,xss:0,fuzz:0,recon:0,scan:0};
    atkRef.current=setInterval(()=>{
      if(idx>=allProbes.length){
        clearInterval(atkRef.current);
        setAtkRunning(false);setAtkProgress(100);
        const vulns=findings.sqli*2+findings.xss+findings.fuzz*3;
        const detected=Math.floor(vulns*0.6);
        setAtkReport({target:targetURL,timestamp:new Date().toISOString(),totalProbes:allProbes.length,findings,vulnerabilities:vulns,detected,score:Math.round((detected/Math.max(vulns,1))*100),severity:vulns>8?"CRITICAL":vulns>4?"HIGH":vulns>1?"MEDIUM":"LOW"});
        return;
      }
      const {phase,icon,probe,phaseId}=allProbes[idx];
      const hit=Math.random()>0.55;
      if(hit&&findings[phaseId]!==undefined)findings[phaseId]++;
      setAtkLog(prev=>[{ts:new Date().toLocaleTimeString("en-US",{hour12:false}),phase,icon,probe,result:hit?"DETECTED":"PASSED",color:hit?"var(--c3)":"var(--c1)"},...prev].slice(0,60));
      if(hit){
        const typeMap={sqli:"sqli",xss:"scan",fuzz:"scan",recon:"scan",scan:"brute"};
        handleRTBatch([{id:Date.now()+idx,attacker_ip:rIP(),attack_type:typeMap[phaseId]||"unknown",service:"HTTP",threat_score:40+Math.floor(Math.random()*55),timestamp:new Date().toISOString()}]);
      }
      setAtkProgress(Math.round(((idx+1)/allProbes.length)*100));
      idx++;
    },180);
  }

  function stopWebAttack(){clearInterval(atkRef.current);setAtkRunning(false);}

  const bestScore=runs.length?Math.max(...runs.map(r=>r.detection_score||0)):0;
  const totalRuns=runs.length;

  return <div className="page" style={{background:"var(--bg)"}}>
    <div className="topbar" style={{borderBottom:"2px solid rgba(255,45,85,.3)"}}>
      <div className="logo" style={{color:"var(--c2)",textShadow:"0 0 20px rgba(255,45,85,.3)"}}>SNAP<em style={{color:"var(--txt3)"}}>TRAP</em></div>
      <div className="tb-div"/>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",background:"var(--c2d)",border:"1px solid var(--c2b)",padding:"3px 10px",borderRadius:"var(--r)",letterSpacing:"1.5px",fontWeight:700}}>⚠ RED TEAM OPS</span>
        <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)"}}>{user.name||user.email}</span>
      </div>
      <div className="tb-r">
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>{totalRuns} runs · {rtCaught} caught</span>
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>

    <div className="mnav" style={{borderBottom:"1px solid var(--c2b)"}}>
      {[["simulate","▶ Simulate"],["website","🌐 Attack Website"],["results","◉ Live Results"],["runs","◈ Run History"]].map(([id,label])=>
        <button key={id} className={`mtab ${tab===id?"on":""}`} style={tab===id?{color:"var(--c2)"}:{}} onClick={()=>{setTab(id);if(id==="runs")refreshRuns();}}>
          {label}
        </button>
      )}
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 16px",gap:8}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:"var(--c2)",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",letterSpacing:"1px"}}>RESTRICTED ACCESS</span>
      </div>
    </div>

    <div className="content">
      <div className="g4" style={{marginBottom:18}}>
        {[{l:"Total Runs",v:totalRuns,c:"var(--c2)"},{l:"Best Detection",v:bestScore?`${bestScore}%`:"—",c:bestScore>=80?"var(--c1)":bestScore>=50?"var(--c3)":"var(--c2)"},{l:"Attacks Caught",v:rtCaught,c:"var(--c4)"},{l:"Unique IPs",v:rtIPs.size,c:"var(--c3)"}].map(({l,v,c})=>
          <div key={l} style={{background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:18}}>
            <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:c,lineHeight:1,marginBottom:6}}>{v}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--txt3)"}}>{l}</div>
          </div>)}
      </div>

      {tab==="simulate"&&<div>
        <div className="rt-panel">
          <div className="ph" style={{color:"var(--c2)"}}>⚡ Launch Attack Simulation</div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:18,lineHeight:1.8,background:"var(--bg2)",padding:"10px 14px",borderRadius:"var(--r)",borderLeft:"3px solid var(--c2)"}}>
            Fire simulated attacks against your org's honeypot. Results appear live in <strong style={{color:"var(--txt2)"}}>Live Results</strong>. Detection score = % caught.
          </div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",letterSpacing:"1px",marginBottom:8}}>DEMO · 50 attackers</div>
              <RTSimPanel onBatch={handleRTBatch} count={50}/>
            </div>
            <div style={{width:1,background:"var(--bdr2)",flexShrink:0}}/>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c3)",letterSpacing:"1px",marginBottom:8}}>BENCHMARK · 700 attackers</div>
              <RTSimPanel onBatch={handleRTBatch} count={700}/>
            </div>
          </div>
        </div>
        <div className="rt-panel" style={{borderColor:"var(--c4b)",borderTopColor:"var(--c4)"}}>
          <div className="ph" style={{color:"var(--c4)"}}>🌐 Share Live Portal</div>
          <NgrokPortalButton/>
        </div>
      </div>}

      {tab==="website"&&<div>
        <div className="rt-panel">
          <div className="ph" style={{color:"var(--c2)"}}>🌐 Attack My Website</div>
          <div style={{background:"var(--bg2)",border:"1px solid var(--c3b)",borderLeft:"3px solid var(--c3)",borderRadius:"var(--r)",padding:"12px 16px",marginBottom:18,fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)",lineHeight:2}}>
            <div style={{color:"var(--c3)",fontWeight:700,marginBottom:4,fontSize:10,letterSpacing:"1px"}}>⚠ AUTHORISED USE ONLY</div>
            Runs a <strong>simulated pentest</strong> against a URL you own or are authorised to test.
            Six phases: <span style={{color:"var(--c3)"}}>Recon → Port Scan → SQL Injection → XSS → Dir Fuzzing → Report</span>.
            All probes are <strong>locally simulated</strong> — no real HTTP traffic is sent.
            Detected probes appear on <strong>Live Results</strong> so you can see how your honeypot responds.
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:6}}>TARGET URL — site you own or are authorised to test</div>
            <div style={{display:"flex",gap:10}}>
              <input className="inp" value={targetURL} onChange={e=>setTargetURL(e.target.value)} placeholder="https://your-site.example.com" disabled={atkRunning} style={{flex:1,borderColor:"var(--c2b)"}}/>
              {!atkRunning
                ?<button className="btn btn-2" style={{whiteSpace:"nowrap",padding:"8px 20px"}} onClick={launchWebAttack} disabled={!targetURL||targetURL==="https://"}>▶ Launch Pentest</button>
                :<button className="btn btn-ghost" style={{whiteSpace:"nowrap"}} onClick={stopWebAttack}>■ Stop</button>
              }
            </div>
          </div>
          {(atkRunning||atkProgress>0)&&<>
            <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:4}}>
              <span>{atkRunning?"Running pentest…":"Complete"}</span>
              <span style={{color:atkRunning?"var(--c2)":"var(--c1)"}}>{atkProgress}%</span>
            </div>
            <div className="sim-bar-track" style={{marginBottom:12}}><div className="sim-bar-fill" style={{width:`${atkProgress}%`,background:atkRunning?"var(--c2)":"var(--c1)"}}/></div>
          </>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {ATK_PHASES.map((ph,phaseIdx)=>{
              const totalBefore=ATK_PHASES.slice(0,phaseIdx).reduce((s,p)=>s+p.probes.length,0);
              const phasePct=(totalBefore/ATK_PHASES.flatMap(p=>p.probes).length)*100;
              const done=atkProgress>phasePct;
              return <div key={ph.id} style={{fontFamily:"var(--mono)",fontSize:9,padding:"4px 10px",borderRadius:2,background:done?"var(--c2d)":"var(--bg2)",border:`1px solid ${done?"var(--c2b)":"var(--bdr2)"}`,color:done?"var(--c2)":"var(--txt4)",letterSpacing:"1px"}}>{ph.icon} {ph.label}</div>;
            })}
          </div>
          {atkLog.length>0&&<div style={{background:"var(--bg)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"8px 12px",maxHeight:220,overflowY:"auto",fontFamily:"var(--mono)",fontSize:10}}>
            {atkLog.map((l,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"2px 0",borderBottom:"1px solid var(--bdr)",color:"var(--txt3)"}}>
              <span style={{color:"var(--txt4)",flexShrink:0,width:56}}>{l.ts}</span>
              <span style={{flexShrink:0}}>{l.icon}</span>
              <span style={{color:"var(--txt4)",flexShrink:0,width:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.phase}</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.probe}</span>
              <span style={{color:l.color,fontWeight:700,flexShrink:0,width:70,textAlign:"right"}}>{l.result}</span>
            </div>)}
          </div>}
        </div>
        {atkReport&&<div className="rt-panel" style={{borderTopColor:"var(--c1)"}}>
          <div className="ph" style={{color:"var(--c1)"}}>📋 Pentest Report</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:16}}>
            {[{l:"Total Probes",v:atkReport.totalProbes,c:"var(--c4)"},{l:"Vulnerabilities",v:atkReport.vulnerabilities,c:"var(--c2)"},{l:"Detected",v:atkReport.detected,c:"var(--c1)"},{l:"Detection Rate",v:`${atkReport.score}%`,c:atkReport.score>=80?"var(--c1)":atkReport.score>=50?"var(--c3)":"var(--c2)"}].map(({l,v,c})=>
              <div key={l} style={{textAlign:"center",flex:1,minWidth:80}}>
                <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:c,marginBottom:4}}>{v}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"1px",color:"var(--txt3)",textTransform:"uppercase"}}>{l}</div>
              </div>)}
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,background:"var(--bg2)",padding:"10px 14px",borderRadius:"var(--r)",borderLeft:`3px solid ${atkReport.score>=80?"var(--c1)":atkReport.score>=50?"var(--c3)":"var(--c2)"}`,color:"var(--txt2)"}}>
            {atkReport.score>=80?"✓ Excellent — your honeypot caught most attack patterns.":atkReport.score>=50?"⚠ Moderate — several patterns slipped through. Review SQLi and fuzzing rules.":"✗ Low detection — most attacks missed. Enable more honeypot services."}
          </div>
        </div>}
      </div>}

      {tab==="results"&&<div>
        {rtCaught===0&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",background:"var(--sur)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"14px 18px",marginBottom:14}}>
          ◉ No attacks yet — run a simulation or launch the website pentest first.
        </div>}
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          <div style={{width:900,flexShrink:0,background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)",marginBottom:10}}>◉ LIVE BATTLEFIELD — RED TEAM FEED</div>
            <Battlefield feed={rtBatch} isLive={false}/>
          </div>
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",overflow:"hidden",minHeight:520}}>
            <div style={{padding:"10px 14px",background:"var(--bg2)",borderBottom:"1px solid var(--bdr2)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)"}}>ATTACK FEED</span>
              <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>{liveFeed.length} events</span>
            </div>
            <div style={{flex:1,overflowY:"auto",minHeight:0}}>
              {!liveFeed.length&&<div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt4)",padding:"28px 16px",textAlign:"center"}}>Run a simulation or pentest to see attacks here.</div>}
              {liveFeed.map((a,i)=><div key={a.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid var(--bdr)",fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)"}}>
                <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}/>
                <span style={{color:"var(--txt4)",fontSize:10,width:52,flexShrink:0}}>{a.timestamp?.slice(11,19)}</span>
                <span style={{color:"var(--c4)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.attacker_ip}</span>
                <Badge v={a.service} map={SVC_CLS}/>
                <Badge v={a.attack_type} map={TYPE_CLS}/>
                <span style={{fontFamily:"var(--head)",fontSize:12,fontWeight:700,flexShrink:0,color:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}>{a.threat_score}</span>
              </div>)}
            </div>
          </div>
        </div>
      </div>}

      {tab==="runs"&&<div>
        <div style={{background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)"}}>◈ Run History — {runs.length} runs</div>
            <button className="btn btn-2" style={{fontSize:10,padding:"4px 12px"}} onClick={refreshRuns}>↻ Refresh</button>
          </div>
          {loadingRuns&&<Loader/>}
          {!loadingRuns&&!runs.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:"28px 0",textAlign:"center"}}>No runs yet — go to Simulate and fire a wave.</div>}
          {!loadingRuns&&runs.map(r=>{
            const sc=r.detection_score>=80?"var(--c1)":r.detection_score>=50?"var(--c3)":"var(--c2)";
            return <div key={r.id} className={`rt-run-card ${selRun?.id===r.id?"active":""}`} onClick={()=>setSelRun(selRun?.id===r.id?null:r)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span className="badge b2">#{r.id}</span>
                  <span className={`badge ${r.mode==="benchmark"?"b3":"bd"}`}>{r.mode}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)"}}>{r.started_at?.slice(0,16)?.replace("T"," ")}</span>
                </div>
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <span style={{fontFamily:"var(--head)",fontSize:20,fontWeight:800,color:sc}}>{r.detection_score!=null?`${r.detection_score}%`:"—"}</span>
                  <span className={`badge ${r.status==="completed"?"b1":"b3"}`}>{r.status}</span>
                </div>
              </div>
              {selRun?.id===r.id&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--bdr2)"}}>
                <div style={{display:"flex",gap:0,marginBottom:12}}>
                  {[["Fired",r.total_attacks,"var(--c4)"],["Detected",r.detected,"var(--c1)"],["Missed",r.missed,"var(--c2)"],["Score",r.detection_score!=null?`${r.detection_score}%`:"—",sc]].map(([l,v,c])=>
                    <div key={l} className="rt-stat"><div className="rt-score" style={{color:c,fontSize:24}}>{v??0}</div><div className="rt-label">{l}</div></div>)}
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",background:"var(--bg2)",padding:"8px 12px",borderRadius:"var(--r)"}}>
                  {r.detection_score>=80?"✓ Excellent — honeypot is well-tuned":r.detection_score>=50?"⚠ Moderate — tune your rules":"✗ Low detection — many attacks slipped through"}
                </div>
              </div>}
            </div>;
          })}
        </div>
      </div>}

    </div>
  </div>;
}
function RTSimPanel({onBatch, count}){
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState(0);
  const [log,setLog]=useState([]);
  const ref=useRef(null);
  const TYPES=["brute","scan","sqli","cred","slow"];
  const SVCS=["SSH","HTTP","FTP","DB","ML"];
  function rIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}
  function run(){
    if(running)return;
    setRunning(true);setProgress(0);setLog([]);
    let fired=0;
    ref.current=setInterval(()=>{
      const burst=Math.min(3,count-fired);
      const batch=[];
      for(let i=0;i<burst;i++){
        const type=TYPES[Math.floor(Math.random()*TYPES.length)];
        const svc=SVCS[Math.floor(Math.random()*SVCS.length)];
        const ip=rIP();
        const score=20+Math.floor(Math.random()*80);
        batch.push({id:Date.now()+i+Math.random(),attacker_ip:ip,attack_type:type,service:svc,threat_score:score,timestamp:new Date().toISOString()});
        setLog(prev=>[`${ip} → ${svc} [${type}]`,...prev].slice(0,6));
      }
      onBatch(batch);
      fired+=burst;
      setProgress(Math.round((fired/count)*100));
      if(fired>=count){clearInterval(ref.current);setRunning(false);setProgress(100);}
    },count>100?60:120);
  }
  function stop(){clearInterval(ref.current);setRunning(false);}
  return <div style={{background:"var(--bg2)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"10px 12px"}}>
    <div style={{display:"flex",gap:8,marginBottom:6}}>
      <button className="sim-btn sim-btn-run" style={{padding:"5px 14px",fontSize:10}} onClick={run} disabled={running}>{running?"⏳ Running…":"▶ Launch"}</button>
      {running&&<button className="btn btn-ghost" style={{fontSize:10,padding:"5px 10px"}} onClick={stop}>■ Stop</button>}
    </div>
    {(running||progress>0)&&<>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:3}}>
        <span>{running?"Firing…":"Done"}</span><span style={{color:running?"var(--c2)":"var(--c1)"}}>{progress}%</span>
      </div>
      <div className="sim-bar-track" style={{marginBottom:4}}><div className="sim-bar-fill" style={{width:`${progress}%`}}/></div>
      <div style={{fontFamily:"var(--mono)",fontSize:10,maxHeight:60,overflowY:"auto"}}>
        {log.map((l,i)=><div key={i} style={{color:"var(--txt3)",display:"flex",gap:6}}><span style={{color:"var(--c2)"}}>▸</span>{l}</div>)}
      </div>
    </>}
  </div>;
}
export default RedTeamDashboard;


/* ═══════════════════════════════════════════════════════════
   MODULE 4 — CONTROL PANEL
═══════════════════════════════════════════════════════════ */