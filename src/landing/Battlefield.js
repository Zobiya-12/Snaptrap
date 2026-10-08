import React, { useEffect, useRef } from 'react';
import { ATTACK_TYPES, HONEYPOTS } from './attackTypes';

/*
  Canvas battlefield. Colours come from the CSS tokens on .sx (see landing.css),
  so changing the palette there recolours the canvas too, and the dark/light
  toggle (data-theme on <html>) is picked up live.

  Props
    feed         [{attack_type, service, attacker_ip}]   real events; each is fired at its station
    colorByType  boolean               tint each attack + burst by its type (dashboards); landing stays monochrome
    onCatch      (event) => void       called on every impact: {id, ip, type, station, tag, x, y}
    spawnEvery   [min,max] | null      ambient attack interval in seconds
    controlRef   ref                   receives { fire({type,station,count,spread}) }
    active       boolean               false = frozen (hidden pane), saves CPU
*/

const randomIp = () =>
  [1 + Math.floor(Math.random() * 222), ...Array.from({ length: 3 }, () => Math.floor(Math.random() * 256))].join('.');

const DEFAULT_SPAWN = [0.22, 0.62];

// Dashboard event vocabulary -> engine indexes (order of ATTACK_TYPES / HONEYPOTS)
const FEED_TYPE = { brute: 0, sqli: 1, scan: 2, cred: 3, slow: 4 };
const FEED_STATION = { ssh: 0, http: 1, ftp: 2, db: 3, mysql: 3 };
const MAX_IN_FLIGHT = 400;

function toRgb(v) {
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  }
  const rgb = /^rgba?\(([^)]+)\)/i.exec(v);
  return rgb ? rgb[1].split(',').slice(0, 3).map((n) => n.trim()).join(',') : null;
}

function readTheme(el) {
  const cs = getComputedStyle(el);
  const get = (n, d) => cs.getPropertyValue(n).trim() || d;
  const types = {};
  ['brute', 'sqli', 'scan', 'stuff', 'probe'].forEach((k) => {
    const rgb = toRgb(get(`--sx-t-${k}`, ''));
    if (rgb) types[k] = rgb;
  });
  return {
    types,
    ink: get('--sx-ink-rgb', '232,237,247'),
    signal: get('--sx-signal-rgb', '0,230,150'),
    paper: get('--sx-canvas', '#070b13'),
    mono: cs.fontFamily || 'ui-monospace, monospace',
  };
}

