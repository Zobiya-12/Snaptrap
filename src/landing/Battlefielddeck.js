import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { ATTACK_TYPES, HONEYPOTS } from './attackTypes';
import Battlefield from './Battlefield';

/*
  ONE battlefield, two layers.
    Layer 1  Live field    ambient attacks + catch log (always underneath)
    Layer 2  Firing range  you pick payload/target and fire; case file per catch

  The firing range sits below the live field with only its grip bar peeking out.
  Swipe the grip up (touch or mouse drag) and it rises over the live field,
  following your finger; release past halfway (or flick) and it snaps open.
  Swipe it down to go back. Click / Enter / Arrow keys also work, and so do the
  two tabs in the top bar. The stage height animates to fit whichever layer is up.
*/

const PEEK = 56; // px of the grip bar visible while the range is closed
const SNAP_VELOCITY = 0.45; // px/ms flick threshold
const TAP_SLOP = 6; // px of movement still treated as a click
const COMMIT_DISTANCE = 110; // px of drag that commits the switch (or half the travel if that is shorter)

const FEATURE_NAMES = ['Request rate', 'Payload entropy', 'Credential reuse', 'Port spread'];
const FEATURE_BASE = {
  brute: [0.92, 0.2, 0.35, 0.05],
  sqli: [0.4, 0.88, 0.1, 0.08],
  scan: [0.85, 0.15, 0.03, 0.96],
  stuff: [0.6, 0.45, 0.94, 0.4],
  probe: [0.06, 0.3, 0.1, 0.25],
};
const THREAT_BASE = { brute: 72, sqli: 88, scan: 52, stuff: 81, probe: 46 };
const PIPELINE = [
  { step: 'Accepted', range: [0.2, 0.6] },
  { step: 'Queued', range: [0.8, 2.4] },
  { step: 'Classified', range: [3.5, 8.5] },
  { step: 'Plotted', range: [11, 19] },
];
const SALVOS = [
  { label: 'Shot', count: 1, spread: 0 },
  { label: 'Wave', count: 12, spread: 0.12 },
  { label: 'Storm', count: 60, spread: 0.035 },
];
const LOG_SIZE = 9;

function payloadFor(key, name, port) {
  switch (key) {
    case 'brute':
      return [`connect ${name.toLowerCase()}:${port}`, 'AUTH root / 123456        DENY', 'AUTH root / password      DENY', 'AUTH root / admin123      DENY', '… 214 attempts in 9.8s'];
    case 'sqli':
      return [
        name === 'MySQL' ? "SELECT * FROM users WHERE id='1'" : 'POST /admin/login HTTP/1.1',
        "user=admin' OR 1=1 --",
        'UNION SELECT user, pass FROM users',
        'entropy 5.81 bits/char',
      ];
    case 'scan':
      return ['SYN :21 :22 :23 :80 :443 :3306', ':5432 :6379 :8080 :8443 :9200', `open → :${port} (${name})`, '48 ports swept in 0.4s'];
    case 'stuff':
      return ['AUTH j.smith@corp.io / Summer2024!', 'AUTH m.lee@corp.io / qwerty!23', 'pair seen in 3 prior breach dumps', 'same list replayed on SSH + FTP'];
    default:
      return [`connect ${name.toLowerCase()}:${port}`, '(idle 41s)  HELP', '(idle 63s)  VERSION', '1 req / 52s — under rate limit'];
  }
}

const jitter = (v, amt) => Math.min(1, Math.max(0.01, v + (Math.random() - 0.5) * amt));
const between = (r) => r[0] + Math.random() * (r[1] - r[0]);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const clock = () => new Date().toLocaleTimeString('en-GB', { hour12: false });

function buildCase(e, n) {
  const pot = HONEYPOTS[e.station];
  const winner = 0.78 + Math.random() * 0.19;
  const rest = ATTACK_TYPES.map((t) => (t.key === e.type.key ? 0 : Math.random()));
  const restSum = rest.reduce((a, b) => a + b, 0) || 1;
  const votes = ATTACK_TYPES.map((t, i) => (t.key === e.type.key ? winner : (rest[i] / restSum) * (1 - winner)));
  let acc = 0;
  return {
    ...e,
    n,
    time: clock(),
    payload: payloadFor(e.type.key, pot.name, pot.port),
    features: FEATURE_BASE[e.type.key].map((v) => jitter(v, 0.12)),
    votes,
    threat: Math.round(Math.min(99, Math.max(10, THREAT_BASE[e.type.key] + (Math.random() - 0.5) * 18))),
    timings: PIPELINE.map((p) => (acc += between(p.range))),
  };
}

