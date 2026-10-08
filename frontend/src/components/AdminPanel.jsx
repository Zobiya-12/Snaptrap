import { api, API, SVC_CLS, TYPE_CLS, tc } from "../constants";
import Badge from "./Badge";
import Loader from "./Loader";
import BarChart from "./BarChart";
import Battlefield from "./Battlefield";
import {TRing} from "./shared";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function AdminPanel(){
  const [tab,setTab]=useState("overview");
  const TABS=[{id:"overview",l:"Overview"},{id:"users",l:"Orgs & Users"},{id:"attacks",l:"Global Attacks"},{id:"ml",l:"ML & Benchmarks"},{id:"db",l:"Database"},{id:"orgview",l:"◉ View Org Dashboard"}];
  return <div>
    <div className="admin-tabs">{TABS.map(t=><button key={t.id} className={`a-tab ${tab===t.id?"on":""}`} onClick={()=>setTab(t.id)}>{t.l}</button>)}</div>
    <div className="content">
      {tab==="overview"&&<AdminOverview/>}
      {tab==="users"&&<AdminUsers/>}
      {tab==="attacks"&&<AdminAttacks/>}
      {tab==="ml"&&<AdminML/>}
      {tab==="db"&&<AdminDB/>}
      {tab==="orgview"&&<AdminOrgViewer/>}
    </div>
  </div>;
}

