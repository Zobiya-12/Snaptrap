import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../landing/landing.css';
import Field from '../landing/Battlefield';
import { ATTACK_TYPES, HONEYPOTS, shapePoints } from '../landing/attackTypes';
import AudioEngine, { TYPE_XP } from '../constants';

/*
  Dashboard battlefield (live monitor, admin, red team, public demo).
  Same props as before — feed, onHit, isLive — but drawn by the new engine in
  landing/Battlefield.js, so the dashboards and the landing page match.

    feed    latest batch of events [{attack_type, service, attacker_ip, ...}]
    onHit   (xp) => void, called on each impact when isLive
    isLive  true: play audio + award XP. false: visual only.
*/

// engine attack keys -> the keys the rest of the app (XP table, audio) uses
const APP_TYPE = { brute: 'brute', sqli: 'sqli', scan: 'scan', stuff: 'cred', probe: 'slow' };
const LEGEND = [
  ['brute', 'Brute'],
  ['sqli', 'SQLi'],
  ['scan', 'Scan'],
  ['stuff', 'Cred'],
  ['probe', 'Slow'],
];

// Same polygons the canvas draws, so the legend always matches the field.
function ShapeIcon({ shape, size = 14 }) {
  const c = size / 2;
  const r = size * 0.36;
  const pts = shapePoints(shape, r, 0);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: 'block' }}>
      {pts ? (
        <polygon points={pts.map(([x, y]) => `${c + x},${c + y}`).join(' ')} fill="currentColor" />
      ) : (
        <circle cx={c} cy={c} r={r} fill="currentColor" />
      )}
    </svg>
  );
}

export default function Battlefield({ feed, onHit, isLive = true }) {
  const rootRef = useRef(null);
  const wrapRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const [maxed, setMaxed] = useState(false);

  /* ── maximise: real browser fullscreen where available, fixed overlay otherwise (e.g. iPhone) ── */
  const enterMax = useCallback(() => {
    const el = rootRef.current;
    if (el && el.requestFullscreen) {
      el.requestFullscreen().then(() => setMaxed(true)).catch(() => setMaxed(true));
    } else {
      setMaxed(true);
    }
  }, []);
  const exitMax = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setMaxed(false);
  }, []);

  useEffect(() => {
    if (!maxed) return undefined;
    // Esc in real fullscreen is handled by the browser; this syncs our state and covers the overlay fallback
    const onFs = () => { if (!document.fullscreenElement) setMaxed(false); };
    const onKey = (e) => { if (e.key === 'Escape' && !document.fullscreenElement) setMaxed(false); };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [maxed]);

  const handleCatch = useCallback(
    (e) => {
      const type = APP_TYPE[e.type.key] || 'unknown';
      const xp = TYPE_XP[type] || 50;

      // floating "+XP" where the attack landed
      const wrap = wrapRef.current;
      const cwrap = canvasWrapRef.current;
      if (wrap && cwrap && e.x != null) {
        const c = cwrap.getBoundingClientRect();
        const w = wrap.getBoundingClientRect();
        const el = document.createElement('div');
        el.className = 'xp-pop';
        el.textContent = `+${xp} XP`;
        el.style.left = `${e.x + (c.left - w.left) - 24}px`;
        el.style.top = `${e.y + (c.top - w.top) - 16}px`;
        const pot = HONEYPOTS[e.station];
        el.style.color = pot
          ? `var(--sx-pot-${pot.key}, var(--sx-signal))`
          : `var(--sx-t-${e.type.key}, var(--sx-signal))`;
        wrap.appendChild(el);
        setTimeout(() => el.remove(), 1100);
      }

      if (isLive) {
        AudioEngine.playImpact(type);
        AudioEngine.playXP();
        if (onHit) onHit(xp);
      }

      // quick shake on impact
      if (cwrap) {
        cwrap.classList.remove('hit');
        void cwrap.offsetWidth;
        cwrap.classList.add('hit');
        setTimeout(() => cwrap.classList.remove('hit'), 130);
      }
    },
    [isLive, onHit],
  );

  return (
    <div ref={rootRef} className={`bf-wrap sx-embed${maxed ? ' max' : ''}`}>
      <div ref={wrapRef} className="bf-inner">
        <div className="bf-topbar">
          <div className="bf-title">◉ Live Battlefield</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--txt3)' }}>{(feed && feed.length) || 0} tracked</span>
            <button
              type="button"
              className="btn btn-ghost bf-max-btn"
              onClick={maxed ? exitMax : enterMax}
              aria-pressed={maxed}
              title={maxed ? 'Exit full view (Esc)' : 'Maximise the battlefield'}
            >
              {maxed ? 'Exit ✕' : 'Maximise'}
            </button>
          </div>
        </div>
        <div ref={canvasWrapRef} className="bf-canvas-wrap">
          {/* spawnEvery={null}: dashboards show real/simulated events only, no ambient traffic */}
          <Field feed={feed} onCatch={handleCatch} spawnEvery={null} colorByType />
        </div>

        {/* legend: attack shapes (one row), then honeypots (second row) — each listed once */}
        <div className="bf-legs">
          {LEGEND.map(([key, label]) => {
            const t = ATTACK_TYPES.find((a) => a.key === key);
            return (
              <div key={key} className="bf-leg" title={t.label}>
                <span style={{ color: `var(--sx-t-${key})`, display: 'inline-flex' }}>
                  <ShapeIcon shape={t.shape} />
                </span>
                {label}
              </div>
            );
          })}
        </div>
        <div className="bf-legs">
          {HONEYPOTS.map((p) => (
            <div key={p.key} className="bf-leg">
              <span
                aria-hidden="true"
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: '50%',
                  display: 'inline-block',
                  background: `var(--sx-pot-${p.key})`,
                  boxShadow: `0 0 6px var(--sx-pot-${p.key})`,
                }}
              />
              {p.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}