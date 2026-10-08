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
@import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;500;600;700&family=Orbitron:wght@500;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}

:root,[data-theme="dark"]{
  --bg:#05070f;--bg2:#080c18;--bg3:#0d1225;
  --sur:#0f1528;--sur2:#131a30;
  --bdr:rgba(0,230,150,.06);--bdr2:rgba(0,230,150,.14);--bdr3:rgba(0,230,150,.28);
  --c1:#00e696;--c1d:rgba(0,230,150,.07);--c1b:rgba(0,230,150,.22);
  --c2:#ff2d55;--c2d:rgba(255,45,85,.07);--c2b:rgba(255,45,85,.22);
  --c3:#ffb800;--c3d:rgba(255,184,0,.07);--c3b:rgba(255,184,0,.22);
  --c4:#00bfff;--c4d:rgba(0,191,255,.07);--c4b:rgba(0,191,255,.22);
  --c5:#b060ff;--c5d:rgba(176,96,255,.07);--c5b:rgba(176,96,255,.22);
  --txt:#eef4ff;--txt2:#aac0d8;--txt3:#6888a8;--txt4:#3a5878;
  --sh:0 2px 20px rgba(0,0,0,.7);--sh2:0 8px 48px rgba(0,0,0,.9);
  --glow1:0 0 16px rgba(0,230,150,.2);
  --r:5px;--r2:10px;
  --mono:'Share Tech Mono',monospace;--head:'Orbitron',monospace;--sans:'Rajdhani',sans-serif;
  --cv:#04060e;
}
[data-theme="light"]{
  --bg:#eaf0fc;--bg2:#dde6f8;--bg3:#ccd8f0;
  --sur:#f4f8ff;--sur2:#edf2ff;
  --bdr:rgba(0,100,180,.07);--bdr2:rgba(0,100,180,.16);--bdr3:rgba(0,100,180,.30);
  --c1:#007a50;--c1d:rgba(0,122,80,.07);--c1b:rgba(0,122,80,.2);
  --c2:#c0002e;--c2d:rgba(192,0,46,.07);--c2b:rgba(192,0,46,.2);
  --c3:#8a5e00;--c3d:rgba(138,94,0,.07);--c3b:rgba(138,94,0,.2);
  --c4:#005b8a;--c4d:rgba(0,91,138,.07);--c4b:rgba(0,91,138,.2);
  --c5:#5a1a9a;--c5d:rgba(90,26,154,.07);--c5b:rgba(90,26,154,.2);
  --txt:#0a1520;--txt2:#1e3248;--txt3:#354e68;--txt4:#507090;
  --sh:0 1px 8px rgba(0,0,0,.08);--sh2:0 4px 24px rgba(0,0,0,.12);
  --glow1:none;--cv:#d8e8fc;
}

html,body,#root{height:100%;background:var(--bg);color:var(--txt);font-family:var(--sans);overflow-x:hidden;font-size:16px;line-height:1.5}
::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-track{background:var(--bg2)}::-webkit-scrollbar-thumb{background:var(--bdr3);border-radius:2px}

[data-theme="dark"] body::before{content:'';position:fixed;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent 0px,transparent 3px,rgba(0,230,150,.015) 3px,rgba(0,230,150,.015) 4px);z-index:9999}

@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
@keyframes xpFloat{0%{opacity:1;transform:translateY(0) scale(1.2)}100%{opacity:0;transform:translateY(-60px) scale(.9)}}
@keyframes ripple{0%{transform:scale(1);opacity:.5}100%{transform:scale(2.6);opacity:0}}
@keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
@keyframes flicker{0%,100%{opacity:1}93%{opacity:.7}95%{opacity:1}97%{opacity:.85}98%{opacity:1}}
@keyframes glow-pulse{0%,100%{box-shadow:0 0 8px var(--c1b)}50%{box-shadow:0 0 22px var(--c1b),0 0 44px var(--c1d)}}
@keyframes typewriter{from{width:0}to{width:100%}}
@keyframes radar{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}

/* ── LAYOUT ── */
.page{min-height:100vh;display:flex;flex-direction:column;background:var(--bg)}
.content{flex:1;padding:20px 24px;max-width:1600px;margin:0 auto;width:100%}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.g4{display:grid;grid-template-columns:repeat(4,1fr);gap:16px}

/* ── TOPBAR ── */
.topbar{height:58px;display:flex;align-items:center;padding:0 24px;gap:14px;
  background:var(--sur);border-bottom:2px solid var(--bdr2);position:sticky;top:0;z-index:200;box-shadow:var(--sh)}