function AdminOverview(){
  const [gs,setGs]=useState(null);const [xo,setXo]=useState([]);const [orgs,setOrgs]=useState([]);
  useEffect(()=>{api("/admin/global-stats").then(setGs);api("/admin/cross-org-ips").then(d=>Array.isArray(d)&&setXo(d));api("/admin/organisations").then(d=>Array.isArray(d)&&setOrgs(d));},[]);
  const sd=gs?Object.entries(gs.by_service||{}).map(([l,c])=>({label:l,count:c})):[];
  const td=gs?Object.entries(gs.by_type||{}).map(([l,c])=>({label:l,count:c})):[];
  return <div>
    <div className="g4" style={{marginBottom:18}}>
      {[{l:"Total Attacks",v:gs?.total_attacks??0,c:"var(--c2)",acc:"c2"},{l:"Unique IPs",v:gs?.unique_ips??0,c:"var(--c4)",acc:"c4"},{l:"Organisations",v:orgs.length,c:"var(--c1)",acc:"c1"},{l:"Cross-Org IPs",v:xo.length,c:"var(--c3)",acc:"c3"}].map(({l,v,c,acc})=><div key={l} className={`panel ${acc}`}><div className="stat-v" style={{color:c}}>{v}</div><div className="stat-l">{l}</div></div>)}
    </div>
    <div className="g2" style={{marginBottom:18}}>
      <div className="panel"><div className="ph">Global by Service</div>{sd.length?<BarChart data={sd} ak="svc"/>:<Loader/>}</div>
      <div className="panel"><div className="ph">Global Attack Types</div>{td.length?<BarChart data={td} ak="type"/>:<Loader/>}</div>
    </div>
    {xo.length>0&&<div className="panel">
      <div className="ph">Cross-Org IPs — Coordinated Attacks <span style={{color:"var(--c2)",marginLeft:10}}>{xo.length} detected</span></div>
      <div style={{overflowX:"auto"}}><table className="tbl"><thead><tr><th>IP</th><th>Orgs Targeted</th><th>Total Hits</th><th>Max Score</th><th>Services</th></tr></thead>
        <tbody>{xo.slice(0,20).map((r,i)=><tr key={i}><td style={{color:"var(--c2)",fontWeight:700}}>{r.attacker_ip}</td><td style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c3)"}}>{r.org_count}</td><td style={{fontFamily:"var(--mono)",fontWeight:700}}>{r.total_hits}</td><td style={{fontFamily:"var(--mono)",color:r.max_score>=70?"var(--c2)":"var(--c1)"}}>{r.max_score}</td><td style={{color:"var(--txt3)"}}>{(r.services||[]).join(", ")}</td></tr>)}
        </tbody></table></div>
    </div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   ADMIN ORG VIEWER — fixed to properly load org data
═══════════════════════════════════════════════════════════ */
function AdminOrgViewer(){
  const [orgs,setOrgs]=useState([]);
  const [selOrg,setSelOrg]=useState(null);
  const [orgStats,setOrgStats]=useState(null);
  const [orgFeed,setOrgFeed]=useState([]);       // history feed for list
  const [orgLiveFeed,setOrgLiveFeed]=useState([]); // for battlefield (same data, different ref)
  const [sel,setSel]=useState(null);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{api("/admin/organisations").then(d=>Array.isArray(d)&&setOrgs(d.filter(o=>o.role!=="superadmin")));},[]);

  async function loadOrg(o){
    setSelOrg(o);setOrgStats(null);setOrgFeed([]);setOrgLiveFeed([]);setSel(null);setLoading(true);
    try {
      const [s,f]=await Promise.all([
        api(`/attacks/stats?org_id=${o.id}`),
        api(`/admin/global-attacks?org_id=${o.id}`),
      ]);
      setOrgStats(s);
      if(Array.isArray(f)){
        const attacks=f.slice(0,100);
        setOrgFeed(attacks);
        // For battlefield in superadmin view: pass all attacks but isLive=false (no XP/sounds)
        setOrgLiveFeed(attacks);
      }
    } finally { setLoading(false); }
  }

  const svcData=orgStats?Object.entries(orgStats.by_service||{}).map(([l,c])=>({label:l,count:c})):[];
  const typeData=orgStats?Object.entries(orgStats.by_type||{}).map(([l,c])=>({label:l,count:c})):[];

  return <div>
    <div style={{background:"var(--c5d)",border:"1px solid var(--c5b)",borderRadius:"var(--r)",padding:"12px 18px",fontFamily:"var(--mono)",fontSize:11,color:"var(--c5)",marginBottom:16}}>
      ◉ Superadmin — select any organisation to preview their dashboard
    </div>

    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:18}}>
      {orgs.map(o=><button key={o.id} className="org-pill"
        style={{borderColor:selOrg?.id===o.id?"var(--c5)":"var(--bdr2)",color:selOrg?.id===o.id?"var(--c5)":"var(--txt3)",background:selOrg?.id===o.id?"var(--c5d)":"transparent"}}
        onClick={()=>loadOrg(o)}>{o.name}</button>)}
      {!orgs.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)"}}>No organisations.</div>}
    </div>

    {selOrg&&<>
      <div style={{fontFamily:"var(--head)",fontSize:14,color:"var(--c5)",letterSpacing:"1.5px",marginBottom:14}}>◉ {selOrg.name} — Dashboard Preview</div>

      {loading?<Loader/>:<>
        {/* Battlefield + feed side by side */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 560px",gap:16,marginBottom:18,alignItems:"stretch"}}>
          {/* isLive=false → no XP earned, no sounds */}
          <Battlefield feed={orgLiveFeed} isLive={false}/>

          <div style={{height:520,display:"flex",flexDirection:"column",background:"var(--sur)",border:"1px solid var(--bdr2)",borderRadius:"var(--r2)",overflow:"hidden",boxShadow:"var(--sh)"}}>
            <div className="raid-bar">
              <div className="raid-t">◉ Attacks</div>
              <div className="live-chip" style={{color:"var(--c5)",borderColor:"var(--c5b)",background:"var(--c5d)"}}>
                <div className="live-dot" style={{background:"var(--c5)"}}/>SUPERADMIN VIEW
              </div>
            </div>
            <div style={{flex:1,overflowY:"scroll",minHeight:0}}>
              {!orgFeed.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:"24px 16px",textAlign:"center"}}>No attacks for this org.</div>}
              {orgFeed.map((a,i)=><div key={a.id} className={`ri ${i<3?"fresh":""}`} onClick={()=>setSel(sel?.id===a.id?null:a)}>
                <div className="rdot" style={{background:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}/>
                <span style={{color:"var(--txt4)",fontSize:10,width:50,flexShrink:0}}>{a.timestamp?.slice(11,19)}</span>
                <span className="ri-ip">{a.attacker_ip}</span>
                <Badge v={a.service} map={SVC_CLS}/>
                <Badge v={a.attack_type} map={TYPE_CLS}/>
              </div>)}
            </div>
            {sel&&<div style={{padding:12,borderTop:"1px solid var(--bdr2)",background:"var(--bg2)",flexShrink:0}}>
              <div className="drow"><span className="dk">IP</span><span className="dv">{sel.attacker_ip}</span></div>
              <div className="drow"><span className="dk">Score</span><span className="dv">{sel.threat_score}</span></div>
              {sel.payload&&<div className="pbox" style={{fontSize:11,maxHeight:50}}>{sel.payload}</div>}
            </div>}
          </div>
        </div>

        <div className="g4" style={{marginBottom:18}}>
          {[{l:"Attacks",v:orgStats?.total_attacks??0,c:"var(--c2)",acc:"c2"},{l:"Unique IPs",v:orgStats?.unique_ips??0,c:"var(--c4)",acc:"c4"},{l:"Avg Score",v:orgStats?.avg_threat_score??0,c:"var(--c3)",acc:"c3"},{l:"Types",v:typeData.length,c:"var(--c1)",acc:"c1"}].map(({l,v,c,acc})=><div key={l} className={`panel ${acc}`}><div className="stat-v" style={{color:c}}>{v}</div><div className="stat-l">{l}</div></div>)}
        </div>
        <div className="g2">
          <div className="panel"><div className="ph">By Service</div>{svcData.length?<BarChart data={svcData} ak="svc"/>:<Loader/>}</div>
          <div className="panel"><div className="ph">By Attack Type</div>{typeData.length?<BarChart data={typeData} ak="type"/>:<Loader/>}</div>
        </div>
      </>}
    </>}
  </div>;
}

