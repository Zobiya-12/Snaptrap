import React, { useState, useEffect, useRef, useCallback } from 'react';
export const API = process.env.REACT_APP_API_URL || "http://192.168.1.19:5000/api";
export const triggerLoginFetch = () => {
    return fetch(`${API}/auth/login`)
        .then(res => res.json())
        .catch(err => console.error("API Fetch failed:", err));
};
/* ─────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────── */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

/* ═══ SNAPTRAP — editorial system (matches landing): Instrument Serif + JetBrains Mono, hairline square UI ═══ */
:root,[data-theme="dark"]{
  --bg:#070b13;--bg1:#070b13;--bg2:#0a101c;--bg3:#121a2b;
  --sur:#0c1220;--sur2:#101829;
  --bdr:rgba(232,237,247,.08);--bdr2:rgba(232,237,247,.16);--bdr3:rgba(232,237,247,.45);
  --c1:#00e696;--c1d:rgba(0,230,150,.08);--c1b:rgba(0,230,150,.32);
  --c2:#ff2d55;--c2d:rgba(255,45,85,.08);--c2b:rgba(255,45,85,.32);
  --c3:#ffb800;--c3d:rgba(255,184,0,.08);--c3b:rgba(255,184,0,.32);
  --c4:#00bfff;--c4d:rgba(0,191,255,.08);--c4b:rgba(0,191,255,.32);
  --c5:#b060ff;--c5d:rgba(176,96,255,.08);--c5b:rgba(176,96,255,.32);
  --on-c1:#03140d;--on-c2:#ffffff;--on-c3:#1a1200;--on-c4:#001018;--on-c5:#ffffff;
  --acc:#00e696;--acc-d:rgba(0,230,150,.08);--acc-b:rgba(0,230,150,.32);--on-acc:#03140d;
  --txt:#e8edf7;--txt2:#b6c1d4;--txt3:#8190a8;--txt4:#56647c;
  --nav-bg:#070b13;--rule:rgba(232,237,247,.5);
  --sh:none;--sh2:0 24px 60px rgba(0,0,0,.6);
  --glow1:none;
  --r:0px;--r2:0px;
  --mono:'JetBrains Mono',ui-monospace,Menlo,monospace;--head:'Instrument Serif',Georgia,serif;--sans:'JetBrains Mono',ui-monospace,Menlo,monospace;
  --cv:#070b13;
}
[data-theme="light"]{
  --bg:#ece8df;--bg1:#ece8df;--bg2:#f1ede4;--bg3:#d9d3c5;
  --sur:#e4dfd4;--sur2:#ddd7ca;
  --bdr:rgba(20,20,20,.09);--bdr2:rgba(20,20,20,.18);--bdr3:rgba(20,20,20,.4);
  --c1:#007a50;--c1d:rgba(0,122,80,.08);--c1b:rgba(0,122,80,.32);
  --c2:#c0002e;--c2d:rgba(192,0,46,.07);--c2b:rgba(192,0,46,.3);
  --c3:#8a5e00;--c3d:rgba(138,94,0,.08);--c3b:rgba(138,94,0,.3);
  --c4:#005b8a;--c4d:rgba(0,91,138,.07);--c4b:rgba(0,91,138,.3);
  --c5:#5a1a9a;--c5d:rgba(90,26,154,.07);--c5b:rgba(90,26,154,.3);
  --on-c1:#f4f1ea;--on-c2:#f4f1ea;--on-c3:#f4f1ea;--on-c4:#f4f1ea;--on-c5:#f4f1ea;
  --acc:#cf3a0c;--acc-d:rgba(207,58,12,.08);--acc-b:rgba(207,58,12,.32);--on-acc:#f4f1ea;
  --txt:#141414;--txt2:#2b2923;--txt3:#5c574e;--txt4:#7a746a;
  --nav-bg:#ece8df;--rule:rgba(20,20,20,.85);
  --sh:none;--sh2:0 18px 48px rgba(20,20,20,.18);
  --glow1:none;--cv:#e4dfd4;
}

html,body,#root{min-height:100%;background:var(--bg);color:var(--txt);font-family:var(--mono);overflow-x:hidden;font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
html,body{height:auto}
::selection{background:var(--acc);color:var(--on-acc)}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--bdr3)}
button{font-family:inherit}
:focus-visible{outline:2px solid var(--acc);outline-offset:2px}

@keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideDown{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.25}}
@keyframes xpFloat{0%{opacity:1;transform:translateY(0) scale(1.2)}100%{opacity:0;transform:translateY(-60px) scale(.9)}}
@keyframes ripple{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.6);opacity:0}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes flicker{0%,100%{opacity:1}}
@keyframes glow-pulse{0%,100%{border-color:var(--c1b)}50%{border-color:var(--c1)}}
@keyframes typewriter{from{width:0}to{width:100%}}
@keyframes radar{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}

/* ── EDITORIAL PRIMITIVES ── */
.eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--acc);display:flex;align-items:center;gap:10px;margin-bottom:10px}
.eyebrow::before{content:'§';color:var(--acc)}
.sec-title{font-family:var(--head);font-weight:400;font-size:clamp(32px,4vw,48px);line-height:1.02;letter-spacing:-.01em;color:var(--txt)}
.sec-title em{font-style:italic;color:var(--acc)}
.sec-sub{font-size:12px;color:var(--txt3);line-height:1.7;margin-top:8px;max-width:640px}
.page-head{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding-bottom:20px;margin-bottom:24px;border-bottom:1px solid var(--bdr3);flex-wrap:wrap}

/* ── LAYOUT ── */
.page{min-height:100vh;display:flex;flex-direction:column;background:var(--bg)}
.content{flex:1;padding:24px 20px;max-width:1400px;margin:0 auto;width:100%}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}

/* ── TOPBAR ── */
.topbar{height:56px;display:flex;align-items:center;padding:0 20px;gap:14px;background:var(--nav-bg);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:200}
.logo{display:flex;align-items:center;gap:10px;font-family:var(--head);font-size:24px;font-weight:400;line-height:1;color:var(--txt);letter-spacing:0;white-space:nowrap}
.logo::before{content:'';width:12px;height:12px;background:var(--acc);flex-shrink:0}
.logo em{font-style:normal;color:inherit}
.tb-div{width:1px;height:22px;background:var(--bdr2)}
.tb-r{display:flex;align-items:center;gap:10px;margin-left:auto}
.live-chip{display:flex;align-items:center;gap:8px;font-size:10px;color:var(--c1);background:transparent;border:1px solid var(--c1b);padding:4px 10px;letter-spacing:.16em;white-space:nowrap;text-transform:uppercase}
.live-dot{width:6px;height:6px;background:var(--c1);animation:pulse 1.4s infinite}
.theme-btn{width:32px;height:32px;border:1px solid var(--bdr2);background:transparent;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--txt);transition:border-color .15s}
.theme-btn:hover{border-color:var(--rule)}
.alert-bar{padding:8px 20px;font-size:11px;text-transform:uppercase;letter-spacing:.16em;display:flex;align-items:center;gap:10px}
.alert-bar.crit{background:var(--c2d);border-bottom:1px solid var(--c2b);color:var(--c2)}
.alert-bar.warn{background:var(--c3d);border-bottom:1px solid var(--c3b);color:var(--c3)}

/* ── MODULE NAV ── */
.mnav{display:flex;background:var(--nav-bg);border-bottom:1px solid var(--bdr2);padding:0 20px;overflow-x:auto;gap:0}
.mtab{font-size:11px;padding:14px 18px;cursor:pointer;border:none;background:none;color:var(--txt3);text-transform:uppercase;transition:color .15s;position:relative;white-space:nowrap;letter-spacing:.16em}
.mtab::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--acc);transform:scaleX(0);transition:transform .2s}
.mtab:hover{color:var(--txt)}.mtab.on{color:var(--txt)}.mtab.on::after{transform:scaleX(1)}

/* ── PANEL ── */
.panel{--pc:var(--acc);background:var(--sur);border:1px solid var(--bdr2);padding:20px;animation:fadeUp .3s ease both;position:relative;overflow:hidden}
.panel.c1{border-top:2px solid var(--c1);--pc:var(--c1)}.panel.c2{border-top:2px solid var(--c2);--pc:var(--c2)}.panel.c3{border-top:2px solid var(--c3);--pc:var(--c3)}.panel.c4{border-top:2px solid var(--c4);--pc:var(--c4)}.panel.c5{border-top:2px solid var(--c5);--pc:var(--c5)}
.panel.glow{animation:glow-pulse 3s ease-in-out infinite}
.ph{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.ph::before{content:'';width:6px;height:6px;background:var(--pc,var(--acc));flex-shrink:0}
.ph::after{content:'';flex:1;height:1px;background:var(--bdr2)}

/* ── STAT CARD ── */
.stat-v{font-family:var(--head);font-size:46px;font-weight:400;line-height:1;margin-bottom:6px;font-variant-numeric:tabular-nums}
.stat-l{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3)}

