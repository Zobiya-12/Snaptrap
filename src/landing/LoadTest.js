import React, { useState } from 'react';

const SPEEDUP = [1, 1.92, 2.81, 3.68, 4.52, 5.36, 6.31, 7.4];
const ATTACKERS = 700;
const SINGLE_THREAD_SECONDS = 61.2;
const MAX = SPEEDUP.length;
const CHART_W = 320;
const CHART_H = 200;
const PAD = 28;

const px = (t) => PAD + ((t - 1) / (MAX - 1)) * (CHART_W - PAD * 1.5);
const py = (s) => CHART_H - PAD - ((s - 1) / (MAX - 1)) * (CHART_H - PAD * 1.6);

function Lane({ index, active }) {
  const dur = 0.5 + (index % 3) * 0.07;
  return (
    <li className={`sx-lane${active ? ' is-on' : ''}`}>
      <span className="sx-label">{`W${index + 1}`}</span>
      <svg preserveAspectRatio="none" viewBox="0 0 400 12" aria-hidden="true">
        <line x1="0" y1="6" x2="400" y2="6" className="sx-s-line" strokeWidth="1" />
        {active && (
          <line x1="0" y1="6" x2="400" y2="6" className="sx-s-fg" strokeWidth="6" strokeDasharray="5 19">
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur={`${dur}s`} repeatCount="indefinite" />
          </line>
        )}
      </svg>
      <span className="sx-lane-dot" aria-hidden="true" />
    </li>
  );
}

export default function LoadTest() {
  const [threads, setThreads] = useState(8);
  const speedup = SPEEDUP[threads - 1];
  const seconds = SINGLE_THREAD_SECONDS / speedup;
  const rate = ATTACKERS / seconds;
  const efficiency = speedup / threads;
  const measured = SPEEDUP.map((s, i) => `${px(i + 1)},${py(s)}`).join(' ');

  return (
    <div className="sx-box sx-load">
      <div className="sx-load-main">
        <div className="sx-load-slider">
          <label htmlFor="sx-threads" className="sx-label">Worker threads</label>
          <input id="sx-threads" type="range" min={1} max={MAX} step={1} value={threads} onChange={(e) => setThreads(Number(e.target.value))} />
          <output htmlFor="sx-threads" className="sx-serif">{threads}</output>
        </div>

        <div className="sx-load-lanes">
          <div className="sx-queue">
            <span className="sx-label">Queue</span>
            <span className="sx-serif">{ATTACKERS}</span>
          </div>
          <ol aria-label={`${threads} of ${MAX} workers active`}>
            {SPEEDUP.map((_, i) => <Lane key={i} index={i} active={i < threads} />)}
          </ol>
        </div>

        <dl className="sx-load-stats">
          {[
            { k: 'Speedup', v: `${speedup.toFixed(1)}×`, hot: true },
            { k: `Clear ${ATTACKERS}`, v: `${seconds.toFixed(1)}s` },
            { k: 'Events / sec', v: Math.round(rate).toString() },
          ].map((m) => (
            <div key={m.k}>
              <dt className="sx-label">{m.k}</dt>
              <dd className={`sx-serif${m.hot ? ' sx-signal' : ''}`}>{m.v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <figure className="sx-load-chart">
        <figcaption>
          <span className="sx-label">Measured vs ideal</span>
          <span className="sx-label">{`${Math.round(efficiency * 100)}% efficient`}</span>
        </figcaption>
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label={`Speedup chart: ${speedup.toFixed(1)} times faster with ${threads} threads, against an ideal of ${threads} times`}>
          {SPEEDUP.map((_, i) => (
            <g key={i}>
              <line x1={px(i + 1)} y1={py(1)} x2={px(i + 1)} y2={py(1) + 4} className="sx-s-fg" />
              <text x={px(i + 1)} y={CHART_H - 8} textAnchor="middle" className="sx-s-text">{i + 1}</text>
            </g>
          ))}
          {[2, 4, 6, 8].map((s) => (
            <g key={s}>
              <line x1={PAD} y1={py(s)} x2={CHART_W - PAD / 2} y2={py(s)} className="sx-s-line" strokeDasharray="1 4" />
              <text x={PAD - 6} y={py(s) + 3} textAnchor="end" className="sx-s-text">{`${s}×`}</text>
            </g>
          ))}
          <line x1={PAD} y1={py(1)} x2={CHART_W - PAD / 2} y2={py(1)} className="sx-s-fg" />
          <line x1={px(1)} y1={py(1)} x2={px(MAX)} y2={py(MAX)} className="sx-s-muted" strokeDasharray="4 4" />
          <polyline points={measured} fill="none" className="sx-s-fg" strokeWidth="1.5" />
          <line x1={px(threads)} y1={py(1)} x2={px(threads)} y2={py(speedup)} className="sx-s-signal" strokeDasharray="2 3" />
          {SPEEDUP.map((s, i) => (
            <rect key={i} x={px(i + 1) - 2.5} y={py(s) - 2.5} width="5" height="5" className={i + 1 === threads ? 'sx-f-signal' : 'sx-f-fg'} />
          ))}
          <circle cx={px(threads)} cy={py(speedup)} r="7" fill="none" className="sx-s-signal" strokeWidth="1.25" />
          <text x={px(MAX) - 4} y={py(MAX) - 6} textAnchor="end" className="sx-s-text">ideal</text>
        </svg>
        <ul>
          <li><b>asyncio</b> accepts every connection</li>
          <li><b>threading</b> isolates each trap, lock-free queue</li>
          <li><b>multiprocessing</b> runs inference off the GIL</li>
        </ul>
      </figure>
    </div>
  );
}