function AdminUsers(){
  const [orgs,setOrgs]=useState([]);const [loading,setLoading]=useState(true);const [modal,setModal]=useState(false);
  const [nm,setNm]=useState("");const [em,setEm]=useState("");const [pw,setPw]=useState("");const [rl,setRl]=useState("org");const [merr,setMerr]=useState("");const [mbusy,setMbusy]=useState(false);
  useEffect(()=>{api("/admin/organisations").then(d=>{if(Array.isArray(d))setOrgs(d);setLoading(false);});},[]);
  async function del(id){if(!window.confirm("Delete this org?"))return;await api(`/admin/organisations/${id}`,{method:"DELETE"});setOrgs(p=>p.filter(o=>o.id!==id));}
  async function create(){if(!nm||!em||!pw){setMerr("All fields required");return;}setMbusy(true);setMerr("");const d=await api("/admin/organisations",{method:"POST",body:JSON.stringify({name:nm,email:em,password:pw,role:rl})});if(d.id){setOrgs(p=>[d,...p]);setModal(false);setNm("");setEm("");setPw("");}else{setMerr(d.error||"Failed");}setMbusy(false);}
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)"}}>{orgs.length} organisations</div>
      <button className="btn btn-4" onClick={()=>setModal(true)}>+ Add Organisation</button>
    </div>
    {modal&&<div className="modal-bg" onClick={()=>setModal(false)}><div className="modal" onClick={e=>e.stopPropagation()}>
      <div className="modal-t">Add Organisation</div>
      <div className="afield"><label className="lbl">Name</label><input className="inp" value={nm} onChange={e=>setNm(e.target.value)} placeholder="Company name"/></div>
      <div className="afield"><label className="lbl">Email</label><input className="inp" value={em} onChange={e=>setEm(e.target.value)} placeholder="admin@company.com"/></div>
      <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Temp password"/></div>
      <div className="afield"><label className="lbl">Role</label><select className="inp" value={rl} onChange={e=>setRl(e.target.value)}><option value="org">Organisation</option><option value="superadmin">Superadmin</option></select></div>
      {merr&&<div className="aerr">{merr}</div>}
      <div style={{display:"flex",gap:10,marginTop:14}}><button className="btn btn-4" onClick={create} disabled={mbusy}>{mbusy?"Creating…":"Create"}</button><button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button></div>
    </div></div>}
    <div className="panel" style={{padding:0}}>
      {loading?<Loader/>:<table className="tbl"><thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Attacks</th><th>Created</th><th>Token</th><th></th></tr></thead>
        <tbody>{orgs.map(o=><tr key={o.id}><td style={{color:"var(--txt3)"}}>{o.id}</td><td style={{fontWeight:700}}>{o.name}</td><td style={{color:"var(--c4)"}}>{o.email}</td><td><Badge v={o.role} map={{superadmin:"b5",org:"b4"}}/></td><td style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c2)"}}>{o.attack_count}</td><td style={{color:"var(--txt3)"}}>{o.created_at?.slice(0,10)}</td><td style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)"}}>{o.agent_token?.slice(0,10)}…</td><td>{o.role!=="superadmin"&&<button className="btn btn-2" style={{padding:"3px 10px",fontSize:10}} onClick={()=>del(o.id)}>Delete</button>}</td></tr>)}
        </tbody></table>}
    </div>
  </div>;
}