export function DashSample({ dash }) {
  return (
    <svg width="40" height="6" viewBox="0 0 40 6" aria-hidden="true" className="sx-dash">
      <line x1="0" y1="3" x2="40" y2="3" stroke="currentColor" strokeWidth="1.25" strokeDasharray={dash.length ? dash.join(' ') : undefined} />
    </svg>
  );
}

function Chip({ pressed, onClick, children }) {
  return (
    <button type="button" aria-pressed={pressed} onClick={onClick} className={`sx-chip${pressed ? ' is-on' : ''}`}>
      {children}
    </button>
  );
}

function Meter({ value, strong }) {
  return (
    <span className="sx-meter" aria-hidden="true">
      <span className={strong ? 'is-strong' : ''} style={{ width: `${value * 100}%` }} />
    </span>
  );
}

const Label = ({ children }) => <p className="sx-label">{children}</p>;

/* ───────────────────────── Layer 1 — live field ───────────────────────── */
function LiveLayer({ log, total, onCatch, active }) {
  const rows = [...log, ...Array(Math.max(0, LOG_SIZE - log.length)).fill(null)];
  return (
    <div className="sx-live">
      <div className="sx-live-canvas">
        <Battlefield onCatch={onCatch} active={active} />
      </div>
      <aside aria-label="Catch log" className="sx-live-aside">
        <div className="sx-live-count">
          <div>
            <p className="sx-label">Caught this session</p>
            <p className="sx-big">{String(total).padStart(4, '0')}</p>
          </div>
          <p className="sx-rec">
            <span className="sx-blip" aria-hidden="true" />
            Rec
          </p>
        </div>
        <ol className="sx-log">
          {rows.map((row, i) =>
            row ? (
              <li key={row.id} className={i === 0 ? 'is-new' : ''}>
                <span className="sx-dim">{row.time}</span>
                <span className="sx-trunc">{row.ip}</span>
                <b>{row.type.code}</b>
                <span>{`→ ${HONEYPOTS[row.station].id}`}</span>
              </li>
            ) : (
              <li key={`e${i}`} className="sx-empty" aria-hidden="true">{'— — —'}</li>
            ),
          )}
        </ol>
        <ul className="sx-legend">
          {ATTACK_TYPES.map((t) => (
            <li key={t.key}>
              <DashSample dash={t.dash} />
              {t.code}
              <span className="sx-sr">{t.label}</span>
            </li>
          ))}
          <li className="sx-signal">
            <span className="sx-dot" aria-hidden="true" />
            Burst = caught
          </li>
        </ul>
      </aside>
    </div>
  );
}

