import React, { useState, useEffect } from 'react';
import { api } from '../constants';

function BlocklistPanel() {
  const [list, setList] = useState([]);
  const [ip, setIp] = useState("");

  useEffect(() => {
    api("/blocklist").then(d => Array.isArray(d) && setList(d));
  }, []);

  async function add() {
    if (!ip) return;
    await api("/blocklist/add", { method: "POST", body: JSON.stringify({ ip }) });
    setList(p => [...p, { ip, hits: 1, last_seen: new Date().toISOString() }]);
    setIp("");
  }

  async function rem(i) {
    await api("/blocklist/remove", { method: "POST", body: JSON.stringify({ ip: i }) });
    setList(p => p.filter(x => x.ip !== i));
  }

  return (
    <div className="panel c2">
      <div className="ph">Blocklist</div>
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input className="inp" placeholder="IPv4 to block…" value={ip}
          onChange={e => setIp(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          style={{ flex: 1 }} />
        <button className="btn btn-2" onClick={add}>Block</button>
      </div>
      <table className="tbl">
        <thead><tr><th>IP</th><th>Hits</th><th>Last Seen</th><th></th></tr></thead>
        <tbody>
          {!list.length && <tr><td colSpan={4} style={{ textAlign: "center", color: "var(--txt4)", padding: 20, fontFamily: "var(--mono)", fontSize: 12 }}>Blocklist empty</td></tr>}
          {list.map((b, i) => (
            <tr key={i}>
              <td style={{ fontFamily: "var(--mono)", color: "var(--c2)", fontWeight: 700 }}>{b.ip}</td>
              <td style={{ fontFamily: "var(--mono)" }}>{b.hits}</td>
              <td style={{ color: "var(--txt3)" }}>{b.last_seen?.slice(0, 19)}</td>
              <td><button className="btn btn-4" style={{ padding: "3px 10px", fontSize: 10 }} onClick={() => rem(b.ip)}>Unblock</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BlocklistPanel;