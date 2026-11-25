import React, { useState, useEffect } from "react";

/* Reference CPU benchmark: every machine measured with benchmarks/cpu_benchmark.py, on one chart.
   Data lives in public/benchmark_reference.json (build it with `cpu_benchmark.py merge`).
   x = number of worker processes, y = events/s or speedup. One line per machine.
   A machine is one CPU model + core count, whatever the run was labelled; its batch-size runs
   ("... batch64") are folded into it and picked with the tabs, so the chart never has more lines than machines.
   If a machine has two runs at the same batch size and engine, the most recent date wins.
   Runs made with `--fast` (optimized inference) are a separate engine, switched with the toggle. */

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

const batchOf = r => { const m = /(\d+)\s+events?\s+per\s+predict_proba/i.exec(r.workload || ""); return m ? +m[1] : 1; };
const engineOf = r => (/optimized/i.test(r.workload || "") ? "fast" : "std");
const baseLabel = r => String(r.label).replace(/\s+batch\s*\d+$/i, "").replace(/\s+fast$/i, "").trim();
const engineName = e => (e === "fast" ? "Optimized inference" : "sklearn predict_proba");
const batchName = b => (b === 1 ? "Live (1 event)" : `Batch ${b}`);
const peak = r => Math.max(...r.results.map(x => x.events_per_sec));

function groupMachines(rawRuns) {
  const machines = [], byKey = {};
  rawRuns.filter(r => r.results?.length).forEach(r => {
    const key = `${r.cpu}|${r.cores}`;
    let m = byKey[key];
    if (!m) { m = byKey[key] = { key, name: baseLabel(r), cpu: r.cpu, cores: r.cores, date: r.date, runs: { std: {}, fast: {} } }; machines.push(m); }
    const b = batchOf(r), slot = m.runs[engineOf(r)], cur = slot[b];
    if (!cur || String(r.date) >= String(cur.date)) slot[b] = r;
    if (String(r.date) > String(m.date)) m.date = r.date;
  });
  return machines;
}