/* ───────────────────────── Layer 2 — firing range ───────────────────────── */
function RangeLayer({ onCatch, active, current }) {
  const control = useRef(null);
  const [type, setType] = useState(null);
  const [station, setStation] = useState(null);
  const [fired, setFired] = useState(0);

  const fire = (count, spread) => {
    if (control.current) {
      control.current.fire({ type: type == null ? undefined : type, station: station == null ? undefined : station, count, spread });
    }
    setFired((f) => f + count);
  };
  const winnerIndex = current ? current.votes.indexOf(Math.max(...current.votes)) : -1;

  return (
    <>
      <div className="sx-range-bar">
        <div className="sx-range-pick">
          <fieldset>
            <legend className="sx-label">1 · Payload</legend>
            <div className="sx-chips">
              <Chip pressed={type === null} onClick={() => setType(null)}>Mixed</Chip>
              {ATTACK_TYPES.map((t, i) => (
                <Chip key={t.key} pressed={type === i} onClick={() => setType(i)}>
                  <DashSample dash={t.dash} />
                  {t.code}
                  <span className="sx-sr">{t.label}</span>
                </Chip>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="sx-label">2 · Target</legend>
            <div className="sx-chips">
              <Chip pressed={station === null} onClick={() => setStation(null)}>Any</Chip>
              {HONEYPOTS.map((p, i) => (
                <Chip key={p.id} pressed={station === i} onClick={() => setStation(i)}>{p.name}</Chip>
              ))}
            </div>
          </fieldset>
        </div>
        <div>
          <p className="sx-label sx-mb">3 · Fire</p>
          <div className="sx-chips">
            {SALVOS.map((s) => (
              <button key={s.label} type="button" onClick={() => fire(s.count, s.spread)} className={`sx-fire${s.label === 'Storm' ? ' is-storm' : ''}`}>
                {s.label}
                <span>{`×${s.count}`}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sx-range-grid">
        <div className="sx-range-canvas">
          <Battlefield
            onCatch={onCatch}
            spawnEvery={[1.6, 2.8]}
            controlRef={control}
            active={active}
            label="Interactive firing range: attacks you launch travel to the chosen honeypot station and burst on impact"
          />
          <p className="sx-fired">{`You fired ${String(fired).padStart(3, '0')}`}</p>
        </div>

        <aside aria-label="Case file for the latest catch" aria-live="polite" className="sx-case">
          {current ? (
            <>
              <div className="sx-case-head">
                <div>
                  <Label>{`Case #${String(current.n).padStart(4, '0')} · ${current.time}`}</Label>
                  <p className="sx-serif sx-case-title">{current.type.label}</p>
                  <p className="sx-case-ip">
                    {current.ip}
                    <span className="sx-dim">{' → '}</span>
                    {`${HONEYPOTS[current.station].name} :${HONEYPOTS[current.station].port}`}
                  </p>
                </div>
                <div className="sx-right">
                  <Label>Threat</Label>
                  <p className={`sx-serif sx-threat${current.threat >= 75 ? ' is-hot' : ''}`}>{current.threat}</p>
                </div>
              </div>
              <div className="sx-case-sec">
                <Label>Captured payload</Label>
                <pre className="sx-term">
                  {current.payload.map((l, i) => (
                    <span key={i}>
                      <i>{'> '}</i>
                      {l}
                    </span>
                  ))}
                </pre>
              </div>
              <div className="sx-case-sec sx-case-cols">
                <div>
                  <Label>Features read</Label>
                  <ul>
                    {FEATURE_NAMES.map((f, i) => (
                      <li key={f}>
                        <span><span>{f}</span><span className="sx-dim">{current.features[i].toFixed(2)}</span></span>
                        <Meter value={current.features[i]} />
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <Label>Model vote</Label>
                  <ul>
                    {ATTACK_TYPES.map((t, i) => (
                      <li key={t.key}>
                        <span className={i === winnerIndex ? 'sx-signal' : ''}><span>{t.code}</span><span>{`${Math.round(current.votes[i] * 100)}%`}</span></span>
                        <Meter value={current.votes[i]} strong={i === winnerIndex} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="sx-case-sec sx-case-last">
                <Label>Knock to plot</Label>
                <ol className="sx-pipe">
                  {PIPELINE.map((p, i) => (
                    <li key={p.step}>
                      <span>{p.step}</span>
                      <span className="sx-dim">{`${current.timings[i].toFixed(1)}ms`}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          ) : (
            <div className="sx-case-empty">
              <Label>Case file</Label>
              <p className="sx-serif">Waiting for the first catch.</p>
              <p className="sx-dim">Pick a payload and a target, then fire.</p>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

/* ───────────────────────── The deck ───────────────────────── */
export default function BattlefieldDeck() {
  const [open, setOpen] = useState(false);
  const [dragDy, setDragDy] = useState(null); // null when not dragging
  const [hA, setHA] = useState(640);
  const [hB, setHB] = useState(720);
  const [log, setLog] = useState([]);
  const [total, setTotal] = useState(0);
  const [current, setCurrent] = useState(null);

  const aRef = useRef(null);
  const bRef = useRef(null);
  const caseCounter = useRef(0);
  const uid = useRef(0); // both canvases number their own events from 0, so the deck re-keys them
  const gesture = useRef(null);

  // Measure both layers so the stage can animate between their heights.
  useLayoutEffect(() => {
    const measure = () => {
      if (aRef.current) setHA(aRef.current.offsetHeight);
      if (bRef.current) setHB(bRef.current.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (aRef.current) ro.observe(aRef.current);
    if (bRef.current) ro.observe(bRef.current);
    return () => ro.disconnect();
  }, []);

  const handleCatch = useCallback((e) => {
    uid.current += 1;
    const row = { ...e, id: uid.current, time: clock() }; // id captured now, not when React runs the updater
    setLog((prev) => [row, ...prev].slice(0, LOG_SIZE));
    setTotal((t) => t + 1);
  }, []);
  const handleRangeCatch = useCallback(
    (e) => {
      handleCatch(e);
      caseCounter.current += 1;
      setCurrent(buildCase(e, caseCounter.current));
    },
    [handleCatch],
  );

  // Geometry: closed → layer 2 is pushed down so only the grip peeks out.
  const closedTy = Math.max(0, hA - PEEK);
  const baseTy = open ? 0 : closedTy;
  const ty = dragDy == null ? baseTy : clamp(baseTy + dragDy, 0, closedTy);
  const progress = closedTy > 0 ? 1 - ty / closedTy : open ? 1 : 0;
  const stageH = hA + (hB - hA) * progress;
  const dragging = dragDy != null;
  const showA = !open || dragging || progress < 0.98;
  const showB = open || dragging;

  const onPointerDown = (e) => {
    if (e.button != null && e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { id: e.pointerId, y0: e.clientY, t0: performance.now(), lastY: e.clientY, lastT: performance.now(), v: 0, moved: false };
  };
  const onPointerMove = (e) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    const dy = e.clientY - g.y0;
    if (!g.moved && Math.abs(dy) > TAP_SLOP) g.moved = true;
    const now = performance.now();
    const dt = now - g.lastT;
    if (dt > 0) g.v = 0.8 * g.v + 0.2 * ((e.clientY - g.lastY) / dt);
    g.lastY = e.clientY;
    g.lastT = now;
    if (g.moved) setDragDy(dy);
  };
  const finish = (e, cancelled) => {
    const g = gesture.current;
    if (!g || g.id !== e.pointerId) return;
    gesture.current = null;
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (err) { /* already released */ }
    if (!g.moved || cancelled) {
      setDragDy(null);
      if (!cancelled && !g.moved) setOpen((o) => !o);
      return;
    }
    const end = clamp(baseTy + (e.clientY - g.y0), 0, closedTy);
    const commit = Math.min(closedTy / 2, COMMIT_DISTANCE);
    let next = open ? end < commit : closedTy - end > commit;
    if (g.v < -SNAP_VELOCITY) next = true;
    else if (g.v > SNAP_VELOCITY) next = false;
    setDragDy(null);
    setOpen(next);
  };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowUp') { e.preventDefault(); setOpen(true); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(false); }
  };

  return (
    <div className={`sx-deck${dragging ? ' is-dragging' : ''}`} id="field">
      <div className="sx-deck-bar">
        <div className="sx-tabs" role="group" aria-label="Battlefield view">
          <button type="button" aria-pressed={!open} onClick={() => setOpen(false)}>
            <em>01</em> Live field
          </button>
          <button type="button" aria-pressed={open} onClick={() => setOpen(true)}>
            <em>02</em> Firing range
          </button>
        </div>
        <p className="sx-deck-stat">
          <span className="sx-hide-sm">Stations armed — 4/4</span>
          <span><b>{String(total).padStart(4, '0')}</b> caught</span>
        </p>
      </div>

      <div className="sx-stage" style={{ height: stageH }}>
        <div ref={aRef} className="sx-layer-a" aria-hidden={open && !dragging ? 'true' : undefined}>
          <LiveLayer log={log} total={total} onCatch={handleCatch} active={showA} />
        </div>

        <section
          ref={bRef}
          id="sx-range-layer"
          aria-label="Firing range"
          className={`sx-layer-b${open ? ' is-open' : ''}${dragging ? ' is-dragging' : ''}`}
          style={{ transform: `translate3d(0, ${ty}px, 0)` }}
        >
          <button
            type="button"
            className="sx-grip"
            aria-expanded={open}
            aria-controls="sx-range-layer"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(e) => finish(e, false)}
            onPointerCancel={(e) => finish(e, true)}
            onKeyDown={onKeyDown}
          >
            <span className="sx-grip-bar" aria-hidden="true" />
            <span className="sx-grip-title"><em>02</em> Firing range</span>
            <span className="sx-grip-hint">
              <span className="sx-hide-sm">{open ? 'Swipe down for the live field' : 'Swipe up — fire back'}</span>
              <svg className={open ? 'is-flip' : ''} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </span>
          </button>
          <div className="sx-layer-b-body">
            <RangeLayer onCatch={handleRangeCatch} active={showB} current={current} />
          </div>
        </section>
      </div>
    </div>
  );
}