/* ── BADGE ── */
.badge{display:inline-block;padding:3px 8px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;font-weight:600}
.b1{background:var(--c1d);color:var(--c1);border:1px solid var(--c1b)}
.b2{background:var(--c2d);color:var(--c2);border:1px solid var(--c2b)}
.b3{background:var(--c3d);color:var(--c3);border:1px solid var(--c3b)}
.b4{background:var(--c4d);color:var(--c4);border:1px solid var(--c4b)}
.b5{background:var(--c5d);color:var(--c5);border:1px solid var(--c5b)}
.bd{background:transparent;color:var(--txt3);border:1px solid var(--bdr2)}

/* ── TABLE ── */
.tbl{width:100%;border-collapse:collapse;font-size:12px}
.tbl th{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);font-weight:500;padding:10px 12px;text-align:left;border-bottom:1px solid var(--rule);background:transparent;white-space:nowrap}
.tbl td{padding:10px 12px;border-bottom:1px solid var(--bdr);vertical-align:middle;color:var(--txt)}
.tbl tr{cursor:pointer;transition:background .1s}.tbl tr:hover td{background:var(--acc-d)}.tbl tr.sel td{background:var(--acc-d)}.tbl tr.sel td:first-child{box-shadow:inset 2px 0 0 var(--acc)}

/* ── FORMS ── */
.inp{background:transparent;border:1px solid var(--bdr3);color:var(--txt);font-family:var(--mono);font-size:13px;padding:10px 12px;outline:none;width:100%;border-radius:0;transition:border-color .15s,background .15s}
.inp:focus{border-color:var(--acc);background:var(--acc-d)}.inp::placeholder{color:var(--txt4)}
select.inp{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--txt3) 50%),linear-gradient(135deg,var(--txt3) 50%,transparent 50%);background-position:calc(100% - 16px) 50%,calc(100% - 11px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:30px}
.lbl{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);display:block;margin-bottom:6px}
.btn{font-family:var(--mono);font-size:11px;letter-spacing:.12em;padding:9px 16px;cursor:pointer;border:1px solid;border-radius:0;transition:background .15s,color .15s,opacity .15s;font-weight:600;text-transform:uppercase;white-space:nowrap;background:transparent}
.btn:disabled{opacity:.4;cursor:not-allowed}
.btn-1{border-color:var(--acc);color:var(--acc)}.btn-1:hover:not(:disabled){background:var(--acc);color:var(--on-acc)}
.btn-2{border-color:var(--c2);color:var(--c2)}.btn-2:hover:not(:disabled){background:var(--c2);color:var(--on-c2)}
.btn-3{border-color:var(--c3);color:var(--c3)}.btn-3:hover:not(:disabled){background:var(--c3);color:var(--on-c3)}
.btn-4{border-color:var(--c4);color:var(--c4)}.btn-4:hover:not(:disabled){background:var(--c4);color:var(--on-c4)}
.btn-5{border-color:var(--c5);color:var(--c5)}.btn-5:hover:not(:disabled){background:var(--c5);color:var(--on-c5)}
.btn-ghost{border-color:var(--bdr3);color:var(--txt2)}.btn-ghost:hover:not(:disabled){background:var(--txt);color:var(--bg);border-color:var(--txt)}
.btn.solid.btn-1{background:var(--acc);color:var(--on-acc)}.btn.solid.btn-1:hover:not(:disabled){opacity:.85}
.btn.solid.btn-2{background:var(--c2);color:var(--on-c2)}.btn.solid.btn-3{background:var(--c3);color:var(--on-c3)}.btn.solid.btn-4{background:var(--c4);color:var(--on-c4)}.btn.solid.btn-5{background:var(--c5);color:var(--on-c5)}
.btn.solid:hover:not(:disabled){opacity:.85}

/* ── DETAIL EXPAND ── */
.detail{background:var(--bg2);border:1px solid var(--bdr2);border-left:2px solid var(--acc);padding:16px;margin-top:10px;animation:slideDown .2s ease}
.drow{display:flex;gap:12px;margin-bottom:8px;font-size:12px}
.dk{color:var(--txt3);width:90px;flex-shrink:0;font-size:10px;letter-spacing:.16em;text-transform:uppercase;padding-top:2px}
.dv{color:var(--txt);font-weight:500;word-break:break-all}
.pbox{background:var(--bg2);border:1px solid var(--bdr2);border-left:2px solid var(--acc);padding:12px;font-size:12px;color:var(--c1);line-height:1.8;word-break:break-all;margin-top:6px;max-height:90px;overflow-y:auto}