function AdminAttacks(){
  const [attacks,setAttacks]=useState([]);const [loading,setLoading]=useState(true);const [filter,setFilter]=useState("");
  const [sel,setSel]=useState(null);const [detail,setDetail]=useState(null);const [selOrg,setSelOrg]=useState("");const [orgs,setOrgs]=useState([]);
  useEffect(()=>{api("/admin/organisations").then(d=>Array.isArray(d)&&setOrgs(d));},[]);
  useEffect(()=>{setLoading(true);const oq=selOrg?`?org_id=${selOrg}`:"";api(`/admin/global-attacks${oq}`).then(d=>{if(Array.isArray(d))setAttacks(d);setLoading(false);});},[selOrg]);
  async function pick(a){if(sel?.id===a.id){setSel(null);setDetail(null);return;}setSel(a);setDetail(await api(`/attacks/${a.id}`));}
  async function del(id){await api(`/attacks/${id}`,{method:"DELETE"});setAttacks(p=>p.filter(a=>a.id!==id));setSel(null);setDetail(null);}

  async function dlCSV(){
    const tk=localStorage.getItem("st_token");
    const oq=selOrg?`?org_id=${selOrg}`:"";
    const resp=await fetch(`${API}/admin/export/csv${oq}`,{headers:{Authorization:`Bearer ${tk}`}});
    if(!resp.ok){const j=await resp.json();alert(j.error||"Export failed");return;}
    const blob=await resp.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="snaptrap_export.csv";a.click();URL.revokeObjectURL(url);
  }

  const filtered=attacks.filter(a=>!filter||[a.attacker_ip,a.service,a.attack_type,a.org_name,a.payload].some(v=>v?.toLowerCase().includes(filter.toLowerCase())));
  return <div>
    <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
      <input className="inp" placeholder="Filter by IP, service, type, org, payload…" value={filter} onChange={e=>setFilter(e.target.value)} style={{flex:1,minWidth:240}}/>
      <select className="inp" style={{width:200}} value={selOrg} onChange={e=>setSelOrg(e.target.value)}>
        <option value="">All Organisations</option>
        {orgs.filter(o=>o.role!=="superadmin").map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
      <button className="btn btn-1" onClick={dlCSV}>⬇ Export CSV</button>
      <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt4)",alignSelf:"center",whiteSpace:"nowrap"}}>{filtered.length} rows</span>
    </div>
    <div className="panel" style={{padding:0}}>
      <div style={{overflowX:"auto",maxHeight:440,overflowY:"auto"}}>
        {loading?<Loader/>:<table className="tbl"><thead><tr><th>#</th><th>Org</th><th>Time</th><th>IP</th><th>Service</th><th>Type</th><th>Payload</th><th>Score</th></tr></thead>
          <tbody>{filtered.map(a=><tr key={a.id} className={sel?.id===a.id?"sel":""} onClick={()=>pick(a)}>
            <td style={{color:"var(--txt3)"}}>{a.id}</td>
            <td style={{color:"var(--c5)",fontWeight:700,maxWidth:100,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.org_name}</td>
            <td style={{color:"var(--txt3)",whiteSpace:"nowrap"}}>{a.timestamp?.slice(11,19)}</td>
            <td style={{color:"var(--c4)",fontWeight:700}}>{a.attacker_ip}</td>
            <td><Badge v={a.service} map={SVC_CLS}/></td>
            <td><Badge v={a.attack_type} map={TYPE_CLS}/></td>
            <td style={{color:"var(--txt3)",maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.payload||"—"}</td>
            <td><span style={{fontFamily:"var(--head)",fontWeight:700,fontSize:13,color:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}>{a.threat_score}</span></td>
          </tr>)}</tbody></table>}
      </div>
    </div>
    {detail&&!detail.error&&<div className="detail">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <TRing score={detail.threat_score||0} size={64}/>
          <div><div style={{fontFamily:"var(--mono)",fontSize:14,fontWeight:700,color:"var(--c4)"}}>{detail.attacker_ip}</div><div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginTop:3}}>#{detail.id} · {detail.service}:{detail.port}</div></div>
        </div>
        <button className="btn btn-2" onClick={()=>del(detail.id)}>Delete</button>
      </div>
      <div className="g2"><div>{[["Service",detail.service],["Port",detail.port],["Time",detail.timestamp?.slice(0,19)],["Org",detail.org_id]].map(([k,v])=><div key={k} className="drow"><span className="dk">{k}</span><span className="dv">{v}</span></div>)}</div><div><div className="dk" style={{marginBottom:6}}>Payload</div><div className="pbox">{detail.payload||"—"}</div></div></div>
    </div>}
  </div>;
}

function AdminML(){
  const [preds,setPreds]=useState(null);const [bench,setBench]=useState([]);
  const [payload,setPayload]=useState("");const [svc,setSvc]=useState("HTTP");const [score,setScore]=useState(50);
  const [result,setResult]=useState(null);const [busy,setBusy]=useState(false);
  useEffect(()=>{api("/admin/ml-predictions").then(setPreds);api("/benchmarks").then(d=>Array.isArray(d)&&setBench(d));},[]);
  async function classify(){setBusy(true);setResult(null);const d=await api("/classify",{method:"POST",body:JSON.stringify({payload,service:svc,threat_score:score})});setResult(d);setBusy(false);}
  const latest=bench.slice(0,5);const base=latest.length?(latest[latest.length-1]?.events_per_sec||1):1;
  return <div className="g2">
    <div>
      <div className="panel" style={{marginBottom:18}}>
        <div className="ph">ML Distribution</div>
        {preds?<><BarChart data={preds.by_type?.map(t=>({label:t.type,count:t.count}))||[]} ak="type"/><div style={{display:"flex",gap:22,marginTop:14}}><div><div style={{fontFamily:"var(--head)",fontSize:24,fontWeight:700,color:"var(--c4)"}}>{preds.total}</div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:4,letterSpacing:"1px"}}>Classified</div></div><div><div style={{fontFamily:"var(--head)",fontSize:24,fontWeight:700,color:"var(--c1)"}}>{preds.accuracy}%</div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:4,letterSpacing:"1px"}}>Accuracy</div></div></div></>:<Loader/>}
      </div>
      <div className="panel">
        <div className="ph">HPC Benchmarks</div>
        {latest.length?<table className="tbl"><thead><tr><th>Threads</th><th>Events/s</th><th>Time(s)</th><th>Speedup</th></tr></thead><tbody>{[...latest].reverse().map((b,i)=>{const sp=(b.events_per_sec/base).toFixed(2);return<tr key={i}><td style={{color:"var(--c4)",fontWeight:700}}>{b.thread_count}</td><td style={{fontFamily:"var(--head)",fontSize:13}}>{b.events_per_sec?.toFixed(1)}</td><td style={{color:"var(--txt3)"}}>{b.test_duration?.toFixed(2)}</td><td style={{fontFamily:"var(--head)",fontWeight:700,color:sp>=4?"var(--c1)":sp>=2?"var(--c3)":"var(--txt3)"}}>{sp}x</td></tr>;})}</tbody></table>:<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",paddingTop:12}}>No benchmarks yet.</div>}
      </div>
    </div>
    <div className="panel">
      <div className="ph">Live Classifier</div>
      <div style={{marginBottom:12}}><label className="lbl">Payload</label><textarea className="inp" rows={5} value={payload} onChange={e=>setPayload(e.target.value)} placeholder="Paste any attack payload to classify…" style={{resize:"vertical"}}/></div>
      <div style={{display:"flex",gap:10,marginBottom:12}}><div style={{flex:1}}><label className="lbl">Service</label><select className="inp" value={svc} onChange={e=>setSvc(e.target.value)}>{["SSH","HTTP","FTP","DB"].map(s=><option key={s}>{s}</option>)}</select></div><div style={{flex:1}}><label className="lbl">Threat Score</label><input className="inp" type="number" min={0} max={100} value={score} onChange={e=>setScore(+e.target.value)}/></div></div>
      <button className="btn btn-4" style={{width:"100%"}} onClick={classify} disabled={busy||!payload}>{busy?"Classifying…":"Run Classifier →"}</button>
      {result&&!result.error&&<div style={{marginTop:12,background:"var(--bg2)",border:"1px solid var(--bdr2)",padding:14,borderRadius:"var(--r)"}}>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:12}}><Badge v={result.predicted_type} map={TYPE_CLS}/><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c1)",fontWeight:700}}>{Math.round(result.confidence*100)}% confidence</span></div>
        {Object.entries(result.breakdown||{}).sort((a,b)=>b[1]-a[1]).map(([k,v])=><div key={k} className="brow"><div className="blbl">{k}</div><div className="btrack"><div className="bfill" style={{width:`${v*100}%`,background:tc(k)}}/></div><div className="bcnt">{Math.round(v*100)}%</div></div>)}
      </div>}
      {result?.error&&<div className="aerr" style={{marginTop:10}}>⚠ {result.error}</div>}
    </div>
  </div>;
}

