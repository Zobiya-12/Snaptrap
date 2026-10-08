
import { api } from "../constants";
import React, { useState, useEffect, useRef, useCallback } from 'react';
function NgrokPortalButton({compact=false}){
  const [status,setStatus]=useState("idle"); // idle | loading | found | error
  const [url,setUrl]=useState("");
  const [copied,setCopied]=useState(false);

  async function openPortal(){
    setStatus("loading");setUrl("");
    try{
      // ngrok local API is on port 4040
      const resp=await fetch("http://localhost:4040/api/tunnels",{headers:{"Content-Type":"application/json"}});
      if(!resp.ok) throw new Error("ngrok not running");
      const data=await resp.json();
      const tunnels=data.tunnels||[];
      // Prefer https tunnel pointed at frontend (port 3000)
      const frontend=tunnels.find(t=>t.proto==="https"&&(t.config?.addr?.includes("3000")||t.name==="frontend"));
      const any=tunnels.find(t=>t.proto==="https");
      const picked=frontend||any;
      if(!picked) throw new Error("No HTTPS tunnel found");
      setUrl(picked.public_url);
      setStatus("found");
      window.open(picked.public_url,"_blank");
    }catch(e){
      // Fallback: try the API to get the ngrok URL if stored
      const d=await api("/org/ngrok-url").catch(()=>({}));
      if(d.url){setUrl(d.url);setStatus("found");window.open(d.url,"_blank");}
      else setStatus("error");
    }
  }

  function copy(){
    navigator.clipboard.writeText(url).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  }

  if(compact){
    return <div style={{display:"flex",alignItems:"center",gap:6}}>
      <button className="btn btn-4" style={{padding:"4px 10px",fontSize:10}} onClick={openPortal} disabled={status==="loading"}>
        {status==="loading"?"⏳":"🌐"} ngrok
      </button>
      {status==="found"&&url&&<>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c4)",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</span>
        <button className="btn btn-4" style={{padding:"3px 8px",fontSize:10}} onClick={copy}>{copied?"✓":"Copy"}</button>
      </>}
      {status==="error"&&<span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)"}}>⚠ ngrok offline</span>}
    </div>;
  }

  return <div>
    <button className="sim-btn sim-btn-portal" onClick={openPortal} disabled={status==="loading"}>
      {status==="loading"?"⏳ Fetching URL…":"🌐 Open Live Portal"}
    </button>
    {status==="found"&&url&&<div className="portal-url">
      <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{url}</span>
      <button className="btn btn-4" style={{padding:"3px 10px",fontSize:10,flexShrink:0}} onClick={copy}>{copied?"✓ Copied!":"Copy"}</button>
      <button className="btn btn-1" style={{padding:"3px 10px",fontSize:10,flexShrink:0}} onClick={()=>window.open(url,"_blank")}>Open →</button>
    </div>}
    {status==="error"&&<div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginTop:8}}>
      ⚠ ngrok not detected. Run: <span style={{color:"var(--c4)"}}>docker compose --profile demo up -d</span>
    </div>}
  </div>;
}
export default NgrokPortalButton; 
/* ═══════════════════════════════════════════════════════════
   RED TEAM DASHBOARD — full shell for redteam role users
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   RED TEAM DASHBOARD
   Tabs: Simulate | Attack My Website | Live Results | Run History
═══════════════════════════════════════════════════════════ */