[data-theme="dark"] .topbar{box-shadow:0 1px 0 var(--bdr2),0 4px 20px rgba(0,0,0,.6)}
.logo{font-family:var(--head);font-size:17px;font-weight:800;color:var(--c1);letter-spacing:5px;animation:flicker 10s infinite;white-space:nowrap;text-shadow:0 0 20px rgba(0,230,150,.2)}
.logo em{color:var(--txt3);font-style:normal}
.tb-div{width:1px;height:26px;background:var(--bdr2)}
.tb-r{display:flex;align-items:center;gap:10px;margin-left:auto}
.live-chip{display:flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;color:var(--c1);background:var(--c1d);border:1px solid var(--c1b);padding:4px 12px;border-radius:3px;letter-spacing:1px;white-space:nowrap}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--c1);animation:pulse 1.4s infinite}
.theme-btn{width:32px;height:32px;border-radius:var(--r);border:1px solid var(--bdr2);background:transparent;cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;color:var(--txt2);transition:all .15s}
.theme-btn:hover{border-color:var(--c1);color:var(--c1)}
.alert-bar{padding:7px 24px;font-family:var(--mono);font-size:11px;letter-spacing:1px;display:flex;align-items:center;gap:10px}
.alert-bar.crit{background:var(--c2d);border-bottom:1px solid var(--c2b);color:var(--c2)}
.alert-bar.warn{background:var(--c3d);border-bottom:1px solid var(--c3b);color:var(--c3)}

/* ── MODULE NAV ── */
.mnav{display:flex;background:var(--sur);border-bottom:1px solid var(--bdr2);padding:0 18px;overflow-x:auto;gap:0}
.mtab{font-family:var(--mono);font-size:11px;padding:13px 18px;cursor:pointer;border:none;background:none;color:var(--txt2);text-transform:uppercase;transition:color .15s;position:relative;white-space:nowrap;letter-spacing:1px}
.mtab::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c1);transform:scaleX(0);transition:transform .2s}
.mtab:hover{color:var(--txt)}.mtab.on{color:var(--c1)}.mtab.on::after{transform:scaleX(1)}

/* ── PANEL ── */
.panel{background:var(--sur);border:1px solid var(--bdr2);padding:18px;border-radius:var(--r2);animation:fadeUp .3s ease both;position:relative;overflow:hidden}
[data-theme="dark"] .panel{box-shadow:var(--sh)}
[data-theme="dark"] .panel::after{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(0,230,150,.02) 0%,transparent 60%);pointer-events:none}
.panel.c1{border-top:2px solid var(--c1)}.panel.c2{border-top:2px solid var(--c2)}.panel.c3{border-top:2px solid var(--c3)}.panel.c4{border-top:2px solid var(--c4)}.panel.c5{border-top:2px solid var(--c5)}
.panel.glow{animation:glow-pulse 3s ease-in-out infinite}
.ph{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2);margin-bottom:16px;display:flex;align-items:center;gap:10px}
.ph::after{content:'';flex:1;height:1px;background:var(--bdr2)}

/* ── STAT CARD ── */
.stat-v{font-family:var(--head);font-size:34px;font-weight:800;line-height:1;margin-bottom:6px}
.stat-l{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2)}

/* ── BADGE ── */
.badge{display:inline-block;padding:3px 8px;font-family:var(--mono);font-size:10px;letter-spacing:.5px;text-transform:uppercase;border-radius:3px;font-weight:700}
.b1{background:var(--c1d);color:var(--c1);border:1px solid var(--c1b)}
.b2{background:var(--c2d);color:var(--c2);border:1px solid var(--c2b)}
.b3{background:var(--c3d);color:var(--c3);border:1px solid var(--c3b)}
.b4{background:var(--c4d);color:var(--c4);border:1px solid var(--c4b)}
.b5{background:var(--c5d);color:var(--c5);border:1px solid var(--c5b)}
.bd{background:var(--bg3);color:var(--txt3);border:1px solid var(--bdr2)}

/* ── TABLE ── */
.tbl{width:100%;border-collapse:collapse;font-family:var(--mono);font-size:13px}
.tbl th{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--txt3);font-weight:400;padding:10px 12px;text-align:left;border-bottom:1px solid var(--bdr2);background:var(--bg2);white-space:nowrap}
.tbl td{padding:10px 12px;border-bottom:1px solid var(--bdr);vertical-align:middle;color:var(--txt)}
.tbl tr{cursor:pointer;transition:background .1s}.tbl tr:hover td{background:var(--c1d)}.tbl tr.sel td{background:var(--c1d);border-left:2px solid var(--c1)}

