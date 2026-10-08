export default function BarChart({ data = [], color = "var(--c1)" }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div>
      {data.map((d, i) => (
        <div className="brow" key={i}>
          <div className="blbl">{d.k}</div>
          <div className="btrack">
            <div className="bfill" style={{ width: `${(d.v/max)*100}%`, background: color }}/>
          </div>
          <div className="bcnt">{d.v}</div>
        </div>
      ))}
    </div>
  );
}