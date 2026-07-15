/* ═══════════════════════════════════════════════════════════
   LANDING DEMO BATTLEFIELD
═══════════════════════════════════════════════════════════ */
import { TYPE_XP, tc } from "../constants";
import AudioEngine from "../constants";
import e from 'cors';
import React, { useState, useEffect, useRef, useCallback } from 'react';
function LandingDemoBattlefield(){
  const cvRef=useRef(null); const animRef=useRef(null);
  const st=useRef({p:[],ex:[],tick:0});
  const W=760,H=360;
  const NODES=[
    {x:400,y:180,r:30,label:"SSH",col:"#00bfff"},
    {x:185,y:140,r:24,label:"HTTP",col:"#ffb800"},
    {x:635,y:120,r:24,label:"FTP",col:"#ffb800"},
    {x:185,y:260,r:24,label:"DB",col:"#ff2d55"},
    {x:635,y:260,r:24,label:"ML",col:"#b060ff"},
  ];
  const TYPES=["brute","scan","sqli","cred","slow"];
  const COLS={brute:"#ffb800",scan:"#00bfff",sqli:"#ff2d55",cred:"#b060ff",slow:"#00e696"};

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    const ctx=cv.getContext("2d");
    const DPR=Math.min(window.devicePixelRatio||1,2);
    cv.width=W*DPR; cv.height=H*DPR;
    cv.style.width=W+"px"; cv.style.height=H+"px";
    ctx.scale(DPR,DPR);
    const s=st.current;

    function spawnParticle(){
      const e=Math.floor(Math.random()*4);
      const ex=e===0?Math.random()*W:e===1?W+8:e===2?Math.random()*W:-8;
      const ey=e===0?-8:e===1?Math.random()*H:e===2?H+8:Math.random()*H;
      const type=TYPES[Math.floor(Math.random()*TYPES.length)];
      const col=COLS[type];
      const node=NODES[Math.floor(Math.random()*NODES.length)];
      s.p.push({x:ex,y:ey,tx:node.x+(Math.random()-.5)*6,ty:node.y+(Math.random()-.5)*6,
        node,col,spd:1+Math.random()*.8,trail:[],age:0,dead:false,op:1,
        wob:Math.random()*Math.PI*2,sz:3+Math.random()*2});
    }

    let spawnT=0;
    function loop(){
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle="#04060e"; ctx.fillRect(0,0,W,H);
      const vig=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.68);
      vig.addColorStop(0,"transparent"); vig.addColorStop(1,"rgba(0,0,0,.55)");
      ctx.fillStyle=vig; ctx.fillRect(0,0,W,H);
      s.tick++; spawnT++;
      if(spawnT%70===0) spawnParticle();
      ctx.save();
      for(let x=24;x<W;x+=40) for(let y=24;y<H;y+=40){
        ctx.beginPath();ctx.arc(x,y,1,0,Math.PI*2);
        ctx.fillStyle="rgba(0,230,150,.1)";ctx.fill();
      }
      ctx.restore();
      NODES.forEach(n=>{
        const pulse=.5+Math.sin(s.tick*.035+n.x*.01)*.5;
        ctx.save();
        ctx.globalAlpha=.18+pulse*.12;
        ctx.beginPath();ctx.arc(n.x,n.y,n.r+10,0,Math.PI*2);
        ctx.strokeStyle=n.col;ctx.lineWidth=1;ctx.stroke();
        ctx.globalAlpha=1;
        ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
        ctx.fillStyle=n.col+"20";ctx.fill();
        ctx.strokeStyle=n.col;ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle="#d0e4f8";ctx.font=`bold 9px 'Share Tech Mono',monospace`;
        ctx.textAlign="center";ctx.textBaseline="middle";
        ctx.fillText(n.label,n.x,n.y);
        ctx.restore();
      });
      s.p=s.p.filter(p=>p.op>.04);
      s.p.forEach(p=>{
        if(p.dead){p.op-=.04;return;}
        p.wob+=.055;
        p.trail.push({x:p.x,y:p.y});if(p.trail.length>12)p.trail.shift();
        p.trail.forEach((pt,i)=>{ctx.save();ctx.globalAlpha=(i/p.trail.length)*.15;ctx.beginPath();ctx.arc(pt.x,pt.y,.9,0,Math.PI*2);ctx.fillStyle=p.col;ctx.fill();ctx.restore();});
        const dx=p.tx-p.x,dy=p.ty-p.y,dist=Math.sqrt(dx*dx+dy*dy);
        if(dist<p.node.r+4){
          p.dead=true;
          const sh=[];for(let i=0;i<8;i++){const a=(Math.PI*2/8)*i;sh.push({x:p.x,y:p.y,vx:Math.cos(a)*(1.5+Math.random()*2.5),vy:Math.sin(a)*(1.5+Math.random()*2.5),a:1,r:1.5+Math.random()*1.5});}
          s.ex.push({sh,col:p.col,a:1});
          return;
        }
        const nx=dx/dist,ny=dy/dist;
        p.x+=(nx+Math.sin(p.wob)*.15)*p.spd; p.y+=(ny+Math.cos(p.wob)*.15)*p.spd;
        p.age++;if(p.age>800){p.dead=true;return;}
        ctx.save();ctx.globalAlpha=p.op;ctx.fillStyle=p.col;ctx.shadowColor=p.col;ctx.shadowBlur=4;
        ctx.beginPath();ctx.arc(p.x,p.y,p.sz,0,Math.PI*2);ctx.fill();ctx.restore();
      });
      s.ex=s.ex.filter(e=>e.a>.02);
      s.ex.forEach(e=>{e.a*=.86;e.sh.forEach(sh=>{sh.x+=sh.vx;sh.y+=sh.vy;sh.vx*=.9;sh.vy*=.9;sh.a*=.87;ctx.save();ctx.globalAlpha=sh.a;ctx.beginPath();ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2);ctx.fillStyle=e.col;ctx.shadowColor=e.col;ctx.shadowBlur=3;ctx.fill();ctx.restore();});});
      animRef.current=requestAnimationFrame(loop);
    }
    loop();
    return()=>cancelAnimationFrame(animRef.current);
  },[]);

  return <canvas ref={cvRef} style={{display:"block"}}/>;
}
export default LandingDemoBattlefield;