/* ── FORMS ── */
.inp{background:var(--bg2);border:1px solid var(--bdr2);color:var(--txt);font-family:var(--mono);font-size:13px;padding:10px 14px;outline:none;width:100%;border-radius:var(--r);transition:all .15s}
.inp:focus{border-color:var(--c1);box-shadow:0 0 0 3px var(--c1d)}.inp::placeholder{color:var(--txt4)}
.lbl{font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--txt3);display:block;margin-bottom:6px}
.btn{font-family:var(--mono);font-size:10px;letter-spacing:.8px;padding:8px 16px;cursor:pointer;border:1px solid;border-radius:var(--r);transition:all .15s;font-weight:700;text-transform:uppercase;white-space:nowrap}
.btn-1{border-color:var(--c1b);color:var(--c1);background:var(--c1d)}.btn-1:hover{background:var(--c1);color:#000}
.btn-2{border-color:var(--c2b);color:var(--c2);background:var(--c2d)}.btn-2:hover{background:var(--c2);color:#fff}
.btn-3{border-color:var(--c3b);color:var(--c3);background:var(--c3d)}.btn-3:hover{background:var(--c3);color:#000}
.btn-4{border-color:var(--c4b);color:var(--c4);background:var(--c4d)}.btn-4:hover{background:var(--c4);color:#000}
.btn-5{border-color:var(--c5b);color:var(--c5);background:var(--c5d)}.btn-5:hover{background:var(--c5);color:#fff}
.btn-ghost{border-color:var(--bdr2);color:var(--txt3);background:transparent}.btn-ghost:hover{border-color:var(--c1);color:var(--c1)}

/* ── DETAIL EXPAND ── */
.detail{background:var(--bg2);border:1px solid var(--bdr2);border-left:3px solid var(--c1);padding:16px;margin-top:10px;animation:slideDown .2s ease;border-radius:var(--r)}
.drow{display:flex;gap:12px;margin-bottom:8px;font-size:13px}
.dk{color:var(--txt3);width:90px;flex-shrink:0;font-family:var(--mono);font-size:10px;letter-spacing:1px;text-transform:uppercase;padding-top:2px}
.dv{color:var(--txt);font-weight:600;word-break:break-all;font-family:var(--mono)}
.pbox{background:var(--sur);border:1px solid var(--bdr2);border-left:2px solid var(--c1);padding:12px;font-family:var(--mono);font-size:12px;color:var(--c1);line-height:1.8;word-break:break-all;border-radius:var(--r);margin-top:6px;max-height:90px;overflow-y:auto}

/* ── CHARTS ── */
.brow{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.blbl{font-family:var(--mono);font-size:11px;color:var(--txt2);width:62px;text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.btrack{flex:1;height:8px;background:var(--bg3);border-radius:2px;overflow:hidden}
.bfill{height:100%;border-radius:2px;transition:width 1.2s cubic-bezier(.19,1,.22,1)}
.bcnt{font-family:var(--mono);font-size:11px;color:var(--txt2);width:32px;text-align:right;flex-shrink:0}
.tlwrap{height:80px;display:flex;align-items:flex-end;gap:3px}
.tlcol{flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end}
.tlbar{width:100%;background:var(--c1);opacity:.65;min-height:2px;transition:height .8s}
.tllbl{font-family:var(--mono);font-size:8px;color:var(--txt3);writing-mode:vertical-rl}

/* ── LOADER ── */
.loader{display:flex;align-items:center;justify-content:center;height:70px}
.spinner{width:20px;height:20px;border:2px solid var(--bdr2);border-top-color:var(--c1);border-radius:50%;animation:spin .7s linear infinite}

/* ── THREAT RING ── */
.tring{position:relative;display:inline-flex;align-items:center;justify-content:center}
.tring-v{position:absolute;font-family:var(--head);font-weight:700}

/* ── BATTLEFIELD ── */
.bf-wrap{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);overflow:hidden;box-shadow:var(--sh);display:inline-block;vertical-align:top;width:100%}
.bf-topbar{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:var(--bg2);border-bottom:1px solid var(--bdr2);width:100%}
.bf-title{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2)}
.bf-legs{display:flex;background:var(--bg2);border-top:1px solid var(--bdr);width:100%}
.bf-leg{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;font-family:var(--mono);font-size:10px;color:var(--txt2);padding:6px 0;border-right:1px solid var(--bdr)}.bf-leg:last-child{border-right:none}
.xp-pop{position:absolute;pointer-events:none;font-family:var(--head);font-size:12px;font-weight:700;color:var(--c1);z-index:50;animation:xpFloat 1s ease forwards;white-space:nowrap;text-shadow:0 0 8px var(--c1)}
@keyframes vibrate{0%,100%{transform:translate(0,0)}20%{transform:translate(-1px,1px)}40%{transform:translate(1px,-1px)}60%{transform:translate(-1px,-1px)}80%{transform:translate(1px,1px)}}
.bf-canvas-wrap{position:relative}
.bf-canvas-wrap.hit{animation:vibrate .12s ease}

/* ── RAID FEED ── */
.raid-card{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--sh);height:100%;}
.raid-bar{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--bg2);border-bottom:1px solid var(--bdr2);flex-shrink:0}
.raid-t{font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2)}
.raid-scroll{overflow-y:scroll;flex:1;min-height:0;}
.ri{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--bdr);cursor:pointer;transition:background .1s;font-family:var(--mono);font-size:11px;color:var(--txt2)}
.ri:hover{background:var(--c1d)}.ri.fresh{background:rgba(0,230,150,.03)}
.rdot{width:7px;height:7px;border-radius:50%;flex-shrink:0;position:relative}
.rdot.pulse::after{content:'';position:absolute;inset:-3px;border-radius:50%;border:1px solid currentColor;animation:ripple 2s ease-out infinite}
.ri-ip{flex:1;color:var(--c4);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px}
.raid-det{padding:12px;border-top:1px solid var(--bdr2);background:var(--bg2);flex-shrink:0;max-height:130px;overflow-y:auto}

/* ── LEADERBOARD (simple list, no podium) ── */

/* ── AUTH ── */
.auth-page{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;overflow:hidden}
[data-theme="dark"] .auth-page{background:radial-gradient(ellipse 60% 70% at 50% 50%,rgba(0,230,150,.05),var(--bg))}
.auth-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(var(--bdr2) 1px,transparent 1px),linear-gradient(90deg,var(--bdr2) 1px,transparent 1px);background-size:44px 44px}
.auth-scan{position:fixed;top:-2%;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--c1),transparent);animation:scanline 6s linear infinite;pointer-events:none;z-index:100;opacity:.25}
@keyframes scanline{0%{top:-2%}100%{top:102%}}
.abox{width:460px;background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);overflow:hidden;box-shadow:var(--sh2);position:relative;z-index:1;animation:fadeUp .4s ease}
[data-theme="dark"] .abox{box-shadow:var(--sh2),0 0 40px rgba(0,230,150,.08)}
.a-logo{font-family:var(--head);font-size:32px;font-weight:800;color:var(--c1);letter-spacing:6px;line-height:1;text-shadow:0 0 30px rgba(0,230,150,.25);animation:flicker 10s infinite}
.a-sub{font-family:var(--mono);font-size:9px;color:var(--txt4);letter-spacing:3px;margin-top:4px;text-transform:uppercase}
.a-logo-divider{width:50px;height:1px;background:linear-gradient(90deg,transparent,var(--c1),transparent);margin:12px auto}
.a-status{display:flex;align-items:center;gap:8px;background:rgba(0,230,150,.04);border:1px solid rgba(0,230,150,.1);padding:7px 14px;font-family:var(--mono);font-size:10px;color:var(--c1);letter-spacing:1px}
.a-status-dot{width:6px;height:6px;border-radius:50%;background:var(--c1);animation:pulse 1.8s infinite;flex-shrink:0}
.auth-header{padding:24px 28px 18px;text-align:center;background:var(--bg2);border-bottom:1px solid var(--bdr2)}
.auth-tabs{display:grid;grid-template-columns:1fr 1fr 1fr;border-bottom:1px solid var(--bdr2)}
.auth-tab{padding:13px 6px;font-family:var(--mono);font-size:10px;letter-spacing:1px;cursor:pointer;border:none;background:transparent;color:var(--txt3);text-transform:uppercase;transition:all .15s;position:relative;text-align:center}
.auth-tab:hover{color:var(--txt);background:rgba(255,255,255,.02)}
.auth-tab .atab-icon{font-size:14px;display:block;margin-bottom:3px}
.auth-tab.tab-org{color:var(--c1);background:rgba(0,230,150,.05)}
.auth-tab.tab-org::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c1)}
.auth-tab.tab-red{color:var(--c2);background:rgba(255,45,85,.05)}
.auth-tab.tab-red::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c2)}
.auth-tab.tab-admin{color:var(--c3);background:rgba(255,184,0,.05)}
.auth-tab.tab-admin::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c3)}
.auth-form-body{padding:22px 28px 20px}
.auth-role-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--mono);font-size:10px;letter-spacing:1.5px;padding:4px 12px;border-radius:2px;margin-bottom:16px;text-transform:uppercase}
.auth-role-badge.org{background:rgba(0,230,150,.08);color:var(--c1);border:1px solid rgba(0,230,150,.2)}
.auth-role-badge.red{background:rgba(255,45,85,.08);color:var(--c2);border:1px solid rgba(255,45,85,.2)}
.auth-role-badge.admin{background:rgba(255,184,0,.08);color:var(--c3);border:1px solid rgba(255,184,0,.2)}
.auth-warn{background:rgba(255,45,85,.06);border:1px solid rgba(255,45,85,.18);border-left:3px solid var(--c2);border-radius:var(--r);padding:10px 14px;margin-bottom:16px;font-family:var(--mono);font-size:11px;color:rgba(255,120,130,.8);line-height:1.7}
.auth-warn strong{color:var(--c2);display:block;margin-bottom:3px;font-size:10px;letter-spacing:1px}
.afield{margin-bottom:14px}
.abtn{width:100%;margin-top:8px;padding:13px;font-family:var(--mono);font-size:11px;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;border:1px solid transparent;cursor:pointer;border-radius:var(--r);transition:all .2s}
.abtn.btn-org{background:var(--c1);color:#000;border-color:var(--c1)}.abtn.btn-org:hover:not(:disabled){background:transparent;color:var(--c1)}
.abtn.btn-red{background:var(--c2);color:#fff;border-color:var(--c2)}.abtn.btn-red:hover:not(:disabled){background:transparent;color:var(--c2)}
.abtn.btn-admin{background:var(--c3);color:#000;border-color:var(--c3)}.abtn.btn-admin:hover:not(:disabled){background:transparent;color:var(--c3)}
.abtn:disabled{opacity:.4;cursor:not-allowed}
.aerr{font-family:var(--mono);font-size:11px;color:var(--c2);margin-top:10px;background:var(--c2d);padding:10px 14px;border-radius:var(--r);border:1px solid var(--c2b)}
.aok{font-family:var(--mono);font-size:11px;color:var(--c1);margin-top:10px;background:var(--c1d);padding:10px 14px;border-radius:var(--r);border:1px solid var(--c1b)}
.ahint{margin-top:14px;padding:12px 14px;background:var(--bg2);border-radius:var(--r);border:1px solid var(--bdr);font-family:var(--mono);font-size:11px;color:var(--txt2);line-height:2.2}
.auth-footer-links{display:flex;justify-content:space-between;margin-top:14px;font-family:var(--mono);font-size:10px;color:var(--txt4)}
.auth-info-strip{display:flex;justify-content:center;gap:20px;margin-top:14px;font-family:var(--mono);font-size:9px;color:var(--txt4);letter-spacing:1px}
.pw-bar{display:flex;gap:3px;margin-top:6px}.pw-seg{flex:1;height:3px;border-radius:2px;background:var(--bg3);transition:background .25s}

/* ── ACCOUNT ── */
.acc-page{max-width:680px;margin:0 auto;padding:28px 0}
.acc-section{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);margin-bottom:18px;overflow:hidden;box-shadow:var(--sh)}
.acc-head{padding:14px 20px;background:var(--bg2);border-bottom:1px solid var(--bdr2);font-family:var(--mono);font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2)}
.acc-body{padding:20px}
.acc-row{display:flex;justify-content:space-between;align-items:center;padding:13px 0;border-bottom:1px solid var(--bdr);font-size:14px}
.acc-row:last-child{border-bottom:none}
.acc-lk{color:var(--txt2);font-family:var(--mono);font-size:11px;letter-spacing:.5px;text-transform:uppercase}
.acc-rv{color:var(--txt);font-weight:600;font-family:var(--mono);font-size:13px}

/* ── CONTROL PANEL ── */
.token-box{font-family:var(--mono);font-size:13px;background:var(--bg2);border:1px solid var(--c1b);border-radius:var(--r);padding:14px;color:var(--c1);word-break:break-all;line-height:1.8;animation:glow-pulse 4s ease-in-out infinite}
.svc-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr);font-size:14px}
.svc-dot{width:8px;height:8px;border-radius:50%;background:var(--c1);flex-shrink:0;animation:pulse 2s infinite}
.svc-dot.off{background:var(--txt4);animation:none}
.db-row{display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--bdr);font-family:var(--mono);font-size:12px}
.terminal-box{background:var(--bg);border:1px solid var(--bdr2);border-left:3px solid var(--c1);padding:16px;font-family:var(--mono);font-size:12px;color:var(--c1);line-height:2.2;border-radius:var(--r);overflow-x:auto;margin-top:14px}
.terminal-box .prompt{color:var(--txt3)}.terminal-box .cmd{color:var(--c4)}.terminal-box .out{color:var(--txt2)}

