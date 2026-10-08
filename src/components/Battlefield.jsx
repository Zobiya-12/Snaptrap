import React, { useCallback, useRef } from 'react';
import '../landing/landing.css';
import Field from '../landing/Battlefield';
import { ATTACK_TYPES } from '../landing/attackTypes';
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

function Dash({ dash }) {
  return (
    <svg width="26" height="6" viewBox="0 0 40 6" aria-hidden="true">
      <line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dash.length ? dash.join(' ') : undefined} />
    </svg>
  );
}

export default function Battlefield({ feed, onHit, isLive = true }) {
  const wrapRef = useRef(null);
  const canvasWrapRef = useRef(null);

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
        el.style.color = `var(--sx-t-${e.type.key}, var(--sx-signal))`;
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
    <div className="bf-wrap sx-embed">
      <div ref={wrapRef} style={{ position: 'relative', width: '100%' }}>
        <div className="bf-topbar">
          <div className="bf-title">◉ Live Battlefield</div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--txt3)' }}>{(feed && feed.length) || 0} tracked</div>
        </div>
        <div
          ref={canvasWrapRef}
          className="bf-canvas-wrap"
          style={{ aspectRatio: '900 / 500', minHeight: 320, maxHeight: 640 }}
        >
          {/* spawnEvery={null}: dashboards show real/simulated events only, no ambient traffic */}
          <Field feed={feed} onCatch={handleCatch} spawnEvery={null} colorByType />
        </div>
        <div className="bf-legs">
          {LEGEND.map(([key, label]) => {
            const t = ATTACK_TYPES.find((a) => a.key === key);
            return (
              <div key={key} className="bf-leg">
                <span style={{ color: `var(--sx-t-${key})`, display: 'inline-flex' }}>
                  <Dash dash={t.dash} />
                </span>
                {label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}