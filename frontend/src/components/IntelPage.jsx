import { api, SVC_CLS, TYPE_CLS } from "../constants";
import Badge from "./Badge";
import Loader from "./Loader";
import BarChart from "./BarChart";
import BlocklistPanel from "./BlocklistPanel";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function IntelPage({user}){
  const [attackers,setAttackers]=useState([]);const [asel,setAsel]=useState(null);const [adet,setAdet]=useState(null);
  const [preds,setPreds]=useState(null);

  useEffect(()=>{
    api("/attackers").then(d=>Array.isArray(d)&&setAttackers(d));
    api("/predictions").then(setPreds);
  },[]);

  async function blockA(ip,e){e.stopPropagation();await api("/blocklist/add",{method:"POST",body:JSON.stringify({ip})});setAttackers(p=>p.map(a=>a.ip_address===ip?{...a,blocked:true}:a));}
  async function pickA(ip){if(asel===ip){setAsel(null);setAdet(null);return;}setAsel(ip);setAdet(await api(`/attackers/${encodeURIComponent(ip)}`));}

  const typeData=preds?preds.by_type?.map(t=>({label:t.type,count:t.count}))||[]:[];

  return <div className="content">
    {/* ML Distribution */}
    <div className="panel" style={{marginBottom:18}}>
      <div className="ph">◈ ML Attack Type Distribution</div>
      {preds?<>
        <div style={{display:"flex",gap:24,marginBottom:18}}>
          {[{v:preds.total,l:"Classified",c:"var(--c4)"},{v:`${preds.accuracy}%`,l:"Accuracy",c:"var(--c1)"}].map(({v,l,c})=><div key={l}><div style={{fontFamily:"var(--head)",fontSize:26,fontWeight:800,color:c}}>{v}</div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:4,letterSpacing:"1px"}}>{l}</div></div>)}
        </div>
        <BarChart data={typeData} ak="type"/>
      </>:<Loader/>}
    </div>

    {/* Threat Actors table */}
    <div className="panel" style={{padding:0,marginBottom:18}}>
      <div style={{padding:"12px 18px",borderBottom:"1px solid var(--bdr2)",background:"var(--bg2)",fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:"var(--txt3)"}}>Threat Actors ({attackers.length})</div>
      <div style={{overflowX:"auto",maxHeight:400,overflowY:"auto"}}>
        {!attackers.length?<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:24,textAlign:"center"}}>No attackers tracked yet.</div>:
        <table className="tbl">
          <thead><tr><th>IP Address</th><th>Risk</th><th>Hits</th><th>First Seen</th><th>Last Seen</th><th>Action</th></tr></thead>
          <tbody>{attackers.map(a=><tr key={a.id} className={asel===a.ip_address?"sel":""} onClick={()=>pickA(a.ip_address)}>
            <td style={{color:"var(--c4)",fontWeight:700}}>{a.ip_address}</td>
            <td><Badge v={a.risk_level} map={{high:"b2",medium:"b3",low:"b1"}}/></td>
            <td style={{fontFamily:"var(--head)",fontWeight:700,fontSize:14}}>{a.total_hits}</td>
            <td style={{color:"var(--txt3)"}}>{a.first_seen?.slice(0,19)}</td>
            <td style={{color:"var(--txt3)"}}>{a.last_seen?.slice(0,19)}</td>
            <td><button className="btn btn-2" style={{padding:"3px 10px",fontSize:10,opacity:a.blocked?.7:1}} onClick={e=>blockA(a.ip_address,e)}>{a.blocked?"Blocked":"Block"}</button></td>
          </tr>)}</tbody>
        </table>}
      </div>
    </div>
    {adet?.profile&&<div className="detail" style={{marginBottom:18}}>
      <div className="g2" style={{marginBottom:12}}>{[["IP",adet.profile.ip_address],["Risk",adet.profile.risk_level],["Hits",adet.profile.total_hits],["First",adet.profile.first_seen?.slice(0,19)],["Last",adet.profile.last_seen?.slice(0,19)]].map(([k,v])=><div key={k} className="drow"><span className="dk">{k}</span><span className="dv">{v||"—"}</span></div>)}</div>
      <div style={{maxHeight:180,overflowY:"auto"}}><table className="tbl"><thead><tr><th>#</th><th>Time</th><th>Service</th><th>Type</th><th>Score</th><th>Payload</th></tr></thead><tbody>{(adet.history||[]).map(h=><tr key={h.id}><td style={{color:"var(--txt3)"}}>{h.id}</td><td style={{color:"var(--txt3)"}}>{h.timestamp?.slice(11,19)}</td><td><Badge v={h.service} map={SVC_CLS}/></td><td><Badge v={h.attack_type} map={TYPE_CLS}/></td><td style={{fontFamily:"var(--head)",fontWeight:700,color:h.threat_score>=70?"var(--c2)":"var(--c1)"}}>{h.threat_score}</td><td style={{color:"var(--txt3)",maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{h.payload_preview}</td></tr>)}</tbody></table></div>
    </div>}
    <BlocklistPanel/>
  </div>;
}
export default IntelPage;
/* ═══════════════════════════════════════════════════════════
   MODULE 3 — OPERATOR XP + ACHIEVEMENTS
═══════════════════════════════════════════════════════════ */