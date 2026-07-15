import { SVC_CLS, TYPE_CLS } from "../constants";
import Badge from "./Badge";import React, { useState, useEffect, useRef, useCallback } from 'react';
function LandingLiveFeed(){
  const [rows,setRows]=useState([]);
  const IPS=["185.220.101.42","45.142.212.100","194.165.16.77","103.251.167.10","91.121.87.210","162.55.48.34","193.32.162.45","198.235.24.106","77.83.140.22","159.65.92.118"];
  const TYPES=["brute","scan","sqli","cred","slow"];
  const SVCS=["SSH","HTTP","DB","FTP"];
  useEffect(()=>{
    const t=setInterval(()=>{
      setRows(prev=>[{
        id:Date.now(),
        ip:IPS[Math.floor(Math.random()*IPS.length)],
        type:TYPES[Math.floor(Math.random()*TYPES.length)],
        svc:SVCS[Math.floor(Math.random()*SVCS.length)],
        score:20+Math.floor(Math.random()*80),
        ts:new Date().toLocaleTimeString('en-GB',{hour12:false}),
      },...prev].slice(0,7));
    },2000);
    return()=>clearInterval(t);
  },[]);
  return <div style={{overflow:"hidden"}}>
    {rows.map(r=><div key={r.id} className="ri" style={{animation:"fadeUp .3s ease",padding:"6px 14px"}}>
      <div className="rdot pulse" style={{background:r.score>=70?"#ff2d55":r.score>=40?"#ffb800":"#00e696",color:r.score>=70?"#ff2d55":r.score>=40?"#ffb800":"#00e696"}}/>
      <span style={{color:"var(--txt3)",fontSize:10,width:56,flexShrink:0}}>{r.ts}</span>
      <span className="ri-ip" style={{fontSize:11}}>{r.ip}</span>
      <Badge v={r.svc} map={SVC_CLS}/>
      <Badge v={r.type} map={TYPE_CLS}/>
    </div>)}
  </div>;
}
export default LandingLiveFeed; 