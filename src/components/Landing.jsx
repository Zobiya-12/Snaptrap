import React from 'react';
import '../landing/landing.css';
import Battlefielddeck from '../landing/Battlefielddeck';
import TrapReplay from '../landing/TrapReplay';
import LoadTest from '../landing/LoadTest';

const REPO_URL = 'https://github.com/Zobiya-12/Snaptrap';

const NAV = [
  { href: '#field', label: 'Battlefield' },
  { href: '#traps', label: 'Inside a trap' },
  { href: '#load', label: 'Under load' },
];

const STATS = [
  { value: '3', label: 'HPC paradigms combined' },
  { value: '5', label: 'Attack classes detected' },
  { value: '24h', label: 'ML auto-retrain cycle' },
  { value: '7.4×', label: 'Speedup at 8 threads' },
];

const STACK = ['Python asyncio', 'threading', 'multiprocessing', 'scikit-learn', 'PostgreSQL', 'Flask', 'React', 'WebSocket', 'JWT', 'Argon2id', 'Docker Compose', 'GitHub Actions', 'Prometheus', 'Grafana'];

function Logo() {
  return (
    <a href="#top" className="sx-logo">
      <span className="sx-logo-mark" aria-hidden="true" />
      <span className="sx-serif">Snaptrap</span>
    </a>
  );
}

function Header({ onLogin, onSignup, onDemo, onTheme, theme }) {
  return (
    <header className="sx-header">
      <div className="sx-wrap sx-header-in">
        <Logo />
        <nav aria-label="Main" className="sx-nav">
          <ul>
            {NAV.map((n, i) => (
              <li key={n.href}>
                <a href={n.href}><em>0{i + 1}</em>{n.label}</a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sx-actions">
          <button type="button" className="sx-demo-link sx-hide-sm" onClick={onDemo}>Live demo →</button>
          <button type="button" className="sx-icon-btn" onClick={onTheme} aria-label="Toggle theme" title="Toggle theme">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <button type="button" className="sx-btn-line" onClick={onLogin}>Sign in</button>
          <button type="button" className="sx-btn-signal" onClick={onSignup}>Sign up</button>
        </div>
      </div>
    </header>
  );
}

function Entry({ id, n, label, title, note, children }) {
  return (
    <section id={id} aria-label={label} className="sx-entry">
      <div className="sx-wrap sx-entry-in">
        <div className="sx-entry-head">
          <p className="sx-kicker"><span className="sx-signal">§ {n}</span><span className="sx-dim">{label}</span></p>
          {title && (
            <div className="sx-entry-title">
              <h2 className="sx-serif">{title}</h2>
              {note && <p className="sx-note">{note}</p>}
            </div>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}

export default function Landing({ onSignup, onLogin, onDemo, onTheme, theme }) {
  return (
    <div className="sx" id="top">
      <Header onLogin={onLogin} onSignup={onSignup} onDemo={onDemo} onTheme={onTheme} theme={theme} />

      <main>
        {/* Hero */}
        <section aria-labelledby="sx-hero-title">
          <div className="sx-wrap">
            <div className="sx-status">
              <span>Field report № 004</span>
              <span>Stations armed — 4/4</span>
              <span className="sx-hide-sm">Classifier — RF / 24h</span>
              <span className="sx-status-r">Status — <b className="sx-signal">Listening</b></span>
            </div>
            <div className="sx-hero">
              <h1 id="sx-hero-title" className="sx-serif">
                Catch attackers <em>before</em> they strike.
              </h1>
              <div className="sx-hero-side">
                <p>
                  Four decoy services sit exposed on the open internet. Nobody legitimate ever touches them — so every knock is hostile.
                  Each one is caught, classified by a self-retraining model, and plotted below as it happens.
                </p>
                <div className="sx-cta-row">
                  <button type="button" className="sx-btn-solid" onClick={onDemo}>Watch it live →</button>
                  <a className="sx-btn-outline" href={REPO_URL} target="_blank" rel="noreferrer">Source ↗</a>
                </div>
              </div>
            </div>
          </div>

          {/* One battlefield: live field + firing range that rises on swipe */}
          <Battlefielddeck />
        </section>

        {/* Stats */}
        <section aria-label="Key numbers">
          <dl className="sx-wrap sx-stats">
            {STATS.map((s) => (
              <div key={s.label}>
                <dt>{s.label}</dt>
                <dd className="sx-serif">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Entry
          id="traps"
          n="01"
          label="Inside a trap"
          title={<>What they see. <em>What we write down.</em></>}
          note="Real-shaped sessions against each decoy. Tarpits stall every reply so the attacker stays longer and leaves more behind."
        >
          <TrapReplay />
        </Entry>

        <Entry
          id="load"
          n="02"
          label="Under load"
          title={<>700 attackers. <em>Drag the threads.</em></>}
          note="Benchmarked on the full pipeline, from connection to classification. Slide to see how throughput scales."
        >
          <LoadTest />
        </Entry>

        <Entry n="03" label="Built with">
          <ul className="sx-stack sx-serif">
            {STACK.map((s, i) => (
              <li key={s}>
                {s}
                {i < STACK.length - 1 && <span className="sx-signal" aria-hidden="true">/</span>}
              </li>
            ))}
          </ul>
        </Entry>

        <section id="cta" className="sx-band">
          <div className="sx-wrap sx-band-in">
            <p className="sx-kicker"><span>§ 04</span><span>Try it</span></p>
            <h2 className="sx-serif">Leave the door open. <em>See who walks in.</em></h2>
            <div className="sx-cta-row">
              <button type="button" className="sx-btn-band" onClick={onDemo}>Open the live demo →</button>
              <a className="sx-btn-band-line" href={REPO_URL} target="_blank" rel="noreferrer">View on GitHub ↗</a>
            </div>
            <p className="sx-band-note">No signup for the demo. Full source on GitHub.</p>
          </div>
        </section>
      </main>

      <footer className="sx-footer">
        <div className="sx-wrap sx-footer-in">
          <Logo />
          <p>Honeypot intelligence — built solo — {new Date().getFullYear()}</p>
          <button type="button" onClick={onLogin}>Login</button>
        </div>
      </footer>
    </div>
  );
}