/* ── CHARTS ── */
.brow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.blbl{font-size:11px;color:var(--txt2);width:62px;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btrack{flex:1;height:6px;background:var(--bg3);overflow:hidden}
.bfill{height:100%;transition:width 1.2s cubic-bezier(.19,1,.22,1)}
.bcnt{font-size:11px;color:var(--txt2);width:32px;text-align:right;flex-shrink:0}
.tlwrap{height:80px;display:flex;align-items:flex-end;gap:3px}
.tlcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end}
.tlbar{width:100%;background:var(--acc);opacity:.7;min-height:2px;transition:height .8s}
.tllbl{font-size:8px;color:var(--txt3);writing-mode:vertical-rl}

/* ── LOADER ── */
.loader{display:flex;align-items:center;justify-content:center;height:70px}
.spinner{width:20px;height:20px;border:2px solid var(--bdr2);border-top-color:var(--acc);border-radius:50%;animation:spin .7s linear infinite}

/* ── THREAT RING ── */
.tring{position:relative;display:inline-flex;align-items:center;justify-content:center}
.tring-v{position:absolute;font-family:var(--head);font-weight:400}

/* ── BATTLEFIELD ── */
.bf-wrap{background:var(--sur);border:1px solid var(--bdr2);overflow:hidden;display:inline-block;vertical-align:top;width:100%}
.bf-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:transparent;border-bottom:1px solid var(--bdr2);width:100%}
.bf-title{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt2)}
.bf-legs{display:flex;background:transparent;border-top:1px solid var(--bdr);width:100%}
.bf-leg{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--txt2);padding:8px 0;border-right:1px solid var(--bdr)}.bf-leg:last-child{border-right:none}
.xp-pop{position:absolute;pointer-events:none;font-family:var(--head);font-size:16px;font-weight:400;color:var(--acc);z-index:50;animation:xpFloat 1s ease forwards;white-space:nowrap}
@keyframes vibrate{0%,100%{transform:translate(0,0)}20%{transform:translate(-1px,1px)}40%{transform:translate(1px,-1px)}60%{transform:translate(-1px,-1px)}80%{transform:translate(1px,1px)}}
.bf-canvas-wrap{position:relative}
.bf-canvas-wrap.hit{animation:vibrate .12s ease}