export default function ReferenceBenchmark({ data: injected, compact = false }) {
  const [data, setData] = useState(injected || null);
  const [err, setErr] = useState(null);
  const [metric, setMetric] = useState("eps");          // "eps" | "speedup"
  const [batchSel, setBatchSel] = useState(null);       // null = live path (1) if present
  const [engineSel, setEngineSel] = useState("std");     // "std" | "fast"
  const [hidden, setHidden] = useState({});

  useEffect(() => {
    if (injected) return;
    fetch((process.env.PUBLIC_URL || "") + "/benchmark_reference.json", { cache: "no-store" })
      .then(r => { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(setData)
      .catch(e => setErr(e.message));
  }, [injected]);

  const machines = groupMachines(data?.runs || []);
  const hasFast = machines.some(m => Object.keys(m.runs.fast).length);
  const eng = hasFast && engineSel === "fast" ? "fast" : "std";
  const batches = [...new Set(machines.flatMap(m => Object.keys(m.runs[eng]).map(Number)))].sort((a, b) => a - b);
  const sel = batches.includes(batchSel) ? batchSel : (batches.includes(1) ? 1 : batches[0]);
  const atSel = m => m.runs[eng][sel];
  const withRun = machines.filter(atSel);
  const shown = withRun.filter(m => !hidden[m.key]);
  const best = withRun.length ? withRun.reduce((a, b) => (peak(atSel(b)) > peak(atSel(a)) ? b : a)) : null;
  const colorOf = m => COLORS[machines.indexOf(m) % COLORS.length];
  const shapeOf = m => SHAPES[machines.indexOf(m) % SHAPES.length];

  // chart geometry
  const W = 640, H = compact ? 250 : 300, L = 56, R = 20, T = 16, B = 40;
  const xs = [...new Set(withRun.flatMap(m => atSel(m).results.map(x => x.workers)))].sort((a, b) => a - b);
  const px = w => L + (xs.length > 1 ? (xs.indexOf(w) / (xs.length - 1)) * (W - L - R) : (W - L - R) / 2);
  const val = (r, p) => (metric === "eps" ? p.events_per_sec : p.speedup);
  const ideal = w => w / (xs[0] || 1);
  const maxV = Math.max(0, ...shown.flatMap(m => atSel(m).results.map(p => val(atSel(m), p))), metric === "speedup" ? Math.max(0, ...xs.map(ideal)) : 0);
  const step = niceStep(maxV * 1.02), yMax = step * 4;
  const py = v => T + (1 - v / yMax) * (H - T - B);
  const ticks = [0, 1, 2, 3, 4].map(i => step * i);
  const fmt = v => (metric === "eps" ? (v >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + "k" : Math.round(v)) : (+v.toFixed(1)) + "x");
  const bestSpeed = r => r.results.reduce((a, b) => (b.speedup > a.speedup ? b : a));
  const dim = { fontFamily: "var(--mono)", fontSize: 12, color: "var(--txt4)" };

  return <div className="panel" style={compact ? undefined : { marginBottom: 18 }}>
    <div className="ph">Reference CPU Benchmark</div>
    {err && <div style={dim}>Couldn't load benchmark_reference.json ({err}).</div>}
    {!data && !err && <div style={dim}>Loading…</div>}
    {data && !machines.length && <div style={{ ...dim, color: "var(--txt3)", lineHeight: 1.7 }}>
      No reference runs yet. Run <code>benchmarks/cpu_benchmark.py</code> on a machine, then merge the result into <code>public/benchmark_reference.json</code>.
    </div>}
    {best && <>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", margin: "2px 0 12px" }}>
        <div style={{ fontFamily: "var(--head)", fontSize: compact ? 28 : 35, fontWeight: 400, color: "var(--c1)" }}>{Math.round(peak(atSel(best))).toLocaleString()}</div>
        <div style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--txt3)", lineHeight: 1.6 }}>
          events/s peak · {batchName(sel).toLowerCase()}{eng === "fast" ? " · optimized" : ""} · {best.name}<br />{best.cpu} · {best.cores} cores
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap", alignItems: "center" }}>
        {hasFast && ["std", "fast"].map(e =>
          <button key={e} className={`btn ${eng === e ? "solid btn-5" : "btn-ghost"}`} style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => setEngineSel(e)}>{engineName(e)}</button>)}
        {hasFast && <span style={{ width: 1, height: 18, background: "var(--bdr2)" }} />}
        {batches.length > 1 && batches.map(b =>
          <button key={b} className={`btn ${sel === b ? "solid btn-1" : "btn-ghost"}`} style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => setBatchSel(b)}>{batchName(b)}</button>)}
        {batches.length > 1 && <span style={{ width: 1, height: 18, background: "var(--bdr2)" }} />}
        {[["eps", "Events / s"], ["speedup", "Speedup"]].map(([k, l]) =>
          <button key={k} className={`btn ${metric === k ? "btn-4" : "btn-2"}`} style={{ fontSize: 10, padding: "4px 12px" }} onClick={() => setMetric(k)}>{l}</button>)}
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)", marginBottom: 8 }}>
        {compact ? "click a legend item to hide a machine" : "x axis: worker processes · click a legend item to hide a machine"}
        {sel > 1 && " · bigger batches trade a little latency for much higher throughput"}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }} role="img"
        aria-label={`Line chart of ${metric === "eps" ? "events per second" : "speedup"} against worker processes, ${batchName(sel)}, for ${withRun.map(m => m.name).join(", ")}${eng === "fast" ? " (optimized inference)" : ""}`}>
        {ticks.map(t => <g key={t}>
          <line x1={L} x2={W - R} y1={py(t)} y2={py(t)} stroke="var(--bdr2)" strokeWidth="1" />
          <text x={L - 8} y={py(t) + 4} textAnchor="end" fontSize="11" fontFamily="var(--mono)" fill="var(--txt3)">{fmt(t)}</text>
        </g>)}
        {xs.map(w => <text key={w} x={px(w)} y={H - B + 18} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill="var(--txt3)">{w}</text>)}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" fontSize="11" fontFamily="var(--mono)" fill="var(--txt4)">worker processes</text>
        {metric === "speedup" && xs.length > 0 && <g>
          <polyline fill="none" stroke="var(--txt4)" strokeWidth="1.5" strokeDasharray="5 4" points={xs.map(w => `${px(w)},${py(ideal(w))}`).join(" ")} />
          <text x={W - R} y={py(ideal(xs[xs.length - 1])) - 6} textAnchor="end" fontSize="10" fontFamily="var(--mono)" fill="var(--txt4)">ideal (linear)</text>
        </g>}
        {shown.map(m => {
          const r = atSel(m), c = colorOf(m);
          const pts = [...r.results].sort((a, b) => a.workers - b.workers);
          return <g key={m.key}>
            <polyline fill="none" stroke={c} strokeWidth="2.25" strokeLinejoin="round" points={pts.map(p => `${px(p.workers)},${py(val(r, p))}`).join(" ")} />
            {pts.map(p => <Marker key={p.workers} shape={shapeOf(m)} x={px(p.workers)} y={py(val(r, p))} color={c}
              title={`${m.name} · ${batchName(sel)}${eng === "fast" ? " · optimized" : ""}: ${p.workers} worker${p.workers > 1 ? "s" : ""} · ${p.events_per_sec} events/s · ${p.speedup}x`} />)}
          </g>;
        })}
      </svg>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
        {machines.map(m => {
          const has = !!atSel(m);
          return <button key={m.key} disabled={!has} title={has ? undefined : `No ${batchName(sel).toLowerCase()} run for this machine yet`}
            onClick={() => setHidden(h => ({ ...h, [m.key]: !h[m.key] }))}
            style={{ background: "none", border: "none", cursor: has ? "pointer" : "default", display: "flex", alignItems: "center", gap: 6, padding: 0, opacity: !has ? 0.3 : hidden[m.key] ? 0.4 : 1, color: "var(--txt2)", fontFamily: "var(--mono)", fontSize: 11 }}>
            <svg width="16" height="12" viewBox="0 0 16 12"><Marker shape={shapeOf(m)} x={8} y={6} color={colorOf(m)} r={4} /></svg>{m.name}
          </button>;
        })}
      </div>
      <div style={{ overflowX: "auto", marginTop: 14 }}>
        <table className="tbl"><thead><tr><th>Machine</th>{!compact && <th>CPU</th>}{!compact && <th>Cores</th>}
          {batches.map(b => <th key={b} style={b === sel ? { color: "var(--txt)" } : undefined}>{b === 1 ? "Live ev/s" : `Batch ${b} ev/s`}</th>)}<th>Best speedup</th>{!compact && <th>Date</th>}</tr></thead>
          <tbody>{machines.map(m => {
            const r = atSel(m), top = r && bestSpeed(r);
            return <tr key={m.key}><td style={{ color: colorOf(m), fontWeight: 700 }}>{m.name}</td>{!compact && <td style={{ color: "var(--txt3)" }}>{m.cpu}</td>}
              {!compact && <td>{m.cores}</td>}
              {batches.map(b => <td key={b} style={{ fontFamily: "var(--head)", fontSize: 19, opacity: b === sel ? 1 : 0.65 }}>{m.runs[eng][b] ? Math.round(peak(m.runs[eng][b])).toLocaleString() : <span style={{ color: "var(--txt4)" }}>·</span>}</td>)}
              <td>{top ? <>{top.speedup}x <span style={{ color: "var(--txt4)" }}>@ {top.workers}</span></> : <span style={{ color: "var(--txt4)" }}>·</span>}</td>{!compact && <td style={{ color: "var(--txt3)" }}>{m.date}</td>}</tr>;
          })}</tbody></table>
      </div>
      <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--txt4)", marginTop: 10, lineHeight: 1.7 }}>
        {compact ? "CPU-only scaling test (100-tree Random Forest, synthetic events), measured offline. Not the live server's ingest rate."
          : `Workload: 100-tree Random Forest, ${sel === 1 ? "one event per call (the live path)" : `${sel} events per call (micro-batched)`}${eng === "fast" ? ", optimized inference (float32, per-tree calls without re-validation; same probabilities as sklearn)" : ""}, synthetic 12-feature events, measured offline with benchmarks/cpu_benchmark.py (median of ${atSel(best).repeats} runs). No database or network, so this is CPU scaling only. It is not the live server's ingest rate.`}
      </div>
    </>}
  </div>;
}
