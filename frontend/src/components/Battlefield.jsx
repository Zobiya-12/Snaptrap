import { TYPE_XP, tc } from "../constants";
import AudioEngine from "../constants";
import e from 'cors';
import React, { useState, useEffect, useRef, useCallback } from 'react';
function Battlefield({feed, onHit, isLive=true}) {
  // W=900 gives a wider canvas. Nodes are repositioned proportionally.
  const W=900, H=460;
  const cvRef=useRef(null), wRef=useRef(null), canvasWrapRef=useRef(null), animRef=useRef(null);
  const st=useRef({p:[],ex:[],bm:[],rg:[],tick:0});

  // Node positions scaled to the new wider canvas
  const NODES=[
    {x:450,y:230,r:30,label:"SSH",  port:"22",   col:"#00bfff"},
    {x:130, y:105, r:24,label:"HTTP",port:"80",   col:"#ffb800"},
    {x:770, y:105, r:24,label:"FTP", port:"21",   col:"#ffb800"},
    {x:130, y:355,r:24,label:"DB",  port:"3306", col:"#ff2d55"},
    {x:770, y:355,r:24,label:"ML",  port:"clf",  col:"#b060ff"},
  ];
  const AM={brute:{col:"#ffb800",sh:"tri"},scan:{col:"#00bfff",sh:"sq"},sqli:{col:"#ff2d55",sh:"hex"},cred:{col:"#b060ff",sh:"dia"},slow:{col:"#00e696",sh:"cir"},unknown:{col:"#3a5070",sh:"cir"}};

  function triggerVibrate(){
    const el=canvasWrapRef.current; if(!el) return;
    el.classList.remove("hit");
    void el.offsetWidth;
    el.classList.add("hit");
    setTimeout(()=>el.classList.remove("hit"),130);
  }

  // Spawn ALL attacks in the incoming batch as particles.
  // The parent (LiveMonitor) guarantees this is always a FRESH batch of new attacks only.
  // No dedup needed here — every item is new.
  useEffect(()=>{
    if(!feed?.length) return;
    const s=st.current;
    feed.forEach(atk=>{
      const e=Math.floor(Math.random()*4);
      const ex=e===0?Math.random()*W:e===1?W+8:e===2?Math.random()*W:-8;
      const ey=e===0?-8:e===1?Math.random()*H:e===2?H+8:Math.random()*H;
      const type=atk.attack_type||"unknown";
      const am=AM[type]||AM.unknown;
      const node=NODES.find(n=>n.label===atk.service)||NODES[0];
      s.p.push({
        x:ex+(Math.random()-.5)*20, y:ey+(Math.random()-.5)*20,
        tx:node.x+(Math.random()-.5)*8, ty:node.y+(Math.random()-.5)*8,
        node,am,type,
        spd:type==="slow"?.6:type==="scan"?2.8:1.4+Math.random()*1.2,
        trail:[],age:0,dead:false,op:1,
        wob:Math.random()*Math.PI*2, sz:3+Math.random()*2.5,
        xpV:TYPE_XP[type]||50
      });
    });
  },[feed]);

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    const DPR=Math.min(window.devicePixelRatio||1,2);
    cv.width=W*DPR; cv.height=H*DPR;
    cv.style.width=W+"px"; cv.style.height=H+"px";
    ctx.scale(DPR,DPR);
    const s=st.current;

    function grid(){
      ctx.save();
      for(let x=20;x<W;x+=44) for(let y=20;y<H;y+=44){
        ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);
        ctx.fillStyle="rgba(0,230,150,.1)";ctx.fill();
      }
      const scanY=((s.tick*1.2)%H);
      ctx.fillStyle="rgba(0,230,150,.035)";
      ctx.fillRect(0,scanY,W,2);
      ctx.restore();
    }

    function drawNode(n){
      const pulse=.45+Math.sin(s.tick*.038+n.x*.012)*.45;
      ctx.save();
      ctx.globalAlpha=.12+pulse*.14;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r+13,0,Math.PI*2);
      ctx.strokeStyle=n.col;ctx.lineWidth=1;ctx.stroke();
      ctx.globalAlpha=.06+pulse*.08;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r+22,0,Math.PI*2);
      ctx.strokeStyle=n.col;ctx.lineWidth=.5;ctx.stroke();
      ctx.globalAlpha=1;
      ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
      ctx.fillStyle=n.col+"1a";ctx.fill();
      ctx.strokeStyle=n.col;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle="#d8eeff";ctx.font=`bold 10px 'Share Tech Mono',monospace`;
      ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillText(n.label,n.x,n.y-4);
      ctx.fillStyle="#3a5878";ctx.font=`7px 'Share Tech Mono',monospace`;
      ctx.fillText(":"+n.port,n.x,n.y+9);
      ctx.restore();
    }

    function drawPart(p){
      const {x,y,am,sz,op}=p;
      ctx.save();ctx.globalAlpha=op;
      ctx.fillStyle=am.col;
      ctx.shadowColor=am.col;ctx.shadowBlur=5;
      ctx.beginPath();
      if(am.sh==="tri"){ctx.moveTo(x,y-sz);ctx.lineTo(x+sz*.87,y+sz*.5);ctx.lineTo(x-sz*.87,y+sz*.5);ctx.closePath();}
      else if(am.sh==="sq"){ctx.rect(x-sz*.78,y-sz*.78,sz*1.56,sz*1.56);}
      else if(am.sh==="hex"){for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;i===0?ctx.moveTo(x+sz*Math.cos(a),y+sz*Math.sin(a)):ctx.lineTo(x+sz*Math.cos(a),y+sz*Math.sin(a));}ctx.closePath();}
      else if(am.sh==="dia"){ctx.moveTo(x,y-sz);ctx.lineTo(x+sz*.8,y);ctx.lineTo(x,y+sz);ctx.lineTo(x-sz*.8,y);ctx.closePath();}
      else{ctx.arc(x,y,sz,0,Math.PI*2);}
      ctx.fill();ctx.restore();
    }

    function burst(x,y,col){
      const sh=[];
      for(let i=0;i<12;i++){const a=(Math.PI*2/12)*i;sh.push({x,y,vx:Math.cos(a)*(1.8+Math.random()*3.5),vy:Math.sin(a)*(1.8+Math.random()*3.5),a:1,r:1.5+Math.random()*2});}
      s.ex.push({x,y,col,a:1,sh});
      s.rg.push({x,y,col,r:0,a:.65});
      s.rg.push({x,y,col,r:0,a:.35,delay:6});
    }

    function xpPop(cx,cy,xpV,col,type){
      if(!wRef.current) return;
      const rect=cv.getBoundingClientRect(),wRect=wRef.current.getBoundingClientRect();
      const sx=rect.width/W,sy=rect.height/H;
      const el=document.createElement("div");
      el.className="xp-pop";el.textContent=`+${xpV} XP`;
      el.style.left=`${cx*sx+(rect.left-wRect.left)-24}px`;
      el.style.top=`${cy*sy+(rect.top-wRect.top)-16}px`;
      el.style.color=col;
      wRef.current.appendChild(el);setTimeout(()=>el.remove(),1100);
      if(isLive) {
        AudioEngine.playImpact(type);
        AudioEngine.playXP();
        if(onHit) onHit(xpV);
      }
      triggerVibrate();
    }

    function loop(){
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#04060e";ctx.fillRect(0,0,W,H);
      const vig=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.7);
      vig.addColorStop(0,"transparent");vig.addColorStop(1,"rgba(0,0,0,.55)");
      ctx.fillStyle=vig;ctx.fillRect(0,0,W,H);
      s.tick++;
      grid();
      s.bm=s.bm.filter(b=>b.a>.02);
      s.bm.forEach(b=>{b.a*=.76;ctx.save();ctx.globalAlpha=b.a;ctx.beginPath();ctx.moveTo(b.x1,b.y1);ctx.lineTo(b.x2,b.y2);ctx.strokeStyle=b.col;ctx.lineWidth=1.5;ctx.shadowColor=b.col;ctx.shadowBlur=6;ctx.stroke();ctx.restore();});
      s.rg=s.rg.filter(r=>r.a>.02);
      s.rg.forEach(r=>{if(r.delay&&r.delay-->0)return;r.r+=5.5;r.a*=.8;ctx.save();ctx.globalAlpha=r.a;ctx.beginPath();ctx.arc(r.x,r.y,r.r,0,Math.PI*2);ctx.strokeStyle=r.col;ctx.lineWidth=1;ctx.stroke();ctx.restore();});
      NODES.forEach(n=>drawNode(n));
      s.p=s.p.filter(p=>p.op>.04);
      s.p.forEach(p=>{
        if(p.dead){p.op-=.038;return;}
        p.wob+=.055;
        p.trail.push({x:p.x,y:p.y});
        if(p.trail.length>16) p.trail.shift();
        p.trail.forEach((pt,i)=>{ctx.save();ctx.globalAlpha=(i/p.trail.length)*.2;ctx.beginPath();ctx.arc(pt.x,pt.y,1,0,Math.PI*2);ctx.fillStyle=p.am.col;ctx.fill();ctx.restore();});
        const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<p.node.r+5){
          p.dead=true;burst(p.x,p.y,p.am.col);
          s.bm.push({x1:p.x,y1:p.y,x2:p.node.x,y2:p.node.y,col:p.am.col,a:.9});
          xpPop(p.x,p.y,p.xpV,p.am.col,p.type);return;
        }
        const nx=dx/dist,ny=dy/dist;
        p.x+=(nx+Math.sin(p.wob)*.15)*p.spd;
        p.y+=(ny+Math.cos(p.wob)*.15)*p.spd;
        p.age++;if(p.age>1200){p.dead=true;return;}
        drawPart(p);
      });
      s.ex=s.ex.filter(e=>e.a>.02);
      s.ex.forEach(e=>{e.a*=.85;e.sh.forEach(sh=>{sh.x+=sh.vx;sh.y+=sh.vy;sh.vx*=.88;sh.vy*=.88;sh.a*=.86;ctx.save();ctx.globalAlpha=sh.a;ctx.beginPath();ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2);ctx.fillStyle=e.col;ctx.shadowColor=e.col;ctx.shadowBlur=4;ctx.fill();ctx.restore();});});
      animRef.current=requestAnimationFrame(loop);
    }
    loop();
    return()=>cancelAnimationFrame(animRef.current);
  },[]);

  return <div className="bf-wrap">
    <div ref={wRef} style={{position:"relative",width:"100%"}}>
      <div className="bf-topbar">
        <div className="bf-title">◉ Live Battlefield</div>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)"}}>{feed?.length||0} tracked</div>
      </div>
      {/* canvas scrolls horizontally if viewport is narrow */}
      <div ref={canvasWrapRef} className="bf-canvas-wrap" style={{overflowX:"auto"}}>
        <canvas ref={cvRef} style={{display:"block"}}/>
      </div>
      <div className="bf-legs">
        {[["brute","Brute","▲"],["scan","Scan","■"],["sqli","SQLi","⬡"],["cred","Cred","◆"],["slow","Slow","●"]].map(([t,l,sh])=><div key={t} className="bf-leg"><span style={{color:tc(t),fontWeight:700,fontSize:11}}>{sh}</span>{l}</div>)}
      </div>
    </div>
  </div>;
}


export default Battlefield;