/* ── ADMIN ── */
.admin-tabs{display:flex;padding:0 18px;background:var(--sur);border-bottom:1px solid var(--bdr2);overflow-x:auto}
.a-tab{font-family:var(--mono);font-size:10px;padding:13px 16px;cursor:pointer;border:none;background:none;color:var(--txt3);text-transform:uppercase;transition:color .15s;position:relative;white-space:nowrap;letter-spacing:1px}
.a-tab::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--c5);transform:scaleX(0);transition:transform .2s}
.a-tab.on{color:var(--c5)}.a-tab.on::after{transform:scaleX(1)}

/* ── MODAL ── */
.modal-bg{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:300;display:flex;align-items:center;justify-content:center;animation:fadeIn .2s ease}
.modal{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);padding:28px;width:440px;max-width:92vw;box-shadow:var(--sh2);animation:fadeUp .2s ease}
[data-theme="dark"] .modal{box-shadow:var(--sh2),0 0 30px rgba(0,230,150,.07)}
.modal-t{font-family:var(--head);font-size:14px;font-weight:700;margin-bottom:18px;color:var(--c1);letter-spacing:1.5px}

/* ── HUD ── */
.hud-mid{display:flex;align-items:center;gap:22px;margin:0 18px}
.tl-segs{display:flex;gap:3px}
.tl-seg{width:12px;height:4px;background:var(--bg3);transition:background .3s;border-radius:0}
.tl-lbl{font-family:var(--mono);font-size:10px;color:var(--txt3);letter-spacing:.5px}
.tl-val{font-family:var(--head);font-size:11px;font-weight:700;letter-spacing:1px}
.xp-label{font-family:var(--mono);font-size:10px;color:var(--txt3);letter-spacing:.3px}

