import { useState, useEffect, useRef, useCallback } from "react";

// ── API URL ──────────────────────────────────────────────────────────────
// Set REACT_APP_API_URL before npm start to point at your backend.
// With VirtualBox port forwarding 5000→5000, localhost:5000 works directly.
// Examples:
//   export REACT_APP_API_URL=http://localhost:5000/api       # VirtualBox port-forwarded
//   export REACT_APP_API_URL=http://192.168.1.X:5000/api    # LAN access
//   export REACT_APP_API_URL=https://abc.ngrok-free.app/api # ngrok public
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

/* ─────────────────────────────────────────────────────────────
   GLOBAL CSS
───────────────────────────────────────────────────────────── */
const CSS = `
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
const api = (path, opts={}) => {
  const tk = localStorage.getItem("st_token");
  return fetch(API + path, {
    headers: {"Content-Type":"application/json", ...(tk?{Authorization:`Bearer ${tk}`}:{}), ...opts.headers},
    ...opts,
  }).then(r=>r.json()).catch(()=>({}));
};

/* ─── CONSTANTS ───────────────────────────────────────────── */
const SVC_CLS = {SSH:"b4",HTTP:"b3",FTP:"b3",DB:"b2",ML:"b5"};
const TYPE_CLS = {sqli:"b2",brute:"b3",cred:"b5",scan:"b4",slow:"b1",unknown:"bd"};
const TYPE_XP  = {sqli:150,brute:80,cred:120,scan:30,slow:20,unknown:50};
const TCOLORS  = {sqli:"#ff2d55",brute:"#ffb800",cred:"#b060ff",scan:"#00bfff",slow:"#00e696",unknown:"#3a5070"};
const SCOLORS  = {SSH:"#00bfff",HTTP:"#ffb800",FTP:"#ffb800",DB:"#ff2d55",ML:"#b060ff"};
const tc = t => TCOLORS[t]||"#3a5070";
const sc = s => SCOLORS[s]||"#00e696";

const ACHS=[
  {id:"first",icon:"🎯",name:"First Blood",desc:"First attacker caught",req:s=>s.total>=1},
  {id:"c100",icon:"💯",name:"Century",desc:"100 attacks logged",req:s=>s.total>=100},
  {id:"sqli",icon:"💉",name:"SQL Hunter",desc:"10 SQL injections caught",req:s=>(s.bt?.sqli||0)>=10},
  {id:"brute",icon:"🔨",name:"Brute Buster",desc:"20 brute force stopped",req:s=>(s.bt?.brute||0)>=20},
  {id:"ips",icon:"🌐",name:"Net Sentinel",desc:"50 unique IPs tracked",req:s=>s.ips>=50},
  {id:"mass",icon:"⚔️",name:"Defender",desc:"2500+ attacks logged",req:s=>s.total>=2500},
  {id:"scan",icon:"🔭",name:"Scanner Buster",desc:"30 port scans caught",req:s=>(s.bt?.scan||0)>=30},
  {id:"elite",icon:"🏆",name:"Elite Operator",desc:"Reach Level 5",req:s=>s.level>=5},
];
const xpL = l => l*l*200;
const calcLvl = x => {let l=1;while(xpL(l+1)<=x)l++;return l;};
const pwStr = pw => {
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

/* ─── SHARED COMPONENTS ───────────────────────────────────── */
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

/* ═══════════════════════════════════════════════════════════
   BATTLEFIELD — wider canvas (900px), nodes scale to fit
   Only spawns particles for NEW attacks (since page load)
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   LANDING DEMO BATTLEFIELD
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   LANDING PAGE — GitHub-inspired layout
═══════════════════════════════════════════════════════════ */
function Landing({onSignup, onLogin, onTheme, theme}){
  const [count,setCount]=useState({attacks:0,ips:0,orgs:0});
  useEffect(()=>{
    const targets={attacks:142893,ips:7240,orgs:48};
    const dur=2000, fps=50, interval=dur/fps;
    let frame=0;
    const t=setInterval(()=>{
      frame++;const p=Math.min(frame/fps,1);
      const ease=1-Math.pow(1-p,3);
      setCount({attacks:Math.round(targets.attacks*ease),ips:Math.round(targets.ips*ease),orgs:Math.round(targets.orgs*ease)});
      if(p>=1) clearInterval(t);
    },interval);
    return()=>clearInterval(t);
  },[]);

  const TICKER_ITEMS=["🔴 SSH Brute Force Detected","💉 SQL Injection Caught","🔭 Port Scan Logged","🔑 Credential Stuffing Blocked","🐢 Slow-Loris Trapped","⚡ ML Classifier Running","🌐 42 IPs Blocked Today","🛡 Tarpit Deployed"];

  return <div className="lp" style={{background:"var(--bg)"}}>
    {/* ── NAV — GitHub style sticky ── */}
    <nav style={{
      height:62,display:"flex",alignItems:"center",padding:"0 24px",
      background:"rgba(13,18,37,0.96)",backdropFilter:"blur(12px)",
      borderBottom:"1px solid var(--bdr2)",position:"sticky",top:0,zIndex:200,gap:16
    }}>
      <div className="logo" style={{fontSize:14,letterSpacing:3}}>SNAP<em>TRAP</em></div>
      <div style={{width:1,height:22,background:"var(--bdr2)"}}/>
      {/* search-bar style input — github signature element */}
      <div style={{flex:1,maxWidth:280,position:"relative"}}>
        <input readOnly style={{
          width:"100%",background:"var(--bg2)",border:"1px solid var(--bdr2)",color:"var(--txt3)",
          fontFamily:"var(--mono)",fontSize:12,padding:"6px 12px 6px 34px",borderRadius:6,outline:"none",cursor:"pointer"
        }} placeholder="Search or jump to…" onClick={onLogin}/>
        <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"var(--txt4)",fontSize:13}}>🔍</span>
        <span style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)",border:"1px solid var(--bdr2)",borderRadius:3,padding:"1px 5px"}}>/</span>
      </div>
      <div style={{display:"flex",gap:0,marginLeft:4}}>
        {["Features","How It Works","Docs"].map((lbl,i)=>{
          const targets=["features","how",null];
          return <button key={lbl} className="lp-nl" onClick={()=>targets[i]&&document.getElementById(targets[i])?.scrollIntoView({behavior:"smooth"})}>{lbl}</button>;
        })}
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center",marginLeft:"auto"}}>
        <button className="theme-btn" onClick={onTheme} title="Toggle theme">{theme==="dark"?"☀":"🌙"}</button>
        <div style={{width:1,height:22,background:"var(--bdr2)"}}/>
        <button onClick={onLogin} style={{fontFamily:"var(--mono)",fontSize:11,padding:"5px 14px",borderRadius:6,border:"1px solid var(--bdr2)",background:"transparent",color:"var(--txt2)",cursor:"pointer",transition:"all .15s"}}
          onMouseEnter={e=>e.target.style.borderColor="var(--c1)"}
          onMouseLeave={e=>e.target.style.borderColor="var(--bdr2)"}
        >Sign in</button>
        <button onClick={onSignup} style={{fontFamily:"var(--mono)",fontSize:11,padding:"5px 14px",borderRadius:6,border:"1px solid rgba(0,230,150,.4)",background:"rgba(0,230,150,.12)",color:"var(--c1)",cursor:"pointer",fontWeight:700,transition:"all .15s"}}
          onMouseEnter={e=>{e.target.style.background="var(--c1)";e.target.style.color="#000";}}
          onMouseLeave={e=>{e.target.style.background="rgba(0,230,150,.12)";e.target.style.color="var(--c1)";}}
        >Sign up</button>
      </div>
    </nav>

    {/* ── HERO — two-column GitHub-style ── */}
    <div style={{
      display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",
      minHeight:"calc(100vh - 62px)",borderBottom:"1px solid var(--bdr2)",
      position:"relative",overflow:"hidden"
    }}>
      {/* subtle grid bg */}
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px)",backgroundSize:"40px 40px",pointerEvents:"none",opacity:.5}}/>
      {[{cls:"tl"},{cls:"tr"},{cls:"bl"},{cls:"br"}].map(c=><div key={c.cls} className={`hero-corner ${c.cls}`}/>)}

      {/* LEFT: text + CTA */}
      <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"72px 60px 72px 72px",position:"relative",zIndex:1}}>
        {/* "social proof" badge strip — github repos have star counts */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:28}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c1)",background:"var(--c1d)",border:"1px solid var(--c1b)",padding:"4px 12px",borderRadius:20,letterSpacing:"2px",display:"flex",alignItems:"center",gap:6}}>
            <div className="live-dot"/><span>LIVE</span>
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",background:"var(--bg2)",border:"1px solid var(--bdr2)",padding:"4px 12px",borderRadius:20,letterSpacing:"1px"}}>
            ⭐ Real-Time Honeypot Defense
          </div>
        </div>

        {/* headline — GitHub uses bold, clear, large text */}
        <h1 style={{
          fontFamily:"var(--head)",fontSize:"clamp(32px,4vw,58px)",fontWeight:800,
          lineHeight:1.1,marginBottom:20,letterSpacing:"1px",
          color:"var(--c1)"
        }}>
          Catch attackers<br/>
          <span style={{color:"var(--txt)",fontSize:"0.72em",letterSpacing:"3px",fontWeight:600}}>before they strike</span>
        </h1>

        <p style={{fontFamily:"var(--sans)",fontSize:17,color:"var(--txt2)",lineHeight:1.75,marginBottom:32,maxWidth:500}}>
          Deploy honeypot sensors across your network. Every brute force, SQL injection, and credential guess is <strong style={{color:"var(--txt)"}}>caught, classified by ML, and visualised live</strong> on your dashboard.
        </p>

        {/* CTA buttons — GitHub style: primary green + ghost */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:36}}>
          <button onClick={onSignup} style={{
            fontFamily:"var(--mono)",fontSize:12,fontWeight:700,letterSpacing:"1px",
            padding:"12px 28px",borderRadius:6,border:"1px solid var(--c1)",
            background:"var(--c1)",color:"#000",cursor:"pointer",transition:"all .2s",display:"flex",alignItems:"center",gap:8
          }}
            onMouseEnter={e=>e.currentTarget.style.background="transparent"}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--c1)";e.currentTarget.style.color="#000";}}
          >
            🚀 Deploy Now — Free
          </button>
          <button onClick={onLogin} style={{
            fontFamily:"var(--mono)",fontSize:12,fontWeight:700,letterSpacing:"1px",
            padding:"12px 28px",borderRadius:6,border:"1px solid var(--bdr3)",
            background:"transparent",color:"var(--txt2)",cursor:"pointer",transition:"all .2s"
          }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="var(--c1)";e.currentTarget.style.color="var(--c1)";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--bdr3)";e.currentTarget.style.color="var(--txt2)";}}
          >
            Open Dashboard →
          </button>
        </div>

        {/* stat row — GitHub uses contributor/star stats below hero */}
        <div style={{display:"flex",gap:28,borderTop:"1px solid var(--bdr2)",paddingTop:24}}>
          {[
            {v:count.attacks.toLocaleString(),l:"Attacks Caught",c:"var(--c2)"},
            {v:count.ips.toLocaleString(),l:"IPs Tracked",c:"var(--c4)"},
            {v:`${count.orgs}+`,l:"Organisations",c:"var(--c1)"},
            {v:"92.3%",l:"ML Accuracy",c:"var(--c3)"},
          ].map(({v,l,c})=><div key={l}>
            <div style={{fontFamily:"var(--head)",fontSize:22,fontWeight:800,color:c}}>{v}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--txt3)",marginTop:3,letterSpacing:"1.5px",textTransform:"uppercase"}}>{l}</div>
          </div>)}
        </div>
      </div>

      {/* RIGHT: live demo card — GitHub uses feature screenshots */}
      <div style={{
        position:"relative",borderLeft:"1px solid var(--bdr2)",
        display:"flex",flexDirection:"column",background:"var(--sur)",overflow:"hidden"
      }}>
        {/* window chrome */}
        <div style={{
          padding:"10px 16px",background:"var(--bg2)",borderBottom:"1px solid var(--bdr2)",
          fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"2px",
          display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0
        }}>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#ff5f57"}}/>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#febc2e"}}/>
            <div style={{width:10,height:10,borderRadius:"50%",background:"#28c840"}}/>
            <span style={{marginLeft:8}}>snaptrap.io/battlefield</span>
          </div>
          <div className="live-chip"><div className="live-dot"/>LIVE DEMO</div>
        </div>
        <div style={{flex:"0 0 auto",overflow:"auto"}}>
          <LandingDemoBattlefield/>
        </div>
        <div style={{borderTop:"1px solid var(--bdr2)",background:"var(--bg)",flex:1,overflow:"hidden",minHeight:0}}>
          <div style={{padding:"6px 14px",fontFamily:"var(--mono)",fontSize:9,color:"var(--txt3)",letterSpacing:"2px",borderBottom:"1px solid var(--bdr)",display:"flex",justifyContent:"space-between"}}>
            <span>◉ RAID FEED</span>
            <span style={{color:"var(--c1)"}}>auto-updating</span>
          </div>
          <LandingLiveFeed/>
        </div>
      </div>
    </div>

    {/* ── TICKER ── */}
    <div className="ticker" style={{background:"var(--bg2)",borderBottom:"1px solid var(--bdr2)"}}>
      <div className="ticker-inner">
        {[...TICKER_ITEMS,...TICKER_ITEMS].map((t,i)=><div key={i} className="ticker-item"><span style={{color:"var(--c1)"}}>◈</span>{t}</div>)}
      </div>
    </div>

    {/* ── FEATURE SECTION — GitHub-style with icon cards ── */}
    <div id="features" style={{padding:"80px 72px",maxWidth:1280,margin:"0 auto",width:"100%"}}>
      <div style={{textAlign:"center",marginBottom:56}}>
        <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c1)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:12}}>◈ Platform Features</div>
        <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(24px,3vw,40px)",fontWeight:800,color:"var(--txt)",letterSpacing:"1px",marginBottom:14}}>Everything you need to defend your network</h2>
        <p style={{fontFamily:"var(--sans)",fontSize:16,color:"var(--txt3)",maxWidth:560,margin:"0 auto",lineHeight:1.7}}>SNAPTRAP brings enterprise-grade honeypot intelligence to any team, with zero infrastructure overhead.</p>
      </div>

      {/* 3-column feature grid — GitHub uses this exact pattern */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:1,border:"1px solid var(--bdr2)",borderRadius:10,overflow:"hidden"}}>
        {[
          {icon:"🛡",t:"Honeypot Services",d:"SSH, HTTP, FTP, and DB honeypots capture payloads and attacker IPs — automatically, always-on. No configuration needed.",c:"var(--c1)"},
          {icon:"📡",t:"Live Battlefield",d:"Animated canvas shows attack particles flying toward your honeypot nodes in real-time as your network is probed.",c:"var(--c4)"},
          {icon:"🤖",t:"ML Classification",d:"Random Forest classifier identifies brute force, SQL injection, credential stuffing, slow probes, and novel attack patterns.",c:"var(--c5)"},
          {icon:"📊",t:"Threat Intelligence",d:"Track unique IPs, timelines, risk levels and trends. Export full reports as CSV for compliance and audit.",c:"var(--c3)"},
          {icon:"🔑",t:"Agent Deployment",d:"Download a pre-configured agent.py — runs on any Linux server. Catches attacks and reports back in seconds.",c:"var(--c2)"},
          {icon:"🏆",t:"Gamified Defense",d:"Earn XP for every attack caught. Unlock achievements and level up your Operator rank to keep your team motivated.",c:"var(--c1)"},
        ].map((f,i)=><div key={f.t} style={{
          background:"var(--sur)",padding:"32px 28px",
          borderRight:i%3!==2?"1px solid var(--bdr2)":"none",
          borderBottom:i<3?"1px solid var(--bdr2)":"none",
          transition:"background .2s",cursor:"default",
        }}
          onMouseEnter={e=>e.currentTarget.style.background="var(--bg2)"}
          onMouseLeave={e=>e.currentTarget.style.background="var(--sur)"}
        >
          <div style={{fontSize:26,marginBottom:14}}>{f.icon}</div>
          <div style={{fontFamily:"var(--head)",fontSize:15,fontWeight:700,marginBottom:10,color:"var(--txt)",letterSpacing:".3px",display:"flex",alignItems:"center",gap:8}}>
            <span style={{width:3,height:14,background:f.c,borderRadius:2,display:"inline-block",flexShrink:0}}/>
            {f.t}
          </div>
          <div style={{fontFamily:"var(--sans)",fontSize:14,color:"var(--txt3)",lineHeight:1.65}}>{f.d}</div>
        </div>)}
      </div>
    </div>

    {/* ── HOW IT WORKS — GitHub-style step flow ── */}
    <div id="how" style={{borderTop:"1px solid var(--bdr2)",background:"var(--sur)",padding:"80px 72px"}}>
      <div style={{maxWidth:1000,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c1)",letterSpacing:"3px",textTransform:"uppercase",marginBottom:12}}>◉ Getting Started</div>
          <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(22px,2.8vw,36px)",fontWeight:800,color:"var(--txt)",letterSpacing:"1px"}}>Deploy in minutes. Monitor forever.</h2>
        </div>

        {/* horizontal step flow — connected with a line */}
        <div style={{position:"relative",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:0}}>
          <div style={{position:"absolute",top:28,left:"12.5%",right:"12.5%",height:2,background:"linear-gradient(to right,var(--c1),var(--c4))",opacity:.35,zIndex:0}}/>
          {[
            {n:"01",t:"Sign Up",d:"Create your org account and receive your unique agent token.",icon:"🔐"},
            {n:"02",t:"Download Agent",d:"Grab agent.py from the Control Panel — pre-configured for your org.",icon:"⬇"},
            {n:"03",t:"Deploy",d:"Run the agent on your server. It starts catching attacks immediately.",icon:"🚀"},
            {n:"04",t:"Monitor Live",d:"Watch attacks, ML classifications, and threat actors in real-time.",icon:"📡"},
          ].map((s,i)=><div key={s.n} style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"0 20px",position:"relative",zIndex:1}}>
            <div style={{
              width:56,height:56,borderRadius:"50%",
              background:"var(--bg)",border:"2px solid var(--c1)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontFamily:"var(--head)",fontSize:18,fontWeight:800,color:"var(--c1)",
              marginBottom:20,boxShadow:"0 0 20px rgba(0,230,150,.15)",
              flexShrink:0
            }}>{s.icon}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--c1)",letterSpacing:"2px",marginBottom:6}}>{s.n}</div>
            <div style={{fontFamily:"var(--head)",fontSize:14,fontWeight:700,color:"var(--txt)",marginBottom:8,letterSpacing:".3px"}}>{s.t}</div>
            <div style={{fontFamily:"var(--sans)",fontSize:13,color:"var(--txt3)",lineHeight:1.6}}>{s.d}</div>
          </div>)}
        </div>
      </div>
    </div>

    {/* ── CTA BANNER — GitHub-style full-width CTA ── */}
    <div style={{
      borderTop:"1px solid var(--bdr2)",borderBottom:"1px solid var(--bdr2)",
      background:"var(--bg)",padding:"72px 72px",textAlign:"center",
      position:"relative",overflow:"hidden"
    }}>
      <div style={{position:"absolute",inset:0,backgroundImage:"linear-gradient(var(--bdr) 1px,transparent 1px),linear-gradient(90deg,var(--bdr) 1px,transparent 1px)",backgroundSize:"36px 36px",opacity:.4,pointerEvents:"none"}}/>
      <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 60% 60% at 50% 50%,rgba(0,230,150,.06),transparent)",pointerEvents:"none"}}/>
      <div style={{position:"relative",zIndex:1}}>
        <h2 style={{fontFamily:"var(--head)",fontSize:"clamp(24px,3.5vw,44px)",fontWeight:800,color:"var(--c1)",marginBottom:16,letterSpacing:"2px",lineHeight:1.15}}>
          Start catching attackers today
        </h2>
        <p style={{fontFamily:"var(--sans)",fontSize:17,color:"var(--txt2)",marginBottom:32,maxWidth:500,margin:"0 auto 32px"}}>
          Free to get started. No credit card. No infrastructure. Just deploy the agent and watch the dashboard light up.
        </p>
        <div style={{display:"flex",gap:14,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onSignup} style={{
            fontFamily:"var(--mono)",fontSize:13,fontWeight:700,letterSpacing:"1.5px",
            padding:"14px 36px",borderRadius:6,border:"1px solid var(--c1)",
            background:"var(--c1)",color:"#000",cursor:"pointer",transition:"all .2s",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="var(--c1)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="var(--c1)";e.currentTarget.style.color="#000";}}
          >
            Create free account →
          </button>
          <button onClick={onLogin} style={{
            fontFamily:"var(--mono)",fontSize:13,fontWeight:700,letterSpacing:"1.5px",
            padding:"14px 36px",borderRadius:6,border:"1px solid var(--bdr3)",
            background:"transparent",color:"var(--txt3)",cursor:"pointer",transition:"all .2s"
          }}
            onMouseEnter={e=>{e.currentTarget.style.color="var(--c1)";e.currentTarget.style.borderColor="var(--c1b)";}}
            onMouseLeave={e=>{e.currentTarget.style.color="var(--txt3)";e.currentTarget.style.borderColor="var(--bdr3)";}}
          >
            Sign in to dashboard
          </button>
        </div>
      </div>
    </div>

    {/* ── FOOTER — GitHub-style footer ── */}
    <footer style={{
      padding:"32px 72px",borderTop:"1px solid var(--bdr2)",
      background:"var(--sur)",
      display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:16
    }}>
      <div style={{fontFamily:"var(--head)",color:"var(--c1)",letterSpacing:"4px",fontSize:14}}>SNAPTRAP</div>
      <div style={{display:"flex",gap:24,fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>
        {["Features","How It Works","Sign Up","Login"].map(l=><span key={l} style={{cursor:"pointer",transition:"color .15s"}}
          onMouseEnter={e=>e.target.style.color="var(--c1)"}
          onMouseLeave={e=>e.target.style.color="var(--txt4)"}
          onClick={l==="Login"?onLogin:l==="Sign Up"?onSignup:undefined}
        >{l}</span>)}
      </div>
      <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>
        © 2025 SNAPTRAP · Honeypot Defense Platform
      </div>
    </footer>
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════ */
function Auth({onLogin, onBack, initialMode="login"}){
  const [tab,setTab]=useState("org"); // org | red | admin
  const [mode,setMode]=useState(initialMode); // login | signup (org only)

  // org/admin login state
  const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  const [err,setErr]=useState("");const [busy,setBusy]=useState(false);
  // red team login state
  const [rtEmail,setRtEmail]=useState("");const [rtPass,setRtPass]=useState("");
  const [rtErr,setRtErr]=useState("");const [rtBusy,setRtBusy]=useState(false);
  // signup state
  const [sName,setSName]=useState("");const [sEmail,setSEmail]=useState("");
  const [sPass,setSPass]=useState("");const [sPass2,setSPass2]=useState("");
  const [sErr,setSErr]=useState("");const [sOk,setSOk]=useState("");const [sBusy,setSBusy]=useState(false);
  const str=pwStr(sPass);

  function switchTab(t){setTab(t);setErr("");setRtErr("");}

  async function doLogin(){
    setBusy(true);setErr("");
    const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email,password:pass})});
    if(d.token){localStorage.setItem("st_token",d.token);onLogin(d);}
    else{setErr(d.error||"Login failed");setBusy(false);}
  }
  async function doRedLogin(){
    setRtBusy(true);setRtErr("");
    const d=await api("/auth/login",{method:"POST",body:JSON.stringify({email:rtEmail,password:rtPass})});
    if(d.token&&d.role==="redteam"){localStorage.setItem("st_token",d.token);onLogin(d);}
    else if(d.token){setRtErr("This account is not a Red Team account");setRtBusy(false);}
    else{setRtErr(d.error||"Login failed");setRtBusy(false);}
  }
  async function doSignup(){
    if(!sName.trim()){setSErr("Organisation name required");return;}
    if(str.s<3){setSErr("Weak password — add uppercase, number, symbol");return;}
    if(sPass!==sPass2){setSErr("Passwords do not match");return;}
    setSBusy(true);setSErr("");setSOk("");
    const d=await api("/auth/signup",{method:"POST",body:JSON.stringify({email:sEmail,password:sPass,name:sName})});
    if(d.org_id||d.token){
      setSOk("Account created! Please sign in.");
      setTimeout(()=>{setMode("login");setEmail(sEmail);setPass("");setSOk("");},2000);
    } else {setSErr(d.error||"Registration failed");}
    setSBusy(false);
  }

  return <div className="auth-page">
    <div className="auth-grid"/>
    <div className="auth-scan"/>
    <div style={{width:"100%",maxWidth:460,padding:"0 20px",position:"relative",zIndex:10}}>

      {/* Logo above card */}
      <div style={{textAlign:"center",marginBottom:24}}>
        <div className="a-logo">SNAPTRAP</div>
        <div className="a-sub">Scalable Network Attack Parallel Trap &amp; Response</div>
        <div className="a-logo-divider"/>
      </div>

      <div className="a-status" style={{marginBottom:16,borderRadius:"var(--r)"}}>
        <div className="a-status-dot"/>
        SYSTEM ONLINE &nbsp;|&nbsp; HONEYPOT ACTIVE &nbsp;|&nbsp; JWT AUTH v2
      </div>

      <div className="abox">
        {/* 3-tab switcher */}
        <div className="auth-tabs">
          <button className={`auth-tab ${tab==="org"?"tab-org":""}`} onClick={()=>switchTab("org")}>
            <span className="atab-icon">🏢</span>Organisation
          </button>
          <button className={`auth-tab ${tab==="red"?"tab-red":""}`} onClick={()=>switchTab("red")}>
            <span className="atab-icon">🎯</span>Red Team
          </button>
          <button className={`auth-tab ${tab==="admin"?"tab-admin":""}`} onClick={()=>switchTab("admin")}>
            <span className="atab-icon">⚡</span>Superadmin
          </button>
        </div>

        <div className="auth-form-body">

          {/* ── ORG PANEL ── */}
          {tab==="org"&&<>
            {mode==="login"?<>
              <div className="auth-role-badge org">● ORG ANALYST / ADMIN</div>
              <div className="afield"><label className="lbl">Email</label><input className="inp" value={email} onChange={e=>setEmail(e.target.value)} placeholder="analyst@yourorg.com" style={{borderColor:"rgba(0,230,150,.2)"}}/></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••" style={{borderColor:"rgba(0,230,150,.2)"}}/></div>
              <button className="abtn btn-org" onClick={doLogin} disabled={busy}>{busy?"Authenticating…":"ACCESS DASHBOARD →"}</button>
              {err&&<div className="aerr">⚠ {err}</div>}
              <div className="auth-footer-links">
                <span style={{color:"var(--txt4)",cursor:"default"}}>Forgot password?</span>
                <button className="btn-link" onClick={()=>setMode("signup")} style={{color:"var(--c1)",cursor:"pointer",background:"none",border:"none",padding:0,fontFamily:"var(--mono)",fontSize:"inherit"}}>Register organisation →</button>
              </div>
             
            </>:<>
              <div className="auth-role-badge org">+ NEW ORGANISATION</div>
              <div className="afield"><label className="lbl">Organisation Name</label><input className="inp" placeholder="Your company or project name" value={sName} onChange={e=>setSName(e.target.value)}/></div>
              <div className="afield"><label className="lbl">Email</label><input className="inp" placeholder="you@example.com" value={sEmail} onChange={e=>setSEmail(e.target.value)}/></div>
              <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" placeholder="Min 8 chars, uppercase + number" value={sPass} onChange={e=>setSPass(e.target.value)}/><PWBar pw={sPass}/></div>
              <div className="afield"><label className="lbl">Confirm Password</label><input className="inp" type="password" value={sPass2} onChange={e=>setSPass2(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doSignup()}/>{sPass2&&<div style={{fontFamily:"var(--mono)",fontSize:10,marginTop:4,color:sPass===sPass2?"var(--c1)":"var(--c2)"}}>{sPass===sPass2?"✓ Match":"✗ No match"}</div>}</div>
              <button className="abtn btn-org" onClick={doSignup} disabled={sBusy||!sEmail||str.s<3}>{sBusy?"Creating…":"CREATE ACCOUNT →"}</button>
              {sErr&&<div className="aerr">⚠ {sErr}</div>}
              {sOk&&<div className="aok">✓ {sOk}</div>}
              <div className="auth-footer-links"><button onClick={()=>setMode("login")} style={{color:"var(--txt3)",cursor:"pointer",background:"none",border:"none",padding:0,fontFamily:"var(--mono)",fontSize:"inherit"}}>← Back to login</button></div>
            </>}
          </>}

          {/* ── RED TEAM PANEL ── */}
          {tab==="red"&&<>
            <div className="auth-role-badge red">⚠ RED TEAM OPERATOR</div>
            <div className="auth-warn">
              <strong>⚠ AUTHORIZED PERSONNEL ONLY</strong>
              Red team access is restricted to approved security testers. All sessions are logged and monitored.
            </div>
            <div className="afield"><label className="lbl">Operator Email</label><input className="inp" value={rtEmail} onChange={e=>setRtEmail(e.target.value)} placeholder="operator@redteam.io" autoComplete="off" style={{borderColor:"rgba(255,45,85,.2)"}}/></div>
            <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={rtPass} onChange={e=>setRtPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doRedLogin()} placeholder="••••••••" autoComplete="off" style={{borderColor:"rgba(255,45,85,.2)"}}/></div>
            <button className="abtn btn-red" onClick={doRedLogin} disabled={rtBusy}>{rtBusy?"Authenticating…":"ENTER RED TEAM OPS →"}</button>
            {rtErr&&<div className="aerr">⚠ {rtErr}</div>}
            <div className="auth-footer-links"><span style={{color:"var(--txt4)"}}>Engagement brief</span><span style={{color:"var(--txt4)"}}>Request access</span></div>
          </>}

          {/* ── SUPERADMIN PANEL ── */}
          {tab==="admin"&&<>
            <div className="auth-role-badge admin">★ SUPERADMIN — GLOBAL ACCESS</div>
            <div className="afield"><label className="lbl">Admin Email</label><input className="inp" value={email} onChange={e=>setEmail(e.target.value)} placeholder="admin@snaptrap.io" autoComplete="off" style={{borderColor:"rgba(255,184,0,.2)"}}/></div>
            <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••" autoComplete="off" style={{borderColor:"rgba(255,184,0,.2)"}}/></div>
            <button className="abtn btn-admin" onClick={doLogin} disabled={busy}>{busy?"Authenticating…":"ENTER SUPERADMIN →"}</button>
            {err&&<div className="aerr">⚠ {err}</div>}
            <div className="auth-footer-links"><span style={{color:"var(--txt4)"}}>Admin docs</span><span style={{color:"var(--txt4)"}}>Audit log</span></div>
          </>}

        </div>
      </div>

      <div className="auth-info-strip">
        <span>JWT // HS256</span><span>TLS 1.3</span><span>SNAPTRAP v2.1</span>
        {onBack&&<span style={{color:"var(--c1)",cursor:"pointer"}} onClick={onBack}>← Back to landing</span>}
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   ACCOUNT PAGE
═══════════════════════════════════════════════════════════ */
function AccountPage({user, onLogout, onBack}){
  const [info,setInfo]=useState(null);const [del,setDel]=useState(false);const [delCfm,setDelCfm]=useState("");
  const [pwOld,setPwOld]=useState("");const [pwNew,setPwNew]=useState("");const [pwMsg,setPwMsg]=useState("");const [pwErr,setPwErr]=useState("");
  const str=pwStr(pwNew);
  useEffect(()=>{api("/control/info").then(setInfo);},[]);

  async function changePw(){
    if(str.s<3){setPwErr("New password too weak");return;}
    setPwMsg("");setPwErr("");
    const d=await api("/auth/change-password",{method:"POST",body:JSON.stringify({old_password:pwOld,new_password:pwNew})});
    if(d.ok){setPwMsg("Password updated!");setPwOld("");setPwNew("");}
    else setPwErr(d.error||"Failed — check current password");
  }
  async function requestDelete(){
    if(delCfm!=="DELETE") return;
    const d=await api("/control/request-delete",{method:"POST"});
    if(d.ok){alert("Deletion request submitted.");setDel(false);}
    else alert(d.error||"Request failed");
  }

  return <div className="acc-page">
    <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
      <button className="btn btn-4" style={{fontSize:10}} onClick={onBack}>← Dashboard</button>
      <div style={{fontFamily:"var(--head)",fontSize:16,color:"var(--c1)",letterSpacing:"2px"}}>ACCOUNT SETTINGS</div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Profile</div>
      <div className="acc-body">
        {info?<>
          <div className="acc-row"><span className="acc-lk">Organisation</span><span className="acc-rv">{info.name}</span></div>
          <div className="acc-row"><span className="acc-lk">Email</span><span className="acc-rv">{info.email}</span></div>
          <div className="acc-row"><span className="acc-lk">Role</span><span><Badge v={user.role} map={{superadmin:"b5",org:"b4"}}/></span></div>
          <div className="acc-row"><span className="acc-lk">Agent Token</span><span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c1)"}}>{info.agent_token?.slice(0,16)}…</span></div>
        </>:<Loader/>}
      </div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Change Password</div>
      <div className="acc-body">
        <div className="afield"><label className="lbl">Current Password</label><input className="inp" type="password" value={pwOld} onChange={e=>setPwOld(e.target.value)} placeholder="Current password"/></div>
        <div className="afield"><label className="lbl">New Password</label><input className="inp" type="password" value={pwNew} onChange={e=>setPwNew(e.target.value)} placeholder="New password"/><PWBar pw={pwNew}/></div>
        {pwErr&&<div className="aerr" style={{marginBottom:10}}>⚠ {pwErr}</div>}
        {pwMsg&&<div className="aok" style={{marginBottom:10}}>✓ {pwMsg}</div>}
        <button className="btn btn-1" onClick={changePw}>Update Password</button>
      </div>
    </div>

    <div className="acc-section">
      <div className="acc-head">Session</div>
      <div className="acc-body">
        <div className="acc-row"><span className="acc-lk">Status</span><span><Badge v="Active" map={{Active:"b1"}}/></span></div>
        <div className="acc-row" style={{borderBottom:"none"}}><span className="acc-lk">Action</span><button className="btn btn-3" onClick={onLogout}>Logout →</button></div>
      </div>
    </div>

    <div className="acc-section" style={{borderColor:"var(--c2b)"}}>
      <div className="acc-head" style={{color:"var(--c2)"}}>⚠ Danger Zone</div>
      <div className="acc-body">
        {user?.role==="superadmin"
          ? <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt2)",lineHeight:2}}>Superadmin accounts cannot be self-deleted.</div>
          : <>
            <div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt2)",marginBottom:16,lineHeight:2}}>Requesting account deletion notifies the admin. All data is permanently removed after admin approval.</div>
            {!del?<button className="btn btn-2" onClick={()=>setDel(true)}>Request Account Deletion</button>:<div>
              <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--c2)",marginBottom:10}}>Type <strong>DELETE</strong> to confirm:</div>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                <input className="inp" placeholder="DELETE" value={delCfm} onChange={e=>setDelCfm(e.target.value)} style={{borderColor:"var(--c2b)",maxWidth:200}}/>
                <button className="btn btn-2" onClick={requestDelete} disabled={delCfm!=="DELETE"}>Confirm</button>
                <button className="btn btn-ghost" onClick={()=>{setDel(false);setDelCfm("");}}>Cancel</button>
              </div>
            </div>}
          </>
        }
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   MODULE 1 — LIVE MONITOR
   - cursorRef set to max-id at mount → no old attacks on battlefield
   - newBatch state: only the LATEST poll batch sent to Battlefield
     so the seen-set never blocks them (each batch is fresh unique ids)
   - historyFeed accumulates for the scrollable list
   - limit=500 on since_id so 200-attacker simulator waves all come through
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   LIVE MONITOR ATTACK SIMULATOR — injects attacks directly
   into the battlefield feed via simBatch state
═══════════════════════════════════════════════════════════ */
let _simCounter = 0;
function LiveSimulatorPanel({onSimBatch}){
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState(0);
  const [log,setLog]=useState([]);
  const intervalRef=useRef(null);

  const ATTACK_TYPES=["brute","scan","sqli","cred","slow"];
  const SERVICES=["SSH","HTTP","FTP","DB","ML"];

  function randomIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}

  function runSim(count){
    if(running) return;
    setRunning(true);setProgress(0);setLog([]);
    let fired=0;
    intervalRef.current=setInterval(()=>{
      // fire 1-3 attacks per tick for visual density
      const burst=Math.min(3,count-fired);
      const batch=[];
      for(let i=0;i<burst;i++){
        const type=ATTACK_TYPES[Math.floor(Math.random()*ATTACK_TYPES.length)];
        const svc=SERVICES[Math.floor(Math.random()*SERVICES.length)];
        const ip=randomIP();
        const score=20+Math.floor(Math.random()*80);
        const uid = `sim-${Date.now()}-${++_simCounter}`;
        batch.push({id: uid, attacker_ip:ip, attack_type:type, service:svc, threat_score:score, timestamp:new Date().toISOString()});
        setLog(prev=>[`${ip} → ${svc} [${type}] ● ${score}`,...prev].slice(0,8));
      }
      onSimBatch(batch);
      fired+=burst;
      setProgress(Math.round((fired/count)*100));
      if(fired>=count){
        clearInterval(intervalRef.current);
        setRunning(false);
        setProgress(100);
      }
    },400);
  }

  function stop(){clearInterval(intervalRef.current);setRunning(false);setProgress(0);setLog([]);}
return (
  <div style={{
    background: "var(--sur)",
    border: "1px solid var(--bdr2)",
    borderTop: "2px solid var(--c2)",
    borderRadius: "var(--r2)",
    padding: "10px 14px",
    boxShadow: "var(--sh)", 
    height: 180, 
    display: "flex",
    flexDirection: "column", 
    overflow: "hidden" 
  }}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",color:"var(--c2)",display:"flex",alignItems:"center",gap:8}}>
        ◈ Attack Simulator
        {running && <span style={{color:"var(--c3)",animation:"pulse 1s infinite"}}>● LIVE</span>}
      </div>
      <NgrokPortalButton compact/>
    </div>
    
    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:6}}>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10}} onClick={()=>runSim(20)} disabled={running}>▶ Wave</button>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10, borderColor:"var(--c3b)",color:"var(--c3)",background:"var(--c3d)"}} onClick={()=>runSim(80)} disabled={running}>⚡ Raid</button>
      <button className="sim-btn sim-btn-run" style={{padding:"4px 8px", fontSize:10, borderColor:"var(--c5b)",color:"var(--c5)",background:"var(--c5d)"}} onClick={()=>runSim(200)} disabled={running}>💥 Storm</button>
      {running && <button className="btn btn-ghost" style={{fontSize:10, padding:"4px 8px"}} onClick={stop}>■ Stop</button>}
    </div>

    {(running || progress > 0) && (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:2}}>
          <span>{running ? "Firing attacks..." : "Complete"}</span>
          <span style={{color:running?"var(--c2)":"var(--c1)"}}>{progress}%</span>
        </div>
        <div className="sim-bar-track" style={{marginBottom:6, height: 4}}>
          <div className="sim-bar-fill" style={{width:`${progress}%`, height: '100%', background:running?"var(--c2)":"var(--c1)"}}/>
        </div>

        <div style={{ 
            overflowY: "auto", 
            flex: 1, 
            background: "rgba(0,0,0,0.2)", 
            padding: "6px", 
            borderRadius: "4px",
            fontFamily: "var(--mono)",
            fontSize: 10,
            lineHeight: "1.4"
          }}>
          {log.map((l, i) => (
            <div key={i} style={{display:"flex", gap:6, color: "var(--txt3)", marginBottom: 2}}>
              <span style={{color:"var(--c2)"}}>▸</span>{l}
            </div>
          ))}
        </div>
      </div>
    )}
  </div>
);
}

function LiveMonitor({user, xp, setXp}){
  const [stats,setStats]=useState(null);const [timeline,setTimeline]=useState([]);
  const [historyFeed,setHistoryFeed]=useState([]);
  const [newBatch,setNewBatch]=useState([]);
  const [sel,setSel]=useState(null);
  const cursorRef=useRef(0);const initRef=useRef(false);

  // Local counters — update instantly from simulator, no Flask polling lag
  const [localCaught,setLocalCaught]=useState(0);
  const [localIPs,setLocalIPs]=useState(new Set());
  const [localByType,setLocalByType]=useState({});
  const [localByService,setLocalByService]=useState({});

  const handleHit=useCallback(v=>{
    setXp(c=>{const n=c+v;localStorage.setItem("st_xp",n);return n;});
  },[setXp]);

  // THE FIX: handleSimBatch now updates ALL sinks — battlefield, raid feed,
  // and the stat counters — so every button click is reflected immediately
const handleSimBatch = useCallback(async (batch) => {
  // 1. Update UI immediately (existing behaviour)
  setNewBatch([...batch]);
  setHistoryFeed(prev => [...batch, ...prev].slice(0, 300));
  setLocalCaught(prev => prev + batch.length);
  setLocalIPs(prev => {
    const s = new Set(prev);
    batch.forEach(a => { if (a.attacker_ip) s.add(a.attacker_ip); });
    return s;
  });
  setLocalByType(prev => {
    const n = {...prev};
    batch.forEach(a => { n[a.attack_type] = (n[a.attack_type] || 0) + 1; });
    return n;
  });
  setLocalByService(prev => {
    const n = {...prev};
    batch.forEach(a => { n[a.service] = (n[a.service] || 0) + 1; });
    return n;
  });

  // 2. Persist to DB so Intel, Threat Level, timeline, etc. all update
  try {
    await api("/attacks/simulate", {
      method: "POST",
      body: JSON.stringify(batch)
    });
  } catch(e) {
    console.warn("Sim persist failed:", e);
  }
}, []);

  useEffect(()=>{
    async function init(){
      const tk = localStorage.getItem("st_token");
      if (!tk) return;  // ← add this
      const m=await api("/attacks/max-id");
      cursorRef.current=m.max_id||0;
      initRef.current=true;
      // History feed for display list only — these do NOT go to battlefield
      const d=await api("/attacks?limit=80");
      if(Array.isArray(d)) setHistoryFeed(d.slice(0,80));
      api("/attacks/stats").then(setStats);
      api("/stats/timeline?interval=day").then(d=>Array.isArray(d)&&setTimeline(d));
    }
    init();
  },[]);

  useEffect(()=>{
    const t=setInterval(async()=>{
      if(!initRef.current) return;
      // limit=500 so a full 200-attacker simulator wave is never truncated
      const fresh=await api(`/attacks/since?since_id=${cursorRef.current}&limit=500`);
      if(Array.isArray(fresh)&&fresh.length){
        cursorRef.current=Math.max(...fresh.map(a=>a.id));
        setHistoryFeed(prev=>[...fresh,...prev].slice(0,300));
        // Send ONLY this batch to battlefield — new array ref every time
        setNewBatch([...fresh]);
      }
    },2000);
    const t2=setInterval(()=>{
      api("/attacks/stats").then(setStats);
      api("/stats/timeline?interval=day").then(d=>Array.isArray(d)&&setTimeline(d));
    },8000);
    return()=>{clearInterval(t);clearInterval(t2);};
  },[]);

  // Merge local (instant from simulator) with Flask (polled every 8s)
  const displayCaught = Math.max(stats?.total_attacks||0, localCaught);
  const displayIPs    = Math.max(stats?.unique_ips||0, localIPs.size);
  const displayAvg    = stats?.avg_threat_score||0;
  const mergedByType  = {...(stats?.by_type||{})};
  Object.entries(localByType).forEach(([k,v])=>{mergedByType[k]=(mergedByType[k]||0)+v;});
  const mergedBySvc   = {...(stats?.by_service||{})};
  Object.entries(localByService).forEach(([k,v])=>{mergedBySvc[k]=(mergedBySvc[k]||0)+v;});
  const svcData  = Object.entries(mergedBySvc).map(([l,c])=>({label:l,count:c}));
  const typeData = Object.entries(mergedByType).map(([l,c])=>({label:l,count:c}));
  const total    = displayCaught;
  const tl=total>1000?"CRITICAL":total>200?"HIGH":total>50?"MEDIUM":"LOW";
  const tlC={CRITICAL:"var(--c2)",HIGH:"var(--c3)",MEDIUM:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRITICAL:5,HIGH:4,MEDIUM:3,LOW:2}[tl];

  return <div>
    {tl==="CRITICAL"&&<div className="alert-bar crit"><span style={{animation:"blink 1s infinite"}}>⚠</span>CRITICAL — sustained attack campaign detected</div>}
    {tl==="HIGH"&&<div className="alert-bar warn">⚠ HIGH — elevated threat activity</div>}
    <div className="content">
      {/* Row: Battlefield (900px fixed) + right column (raid feed + simulator) */}
      <div style={{display:"flex",gap:16,marginBottom:18,alignItems:"flex-start"}}>

        {/* Fixed 900px battlefield */}
        <div style={{width:900,flexShrink:0}}>
          <Battlefield feed={newBatch} onHit={handleHit} isLive={true}/>
        </div>

        {/* Right column — same width as remaining space, capped height */}
        <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",gap:12}}>

          {/* Simulator panel — sits above raid feed, matches its width */}
          <LiveSimulatorPanel onSimBatch={handleSimBatch}/>

          {/* Raid feed — fixed height, internal scroll */}
          <div style={{display:"flex",flexDirection:"column",background:"var(--sur)",border:"1px solid var(--bdr2)",borderRadius:"var(--r2)",overflow:"hidden",boxShadow:"var(--sh)",height:340}}>
            <div className="raid-bar">
              <div className="raid-t">◉ Live Raid Feed</div>
              <div className="live-chip"><div className="live-dot"/>LIVE</div>
            </div>
            {/* scrollable area — fixed height, never grows */}
            <div style={{overflowY:"scroll",flex:1,minHeight:0}}>
              {!historyFeed.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:"24px 16px",textAlign:"center"}}>No attacks yet.<br/><span style={{fontSize:11,color:"var(--txt3)"}}>Run your agent or hit a simulator button to begin.</span></div>}
              {historyFeed.map((a,i)=><div key={a.id||i} className={`ri ${i<5?"fresh":""}`} onClick={()=>setSel(sel?.id===a.id?null:a)}>
                <div className="rdot pulse" style={{background:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)",color:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}/>
                <span style={{color:"var(--txt3)",fontSize:10,width:50,flexShrink:0}}>{a.timestamp?.slice(11,19)}</span>
                <span className="ri-ip">{a.attacker_ip}</span>
                <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",flexShrink:0,width:34,textAlign:"right"}}>{a.threat_score}</span>
              </div>)}
            </div>
            {sel&&<div style={{padding:10,borderTop:"1px solid var(--bdr2)",background:"var(--bg2)",flexShrink:0,maxHeight:110,overflowY:"auto"}}>
              <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                <TRing score={sel.threat_score||0} size={44}/>
                <div>
                  <div style={{fontFamily:"var(--mono)",fontSize:12,fontWeight:700,color:"var(--c4)"}}>{sel.attacker_ip}</div>
                  <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:2,display:"flex",gap:6}}>
                    <Badge v={sel.service} map={SVC_CLS}/>
                    <Badge v={sel.attack_type} map={TYPE_CLS}/>
                  </div>
                </div>
              </div>
              {sel.payload&&<div className="pbox" style={{maxHeight:50,fontSize:11}}>{sel.payload}</div>}
            </div>}
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="g4" style={{marginBottom:18}}>
        {[{l:"Attacks Caught",v:displayCaught,c:"var(--c2)",acc:"c2"},{l:"Unique IPs",v:displayIPs,c:"var(--c4)",acc:"c4"},{l:"Avg Threat Score",v:displayAvg,c:"var(--c3)",acc:"c3"},{l:"Attack Types",v:typeData.length||0,c:"var(--c1)",acc:"c1"}].map(({l,v,c,acc})=><div key={l} className={`panel ${acc}`}><div className="stat-v" style={{color:c}}>{v}</div><div className="stat-l">{l}</div></div>)}
      </div>

      {/* Timeline + Threat level + By Service + By Attack Type */}
      <div className="g2" style={{marginBottom:18}}>
        <div className="panel"><div className="ph">Attack Timeline</div>{timeline.length?<TLChart data={timeline}/>:<Loader/>}</div>
        <div className={`panel ${tl==="CRITICAL"?"c2":""}`}>
          <div className="ph">Threat Level</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:8}}>
            <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:tlC,letterSpacing:2}}>{tl}</div>
            <div style={{display:"flex",gap:4}}>{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{width:16,height:5,background:i<=tlN?tlC:"var(--bg3)"}}/>)}</div>
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:14}}>{displayCaught.toLocaleString()} attacks on your network</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:8,textTransform:"uppercase"}}>By Service</div>{svcData.length?<BarChart data={svcData} ak="svc"/>:<Loader/>}</div>
            <div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:8,textTransform:"uppercase"}}>By Attack Type</div>{typeData.length?<BarChart data={typeData} ak="type"/>:<Loader/>}</div>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   MODULE 2 — INTEL
   - No leaderboard, no safest orgs
   - Block button always shown (manual only)
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   MODULE 3 — OPERATOR XP + ACHIEVEMENTS
═══════════════════════════════════════════════════════════ */
function XPPage({xp}){
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("/attacks/stats").then(setStats);},[]);
  const level=calcLvl(xp);const tx=xpL(level),nx=xpL(level+1);const pct=((xp-tx)/(nx-tx))*100;
  const as={total:stats?.total_attacks||0,ips:stats?.unique_ips||0,level,bt:Object.fromEntries(Object.entries(stats?.by_type||{}).map(([k,v])=>[k,v]))};
  const unlocked=ACHS.filter(a=>a.req(as)).length;

  return <div className="content">
    <div className="panel c1 glow" style={{marginBottom:18}}>
      <div className="ph">Operator Status</div>
      <div style={{display:"flex",gap:24,alignItems:"center",marginBottom:20}}>
        <div style={{textAlign:"center",background:"var(--c1d)",border:"1px solid var(--c1b)",borderRadius:"var(--r)",padding:"18px 22px",flexShrink:0}}>
          <div style={{fontFamily:"var(--head)",fontSize:48,fontWeight:800,color:"var(--c1)",lineHeight:1}}>{level}</div>
          <div style={{fontFamily:"var(--mono)",fontSize:9,color:"var(--txt3)",marginTop:4,letterSpacing:"2px"}}>LEVEL</div>
        </div>
        <div style={{flex:1}}>
          <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:8}}><span>Progress to Level {level+1}</span><span style={{color:"var(--c1)"}}>{xp.toLocaleString()} XP</span></div>
          <div className="xp-track" style={{marginBottom:16}}><div className="xp-fill" style={{width:`${pct}%`}}/></div>
          <div style={{display:"flex",gap:28}}>
            {[{v:`${unlocked}/${ACHS.length}`,l:"Badges Earned",c:"var(--c3)"},{v:as.total,l:"Total Caught",c:"var(--c2)"},{v:as.ips,l:"IPs Tracked",c:"var(--c4)"}].map(({v,l,c})=><div key={l}><div style={{fontFamily:"var(--head)",fontSize:24,fontWeight:700,color:c}}>{v}</div><div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginTop:3,letterSpacing:"1px"}}>{l}</div></div>)}
          </div>
        </div>
      </div>
      <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)"}}>Next XP milestone: {nx.toLocaleString()} XP — earn XP by catching live attacks on the battlefield.</div>
    </div>
    <div className="panel">
      <div className="ph">Achievements ({unlocked}/{ACHS.length} Unlocked)</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {ACHS.map(a=>{const won=a.req(as);return<div key={a.id} className={`ach ${won?"won":""}`}><div className="ach-ic">{a.icon}</div><div style={{flex:1}}><div className="ach-nm">{a.name}</div><div className="ach-ds">{a.desc}</div></div>{won&&<span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c3)",flexShrink:0}}>✓</span>}</div>;})}
      </div>
    </div>
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   SIMULATOR BUTTON — triggers backend simulator + shows live log
═══════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   NGROK PORTAL BUTTON — fetches live URL and opens it
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   RED TEAM DASHBOARD — full shell for redteam role users
═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   RED TEAM DASHBOARD
   Tabs: Simulate | Attack My Website | Live Results | Run History
═══════════════════════════════════════════════════════════ */
function RedTeamDashboard({user, onLogout, onTheme, theme}){
  const [tab,setTab]=useState("simulate");
  const [runs,setRuns]=useState([]);
  const [selRun,setSelRun]=useState(null);
  const [loadingRuns,setLoadingRuns]=useState(true);

  // Live feed state — driven by sim batches directly, not polling
  const [liveFeed,setLiveFeed]=useState([]);
  const [rtBatch,setRtBatch]=useState([]);
  const [rtCaught,setRtCaught]=useState(0);
  const [rtIPs,setRtIPs]=useState(new Set());

  // Attack My Website state
  const [targetURL,setTargetURL]=useState("https://");
  const [atkRunning,setAtkRunning]=useState(false);
  const [atkLog,setAtkLog]=useState([]);
  const [atkProgress,setAtkProgress]=useState(0);
  const [atkReport,setAtkReport]=useState(null);
  const atkRef=useRef(null);

  useEffect(()=>{
    api("/redteam/runs").then(d=>{if(Array.isArray(d)){setRuns(d);if(d[0])setSelRun(d[0]);}setLoadingRuns(false);});
  },[]);

  function refreshRuns(){
    setLoadingRuns(true);
    api("/redteam/runs").then(d=>{if(Array.isArray(d)){setRuns(d);if(d[0])setSelRun(d[0]);}setLoadingRuns(false);});
  }

  // handleRTBatch — updates all sinks at once (feed, battlefield, counters)
  const handleRTBatch=useCallback(batch=>{
    setRtBatch([...batch]);
    setLiveFeed(prev=>[...batch,...prev].slice(0,300));
    setRtCaught(prev=>prev+batch.length);
    setRtIPs(prev=>{const s=new Set(prev);batch.forEach(a=>{if(a.attacker_ip)s.add(a.attacker_ip);});return s;});
  },[]);

  // Attack My Website — 6-phase simulated pentest (no real traffic sent)
  const ATK_PHASES=[
    {id:"recon", label:"Reconnaissance", icon:"🔭", probes:["Resolving target hostname","Fetching HTTP headers","Server fingerprint check","Scanning for robots.txt","X-Powered-By disclosure","Security headers audit"]},
    {id:"scan",  label:"Port Scan",       icon:"📡", probes:["Probing port 80 (HTTP)","Probing port 443 (HTTPS)","Probing port 8080","Probing port 22 (SSH)","Probing port 3306 (MySQL)","Probing port 5432 (Postgres)"]},
    {id:"sqli",  label:"SQL Injection",   icon:"💉", probes:["Login: OR 1=1--","Query param injection","UNION SELECT probe","Cookie tampering","Blind SQLi time-delay","Error-based SQLi"]},
    {id:"xss",   label:"XSS Probe",       icon:"📜", probes:["Reflected XSS script tag","DOM XSS via hash","Stored XSS comment field","XSS img onerror","XSS svg onload","XSS User-Agent header"]},
    {id:"fuzz",  label:"Dir Fuzzing",     icon:"📂", probes:["GET /.env","GET /admin","GET /wp-admin","GET /config.php","GET /.git/config","GET /api/keys","GET /phpmyadmin","GET /backup.zip"]},
    {id:"report",label:"Report",          icon:"📋", probes:["Scoring findings","Detection rate calc","Vulnerability map","CVSS scoring","Severity assessment","Finalising report"]},
  ];

  function rIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}

  function launchWebAttack(){
    if(atkRunning||!targetURL||targetURL==="https://") return;
    setAtkRunning(true);setAtkLog([]);setAtkProgress(0);setAtkReport(null);
    const allProbes=ATK_PHASES.flatMap(ph=>ph.probes.map(p=>({phase:ph.label,icon:ph.icon,probe:p,phaseId:ph.id})));
    let idx=0;
    const findings={sqli:0,xss:0,fuzz:0,recon:0,scan:0};
    atkRef.current=setInterval(()=>{
      if(idx>=allProbes.length){
        clearInterval(atkRef.current);
        setAtkRunning(false);setAtkProgress(100);
        const vulns=findings.sqli*2+findings.xss+findings.fuzz*3;
        const detected=Math.floor(vulns*0.6);
        setAtkReport({target:targetURL,timestamp:new Date().toISOString(),totalProbes:allProbes.length,findings,vulnerabilities:vulns,detected,score:Math.round((detected/Math.max(vulns,1))*100),severity:vulns>8?"CRITICAL":vulns>4?"HIGH":vulns>1?"MEDIUM":"LOW"});
        return;
      }
      const {phase,icon,probe,phaseId}=allProbes[idx];
      const hit=Math.random()>0.55;
      if(hit&&findings[phaseId]!==undefined)findings[phaseId]++;
      setAtkLog(prev=>[{ts:new Date().toLocaleTimeString("en-US",{hour12:false}),phase,icon,probe,result:hit?"DETECTED":"PASSED",color:hit?"var(--c3)":"var(--c1)"},...prev].slice(0,60));
      if(hit){
        const typeMap={sqli:"sqli",xss:"scan",fuzz:"scan",recon:"scan",scan:"brute"};
        handleRTBatch([{id:Date.now()+idx,attacker_ip:rIP(),attack_type:typeMap[phaseId]||"unknown",service:"HTTP",threat_score:40+Math.floor(Math.random()*55),timestamp:new Date().toISOString()}]);
      }
      setAtkProgress(Math.round(((idx+1)/allProbes.length)*100));
      idx++;
    },180);
  }

  function stopWebAttack(){clearInterval(atkRef.current);setAtkRunning(false);}

  const bestScore=runs.length?Math.max(...runs.map(r=>r.detection_score||0)):0;
  const totalRuns=runs.length;

  return <div className="page" style={{background:"var(--bg)"}}>
    <div className="topbar" style={{borderBottom:"2px solid rgba(255,45,85,.3)"}}>
      <div className="logo" style={{color:"var(--c2)",textShadow:"0 0 20px rgba(255,45,85,.3)"}}>SNAP<em style={{color:"var(--txt3)"}}>TRAP</em></div>
      <div className="tb-div"/>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",background:"var(--c2d)",border:"1px solid var(--c2b)",padding:"3px 10px",borderRadius:"var(--r)",letterSpacing:"1.5px",fontWeight:700}}>⚠ RED TEAM OPS</span>
        <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)"}}>{user.name||user.email}</span>
      </div>
      <div className="tb-r">
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>{totalRuns} runs · {rtCaught} caught</span>
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>

    <div className="mnav" style={{borderBottom:"1px solid var(--c2b)"}}>
      {[["simulate","▶ Simulate"],["website","🌐 Attack Website"],["results","◉ Live Results"],["runs","◈ Run History"]].map(([id,label])=>
        <button key={id} className={`mtab ${tab===id?"on":""}`} style={tab===id?{color:"var(--c2)"}:{}} onClick={()=>{setTab(id);if(id==="runs")refreshRuns();}}>
          {label}
        </button>
      )}
      <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 16px",gap:8}}>
        <div style={{width:6,height:6,borderRadius:"50%",background:"var(--c2)",animation:"pulse 1.5s infinite"}}/>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",letterSpacing:"1px"}}>RESTRICTED ACCESS</span>
      </div>
    </div>

    <div className="content">
      <div className="g4" style={{marginBottom:18}}>
        {[{l:"Total Runs",v:totalRuns,c:"var(--c2)"},{l:"Best Detection",v:bestScore?`${bestScore}%`:"—",c:bestScore>=80?"var(--c1)":bestScore>=50?"var(--c3)":"var(--c2)"},{l:"Attacks Caught",v:rtCaught,c:"var(--c4)"},{l:"Unique IPs",v:rtIPs.size,c:"var(--c3)"}].map(({l,v,c})=>
          <div key={l} style={{background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:18}}>
            <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:c,lineHeight:1,marginBottom:6}}>{v}</div>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--txt3)"}}>{l}</div>
          </div>)}
      </div>

      {tab==="simulate"&&<div>
        <div className="rt-panel">
          <div className="ph" style={{color:"var(--c2)"}}>⚡ Launch Attack Simulation</div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:18,lineHeight:1.8,background:"var(--bg2)",padding:"10px 14px",borderRadius:"var(--r)",borderLeft:"3px solid var(--c2)"}}>
            Fire simulated attacks against your org's honeypot. Results appear live in <strong style={{color:"var(--txt2)"}}>Live Results</strong>. Detection score = % caught.
          </div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c2)",letterSpacing:"1px",marginBottom:8}}>DEMO · 50 attackers</div>
              <RTSimPanel onBatch={handleRTBatch} count={50}/>
            </div>
            <div style={{width:1,background:"var(--bdr2)",flexShrink:0}}/>
            <div style={{flex:1,minWidth:240}}>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c3)",letterSpacing:"1px",marginBottom:8}}>BENCHMARK · 700 attackers</div>
              <RTSimPanel onBatch={handleRTBatch} count={700}/>
            </div>
          </div>
        </div>
        <div className="rt-panel" style={{borderColor:"var(--c4b)",borderTopColor:"var(--c4)"}}>
          <div className="ph" style={{color:"var(--c4)"}}>🌐 Share Live Portal</div>
          <NgrokPortalButton/>
        </div>
      </div>}

      {tab==="website"&&<div>
        <div className="rt-panel">
          <div className="ph" style={{color:"var(--c2)"}}>🌐 Attack My Website</div>
          <div style={{background:"var(--bg2)",border:"1px solid var(--c3b)",borderLeft:"3px solid var(--c3)",borderRadius:"var(--r)",padding:"12px 16px",marginBottom:18,fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)",lineHeight:2}}>
            <div style={{color:"var(--c3)",fontWeight:700,marginBottom:4,fontSize:10,letterSpacing:"1px"}}>⚠ AUTHORISED USE ONLY</div>
            Runs a <strong>simulated pentest</strong> against a URL you own or are authorised to test.
            Six phases: <span style={{color:"var(--c3)"}}>Recon → Port Scan → SQL Injection → XSS → Dir Fuzzing → Report</span>.
            All probes are <strong>locally simulated</strong> — no real HTTP traffic is sent.
            Detected probes appear on <strong>Live Results</strong> so you can see how your honeypot responds.
          </div>
          <div style={{marginBottom:14}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",letterSpacing:"1px",marginBottom:6}}>TARGET URL — site you own or are authorised to test</div>
            <div style={{display:"flex",gap:10}}>
              <input className="inp" value={targetURL} onChange={e=>setTargetURL(e.target.value)} placeholder="https://your-site.example.com" disabled={atkRunning} style={{flex:1,borderColor:"var(--c2b)"}}/>
              {!atkRunning
                ?<button className="btn btn-2" style={{whiteSpace:"nowrap",padding:"8px 20px"}} onClick={launchWebAttack} disabled={!targetURL||targetURL==="https://"}>▶ Launch Pentest</button>
                :<button className="btn btn-ghost" style={{whiteSpace:"nowrap"}} onClick={stopWebAttack}>■ Stop</button>
              }
            </div>
          </div>
          {(atkRunning||atkProgress>0)&&<>
            <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:4}}>
              <span>{atkRunning?"Running pentest…":"Complete"}</span>
              <span style={{color:atkRunning?"var(--c2)":"var(--c1)"}}>{atkProgress}%</span>
            </div>
            <div className="sim-bar-track" style={{marginBottom:12}}><div className="sim-bar-fill" style={{width:`${atkProgress}%`,background:atkRunning?"var(--c2)":"var(--c1)"}}/></div>
          </>}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
            {ATK_PHASES.map((ph,phaseIdx)=>{
              const totalBefore=ATK_PHASES.slice(0,phaseIdx).reduce((s,p)=>s+p.probes.length,0);
              const phasePct=(totalBefore/ATK_PHASES.flatMap(p=>p.probes).length)*100;
              const done=atkProgress>phasePct;
              return <div key={ph.id} style={{fontFamily:"var(--mono)",fontSize:9,padding:"4px 10px",borderRadius:2,background:done?"var(--c2d)":"var(--bg2)",border:`1px solid ${done?"var(--c2b)":"var(--bdr2)"}`,color:done?"var(--c2)":"var(--txt4)",letterSpacing:"1px"}}>{ph.icon} {ph.label}</div>;
            })}
          </div>
          {atkLog.length>0&&<div style={{background:"var(--bg)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"8px 12px",maxHeight:220,overflowY:"auto",fontFamily:"var(--mono)",fontSize:10}}>
            {atkLog.map((l,i)=><div key={i} style={{display:"flex",gap:10,alignItems:"center",padding:"2px 0",borderBottom:"1px solid var(--bdr)",color:"var(--txt3)"}}>
              <span style={{color:"var(--txt4)",flexShrink:0,width:56}}>{l.ts}</span>
              <span style={{flexShrink:0}}>{l.icon}</span>
              <span style={{color:"var(--txt4)",flexShrink:0,width:110,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.phase}</span>
              <span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.probe}</span>
              <span style={{color:l.color,fontWeight:700,flexShrink:0,width:70,textAlign:"right"}}>{l.result}</span>
            </div>)}
          </div>}
        </div>
        {atkReport&&<div className="rt-panel" style={{borderTopColor:"var(--c1)"}}>
          <div className="ph" style={{color:"var(--c1)"}}>📋 Pentest Report</div>
          <div style={{display:"flex",gap:20,flexWrap:"wrap",marginBottom:16}}>
            {[{l:"Total Probes",v:atkReport.totalProbes,c:"var(--c4)"},{l:"Vulnerabilities",v:atkReport.vulnerabilities,c:"var(--c2)"},{l:"Detected",v:atkReport.detected,c:"var(--c1)"},{l:"Detection Rate",v:`${atkReport.score}%`,c:atkReport.score>=80?"var(--c1)":atkReport.score>=50?"var(--c3)":"var(--c2)"}].map(({l,v,c})=>
              <div key={l} style={{textAlign:"center",flex:1,minWidth:80}}>
                <div style={{fontFamily:"var(--head)",fontSize:28,fontWeight:800,color:c,marginBottom:4}}>{v}</div>
                <div style={{fontFamily:"var(--mono)",fontSize:9,letterSpacing:"1px",color:"var(--txt3)",textTransform:"uppercase"}}>{l}</div>
              </div>)}
          </div>
          <div style={{fontFamily:"var(--mono)",fontSize:11,background:"var(--bg2)",padding:"10px 14px",borderRadius:"var(--r)",borderLeft:`3px solid ${atkReport.score>=80?"var(--c1)":atkReport.score>=50?"var(--c3)":"var(--c2)"}`,color:"var(--txt2)"}}>
            {atkReport.score>=80?"✓ Excellent — your honeypot caught most attack patterns.":atkReport.score>=50?"⚠ Moderate — several patterns slipped through. Review SQLi and fuzzing rules.":"✗ Low detection — most attacks missed. Enable more honeypot services."}
          </div>
        </div>}
      </div>}

      {tab==="results"&&<div>
        {rtCaught===0&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",background:"var(--sur)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"14px 18px",marginBottom:14}}>
          ◉ No attacks yet — run a simulation or launch the website pentest first.
        </div>}
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          <div style={{width:900,flexShrink:0,background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)",marginBottom:10}}>◉ LIVE BATTLEFIELD — RED TEAM FEED</div>
            <Battlefield feed={rtBatch} isLive={false}/>
          </div>
          <div style={{flex:1,minWidth:0,display:"flex",flexDirection:"column",background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",overflow:"hidden",minHeight:520}}>
            <div style={{padding:"10px 14px",background:"var(--bg2)",borderBottom:"1px solid var(--bdr2)",display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
              <span style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)"}}>ATTACK FEED</span>
              <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt4)"}}>{liveFeed.length} events</span>
            </div>
            <div style={{flex:1,overflowY:"auto",minHeight:0}}>
              {!liveFeed.length&&<div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt4)",padding:"28px 16px",textAlign:"center"}}>Run a simulation or pentest to see attacks here.</div>}
              {liveFeed.map((a,i)=><div key={a.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",borderBottom:"1px solid var(--bdr)",fontFamily:"var(--mono)",fontSize:11,color:"var(--txt2)"}}>
                <div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}/>
                <span style={{color:"var(--txt4)",fontSize:10,width:52,flexShrink:0}}>{a.timestamp?.slice(11,19)}</span>
                <span style={{color:"var(--c4)",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.attacker_ip}</span>
                <Badge v={a.service} map={SVC_CLS}/>
                <Badge v={a.attack_type} map={TYPE_CLS}/>
                <span style={{fontFamily:"var(--head)",fontSize:12,fontWeight:700,flexShrink:0,color:a.threat_score>=70?"var(--c2)":a.threat_score>=40?"var(--c3)":"var(--c1)"}}>{a.threat_score}</span>
              </div>)}
            </div>
          </div>
        </div>
      </div>}

      {tab==="runs"&&<div>
        <div style={{background:"var(--sur)",border:"1px solid var(--c2b)",borderTop:"2px solid var(--c2)",borderRadius:"var(--r2)",padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontFamily:"var(--mono)",fontSize:10,letterSpacing:"2px",color:"var(--c2)"}}>◈ Run History — {runs.length} runs</div>
            <button className="btn btn-2" style={{fontSize:10,padding:"4px 12px"}} onClick={refreshRuns}>↻ Refresh</button>
          </div>
          {loadingRuns&&<Loader/>}
          {!loadingRuns&&!runs.length&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",padding:"28px 0",textAlign:"center"}}>No runs yet — go to Simulate and fire a wave.</div>}
          {!loadingRuns&&runs.map(r=>{
            const sc=r.detection_score>=80?"var(--c1)":r.detection_score>=50?"var(--c3)":"var(--c2)";
            return <div key={r.id} className={`rt-run-card ${selRun?.id===r.id?"active":""}`} onClick={()=>setSelRun(selRun?.id===r.id?null:r)}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div style={{display:"flex",gap:12,alignItems:"center"}}>
                  <span className="badge b2">#{r.id}</span>
                  <span className={`badge ${r.mode==="benchmark"?"b3":"bd"}`}>{r.mode}</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)"}}>{r.started_at?.slice(0,16)?.replace("T"," ")}</span>
                </div>
                <div style={{display:"flex",gap:14,alignItems:"center"}}>
                  <span style={{fontFamily:"var(--head)",fontSize:20,fontWeight:800,color:sc}}>{r.detection_score!=null?`${r.detection_score}%`:"—"}</span>
                  <span className={`badge ${r.status==="completed"?"b1":"b3"}`}>{r.status}</span>
                </div>
              </div>
              {selRun?.id===r.id&&<div style={{marginTop:14,paddingTop:14,borderTop:"1px solid var(--bdr2)"}}>
                <div style={{display:"flex",gap:0,marginBottom:12}}>
                  {[["Fired",r.total_attacks,"var(--c4)"],["Detected",r.detected,"var(--c1)"],["Missed",r.missed,"var(--c2)"],["Score",r.detection_score!=null?`${r.detection_score}%`:"—",sc]].map(([l,v,c])=>
                    <div key={l} className="rt-stat"><div className="rt-score" style={{color:c,fontSize:24}}>{v??0}</div><div className="rt-label">{l}</div></div>)}
                </div>
                <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",background:"var(--bg2)",padding:"8px 12px",borderRadius:"var(--r)"}}>
                  {r.detection_score>=80?"✓ Excellent — honeypot is well-tuned":r.detection_score>=50?"⚠ Moderate — tune your rules":"✗ Low detection — many attacks slipped through"}
                </div>
              </div>}
            </div>;
          })}
        </div>
      </div>}

    </div>
  </div>;
}

/* ── RTSimPanel — self-contained simulator for Red Team dashboard ── */
function RTSimPanel({onBatch, count}){
  const [running,setRunning]=useState(false);
  const [progress,setProgress]=useState(0);
  const [log,setLog]=useState([]);
  const ref=useRef(null);
  const TYPES=["brute","scan","sqli","cred","slow"];
  const SVCS=["SSH","HTTP","FTP","DB","ML"];
  function rIP(){return `${10+Math.floor(Math.random()*220)}.${Math.floor(Math.random()*255)}.${Math.floor(Math.random()*255)}.${1+Math.floor(Math.random()*254)}`;}
  function run(){
    if(running)return;
    setRunning(true);setProgress(0);setLog([]);
    let fired=0;
    ref.current=setInterval(()=>{
      const burst=Math.min(3,count-fired);
      const batch=[];
      for(let i=0;i<burst;i++){
        const type=TYPES[Math.floor(Math.random()*TYPES.length)];
        const svc=SVCS[Math.floor(Math.random()*SVCS.length)];
        const ip=rIP();
        const score=20+Math.floor(Math.random()*80);
        batch.push({id:Date.now()+i+Math.random(),attacker_ip:ip,attack_type:type,service:svc,threat_score:score,timestamp:new Date().toISOString()});
        setLog(prev=>[`${ip} → ${svc} [${type}]`,...prev].slice(0,6));
      }
      onBatch(batch);
      fired+=burst;
      setProgress(Math.round((fired/count)*100));
      if(fired>=count){clearInterval(ref.current);setRunning(false);setProgress(100);}
    },count>100?60:120);
  }
  function stop(){clearInterval(ref.current);setRunning(false);}
  return <div style={{background:"var(--bg2)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:"10px 12px"}}>
    <div style={{display:"flex",gap:8,marginBottom:6}}>
      <button className="sim-btn sim-btn-run" style={{padding:"5px 14px",fontSize:10}} onClick={run} disabled={running}>{running?"⏳ Running…":"▶ Launch"}</button>
      {running&&<button className="btn btn-ghost" style={{fontSize:10,padding:"5px 10px"}} onClick={stop}>■ Stop</button>}
    </div>
    {(running||progress>0)&&<>
      <div style={{display:"flex",justifyContent:"space-between",fontFamily:"var(--mono)",fontSize:10,color:"var(--txt3)",marginBottom:3}}>
        <span>{running?"Firing…":"Done"}</span><span style={{color:running?"var(--c2)":"var(--c1)"}}>{progress}%</span>
      </div>
      <div className="sim-bar-track" style={{marginBottom:4}}><div className="sim-bar-fill" style={{width:`${progress}%`}}/></div>
      <div style={{fontFamily:"var(--mono)",fontSize:10,maxHeight:60,overflowY:"auto"}}>
        {log.map((l,i)=><div key={i} style={{color:"var(--txt3)",display:"flex",gap:6}}><span style={{color:"var(--c2)"}}>▸</span>{l}</div>)}
      </div>
    </>}
  </div>;
}



/* ═══════════════════════════════════════════════════════════
   MODULE 4 — CONTROL PANEL
═══════════════════════════════════════════════════════════ */
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
    <RedTeamManager/>
  </div>;
}

/* ── RED TEAM MANAGER (inside org control panel) ── */
function RedTeamManager(){
  const [accounts,setAccounts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [showForm,setShowForm]=useState(false);
  const [name,setName]=useState("");const [email,setEmail]=useState("");const [pass,setPass]=useState("");
  const [busy,setBusy]=useState(false);const [err,setErr]=useState("");const [ok,setOk]=useState("");

  useEffect(()=>{load();},[]);
  function load(){setLoading(true);api("/redteam").then(d=>{if(Array.isArray(d))setAccounts(d);setLoading(false);});}

  async function create(){
    if(!name||!email||!pass){setErr("All fields required");return;}
    setBusy(true);setErr("");setOk("");
    const d=await api("/redteam",{method:"POST",body:JSON.stringify({name,email,password:pass})});
    if(d.redteam_id){setOk(`Red Team account created for ${name}`);setName("");setEmail("");setPass("");setShowForm(false);load();}
    else setErr(d.error||"Failed");
    setBusy(false);
  }
  async function remove(id,n){
    if(!window.confirm(`Delete Red Team account "${n}"?`)) return;
    await api(`/redteam/${id}`,{method:"DELETE"});
    load();
  }

  return <div className="panel c2" style={{marginBottom:18,borderTopColor:"var(--c5)",borderColor:"var(--c5b)"}}>
    <div className="ph" style={{color:"var(--c5)"}}>◈ Red Team Accounts</div>
    <div style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--txt3)",marginBottom:14,lineHeight:2}}>Create Red Team accounts for pen testers. They can only trigger simulations and see their own results.</div>
    {loading?<Loader/>:<>
      {accounts.length>0&&<table className="tbl" style={{marginBottom:14}}><thead><tr><th>Name</th><th>Email</th><th>Runs</th><th>Joined</th><th></th></tr></thead>
        <tbody>{accounts.map(a=><tr key={a.id}>
          <td style={{fontWeight:700}}>{a.name}</td>
          <td style={{color:"var(--txt3)",fontFamily:"var(--mono)",fontSize:11}}>{a.email}</td>
          <td style={{fontFamily:"var(--head)",fontWeight:700,color:"var(--c5)"}}>{a.run_count||0}</td>
          <td style={{color:"var(--txt3)"}}>{a.created_at?.slice(0,10)}</td>
          <td><button className="btn btn-2" style={{padding:"3px 10px",fontSize:10}} onClick={()=>remove(a.id,a.name)}>Remove</button></td>
        </tr>)}</tbody>
      </table>}
      {!accounts.length&&!showForm&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--txt4)",marginBottom:14}}>No Red Team accounts yet.</div>}
      {ok&&<div className="aok" style={{marginBottom:10}}>✓ {ok}</div>}
      {!showForm?<button className="btn btn-5" onClick={()=>setShowForm(true)}>+ Add Red Team Account</button>:<div style={{background:"var(--bg2)",border:"1px solid var(--bdr2)",borderRadius:"var(--r)",padding:16,marginTop:4}}>
        <div className="afield"><label className="lbl">Name</label><input className="inp" value={name} onChange={e=>setName(e.target.value)} placeholder="Red Team member name"/></div>
        <div className="afield"><label className="lbl">Email</label><input className="inp" value={email} onChange={e=>setEmail(e.target.value)} placeholder="redteam@example.com"/></div>
        <div className="afield"><label className="lbl">Password</label><input className="inp" type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Set a password"/></div>
        {err&&<div className="aerr" style={{marginBottom:10}}>⚠ {err}</div>}
        <div style={{display:"flex",gap:10}}>
          <button className="btn btn-5" onClick={create} disabled={busy}>{busy?"Creating…":"Create Account"}</button>
          <button className="btn btn-ghost" onClick={()=>{setShowForm(false);setErr("");}}>Cancel</button>
        </div>
      </div>}
    </>}
  </div>;
}

/* Blocklist panel */
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

/* ═══════════════════════════════════════════════════════════
   SUPERADMIN PANEL
═══════════════════════════════════════════════════════════ */
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

/* ═══════════════════════════════════════════════════════════
   ORG DASHBOARD SHELL
═══════════════════════════════════════════════════════════ */
function OrgDashboard({user, onLogout, onTheme, theme}){
  const [mod,setMod]=useState("monitor");
  const [xp,setXp]=useState(()=>parseInt(localStorage.getItem("st_xp")||"0"));
  const [stats,setStats]=useState(null);
  useEffect(()=>{api("/attacks/stats").then(setStats);},[]);
  const total=stats?.total_attacks||0;
  const tl=total>1000?"CRIT":total>200?"HIGH":total>50?"MED":"LOW";
  const tlC={CRIT:"var(--c2)",HIGH:"var(--c3)",MED:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRIT:5,HIGH:4,MED:3,LOW:2}[tl];
  const level=calcLvl(xp);const pct=((xp-xpL(level))/(xpL(level+1)-xpL(level)))*100;

  return <div className="page">
    <div className="topbar">
      <div className="logo">SNAP<em>TRAP</em></div>
      <div className="tb-div"/>
      <div className="hud-mid">
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="tl-lbl">Threat</div>
          <div className="tl-val" style={{color:tlC}}>{tl}</div>
          <div className="tl-segs">{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{background:i<=tlN?tlC:undefined}}/>)}</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:4,minWidth:140}}>
          <div style={{display:"flex",justifyContent:"space-between"}}><span className="xp-label">Lv{level} {user.name||"Operator"}</span><span className="xp-label" style={{color:"var(--c1)"}}>{xp.toLocaleString()} XP</span></div>
          <div className="xp-track" style={{width:140}}><div className="xp-fill" style={{width:`${pct}%`}}/></div>
        </div>
      </div>
      <div className="tb-r">
        <div className="live-chip"><div className="live-dot"/>LIVE</div>
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-4" style={{padding:"5px 12px",fontSize:10}} onClick={()=>setMod("account")}>⚙ Account</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>

    <div className="mnav">
      <button className={`mtab ${mod==="monitor"?"on":""}`} onClick={()=>setMod("monitor")}>◉ Live Monitor</button>
      <button className={`mtab ${mod==="intel"?"on":""}`} onClick={()=>setMod("intel")}>◈ Threat Intel</button>
      <button className={`mtab ${mod==="xp"?"on":""}`} onClick={()=>setMod("xp")}>⬡ Operator XP</button>
      <button className={`mtab ${mod==="control"?"on":""}`} onClick={()=>setMod("control")}>⚙ Control Panel</button>
    </div>

    {mod==="monitor"&&<LiveMonitor user={user} xp={xp} setXp={setXp}/>}
    {mod==="intel"&&<IntelPage user={user}/>}
    {mod==="xp"&&<XPPage xp={xp}/>}
    {mod==="control"&&<ControlPanel user={user}/>}
    {mod==="account"&&<div className="content"><AccountPage user={user} onLogout={onLogout} onBack={()=>setMod("monitor")}/></div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   SUPERADMIN SHELL
═══════════════════════════════════════════════════════════ */
function SuperAdminShell({user, onLogout, onTheme, theme}){
  const [gs,setGs]=useState(null);const [mod,setMod]=useState("admin");
  useEffect(()=>{api("/admin/global-stats").then(setGs);},[]);
  const total=gs?.total_attacks||0;
  const tl=total>1000?"CRIT":total>200?"HIGH":total>50?"MED":"LOW";
  const tlC={CRIT:"var(--c2)",HIGH:"var(--c3)",MED:"var(--c3)",LOW:"var(--c1)"}[tl];
  const tlN={CRIT:5,HIGH:4,MED:3,LOW:2}[tl];

  return <div className="page">
    <div className="topbar">
      <div className="logo">SNAP<em>TRAP</em></div>
      <div className="tb-div"/>
      <div className="hud-mid">
        <div style={{display:"flex",alignItems:"center",gap:9}}>
          <div className="tl-lbl">Global Threat</div>
          <div className="tl-val" style={{color:tlC}}>{tl}</div>
          <div className="tl-segs">{[1,2,3,4,5].map(i=><div key={i} className="tl-seg" style={{background:i<=tlN?tlC:undefined}}/>)}</div>
        </div>
        <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--c5)",border:"1px solid var(--c5b)",padding:"3px 12px",borderRadius:"var(--r)",letterSpacing:"1.5px"}}>SUPERADMIN</span>
      </div>
      <div className="tb-r">
        <button className="theme-btn" onClick={onTheme}>{theme==="dark"?"☀":"🌙"}</button>
        <button className="btn btn-5" style={{padding:"5px 12px",fontSize:10}} onClick={()=>setMod("account")}>⚙ Account</button>
        <button className="btn btn-2" style={{padding:"5px 12px",fontSize:10}} onClick={onLogout}>Logout</button>
      </div>
    </div>
    {tl==="CRIT"&&<div className="alert-bar crit"><span style={{animation:"blink 1s infinite"}}>⚠</span>GLOBAL CRITICAL — coordinated campaign detected across organisations</div>}
    {mod==="admin"&&<AdminPanel/>}
    {mod==="account"&&<div className="content"><AccountPage user={user} onLogout={onLogout} onBack={()=>setMod("admin")}/></div>}
  </div>;
}

/* ═══════════════════════════════════════════════════════════
   ROOT
═══════════════════════════════════════════════════════════ */
export default function App(){
  const [view,setView]=useState("landing");
  const [authMode,setAuthMode]=useState("login");
  const [user,setUser]=useState(null);
  const [theme,setTheme]=useState(()=>localStorage.getItem("st_theme")||"dark");

  useEffect(()=>{document.documentElement.setAttribute("data-theme",theme);localStorage.setItem("st_theme",theme);},[theme]);
  const toggleTheme=()=>setTheme(t=>t==="dark"?"light":"dark");

  useEffect(()=>{
    const tk=localStorage.getItem("st_token");
    if(tk){try{const p=JSON.parse(atob(tk.split(".")[1]));setUser({token:tk,role:p.role,email:p.email,name:p.name});setView("app");}catch{localStorage.removeItem("st_token");}}
  },[]);

  function handleLogin(d){
    localStorage.setItem("st_token", d.token); 
    try{const p=JSON.parse(atob(d.token.split(".")[1]));setUser({...d,role:p.role,name:p.name||d.name});}
    catch{setUser(d);}
    setView("app");
  }
  function handleLogout(){localStorage.removeItem("st_token");localStorage.removeItem("st_xp");setUser(null);setView("landing");}

  return <>
    <style>{CSS}</style>
    {view==="landing"&&<Landing onSignup={()=>{setAuthMode("signup");setView("auth");}} onLogin={()=>{setAuthMode("login");setView("auth");}} onTheme={toggleTheme} theme={theme}/>}
    {view==="auth"&&<Auth onLogin={handleLogin} onBack={()=>setView("landing")} initialMode={authMode}/>}
    {view==="app"&&user&&(user.role==="superadmin"
      ?<SuperAdminShell user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme}/>
      :user.role==="redteam"
      ?<RedTeamDashboard user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme}/>
      :<OrgDashboard user={user} onLogout={handleLogout} onTheme={toggleTheme} theme={theme}/>
    )}
  </>;
}