function AdminDB(){
  const [counts,setCounts]=useState(null);const [orgs,setOrgs]=useState([]);
  useEffect(()=>{api("/admin/db-tables").then(setCounts);api("/admin/organisations").then(d=>Array.isArray(d)&&setOrgs(d));},[]);
  async function dlCSV(orgId){
    const tk=localStorage.getItem("st_token");
    const oq=orgId?`?org_id=${orgId}`:"";
    const resp=await fetch(`${API}/admin/export/csv${oq}`,{headers:{Authorization:`Bearer ${tk}`}});
    if(!resp.ok){const j=await resp.json();alert(j.error||"Export failed");return;}
    const blob=await resp.blob();const url=URL.createObjectURL(blob);
    const a=document.createElement("a");a.href=url;a.download="snaptrap_export.csv";a.click();URL.revokeObjectURL(url);
  }
  return <div>
    <div className="g2" style={{marginBottom:18}}>
      <div className="panel c5"><div className="ph">Table Row Counts</div>{counts?Object.entries(counts).map(([k,v])=><div key={k} className="db-row"><span style={{color:"var(--txt3)",fontSize:11,textTransform:"uppercase",letterSpacing:".5px"}}>{k}</span><span style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c4)",fontSize:16}}>{v.toLocaleString()}</span></div>):<Loader/>}</div>
      <div className="panel"><div className="ph">Organisation Summary</div><table className="tbl"><thead><tr><th>#</th><th>Name</th><th>Role</th><th>Attacks</th><th>Joined</th></tr></thead><tbody>{orgs.map(o=><tr key={o.id}><td style={{color:"var(--txt3)"}}>{o.id}</td><td style={{fontWeight:700}}>{o.name}</td><td><Badge v={o.role} map={{superadmin:"b5",org:"b4"}}/></td><td style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c2)"}}>{o.attack_count}</td><td style={{color:"var(--txt3)"}}>{o.created_at?.slice(0,10)}</td></tr>)}</tbody></table></div>
    </div>
    <div className="panel" style={{borderColor:"var(--c5b)"}}>
      <div className="ph" style={{color:"var(--c5)"}}>Export Options</div>
      <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
        <button className="btn btn-5" onClick={()=>dlCSV(null)}>⬇ All Attacks (CSV)</button>
        {orgs.filter(o=>o.role!=="superadmin").map(o=><button key={o.id} className="btn btn-ghost" onClick={()=>dlCSV(o.id)}>⬇ {o.name}</button>)}
      </div>
    </div>
  </div>;
}
export default AdminPanel;
/* ═══════════════════════════════════════════════════════════
   ORG DASHBOARD SHELL
═══════════════════════════════════════════════════════════ */