/* ── LANDING ── */
.lp{min-height:100vh;background:var(--bg);display:flex;flex-direction:column}
.lp-nav{height:58px;display:flex;align-items:center;padding:0 48px;background:var(--sur);border-bottom:1px solid var(--bdr2);position:sticky;top:0;z-index:100;gap:0}
.lp-nav-links{display:flex;gap:0;margin:0 auto}
.lp-nl{font-family:var(--mono);font-size:10px;padding:8px 18px;cursor:pointer;border:none;background:none;color:var(--txt3);text-transform:uppercase;transition:color .15s;letter-spacing:1px}
.lp-nl:hover{color:var(--c1)}
.hero{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:80px 24px 60px;position:relative;overflow:hidden;min-height:75vh}
.hero-bg{position:absolute;inset:0;pointer-events:none}
[data-theme="dark"] .hero-bg{background:radial-gradient(ellipse 60% 50% at 50% 55%,rgba(0,230,150,.07),transparent)}
.hero-grid{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px);background-size:48px 48px}
.hero-corner{position:absolute;width:60px;height:60px;pointer-events:none}
.hero-corner.tl{top:24px;left:24px;border-top:2px solid var(--c1);border-left:2px solid var(--c1);opacity:.5}
.hero-corner.tr{top:24px;right:24px;border-top:2px solid var(--c1);border-right:2px solid var(--c1);opacity:.5}
.hero-corner.bl{bottom:24px;left:24px;border-bottom:2px solid var(--c1);border-left:2px solid var(--c1);opacity:.5}
.hero-corner.br{bottom:24px;right:24px;border-bottom:2px solid var(--c1);border-right:2px solid var(--c1);opacity:.5}
.radar-wrap{position:absolute;right:5%;top:50%;transform:translateY(-50%);width:220px;height:220px;opacity:.12;pointer-events:none}
.radar-circle{position:absolute;border:1px solid var(--c1);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%)}
.radar-sweep{position:absolute;top:50%;left:50%;width:50%;height:1px;background:linear-gradient(to right,transparent,var(--c1));transform-origin:left center;animation:radar 3s linear infinite}
.radar-blip{position:absolute;width:6px;height:6px;border-radius:50%;background:var(--c2);animation:pulse 1.5s infinite}
.hero-badge{font-family:var(--mono);font-size:10px;color:var(--c1);background:var(--c1d);border:1px solid var(--c1b);padding:6px 18px;border-radius:3px;margin-bottom:28px;letter-spacing:2.5px;position:relative;z-index:1}
.hero-h1{font-family:var(--head);font-size:clamp(36px,5vw,64px);font-weight:800;line-height:1.08;margin-bottom:20px;position:relative;z-index:1;letter-spacing:3px}
[data-theme="dark"] .hero-h1{color:var(--c1);text-shadow:0 0 40px rgba(0,230,150,.3)}
[data-theme="light"] .hero-h1{color:var(--txt)}
.hero-h1 em{font-style:normal;color:var(--txt2);display:block;font-size:.65em;letter-spacing:4px;margin-top:4px}
.hero-sub{font-family:var(--sans);font-size:18px;color:var(--txt2);max-width:560px;line-height:1.7;margin-bottom:36px;position:relative;z-index:1}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;justify-content:center;position:relative;z-index:1}
.hero-btn-p{padding:14px 36px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--c1);cursor:pointer;border-radius:var(--r);background:var(--c1);color:#000;transition:all .2s}
.hero-btn-p:hover{background:transparent;color:var(--c1);box-shadow:var(--glow1)}
.hero-btn-s{padding:14px 36px;font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;border:1px solid var(--bdr3);cursor:pointer;border-radius:var(--r);background:transparent;color:var(--txt2);transition:all .2s}
.hero-btn-s:hover{border-color:var(--c1);color:var(--c1)}
.hero-stats{display:flex;gap:0;border-top:1px solid var(--bdr2);margin-top:0;width:100%}
.hs{flex:1;padding:22px 0;text-align:center;border-right:1px solid var(--bdr2)}.hs:last-child{border-right:none}
.hs-v{font-family:var(--head);font-size:28px;font-weight:800;color:var(--c1)}
.hs-l{font-family:var(--mono);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);margin-top:3px}
.ticker{display:flex;overflow:hidden;border-top:1px solid var(--bdr2);border-bottom:1px solid var(--bdr2);background:var(--sur);padding:10px 0}
.ticker-inner{display:flex;gap:50px;animation:marquee 22s linear infinite;white-space:nowrap}
.ticker-item{font-family:var(--mono);font-size:11px;color:var(--txt3);display:flex;align-items:center;gap:8px}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:20px;padding:64px 48px;max-width:1200px;margin:0 auto;width:100%}
.feat{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);padding:28px;transition:border-color .2s,box-shadow .2s;position:relative;overflow:hidden}
[data-theme="dark"] .feat::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(to right,transparent,var(--c1),transparent);opacity:0;transition:opacity .3s}
.feat:hover{border-color:var(--c1b)}.feat:hover::before{opacity:1}
[data-theme="dark"] .feat:hover{box-shadow:0 4px 30px rgba(0,230,150,.1)}
.feat-icon{font-size:28px;margin-bottom:14px}
.feat-t{font-family:var(--head);font-size:14px;font-weight:600;margin-bottom:8px;color:var(--txt);letter-spacing:.5px}
.feat-d{font-family:var(--sans);font-size:15px;color:var(--txt3);line-height:1.6}
.how{padding:64px 48px;max-width:1000px;margin:0 auto;width:100%;text-align:center}
.how-t{font-family:var(--head);font-size:26px;font-weight:800;margin-bottom:10px;color:var(--c1);letter-spacing:2px}
.how-s{font-family:var(--sans);font-size:16px;color:var(--txt3);margin-bottom:44px}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px}
.step{background:var(--sur);border:1px solid var(--bdr2);border-radius:var(--r2);padding:24px;text-align:left;position:relative}
.step-num{font-family:var(--head);font-size:32px;font-weight:800;color:var(--c1);opacity:.35;margin-bottom:10px;line-height:1}
.step-t{font-family:var(--head);font-size:13px;font-weight:600;margin-bottom:6px;color:var(--txt);letter-spacing:.5px}
.step-d{font-size:14px;color:var(--txt3);line-height:1.6}
.lp-footer{padding:26px 48px;border-top:1px solid var(--bdr2);font-family:var(--mono);font-size:10px;color:var(--txt4);display:flex;justify-content:space-between;align-items:center;background:var(--sur)}