/* ── RAID FEED ── */
.raid-card{background:var(--sur);border:1px solid var(--bdr2);overflow:hidden;display:flex;flex-direction:column;height:100%}
.raid-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:transparent;border-bottom:1px solid var(--bdr2);flex-shrink:0}
.raid-t{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt2)}
.raid-scroll{overflow-y:scroll;flex:1;min-height:0}
.ri{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--bdr);cursor:pointer;transition:background .1s;font-size:11px;color:var(--txt2)}
.ri:hover{background:var(--acc-d)}.ri.fresh{background:var(--c1d)}
.rdot{width:7px;height:7px;flex-shrink:0;position:relative}
.rdot.pulse::after{content:'';position:absolute;inset:-3px;border:1px solid currentColor;animation:ripple 2s ease-out infinite}
.ri-ip{flex:1;color:var(--c4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.raid-det{padding:12px;border-top:1px solid var(--bdr2);background:var(--bg2);flex-shrink:0;max-height:130px;overflow-y:auto}

/* ── AUTH (editorial split) ── */
.au{min-height:100vh;background:var(--bg);color:var(--txt);display:flex;flex-direction:column}
.au-nav{height:56px;display:flex;align-items:center;gap:16px;padding:0 20px;background:var(--nav-bg);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:50}
.au-back{font-size:11px;text-transform:uppercase;letter-spacing:.16em;color:var(--txt3);background:none;border:0;cursor:pointer;transition:color .15s}
.au-back:hover{color:var(--txt)}
.au-main{flex:1;display:grid;grid-template-columns:1.05fr .95fr;max-width:1400px;width:100%;margin:0 auto}
.au-left{padding:56px 40px 48px 20px;display:flex;flex-direction:column;justify-content:space-between;gap:40px;border-right:1px solid var(--bdr2)}
.au-h1{font-family:var(--head);font-weight:400;font-size:clamp(44px,6.4vw,92px);line-height:.96;letter-spacing:-.02em;margin:6px 0 24px}
.au-h1 em{font-style:italic;color:var(--acc)}
.au-p{font-size:13px;line-height:1.75;color:var(--txt3);max-width:480px}
.au-p strong{color:var(--txt);font-weight:500}
.au-facts{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--rule)}
.au-facts>div{padding:16px 12px 0 0}
.au-fact-v{font-family:var(--head);font-size:40px;line-height:1;color:var(--txt)}
.au-fact-l{font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--txt3);margin-top:6px;line-height:1.5}
.au-right{padding:56px 20px 48px 40px;display:flex;flex-direction:column;justify-content:center;gap:16px}
.au-card{background:var(--sur);border:1px solid var(--rule);animation:fadeUp .35s ease both}
.au-card-top{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--bdr2);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3)}
.au-tabs{display:grid;grid-template-columns:repeat(3,1fr);border-bottom:1px solid var(--bdr2)}
.au-tab{--tc:var(--acc);padding:13px 6px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;cursor:pointer;border:0;border-right:1px solid var(--bdr2);background:transparent;color:var(--txt3);transition:color .15s,background .15s;position:relative}
.au-tab:last-child{border-right:0}
.au-tab:hover{color:var(--txt)}
.au-tab.t-red{--tc:var(--c2)}.au-tab.t-admin{--tc:var(--c3)}
.au-tab.on{color:var(--txt);background:var(--bg2)}
.au-tab.on::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:var(--tc)}
.au-body{padding:24px 24px 22px}
.au-seg{display:grid;grid-template-columns:1fr 1fr;border:1px solid var(--bdr3);margin-bottom:20px}
.au-seg button{padding:9px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;border:0;background:transparent;color:var(--txt3);cursor:pointer;transition:background .15s,color .15s}
.au-seg button+button{border-left:1px solid var(--bdr3)}
.au-seg button.on{background:var(--txt);color:var(--bg)}
.au-role{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--acc);margin-bottom:16px}
.au-warn{border:1px solid var(--c2b);border-left:2px solid var(--c2);background:var(--c2d);padding:10px 14px;margin-bottom:16px;font-size:11px;color:var(--txt2);line-height:1.7}
.au-warn strong{color:var(--c2);display:block;margin-bottom:3px;font-size:10px;letter-spacing:.16em}
.au-links{display:flex;justify-content:space-between;gap:12px;margin-top:16px;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--txt4)}
.au-link{background:none;border:0;cursor:pointer;font-family:inherit;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--acc);text-decoration:underline;text-underline-offset:4px}
.au-link.muted{color:var(--txt3)}
.au-strip{display:flex;gap:20px;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt4)}
.afield{margin-bottom:14px}
.abtn{width:100%;margin-top:8px;padding:13px;font-family:var(--mono);font-size:11px;letter-spacing:.16em;font-weight:700;text-transform:uppercase;border:1px solid var(--acc);background:var(--acc);color:var(--on-acc);cursor:pointer;transition:opacity .15s}
.abtn:hover:not(:disabled){opacity:.85}
.au-card[data-tab="red"] .abtn{background:var(--c2);border-color:var(--c2);color:var(--on-c2)}
.au-card[data-tab="admin"] .abtn{background:var(--c3);border-color:var(--c3);color:var(--on-c3)}
.abtn:disabled{opacity:.4;cursor:not-allowed}
.aerr{font-size:11px;color:var(--c2);margin-top:10px;background:var(--c2d);padding:10px 14px;border:1px solid var(--c2b)}
.aok{font-size:11px;color:var(--c1);margin-top:10px;background:var(--c1d);padding:10px 14px;border:1px solid var(--c1b)}
.ahint{margin-top:14px;padding:12px 14px;background:var(--bg2);border:1px solid var(--bdr);font-size:11px;color:var(--txt2);line-height:2.2}
.pw-bar{display:flex;gap:3px;margin-top:6px}.pw-seg{flex:1;height:3px;background:var(--bg3);transition:background .25s}

/* ── ACCOUNT ── */
.acc-page{max-width:720px;margin:0 auto;padding:28px 0}
.acc-section{background:var(--sur);border:1px solid var(--bdr2);margin-bottom:18px;overflow:hidden}
.acc-section.danger{border-color:var(--c2b)}.acc-section.danger .acc-head{color:var(--c2);border-bottom-color:var(--c2b)}
.acc-head{padding:12px 20px;background:transparent;border-bottom:1px solid var(--bdr2);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3)}
.acc-body{padding:20px}
.acc-row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--bdr);font-size:13px;gap:12px}
.acc-row:last-child{border-bottom:none}
.acc-lk{color:var(--txt3);font-size:10px;letter-spacing:.16em;text-transform:uppercase}
.acc-rv{color:var(--txt);font-weight:500;font-size:13px}
.acc-note{font-size:12px;color:var(--txt3);line-height:1.7}