export default function Battlefield({
  feed,
  onCatch,
  spawnEvery = DEFAULT_SPAWN,
  controlRef,
  colorByType = false,
  active = true,
  label = 'Live plot of attacks travelling toward four honeypot stations and bursting on impact',
}) {
  const canvasRef = useRef(null);
  const onCatchRef = useRef(onCatch);
  const spawnRef = useRef(spawnEvery);
  const activeRef = useRef(active);
  const colorRef = useRef(colorByType);
  const ingestRef = useRef(null);

  useEffect(() => {
    onCatchRef.current = onCatch;
    spawnRef.current = spawnEvery;
    activeRef.current = active;
    colorRef.current = colorByType;
  }, [onCatch, spawnEvery, active, colorByType]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let theme = readTheme(canvas);
    const themeObserver = new MutationObserver(() => {
      theme = readTheme(canvas);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => (theme = readTheme(canvas)));

    let onScreen = true;
    const io =
      typeof IntersectionObserver !== 'undefined'
        ? new IntersectionObserver(([e]) => (onScreen = e.isIntersecting))
        : null;
    if (io) io.observe(canvas);

    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = performance.now();
    let spawnTimer = 0;
    let nextId = 0;
    let clock = 0;
    let dpr = 1;

    const attacks = [];
    const bursts = [];
    const queue = [];
    const tallies = HONEYPOTS.map(() => []);
    const hits = HONEYPOTS.map(() => 0);
    const flash = HONEYPOTS.map(() => 0);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, width * dpr);
      canvas.height = Math.max(1, height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      theme = readTheme(canvas);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const potPos = (i) => ({ x: HONEYPOTS[i].x * width, y: HONEYPOTS[i].y * height });
    const radius = () => Math.max(16, Math.min(40, Math.min(width, height) * 0.075));

    if (controlRef) {
      controlRef.current = {
        fire: ({ type, station, count = 1, spread = 0.1 }) => {
          for (let k = 0; k < count; k++) queue.push({ at: clock + k * spread, type, station });
        },
      };
    }

    const spawn = (typeIndex, station, extra) => {
      if (attacks.length > MAX_IN_FLIGHT) return;
      const edge = Math.floor(Math.random() * 4);
      const sx = edge === 1 ? width + 8 : edge === 3 ? -8 : Math.random() * width;
      const sy = edge === 0 ? -8 : edge === 2 ? height + 8 : Math.random() * height;
      const target = station != null ? station : Math.floor(Math.random() * HONEYPOTS.length);
      const p = potPos(target);
      const dx = p.x - sx;
      const dy = p.y - sy;
      const bend = (Math.random() - 0.5) * 0.7;
      const type = ATTACK_TYPES[typeIndex != null ? typeIndex : Math.floor(Math.random() * ATTACK_TYPES.length)];
      const pxPerSec = type.speed[0] + Math.random() * (type.speed[1] - type.speed[0]);
      attacks.push({
        sx, sy,
        cx: (sx + p.x) / 2 - dy * bend,
        cy: (sy + p.y) / 2 + dx * bend,
        target, t: 0,
        speed: pxPerSec / Math.max(Math.hypot(dx, dy), 1),
        type, ip: (extra && extra.ip) || randomIp(), tag: extra && extra.tag, trail: [],
      });
    };

    // Real events from the dashboards: stagger them a touch so a batch reads as a volley.
    ingestRef.current = (batch) => {
      batch.forEach((atk) => {
        const svc = String(atk.service || '').toLowerCase();
        queue.push({
          at: clock + Math.random() * 0.35,
          type: FEED_TYPE[atk.attack_type],
          station: FEED_STATION[svc],
          extra: { ip: atk.attacker_ip, tag: 'feed' },
        });
      });
    };

    const impact = (a, at) => {
      const center = potPos(a.target);
      hits[a.target] += 1;
      flash[a.target] = 1;
      const list = tallies[a.target];
      list.push(Math.atan2(at.y - center.y, at.x - center.x));
      if (list.length > 72) list.shift();
      bursts.push({
        x: at.x, y: at.y, life: 1, code: a.type.code, key: a.type.key,
        spikes: Array.from({ length: 9 + Math.floor(Math.random() * 5) }, () => ({
          a: Math.random() * Math.PI * 2,
          len: 6 + Math.random() * 16,
        })),
      });
      if (onCatchRef.current) {
        onCatchRef.current({ id: nextId++, ip: a.ip, type: a.type, station: a.target, tag: a.tag, x: at.x, y: at.y });
      }
    };

    const drawPaper = () => {
      const { ink, paper, mono } = theme;
      ctx.fillStyle = paper;
      ctx.fillRect(0, 0, width, height);
      const step = 24;
      ctx.fillStyle = `rgba(${ink},0.16)`;
      for (let x = step; x < width; x += step) for (let y = step; y < height; y += step) ctx.fillRect(x, y, 1, 1);

      ctx.strokeStyle = `rgba(${ink},0.45)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0, i = 0; x < width; x += step, i++) {
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, i % 5 === 0 ? 8 : 4);
      }
      for (let y = 0, i = 0; y < height; y += step, i++) {
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(i % 5 === 0 ? 8 : 4, y + 0.5);
      }
      ctx.stroke();

      ctx.fillStyle = `rgba(${ink},0.45)`;
      ctx.font = `9px ${mono}`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      for (let x = step * 5; x < width - 30; x += step * 5) ctx.fillText(String(x).padStart(4, '0'), x + 3, 4);
      for (let y = step * 5; y < height - 20; y += step * 5) ctx.fillText(String(y).padStart(4, '0'), 11, y + 3);

      const m = 16;
      ctx.strokeStyle = `rgba(${ink},0.55)`;
      [[width - m, m], [m, height - m], [width - m, height - m]].forEach(([x, y]) => {
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.moveTo(x - 9, y); ctx.lineTo(x + 9, y);
        ctx.moveTo(x, y - 9); ctx.lineTo(x, y + 9);
        ctx.stroke();
      });
    };

    const drawPerimeter = () => {
      ctx.strokeStyle = `rgba(${theme.ink},0.2)`;
      ctx.setLineDash([2, 6]);
      ctx.beginPath();
      [0, 1, 3, 2, 0].forEach((idx, n) => {
        const p = potPos(idx);
        if (n === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawAttack = (a) => {
      if (a.trail.length < 2) return;
      const col = (colorRef.current && theme.types[a.type.key]) || theme.ink;
      ctx.strokeStyle = `rgba(${col},0.78)`;
      ctx.lineWidth = 1.15;
      ctx.setLineDash(a.type.dash);
      ctx.beginPath();
      ctx.moveTo(a.trail[0].x, a.trail[0].y);
      for (let j = 1; j < a.trail.length; j++) ctx.lineTo(a.trail[j].x, a.trail[j].y);
      ctx.stroke();
      ctx.setLineDash([]);
      const head = a.trail[a.trail.length - 1];
      ctx.fillStyle = `rgb(${col})`;
      if (a.type.key === 'scan') ctx.fillRect(head.x - 2, head.y - 2, 4, 4);
      else {
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const drawTrap = (i, now) => {
      const { ink, signal, paper, mono } = theme;
      const pot = HONEYPOTS[i];
      const { x, y } = potPos(i);
      const r = radius();
      const f = flash[i];

      ctx.strokeStyle = `rgba(${ink},0.4)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.lineDashOffset = -now / 70;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      const list = tallies[i];
      ctx.lineWidth = 1.25;
      list.forEach((a, n) => {
        const inner = r * 1.62;
        const outer = inner + (n % 5 === 4 ? 11 : 6);
        ctx.strokeStyle = `rgba(${signal},${0.2 + 0.75 * ((n + 1) / list.length)})`;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * inner, y + Math.sin(a) * inner);
        ctx.lineTo(x + Math.cos(a) * outer, y + Math.sin(a) * outer);
        ctx.stroke();
      });

      ctx.fillStyle = paper;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      if (f > 0) {
        ctx.fillStyle = `rgba(${signal},${f * 0.9})`;
        ctx.beginPath();
        ctx.arc(x, y, r * (0.55 + 0.45 * f), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = `rgb(${ink})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (Math.PI / 2) * k;
        ctx.moveTo(x + Math.cos(a) * r * 1.12, y + Math.sin(a) * r * 1.12);
        ctx.lineTo(x + Math.cos(a) * r * 1.36, y + Math.sin(a) * r * 1.36);
      }
      ctx.stroke();

      ctx.fillStyle = f > 0.3 ? paper : `rgb(${ink})`;
      ctx.fillRect(x - 2.5, y - 2.5, 5, 5);

      if (width < 560) {
        // Narrow canvas (phones): centre the label under the station so nothing clips.
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        const ly = y + r * 1.62 + 14;
        ctx.fillStyle = `rgb(${ink})`;
        ctx.font = `600 11px ${mono}`;
        ctx.fillText(`${pot.id} ${pot.name}`, x, ly);
        ctx.font = `10px ${mono}`;
        ctx.fillStyle = f > 0 ? `rgb(${signal})` : `rgba(${ink},0.6)`;
        ctx.fillText(`:${pot.port} · ${String(hits[i]).padStart(4, '0')}`, x, ly + 13);
        return;
      }

      const side = pot.x < 0.5 ? -1 : 1;
      const ax = x + side * Math.cos(Math.PI / 4) * r * 1.5;
      const ay = y - Math.sin(Math.PI / 4) * r * 1.5;
      const bx = ax + side * 16;
      const by = ay - 16;
      const cx = bx + side * 26;
      ctx.strokeStyle = `rgb(${ink})`;
      ctx.beginPath();
      ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(cx, by);
      ctx.stroke();

      ctx.textAlign = side < 0 ? 'right' : 'left';
      ctx.textBaseline = 'alphabetic';
      const tx = cx + side * 6;
      ctx.fillStyle = `rgb(${ink})`;
      ctx.font = `600 11px ${mono}`;
      ctx.fillText(`${pot.id} ${pot.name}`, tx, by + 4);
      ctx.font = `10px ${mono}`;
      ctx.fillStyle = `rgba(${ink},0.6)`;
      ctx.fillText(`:${pot.port}`, tx, by + 18);
      ctx.fillStyle = f > 0 ? `rgb(${signal})` : `rgba(${ink},0.6)`;
      ctx.fillText(`${String(hits[i]).padStart(4, '0')} caught`, tx, by + 31);
    };

    const drawBurst = (b) => {
      const { mono } = theme;
      const signal = (colorRef.current && theme.types[b.key]) || theme.signal;
      const e = 1 - b.life;
      const ease = 1 - (1 - e) * (1 - e);
      ctx.strokeStyle = `rgba(${signal},${b.life})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      b.spikes.forEach((s) => {
        const from = 3 + ease * 10;
        const to = from + s.len * (0.35 + ease);
        ctx.moveTo(b.x + Math.cos(s.a) * from, b.y + Math.sin(s.a) * from);
        ctx.lineTo(b.x + Math.cos(s.a) * to, b.y + Math.sin(s.a) * to);
      });
      ctx.stroke();
      ctx.lineWidth = 1.5 * b.life;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4 + ease * 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(${signal},${b.life})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3.5 * b.life + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = `700 10px ${mono}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(b.code, b.x + 10, b.y - 10 - ease * 14);
    };

    const bezier = (a, t) => {
      const p = potPos(a.target);
      const u = 1 - t;
      return {
        x: u * u * a.sx + 2 * u * t * a.cx + t * t * p.x,
        y: u * u * a.sy + 2 * u * t * a.cy + t * t * p.y,
      };
    };

    const frame = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Hidden pane or scrolled off-screen: keep the loop alive but do no work.
      if (!activeRef.current || !onScreen || width < 2) {
        raf = requestAnimationFrame(frame);
        return;
      }

      // Re-apply every frame: a resize, a context restore or a hidden->visible
      // layer change can silently reset the transform, which draws everything
      // at 1x on a 2x canvas.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      clock += dt;
      const every = spawnRef.current;
      if (every) {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          spawnTimer = reducedMotion ? Math.max(1.8, every[1]) : every[0] + Math.random() * (every[1] - every[0]);
        }
      }
      for (let q = queue.length - 1; q >= 0; q--) {
        if (queue[q].at <= clock) {
          spawn(queue[q].type, queue[q].station, queue[q].extra);
          queue.splice(q, 1);
        }
      }

      drawPaper();
      drawPerimeter();

      const r = radius();
      for (let i = attacks.length - 1; i >= 0; i--) {
        const a = attacks[i];
        a.t = Math.min(a.t + a.speed * dt, 1);
        const pos = bezier(a, a.t);
        a.trail.push(pos);
        if (a.trail.length > 42) a.trail.shift();
        const c = potPos(a.target);
        if (Math.hypot(pos.x - c.x, pos.y - c.y) <= r || a.t >= 1) {
          impact(a, pos);
          attacks.splice(i, 1);
          continue;
        }
        drawAttack(a);
      }

      for (let i = 0; i < HONEYPOTS.length; i++) {
        flash[i] = Math.max(0, flash[i] - dt * 2.8);
        drawTrap(i, now);
      }

      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.life -= dt * 1.5;
        if (b.life <= 0) {
          bursts.splice(i, 1);
          continue;
        }
        drawBurst(b);
      }

      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
      if (io) io.disconnect();
      ingestRef.current = null;
      if (controlRef) controlRef.current = null;
    };
  }, [controlRef]);

  // New batch of real events arrived.
  useEffect(() => {
    if (feed && feed.length && ingestRef.current) ingestRef.current(feed);
  }, [feed]);

  return <canvas ref={canvasRef} className="sx-canvas" role="img" aria-label={label} />;
}