/* ── PORT CONFIG ── */
.port-row{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--bdr)}
.port-label{font-family:var(--mono);font-size:11px;color:var(--txt3);width:60px;flex-shrink:0;letter-spacing:1px;text-transform:uppercase}
.port-inp{width:90px;font-family:var(--mono);font-size:12px;padding:6px 10px;background:var(--bg2);border:1px solid var(--bdr2);color:var(--c1);border-radius:var(--r);outline:none}
.port-inp:focus{border-color:var(--c1)}

/* ── SIMULATOR BUTTON ── */
.sim-btn{font-family:var(--mono);font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;padding:11px 22px;border-radius:var(--r);cursor:pointer;border:1px solid;transition:all .2s;display:inline-flex;align-items:center;gap:8px}
.sim-btn-run{border-color:var(--c2b);color:var(--c2);background:var(--c2d)}.sim-btn-run:hover:not(:disabled){background:var(--c2);color:#fff}.sim-btn-run:disabled{opacity:.4;cursor:not-allowed}
.sim-btn-portal{border-color:var(--c4b);color:var(--c4);background:var(--c4d)}.sim-btn-portal:hover{background:var(--c4);color:#000}
.sim-progress{background:var(--bg);border:1px solid var(--bdr2);border-left:3px solid var(--c2);border-radius:var(--r);padding:16px;margin-top:14px;font-family:var(--mono);font-size:12px;animation:fadeUp .25s ease}
.sim-bar-track{height:6px;background:var(--bg3);border-radius:3px;margin:10px 0;overflow:hidden}
.sim-bar-fill{height:100%;border-radius:3px;background:var(--c2);transition:width .4s ease}
.sim-log{max-height:110px;overflow-y:auto;color:var(--c1);line-height:2;font-size:11px;margin-top:6px}
.sim-log-line{display:flex;gap:8px;align-items:center}
.sim-log-line::before{content:"▸";color:var(--c2);flex-shrink:0}
.portal-url{font-family:var(--mono);font-size:12px;background:var(--bg2);border:1px solid var(--c4b);padding:12px 14px;border-radius:var(--r);color:var(--c4);word-break:break-all;margin-top:10px;display:flex;align-items:center;gap:10px;animation:fadeUp .2s ease}

/* ── RED TEAM DASHBOARD ── */
.rt-panel{background:var(--sur);border:1px solid var(--c2b);border-top:2px solid var(--c2);border-radius:var(--r2);padding:20px;margin-bottom:18px;animation:fadeUp .3s ease}
.rt-run-card{background:var(--bg2);border:1px solid var(--bdr2);border-radius:var(--r);padding:14px;margin-bottom:10px;cursor:pointer;transition:border-color .15s}
.rt-run-card:hover{border-color:var(--c2b)}
.rt-run-card.active{border-color:var(--c2);background:var(--c2d)}
.rt-score{font-family:var(--head);font-size:32px;font-weight:800;line-height:1}
.rt-label{font-family:var(--mono);font-size:9px;letter-spacing:2px;text-transform:uppercase;color:var(--txt3);margin-top:3px}
.rt-stat{text-align:center;padding:0 18px;border-right:1px solid var(--bdr2)}.rt-stat:last-child{border-right:none}

.org-pill{font-family:var(--mono);font-size:10px;padding:6px 14px;cursor:pointer;border:1px solid;border-radius:3px;transition:all .15s;letter-spacing:.5px;font-weight:700;text-transform:uppercase}

/* ── XP / ACHIEVEMENTS ── */
.xp-track{height:5px;background:var(--bg3);border-radius:0;overflow:hidden}
.xp-fill{height:100%;background:var(--c1);transition:width 1.2s ease;border-radius:0}
.ach{display:flex;gap:12px;align-items:center;padding:12px 14px;border:1px solid var(--bdr2);margin-bottom:8px;border-radius:var(--r);background:var(--sur);transition:border-color .2s}
.ach.won{border-color:var(--c3b);background:var(--c3d)}
.ach-ic{font-size:20px;flex-shrink:0;filter:grayscale(1) brightness(.35)}.ach.won .ach-ic{filter:none}
.ach-nm{font-family:var(--mono);font-size:12px;font-weight:700;color:var(--txt2)}.ach.won .ach-nm{color:var(--c3)}
.ach-ds{font-size:13px;color:var(--txt2);margin-top:2px}

@media(max-width:960px){.g4,.g3,.g2{grid-template-columns:1fr}.content{padding:14px 16px}.hud-mid{display:none}.lp-nav{padding:0 20px}.features,.how,.lp-footer{padding-left:20px;padding-right:20px}}
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
  return{s,lbl:["","Weak","Fair","Good","Strong","Elite"][s]||"Elite",col:["","#ff2d55","#ffb800","#ffb800","#00e696","#00bfff"][s]||"#00bfff"};
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