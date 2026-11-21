import React, { useState, useEffect } from "react";

/* Reference CPU benchmark: every machine measured with benchmarks/cpu_benchmark.py, on one chart.
   Data lives in public/benchmark_reference.json (build it with `cpu_benchmark.py merge`).
   x = number of worker processes, y = events/s or speedup. One line per machine. */

const COLORS = ["var(--c4)", "var(--c1)", "var(--c3)", "var(--c2)", "var(--txt2)"];
const SHAPES = ["circle", "square", "diamond", "triangle", "circle"];   // shape + colour, so colour is never the only cue

function Marker({ shape, x, y, color, r = 4.5, title }) {
  const common = { fill: color, stroke: "var(--sur)", strokeWidth: 1.5 };
  const t = title ? <title>{title}</title> : null;
  if (shape === "square") return <rect x={x - r} y={y - r} width={2 * r} height={2 * r} {...common}>{t}</rect>;
  if (shape === "diamond") return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`} {...common}>{t}</polygon>;
  if (shape === "triangle") return <polygon points={`${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`} {...common}>{t}</polygon>;
  return <circle cx={x} cy={y} r={r} {...common}>{t}</circle>;
}

function niceStep(max, n = 4) {            // round tick step so the axis reads 0, 600, 1.2k ... not 625, 1.3k
  const raw = (max || 1) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
  return ([1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(x => f <= x + 1e-9) || 10) * p;
}

export default function ReferenceBenchmark({ data: injected, compact = false }) {
  const [data, setData] = useState(injected || null);
  const [err, setErr] = useState(null);
  const [metric, setMetric] = useState("eps");          // "eps" | "speedup"
  const [hidden, setHidden] = useState({});

  useEffect(() => {
    if (injected) return;
    fetch((process.env.PUBLIC_URL || "") + "/benchmark_reference.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(setData)
      .catch(e => setErr(e.message));
  }, [injected]);

  const runs = (data?.runs || []).filter(r => r.results?.length);
  const shown = runs.filter(r => !hidden[r.label]);
  const peak = r => Math.max(...r.results.map(x => x.events_per_sec));
  const best = runs.length ? runs.reduce((a, b) => (peak(b) > peak(a) ? b : a)) : null;

  // chart geometry
  const W = 640, H = compact ? 250 : 300, L = 56, R = 20, T = 16, B = 40;
  const xs = [...new Set(runs.flatMap(r => r.results.map(x => x.workers)))].sort((a, b) => a - b);
  const px = w => L + (xs.length > 1 ? (xs.indexOf(w) / (xs.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const val = (r, p) => (metric === "eps" ? p.events_per_sec : p.speedup);
  const ideal = w => w / (xs[0] || 1);
  const maxV = Math.max(0, ...shown.flatMap(r => r.results.map(p => val(r, p))), metric === "speedup" ? Math.max(...xs.map(ideal), 0) : 0);
  const step = niceStep(maxV * 1.02), yMax = step * 4;
  const py = v => T + (1 - v / yMax) * (H - T - B);
  const ticks = [0, 1, 2, 3, 4].map(i => step * i);
  const fmt = v => (metric === "eps" ? (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : Math.round(v)) : (+v.toFixed(1)) + "x");

  return <div className="panel" style={compact ? undefined : { marginBottom: 18 }}>
    <div className="ph">Reference CPU Benchmark</div>
    {err && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)" }}>Couldn't load benchmark_reference.json ({err}).</div>}
    {!data && !err && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)" }}>Loading…</div>}
    {data && !runs.length && <div style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt3)", lineHeight: 1.7 }}>
      No reference runs yet. Run <code>benchmarks/cpu_benchmark.py</code> on a machine, then merge the result into <code>public/benchmark_reference.json</code>.
    </div>}
    {best && <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "2px 0 12px" }}>
        <div style={{ fontFamily: "var(--head)", fontSize: compact ? 28 : 35, fontWeight: 400, color: "var(--c1)" }}>{Math.round(peak(best)).toLocaleString()}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt3)", lineHeight: 1.6 }}>
          events/s peak · {best.label}<br />{best.cpu} · {best.cores} cores
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {[["eps", "Events / s"], ["speedup", "Speedup"]].map(([k, l]) =>
          <button key={k} className={`btn ${metric === k ? "btn-4" : "btn-2"}`} style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => setMetric(k)}>{l}</button>)}
        <span style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)" }}>{compact ? "click a legend item to hide a machine" : "x axis: worker processes · click a legend item to hide a machine"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
        aria-label={`Line chart of ${metric === "eps" ? "events per second" : "speedup"} against worker processes for ${runs.map(r => r.label).join(", ")}`}>
        {ticks.map(t => <g key={t}>
          <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} stroke="var(--bdr2)" strokeWidth="1" />
          <text x={L - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fontFamily="var(--mono)" fill="var(--txt3)">{fmt(t)}</text>
        </g>)}
        {xs.map(w => <text key={w} x={px(w)} y={H - B + 18} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill="var(--txt3)">{w}</text>)}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill="var(--txt4)">worker processes</text>
        {metric === "speedup" && <g>
          <polyline fill="none" stroke="var(--txt4)" strokeWidth="1.5" strokeDasharray="5 4" points={xs.map(w => `${px(w)},${py(ideal(w))}`).join(" ")} />
          <text x={W - R} y={py(ideal(xs[xs.length - 1])) - 6} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--txt4)">ideal (linear)</text>
        </g>}
        {shown.map(r => {
          const i = runs.indexOf(r), c = COLORS[i % COLORS.length];
          const pts = [...r.results].sort((a, b) => a.workers - b.workers);
          return <g key={r.label}>
            <polyline fill="none" stroke={c} strokeWidth="2.25" strokeLinejoin="round" points={pts.map(p => `${px(p.workers)},${py(val(r, p))}`).join(" ")} />
            {pts.map(p => <Marker key={p.workers} shape={SHAPES[i % SHAPES.length]} x={px(p.workers)} y={py(val(r, p))} color={c}
              title={`${r.label}: ${p.workers} worker${p.workers > 1 ? "s" : ""} · ${p.events_per_sec} events/s · ${p.speedup}x`} />)}
          </g>;
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        {runs.map((r, i) => <button key={r.label} onClick={() => setHidden(h => ({ ...h, [r.label]: !h[r.label] }))}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, padding: 0, opacity: hidden[r.label] ? 0.4 : 1, color: "var(--txt2)", fontFamily: "var(--mono)", fontSize: 11 }}>
          <svg width="16" height="12" viewBox="0 0 16 12"><Marker shape={SHAPES[i % SHAPES.length]} x={8} y={6} color={COLORS[i % COLORS.length]} r={4} /></svg>{r.label}
        </button>)}
      </div>
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table className="tbl"><thead><tr><th>Machine</th>{!compact && <th>CPU</th>}{!compact && <th>Cores</th>}<th>Peak events/s</th><th>Best speedup</th>{!compact && <th>Date</th>}</tr></thead>
          <tbody>{runs.map(r => {
            const top = r.results.reduce((a, b) => (b.speedup > a.speedup ? b : a));
            return <tr key={r.label}><td style={{ color: COLORS[runs.indexOf(r) % COLORS.length], fontWeight: 700 }}>{r.label}</td>{!compact && <td style={{ color: "var(--txt3)" }}>{r.cpu}</td>}
              {!compact && <td>{r.cores}</td>}<td style={{ fontFamily: "var(--head)", fontSize: 19 }}>{Math.round(peak(r)).toLocaleString()}</td>
              <td>{top.speedup}x <span style={{ color: "var(--txt4)" }}>@ {top.workers}</span></td>{!compact && <td style={{ color: "var(--txt3)" }}>{r.date}</td>}</tr>;
          })}</tbody></table>
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)", marginTop: 10, lineHeight: 1.7 }}>
        {compact ? "CPU-only scaling test (100-tree Random Forest, synthetic events), measured offline. Not the live server's ingest rate."
          : `Workload: 100-tree Random Forest, one event per call, synthetic 12-feature events, measured offline with benchmarks/cpu_benchmark.py (median of ${runs[0].repeats} runs). No database or network, so this is CPU scaling only. It is not the live server's ingest rate.`}
      </div>
    </>}
  </div>;
}
