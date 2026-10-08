import { SVC_CLS } from "../constants";
import { pwStr, tc, sc } from "../constants";
import React, { useState, useEffect, useRef, useCallback } from 'react';
const Badge = ({v,map}) => <span className={`badge ${map?.[v]||"bd"}`}>{v||"—"}</span>;
const Loader = () => <div className="loader"><div className="spinner"/></div>;
const PWBar = ({pw}) => {
  const {s,lbl,col}=pwStr(pw);if(!pw)return null;
  return <div><div className="pw-bar">{[1,2,3,4,5].map(i=><div key={i} className="pw-seg" style={{background:i<=s?col:undefined}}/>)}</div><div style={{fontFamily:"var(--mono)",fontSize:10,marginTop:4,color:col}}>{lbl}</div></div>;
};
const TRing = ({score,size=64}) => {
  const r=size*.38,c=size/2,ci=2*Math.PI*r;
  const col=score>=70?"var(--c2)":score>=40?"var(--c3)":"var(--c1)";
  return <div className="tring" style={{width:size,height:size}}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
      <circle cx={c} cy={c} r={r} fill="none" stroke="var(--bg3)" strokeWidth="4"/>
      <circle cx={c} cy={c} r={r} fill="none" stroke={col} strokeWidth="4" strokeDasharray={ci} strokeDashoffset={ci*(1-score/100)} strokeLinecap="square" style={{transition:"stroke-dashoffset 1s ease"}}/>
    </svg>
    <div className="tring-v" style={{fontSize:size*.2,color:col}}>{score}</div>
  </div>;
};
const BarChart = ({data, ak}) => {
  const max=Math.max(...data.map(d=>d.count),1);
  return <div>{data.map(({label,count})=>{
    const col = ak==="type"?tc(label):sc(label)||"var(--c1)";
    return <div key={label} className="brow">
      <div className="blbl" title={label}>{label}</div>
      <div className="btrack"><div className="bfill" style={{width:`${(count/max)*100}%`,background:col}}/></div>
      <div className="bcnt">{count}</div>
    </div>;
  })}</div>;
};
const TLChart = ({data}) => {
  const max=Math.max(...data.map(d=>d.total),1);
  return <div className="tlwrap">{data.map((d,i)=><div key={i} className="tlcol">
    <div className="tlbar" style={{height:`${(d.total/max)*100}%`}}/>
    <div className="tllbl">{d.time?.slice(5,10)}</div>
  </div>)}</div>;
};
export { Badge, Loader, PWBar, TRing, BarChart, TLChart };
/* ═══════════════════════════════════════════════════════════
   BATTLEFIELD — wider canvas (900px), nodes scale to fit
   Only spawns particles for NEW attacks (since page load)
═══════════════════════════════════════════════════════════ */