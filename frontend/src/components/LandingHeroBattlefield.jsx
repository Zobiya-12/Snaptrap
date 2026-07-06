/* ═══════════════════════════════════════════════════════════
   LANDING HERO BATTLEFIELD — fully responsive, no fixed W/H.
   Resizes to whatever space its container gives it, on every
   resize event. Nodes are positioned as proportions (0..1) of
   the current width/height, not fixed pixel coordinates.
═══════════════════════════════════════════════════════════ */
import React, { useRef, useEffect } from 'react';

const AM = {
  brute: { col: "#ffb800" }, scan: { col: "#00bfff" }, sqli: { col: "#ff2d55" },
  cred: { col: "#b060ff" }, slow: { col: "#00e696" }, unknown: { col: "#3a5070" },
};

const NODE_DEFS = [
  { fx: 0.5, fy: 0.5, r: 0.11, label: "SSH", col: "#00bfff" },
  { fx: 0.16, fy: 0.26, r: 0.085, label: "HTTP", col: "#ffb800" },
  { fx: 0.84, fy: 0.26, r: 0.085, label: "FTP", col: "#ffb800" },
  { fx: 0.16, fy: 0.76, r: 0.085, label: "DB", col: "#ff2d55" },
  { fx: 0.84, fy: 0.76, r: 0.085, label: "ML", col: "#b060ff" },
];

export default function LandingHeroBattlefield({ feed }) {
  const wrapRef = useRef(null);
  const cvRef = useRef(null);
  const animRef = useRef(null);
  const st = useRef({ p: [], ex: [], tick: 0, W: 400, H: 300 });

  useEffect(() => {
    const wrap = wrapRef.current, cv = cvRef.current;
    if (!wrap || !cv) return;
    const ctx = cv.getContext("2d");
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const rect = wrap.getBoundingClientRect();
      const W = Math.max(160, Math.round(rect.width));
      const H = Math.max(120, Math.round(rect.height));
      st.current.W = W; st.current.H = H;
      cv.width = W * DPR; cv.height = H * DPR;
      cv.style.width = W + "px"; cv.style.height = H + "px";
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    function currentNodes() {
      const { W, H } = st.current;
      const rBase = Math.min(W, H);
      return NODE_DEFS.map(n => ({ ...n, x: n.fx * W, y: n.fy * H, r: rBase * n.r }));
    }

    function loop() {
      const s = st.current;
      const { W, H } = s;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#04060e"; ctx.fillRect(0, 0, W, H);
      const vig = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * .7);
      vig.addColorStop(0, "transparent"); vig.addColorStop(1, "rgba(0,0,0,.55)");
      ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      s.tick++;

      ctx.save();
      for (let x = 20; x < W; x += 36) for (let y = 20; y < H; y += 36) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,230,150,.08)"; ctx.fill();
      }
      ctx.restore();

      const ns = currentNodes();
      ns.forEach(n => {
        const pulse = .45 + Math.sin(s.tick * .038 + n.x * .012) * .45;
        ctx.save();
        ctx.globalAlpha = .12 + pulse * .14;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 8, 0, Math.PI * 2);
        ctx.strokeStyle = n.col; ctx.lineWidth = 1; ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.col + "1a"; ctx.fill();
        ctx.strokeStyle = n.col; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = "#d8eeff";
        ctx.font = `bold ${Math.max(8, Math.round(n.r * 0.38))}px 'Share Tech Mono',monospace`;
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(n.label, n.x, n.y);
        ctx.restore();
      });

      s.p = s.p.filter(p => p.op > .04);
      s.p.forEach(p => {
        if (p.dead) { p.op -= .04; return; }
        p.wob += .055;
        p.trail.push({ x: p.x, y: p.y }); if (p.trail.length > 12) p.trail.shift();
        p.trail.forEach((pt, i) => {
          ctx.save(); ctx.globalAlpha = (i / p.trail.length) * .18;
          ctx.beginPath(); ctx.arc(pt.x, pt.y, 1, 0, Math.PI * 2);
          ctx.fillStyle = p.am.col; ctx.fill(); ctx.restore();
        });
        const dx = p.tx - p.x, dy = p.ty - p.y, dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < p.nodeR + 5) {
          p.dead = true;
          const sh = [];
          for (let i = 0; i < 10; i++) {
            const a = (Math.PI * 2 / 10) * i;
            sh.push({ x: p.x, y: p.y, vx: Math.cos(a) * (1.6 + Math.random() * 3), vy: Math.sin(a) * (1.6 + Math.random() * 3), a: 1, r: 1.4 + Math.random() * 1.8 });
          }
          s.ex.push({ col: p.am.col, a: 1, sh });
          return;
        }
        const nx = dx / dist, ny = dy / dist;
        p.x += (nx + Math.sin(p.wob) * .15) * p.spd;
        p.y += (ny + Math.cos(p.wob) * .15) * p.spd;
        p.age++; if (p.age > 900) { p.dead = true; return; }
        ctx.save(); ctx.globalAlpha = p.op; ctx.fillStyle = p.am.col;
        ctx.shadowColor = p.am.col; ctx.shadowBlur = 4;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.sz, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      });

      s.ex = s.ex.filter(e => e.a > .02);
      s.ex.forEach(e => {
        e.a *= .86;
        e.sh.forEach(sh => {
          sh.x += sh.vx; sh.y += sh.vy; sh.vx *= .9; sh.vy *= .9; sh.a *= .87;
          ctx.save(); ctx.globalAlpha = sh.a;
          ctx.beginPath(); ctx.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2);
          ctx.fillStyle = e.col; ctx.shadowColor = e.col; ctx.shadowBlur = 3; ctx.fill(); ctx.restore();
        });
      });

      animRef.current = requestAnimationFrame(loop);
    }
    loop();
    return () => { ro.disconnect(); cancelAnimationFrame(animRef.current); };
  }, []);

  // Ingest new attack batches — spawn particles aimed at the correct proportional node
  useEffect(() => {
    if (!feed?.length) return;
    const s = st.current;
    const { W, H } = s;
    const rBase = Math.min(W, H);
    feed.forEach(atk => {
      const type = atk.attack_type || "unknown";
      const am = AM[type] || AM.unknown;
      const nodeDef = NODE_DEFS.find(n => n.label === atk.service) || NODE_DEFS[0];
      const nx = nodeDef.fx * W, ny = nodeDef.fy * H, nr = rBase * nodeDef.r;
      const e = Math.floor(Math.random() * 4);
      const ex = e === 0 ? Math.random() * W : e === 1 ? W + 8 : e === 2 ? Math.random() * W : -8;
      const ey = e === 0 ? -8 : e === 1 ? Math.random() * H : e === 2 ? H + 8 : Math.random() * H;
      s.p.push({
        x: ex, y: ey,
        tx: nx + (Math.random() - .5) * 8, ty: ny + (Math.random() - .5) * 8,
        nodeR: nr, am, type,
        spd: type === "slow" ? .6 : type === "scan" ? 2.6 : 1.3 + Math.random() * 1.1,
        trail: [], age: 0, dead: false, op: 1, wob: Math.random() * Math.PI * 2, sz: 2.5 + Math.random() * 2,
      });
    });
  }, [feed]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%", position: "relative" }}>
      <canvas ref={cvRef} style={{ display: "block" }} />
    </div>
  );
}