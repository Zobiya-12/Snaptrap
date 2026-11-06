import React, { useEffect, useRef, useState } from "react";

/* ═══════════════════════════════════════════════════════════
   AGENT DOCS — centred pop-up opened from the Control Panel.
   One section at a time (side nav), content mirrors backend/agent.py.
   Props: open, onClose, server (base URL, no /api), ports {SSH,HTTP,FTP,DB}
═══════════════════════════════════════════════════════════ */

const TABS = [
  { id: "start", label: "Quick start" },
  { id: "req", label: "Requirements" },
  { id: "flags", label: "Flags" },
  { id: "how", label: "How it works" },
  { id: "token", label: "Token" },
  { id: "fix", label: "Troubleshooting" },
];

/* colour flags (--x) and <placeholders> in a command */
function highlight(code) {
  return code.split(/(--[a-z-]+|<[^>]+>|^\$)/gm).map((part, i) => {
    if (/^--/.test(part)) return <span key={i} className="f">{part}</span>;
    if (/^</.test(part)) return <span key={i} className="v">{part}</span>;
    if (part === "$") return <span key={i} className="p">$</span>;
    return part;
  });
}

function Code({ code }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const raw = code.replace(/^\$ /, "");
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(raw).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }
  return (
    <div className="dm-code-wrap">
      <pre className="dm-code">{highlight(code)}</pre>
      <button type="button" className="dm-copy" onClick={copy}>{copied ? "Copied" : "Copy"}</button>
    </div>
  );
}

const Step = ({ n, children }) => (
  <div className="dm-step"><div className="dm-num">{n}</div><div>{children}</div></div>
);

export default function AgentDocs({ open, onClose, server, ports }) {
  const [tab, setTab] = useState("start");
  const closeRef = useRef(null);
  const paneRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    setTab("start");
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (closeRef.current) closeRef.current.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => { if (paneRef.current) paneRef.current.scrollTop = 0; }, [tab]);

  if (!open) return null;

  const p = ports || { SSH: 2222, HTTP: 8080, FTP: 2121, DB: 3306 };
  const cmd =
`$ python3 agent.py \\
    --token <YOUR_ORG_TOKEN> \\
    --server ${server} \\
    --ssh-port ${p.SSH} --http-port ${p.HTTP} \\
    --ftp-port ${p.FTP} --db-port ${p.DB}`;

  let pane = null;

  if (tab === "start") pane = (
    <>
      <h3>Quick start</h3>
      <div className="dm-lead">Three steps from download to your first caught attack.</div>
      <div className="dm-steps">
        <Step n="1"><p><b>Download the agent.</b> Use the <code>Download agent.py</code> button at the top of the Control Panel.</p></Step>
        <Step n="2"><p><b>Copy your token</b> from the Agent Token panel and put it in the command below. The ports follow what you saved in <i>Honeypot Services</i>.</p></Step>
        <Step n="3"><p><b>Run it</b> on the machine you want to watch. Attacks start appearing in your Live Monitor within seconds.</p></Step>
      </div>
      <Code code={cmd} />
    </>
  );

  if (tab === "req") pane = (
    <>
      <h3>Requirements</h3>
      <div className="dm-lead">What the machine running the agent needs.</div>
      <ul className="dm-list">
        <li><code>Python 3</code> installed.</li>
        <li>Packages: <code>pip install requests colorama</code></li>
        <li>The four honeypot ports free and <b>above 1024</b>. The agent refuses anything lower.</li>
        <li>Outbound HTTP(S) access to <code>{server}</code>.</li>
      </ul>
    </>
  );

  if (tab === "flags") pane = (
    <>
      <h3>Flags</h3>
      <div className="dm-lead">Everything <code>agent.py</code> accepts.</div>
      <div className="dm-flags">
        <div className="dm-flag h"><span>Flag</span><span>Default</span><span>What it does</span></div>
        {[
          ["--token", "required", "Your organisation agent token"],
          ["--server", "http://localhost:5000", "SNAPTRAP server base URL (no /api)"],
          ["--ssh-port", "2222", "Fake SSH honeypot"],
          ["--http-port", "8080", "Fake HTTP honeypot"],
          ["--ftp-port", "2121", "Fake FTP honeypot"],
          ["--db-port", "3306", "Fake database honeypot"],
        ].map(([f, d, n]) => (
          <div className="dm-flag" key={f}>
            <code>{f}</code><span className="d">{d}</span><span className="n">{n}</span>
          </div>
        ))}
      </div>
    </>
  );

  if (tab === "how") pane = (
    <>
      <h3>How it works</h3>
      <div className="dm-lead">What happens after you start the agent.</div>
      <div className="dm-steps">
        <Step n="1"><p><b>Listens.</b> Opens fake SSH, HTTP, FTP and database services on your chosen ports.</p></Step>
        <Step n="2"><p><b>Reports.</b> Each attack is sent to <code>{server}/api/agent/report</code> with your token in the <code>X-Agent-Token</code> header. Data stays isolated to your organisation.</p></Step>
        <Step n="3"><p><b>Blocks repeat offenders.</b> An IP that hits the agent 5 times goes on its local blocklist.</p></Step>
        <Step n="4"><p><b>Leaves no footprint.</b> Nothing is installed on the host besides the listening sockets.</p></Step>
      </div>
    </>
  );

  if (tab === "token") pane = (
    <>
      <h3>Token</h3>
      <div className="dm-lead">The token ties an agent to your organisation.</div>
      <div className="dm-note"><b>Keep it secret.</b> Anyone holding it can submit events as your organisation.</div>
      <ul className="dm-list">
        <li>Use <b>Show</b> and <b>Copy</b> in the Agent Token panel to read it.</li>
        <li><b>Regenerate</b> invalidates the old token immediately. Agents still using it are rejected until you restart them with the new one.</li>
      </ul>
    </>
  );

  if (tab === "fix") pane = (
    <>
      <h3>Troubleshooting</h3>
      <div className="dm-lead">The usual suspects, in order of likelihood.</div>
      {[
        ["“port … is below 1024”", "Pick ports above 1024 in Honeypot Services and run the command again."],
        ["Address already in use", "Another process owns that port. Change the matching port flag."],
        ["No events in the dashboard", `Check the machine can reach ${server}, and that the traffic hits a honeypot port rather than the real service.`],
        ["401 from the server", "Wrong or regenerated token. Copy it again from the Agent Token panel."],
      ].map(([q, a]) => (
        <div className="dm-fix" key={q}><b>{q}</b><p>{a}</p></div>
      ))}
    </>
  );

  return (
    <div className="dm-bg" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dm" role="dialog" aria-modal="true" aria-label="Agent setup documentation">
        <div className="dm-head">
          <div>
            <div className="eyebrow">◈ Docs</div>
            <div className="dm-title">Agent <em>setup</em></div>
          </div>
          <button ref={closeRef} type="button" className="dm-x" onClick={onClose} aria-label="Close docs">✕</button>
        </div>
        <div className="dm-main">
          <nav className="dm-nav" aria-label="Docs sections">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                type="button"
                className={`dm-tab${tab === t.id ? " on" : ""}`}
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
              >
                <span>{String(i + 1).padStart(2, "0")}</span>{t.label}
              </button>
            ))}
          </nav>
          <div className="dm-pane" ref={paneRef}>{pane}</div>
        </div>
      </div>
    </div>
  );
}