/* ── CONTROL PANEL ── */
.token-box{font-size:13px;background:var(--bg2);border:1px solid var(--c1b);padding:14px;color:var(--c1);word-break:break-all;line-height:1.8}
.svc-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr);font-size:13px}
.svc-dot{width:8px;height:8px;background:var(--c1);flex-shrink:0;animation:pulse 2s infinite}
.svc-dot.off{background:var(--txt4);animation:none}
.db-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bdr);font-size:12px}
.terminal-box{background:#03060c;border:1px solid var(--bdr2);border-left:2px solid var(--acc);padding:16px;font-size:12px;color:#00e696;line-height:2.1;overflow-x:auto;margin-top:14px}
[data-theme="light"] .terminal-box{background:#141414;color:#f4f1ea}
.terminal-box .prompt{color:#8190a8}.terminal-box .cmd{color:#00bfff}.terminal-box .out{color:#b6c1d4}

/* ── ADMIN ── */
.admin-tabs{display:flex;padding:0 20px;background:var(--nav-bg);border-bottom:1px solid var(--bdr2);overflow-x:auto}
.a-tab{font-size:11px;padding:14px 16px;cursor:pointer;border:none;background:none;color:var(--txt3);text-transform:uppercase;transition:color .15s;position:relative;white-space:nowrap;letter-spacing:.16em}
.a-tab::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--acc);transform:scaleX(0);transition:transform .2s}
.a-tab:hover{color:var(--txt)}.a-tab.on{color:var(--txt)}.a-tab.on::after{transform:scaleX(1)}

/* ── MODAL ── */
.modal-bg{position:fixed;inset:0;background:rgba(3,6,12,.72);z-index:300;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
.modal{background:var(--sur);border:1px solid var(--rule);padding:28px;width:460px;max-width:92vw;box-shadow:var(--sh2);animation:fadeUp .2s ease}
.modal-t{font-family:var(--head);font-size:28px;font-weight:400;margin-bottom:18px;color:var(--txt);letter-spacing:0}

/* ── HUD ── */
.hud-mid{display:flex;align-items:center;gap:22px;margin:0 18px}
.tl-segs{display:flex;gap:3px}
.tl-seg{width:12px;height:4px;background:var(--bg3);transition:background .3s}
.tl-lbl{font-size:10px;color:var(--txt3);letter-spacing:.12em;text-transform:uppercase}
.tl-val{font-family:var(--head);font-size:16px;font-weight:400;letter-spacing:.02em}
.xp-label{font-size:10px;color:var(--txt3);letter-spacing:.12em;text-transform:uppercase}

/* ── LEGACY LANDING CLASSES (kept for any remaining users) ── */
.lp{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.lp-nav{height:56px;display:flex;align-items:center;padding:0 20px;background:var(--nav-bg);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:100}
.lp-nl{font-size:11px;padding:8px 18px;cursor:pointer;border:none;background:none;color:var(--txt3);text-transform:uppercase;letter-spacing:.16em}
.lp-nl:hover{color:var(--txt)}
.ticker{display:flex;overflow:hidden;border-top:1px solid var(--bdr2);border-bottom:1px solid var(--bdr2);background:var(--sur);padding:10px 0}
.ticker-inner{display:flex;gap:50px;animation:marquee 22s linear infinite;white-space:nowrap}
.ticker-item{font-size:11px;color:var(--txt3);display:flex;align-items:center;gap:8px}
.lp-footer{padding:26px 20px;border-top:1px solid var(--bdr2);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--txt4);display:flex;justify-content:space-between;align-items:center;background:var(--sur)}

/* ── PORT CONFIG ── */
.port-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)}
.port-label{font-size:10px;color:var(--txt3);width:60px;flex-shrink:0;letter-spacing:.16em;text-transform:uppercase}
.port-inp{width:90px;font-size:12px;padding:6px 10px;background:transparent;border:1px solid var(--bdr3);color:var(--acc);outline:none;font-family:var(--mono)}
.port-inp:focus{border-color:var(--acc)}

