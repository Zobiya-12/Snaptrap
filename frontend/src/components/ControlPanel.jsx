import { api, API, SVC_CLS } from "../constants";
import Badge from "./Badge";
import Loader from "./Loader";
import NetworkAgentConsole from "./NetworkAgentConsole";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function ControlPanel({user}){
  const [info,setInfo]=useState(null);const [counts,setCounts]=useState(null);
  const [regen,setRegen]=useState(false);const [copied,setCopied]=useState(false);
  const [ports,setPorts]=useState({SSH:2222,HTTP:8080,FTP:2121,DB:3306});
  const [savedPorts,setSavedPorts]=useState({SSH:2222,HTTP:8080,FTP:2121,DB:3306});
  const [portSaved,setPortSaved]=useState(false);
  useEffect(()=>{api("/control/info").then(setInfo);api("/control/db-counts").then(setCounts);},[]);

  async function doRegen(){setRegen(true);const d=await api("/control/regenerate-token",{method:"POST"});if(d.agent_token)setInfo(p=>({...p,agent_token:d.agent_token}));setRegen(false);}
  function copyToken(){if(info?.agent_token){navigator.clipboard.writeText(info.agent_token).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});}}
  function savePorts(){setSavedPorts({...ports});setPortSaved(true);setTimeout(()=>setPortSaved(false),2500);}

  async function dlAgent(){
    const tk=localStorage.getItem("st_token");
    const resp=await fetch(`${API}/control/agent-script`,{headers:{Authorization:`Bearer ${tk}`}});
    if(!resp.ok){const j=await resp.json();alert(j.error||"Download failed");return;}
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download=`snaptrap_agent.py`;a.click();URL.revokeObjectURL(url);
  }

  const SVCS=[
    {name:"SSH",  key:"SSH", desc:"Catches brute force & credential attacks"},
    {name:"HTTP", key:"HTTP",desc:"Catches SQL injection, web scanners, path traversal"},
    {name:"FTP",  key:"FTP", desc:"Catches anonymous login and credential stuffing"},
    {name:"DB",   key:"DB",  desc:"Catches database exploitation attempts"},
  ];

  return <div className="content">
    <div className="g2" style={{marginBottom:18}}>
      <div className="panel c4">
        <div className="ph">Organisation Info</div>
        {info?<>
          <div className="drow"><span className="dk">Name</span><span className="dv">{info.name}</span></div>
          <div className="drow"><span className="dk">Email</span><span className="dv">{info.email}</span></div>
        </>:<Loader/>}
      </div>
      <div className="panel c1">
        <div className="ph">Database Counts</div>
        {counts?Object.entries(counts).map(([k,v])=><div key={k} className="db-row"><span style={{color:"var(--txt3)",fontSize:11,letterSpacing:".5px",textTransform:"uppercase"}}>{k}</span><span style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c1)",fontSize:16}}>{v.toLocaleString()}</span></div>):<Loader/>}
      </div>
    </div>

    <div className="panel" style={{marginBottom:18}}>
      <div className="ph">Agent Token<span style={{color:"var(--txt3)",fontWeight:400,marginLeft:10,fontSize:10}}>keep this secret</span></div>
      {info?<>
        <div className="token-box" style={{marginBottom:14}}>{info.agent_token}</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn btn-4" onClick={copyToken}>{copied?"✓ Copied!":"Copy Token"}</button>
          <button className="btn btn-1" onClick={dlAgent}>⬇ Download agent.py</button>
          <button className="btn btn-2" onClick={doRegen} disabled={regen}>{regen?"Regenerating…":"Regenerate Token"}</button>
        </div>
        <div className="terminal-box">
          <div><span className="prompt">$</span> <span className="cmd">python3 agent.py \</span></div>
          <div><span className="prompt">  </span> <span className="cmd">--token {info.agent_token?.slice(0,12)}… \</span></div>
          <div><span className="prompt">  </span> <span className="cmd">--server http://YOUR_SERVER:5000 \</span></div>
          <div><span className="prompt">  </span> <span className="cmd">--ssh-port {savedPorts.SSH} --http-port {savedPorts.HTTP} --ftp-port {savedPorts.FTP} --db-port {savedPorts.DB}</span></div>
          <div style={{marginTop:4}}><span className="out">[AGENT] Listening — attacks will appear in your dashboard within seconds</span></div>
        </div>
      </>:<Loader/>}
    </div>

    <div className="panel" style={{marginBottom:18}}>
      <div className="ph">Honeypot Services — Configure Ports</div>
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:14}}>Ports above 1024 only. Changes apply when you restart the agent.</div>
      {SVCS.map(s=><div key={s.name} className="port-row">
        <div className="svc-dot"/>
        <Badge v={s.name} map={SVC_CLS}/>
        <div style={{flex:1,fontSize:14,color:"var(--txt2)"}}>{s.desc}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div className="port-label">Port</div>
          <input className="port-inp" type="number" min={1025} max={65535} value={ports[s.key]} onChange={e=>setPorts(p=>({...p,[s.key]:+e.target.value}))}/>
        </div>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c1)",width:70}}>● RUNNING</span>
      </div>)}
      <div style={{marginTop:14,display:"flex",alignItems:"center",gap:12}}>
        <button className="btn btn-1" onClick={savePorts}>Save Port Config</button>
        {portSaved&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c1)"}}>✓ Saved! Use the command above to apply.</span>}
      </div>
    </div>

    {/* ── RED TEAM MANAGEMENT ── */}
    <NetworkAgentConsole/>
  </div>;
}

/* ── RED TEAM MANAGER (inside org control panel) ── */
function BlocklistPanel(){
  const [list,setList]=useState([]);const [ip,setIp]=useState("");
  useEffect(()=>{api("/blocklist").then(d=>Array.isArray(d)&&setList(d));},[]);
  async function add(){if(!ip) return;await api("/blocklist/add",{method:"POST",body:JSON.stringify({ip})});setList(p=>[...p,{ip,hits:1,last_seen:new Date().toISOString()}]);setIp("");}
  async function rem(i){await api("/blocklist/remove",{method:"POST",body:JSON.stringify({ip:i})});setList(p=>p.filter(x=>x.ip!==i));}
  return <div className="panel c2">
    <div className="ph">Blocklist</div>
    <div style={{display:"flex",gap:10,marginBottom:14}}><input className="inp" placeholder="IPv4 to block…" value={ip} onChange={e=>setIp(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} style={{flex:1}}/><button className="btn btn-2" onClick={add}>Block</button></div>
    <table className="tbl"><thead><tr><th>IP</th><th>Hits</th><th>Last Seen</th><th></th></tr></thead><tbody>
      {!list.length&&<tr><td colSpan={4} style={{textAlign:"center",color:"var(--txt4)",padding:20,fontFamily:"var(--mono)",fontSize:12}}>Blocklist empty</td></tr>}
      {list.map((b,i)=><tr key={i}><td style={{fontFamily:"var(--mono)",color:"var(--c2)",fontWeight:700}}>{b.ip}</td><td style={{fontFamily:"var(--mono)"}}>{b.hits}</td><td style={{color:"var(--txt3)"}}>{b.last_seen?.slice(0,19)}</td><td><button className="btn btn-4" style={{padding:"3px 10px",fontSize:10}} onClick={()=>rem(b.ip)}>Unblock</button></td></tr>)}
    </tbody></table>
  </div>;
}
export default ControlPanel;
/* ═══════════════════════════════════════════════════════════
   SUPERADMIN PANEL
═══════════════════════════════════════════════════════════ */