/* ── SIMULATOR BUTTON ── */
.sim-btn{font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:11px 22px;cursor:pointer;border:1px solid;background:transparent;transition:background .15s,color .15s;display:inline-flex;align-items:center;gap:8px;font-family:var(--mono)}
.sim-btn-run{border-color:var(--c2);color:var(--c2)}.sim-btn-run:hover:not(:disabled){background:var(--c2);color:var(--on-c2)}.sim-btn-run:disabled{opacity:.4;cursor:not-allowed}
.sim-btn-portal{border-color:var(--c4);color:var(--c4)}.sim-btn-portal:hover{background:var(--c4);color:var(--on-c4)}
.sim-progress{background:var(--bg2);border:1px solid var(--bdr2);border-left:2px solid var(--c2);padding:16px;margin-top:14px;font-size:12px;animation:fadeUp .25s ease}
.sim-bar-track{height:4px;background:var(--bg3);margin:10px 0;overflow:hidden}
.sim-bar-fill{height:100%;background:var(--c2);transition:width .4s ease}
.sim-log{max-height:110px;overflow-y:auto;color:var(--c1);line-height:2;font-size:11px;margin-top:6px}
.sim-log-line{display:flex;gap:8px;align-items:center}
.sim-log-line::before{content:"▸";color:var(--c2);flex-shrink:0}
.portal-url{font-size:12px;background:var(--bg2);border:1px solid var(--c4b);padding:12px 14px;color:var(--c4);word-break:break-all;margin-top:10px;display:flex;align-items:center;gap:10px;animation:fadeUp .2s ease}

/* ── RED TEAM DASHBOARD ── */
.rt-panel{background:var(--sur);border:1px solid var(--c2b);border-top:2px solid var(--c2);padding:20px;margin-bottom:18px;animation:fadeUp .3s ease}
.rt-run-card{background:var(--bg2);border:1px solid var(--bdr2);padding:14px;margin-bottom:10px;cursor:pointer;transition:border-color .15s}
.rt-run-card:hover{border-color:var(--c2b)}
.rt-run-card.active{border-color:var(--c2);background:var(--c2d)}
.rt-score{font-family:var(--head);font-size:44px;font-weight:400;line-height:1}
.rt-label{font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt3);margin-top:3px}
.rt-stat{text-align:center;padding:0 18px;border-right:1px solid var(--bdr2)}.rt-stat:last-child{border-right:none}

.org-pill{font-size:10px;padding:6px 14px;cursor:pointer;border:1px solid;transition:all .15s;letter-spacing:.12em;font-weight:600;text-transform:uppercase;background:transparent;font-family:var(--mono)}

/* ── XP / ACHIEVEMENTS ── */
.xp-track{height:4px;background:var(--bg3);overflow:hidden}
.xp-fill{height:100%;background:var(--acc);transition:width 1.2s ease}
.ach{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--bdr2);margin-bottom:8px;background:var(--sur);transition:border-color .2s}
.ach.won{border-color:var(--c3b);background:var(--c3d)}
.ach-ic{font-size:20px;flex-shrink:0;filter:grayscale(1) opacity(.45)}.ach.won .ach-ic{filter:none}
.ach-nm{font-size:12px;font-weight:600;color:var(--txt2);letter-spacing:.04em}.ach.won .ach-nm{color:var(--c3)}
.ach-ds{font-size:12px;color:var(--txt3);margin-top:2px}

@media(max-width:960px){.g4,.g3,.g2{grid-template-columns:1fr}.content{padding:14px 16px}.hud-mid{display:none}.au-main{grid-template-columns:1fr}.au-left{padding:36px 20px 24px;border-right:0;border-bottom:1px solid var(--bdr2)}.au-right{padding:28px 20px 36px}.au-facts{grid-template-columns:repeat(2,1fr)}.lp-footer{padding-left:20px;padding-right:20px}}
`;

/* ─── API ─────────────────────────────────────────────────── */
export const api = (path, opts={}) => {
  const tk = localStorage.getItem("st_token");
  return fetch(API + path, {
    headers: {"Content-Type":"application/json", ...(tk?{Authorization:`Bearer ${tk}`}:{}), ...opts.headers},
    ...opts,
  })
  .then(r => r.json())
  .catch(err => {
    console.error("API ERROR:", err);   // ← temporary, shows real error in console
    return { error: err.message || "Network error" };
  });
};

/* ─── CONSTANTS ───────────────────────────────────────────── */
// ── isPasswordStrong (Argon2-style client gate) ──────────────
export const isPasswordStrong = pw => {
  const issues = [];
  if (pw.length < 12)            issues.push('At least 12 characters');
  if (!/[A-Z]/.test(pw))        issues.push('One uppercase letter');
  if (!/[a-z]/.test(pw))        issues.push('One lowercase letter');
  if (!/[0-9]/.test(pw))        issues.push('One number');
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('One special character');
  return { ok: issues.length === 0, issues };
};

export const SVC_CLS = {SSH:"b4",HTTP:"b3",FTP:"b3",DB:"b2",ML:"b5"};
export const TYPE_CLS = {sqli:"b2",brute:"b3",cred:"b5",scan:"b4",slow:"b1",unknown:"bd"};
export const TYPE_XP  = {sqli:150,brute:80,cred:120,scan:30,slow:20,unknown:50};
export const TCOLORS  = {sqli:"#ff2d55",brute:"#ffb800",cred:"#b060ff",scan:"#00bfff",slow:"#00e696",unknown:"#3a5070"};
export const SCOLORS  = {SSH:"#00bfff",HTTP:"#ffb800",FTP:"#ffb800",DB:"#ff2d55",ML:"#b060ff"};
export const tc = t => TCOLORS[t]||"#3a5070";
export const sc = s => SCOLORS[s]||"#00e696";

export const ACHS=[
  {id:"first",icon:"🎯",name:"First Blood",desc:"First attacker caught",req:s=>s.total>=1},
  {id:"c100",icon:"💯",name:"Century",desc:"100 attacks logged",req:s=>s.total>=100},
  {id:"sqli",icon:"💉",name:"SQL Hunter",desc:"10 SQL injections caught",req:s=>(s.bt?.sqli||0)>=10},
  {id:"brute",icon:"🔨",name:"Brute Buster",desc:"20 brute force stopped",req:s=>(s.bt?.brute||0)>=20},
  {id:"ips",icon:"🌐",name:"Net Sentinel",desc:"50 unique IPs tracked",req:s=>s.ips>=50},
  {id:"mass",icon:"⚔️",name:"Defender",desc:"2500+ attacks logged",req:s=>s.total>=2500},
  {id:"scan",icon:"🔭",name:"Scanner Buster",desc:"30 port scans caught",req:s=>(s.bt?.scan||0)>=30},
  {id:"elite",icon:"🏆",name:"Elite Operator",desc:"Reach Level 5",req:s=>s.level>=5},
];
export const xpL = l => l*l*200;
export const calcLvl = x => {let l=1;while(xpL(l+1)<=x)l++;return l;};
export const pwStr = pw => {
  if(!pw)return{s:0,lbl:"",col:""};
  let s=0;
  if(pw.length>=8)s++;if(pw.length>=12)s++;
  if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;
  return{s,lbl:["","Weak","Fair","Good","Strong","Elite"][s]||"Elite",col:["","var(--c2)","var(--c3)","var(--c3)","var(--c1)","var(--c4)"][s]||"var(--c4)"};
};

/* ─── WEB AUDIO SOUND ENGINE ──────────────────────────────── */
const AudioEngine = (() => {
  let ctx = null;
  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }
  function playImpact(type) {
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      const dist = ac.createWaveShaper();
      // distortion curve
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = (i * 2) / 256 - 1; curve[i] = (Math.PI + 400) * x / (Math.PI + 400 * Math.abs(x)); }
      dist.curve = curve;
      osc.connect(dist); dist.connect(gain); gain.connect(ac.destination);
      const now = ac.currentTime;
      const freqMap = {sqli:180, brute:220, cred:160, scan:440, slow:110, unknown:200};
      const freq = freqMap[type] || 200;
      osc.type = type === 'scan' ? 'square' : type === 'slow' ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.3, now + 0.18);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now); osc.stop(now + 0.2);
    } catch(e) {}
  }
  function playXP() {
    try {
      const ac = getCtx();
      [0, 0.06, 0.12].forEach((delay, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.connect(gain); gain.connect(ac.destination);
        const now = ac.currentTime + delay;
        osc.type = 'sine';
        const notes = [523, 659, 784];
        osc.frequency.setValueAtTime(notes[i], now);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        osc.start(now); osc.stop(now + 0.14);
      });
    } catch(e) {}
  }
  return { playImpact, playXP };
})();

export { AudioEngine as default };   // or: export default AudioEngine;
/* ─── SHARED COMPONENTS ───────────────────────────────────── */