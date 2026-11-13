/*
  Snappy's knowledge base — every answer here describes something the dashboard really does.
  If you change a screen, change its entry. Fields:
    id      unique
    mod     which dashboard tab it belongs to (monitor | intel | xp | control | account | general)
    title   shown as the suggestion chip / used for matching
    kw      keywords & phrases (lower-case). Phrases count more than single words.
    a       the answer (plain text)
    next    ids of related entries offered as follow-up chips
*/
export const KB = [
  /* ───────── general ───────── */
  { id: "what", mod: "general", title: "What is SNAPTRAP?",
    kw: ["what is snaptrap", "snaptrap", "honeypot", "what does this do", "overview", "about"],
    a: "SNAPTRAP runs decoy services (fake SSH, HTTP, FTP and database ports). Nobody legitimate has a reason to use them, so whoever connects is probably scanning or attacking. Each attempt is recorded, classified by a machine-learning model, and shown on this dashboard.",
    next: ["tabs", "types", "score"] },
  { id: "tabs", mod: "general", title: "What are the tabs?",
    kw: ["tabs", "modules", "navigation", "menu", "pages", "sections"],
    a: "Live Monitor: attacks as they arrive, with charts. Threat Intel: attacker profiles, the attack log and your blocklist. Operator XP: levels and badges. Control Panel: your agent token, honeypot ports and deployed agents. Account (top right): password, data & consent.",
    next: ["battlefield", "attackers", "token"] },
  { id: "types", mod: "general", title: "What do the attack types mean?",
    kw: ["attack types", "types", "sqli", "brute", "cred", "scan", "slow", "unknown", "classes", "categories", "sql injection", "brute force", "credential"],
    a: "sqli: SQL injection attempts against the database or web decoys. brute: repeated login guesses (SSH/FTP). cred: credential stuffing — trying username/password pairs, typically on the HTTP login. scan: port or banner probing. slow: low-and-slow requests that look almost normal (e.g. a plain GET /). unknown: the model wasn't confident enough to pick one.",
    next: ["score", "ml", "unknown"] },
  { id: "score", mod: "general", title: "What is the threat score?",
    kw: ["threat score", "score", "risk", "risk level", "high medium low", "0-100", "severity"],
    a: "A number from 0 to 100 attached to every attack. It is a heuristic (service, keywords in the payload, repeat behaviour), not a probability. The Risk badge on an attacker is derived from it: 70+ is high, 40–69 medium, below 40 low. Risk reflects the attacker's most recent event, so it can move up and down.",
    next: ["types", "blocklist"] },
  { id: "threatlevel", mod: "general", title: "How is the Threat Level worked out?",
    kw: ["threat level", "low medium high critical", "critical", "alert bar", "threat meter", "topbar threat"],
    a: "It's a simple count of all attacks logged for your organisation: over 50 is MEDIUM, over 200 HIGH, over 1,000 CRITICAL. It does not look at how recent they are, so it only ever goes up — treat it as 'how much data you have', not 'are you under attack right now'. The timeline chart shows current activity.",
    next: ["timeline", "stats"] },
  { id: "geo", mod: "general", title: "Does SNAPTRAP show where attackers are?",
    kw: ["location", "geolocation", "country", "map", "where attackers", "geo", "trace", "locate"],
    a: "Not yet. SNAPTRAP records the attacker's IP address but doesn't look up a country or city, and the battlefield's positions are decorative. Even with a lookup, an IP only gives an approximate region — VPNs, Tor and cloud servers hide the real origin.",
    next: ["attackers", "battlefield"] },

  /* ───────── Live Monitor ───────── */
  { id: "battlefield", mod: "monitor", title: "What is the battlefield?",
    kw: ["battlefield", "animation", "dots", "radar", "live field", "arena", "canvas"],
    a: "The animated field at the top of Live Monitor. Each new attack that arrives is drawn as an incoming marker, coloured by attack type. It shows only events that arrive after you opened the page (not history); click the field to maximise it. Selecting an event in the feed shows its payload. Positions are decorative.",
    next: ["simulator", "xp"] },
  { id: "simulator", mod: "monitor", title: "What do the Wave buttons do?",
    kw: ["simulator", "wave", "wave 20", "wave 80", "wave 200", "simulate", "fake attacks", "test attacks", "demo"],
    a: "The Attack Simulator sends 20, 80 or 200 synthetic attacks through the same pipeline real ones use, so you can see the dashboard work without live traffic. They're stored in your data but tagged 'simulated', and they can be excluded from model training.",
    next: ["battlefield", "ml"] },
  { id: "stats", mod: "monitor", title: "What do the four stat cards mean?",
    kw: ["stat cards", "attacks caught", "unique ips", "avg threat score", "attack types", "numbers", "counters", "cards"],
    a: "Attacks Caught: total events logged. Unique IPs: distinct attacking addresses. Avg Threat Score: mean score across events (0–100). Attack Types: how many different classes have been seen.",
    next: ["score", "timeline"] },
  { id: "timeline", mod: "monitor", title: "What does the timeline show?",
    kw: ["timeline", "chart", "graph", "over time", "attacks per", "trend", "by service", "by attack type"],
    a: "Attack Timeline plots how many attacks arrived over time, so you can spot bursts. Below it, the breakdowns by service (SSH/HTTP/FTP/DB) and by attack type show what's being targeted and how.",
    next: ["stats", "threatlevel"] },

  /* ───────── Threat Intel ───────── */
  { id: "attackers", mod: "intel", title: "What is the attacker table?",
    kw: ["attacker table", "attackers", "ip address", "hits", "first seen", "last seen", "profiles", "attacker profile", "intel"],
    a: "One row per attacking IP: its risk badge, total hits, and when it was first and last seen. Click a row to open that attacker's details (click again to close). 'Block' adds it to your blocklist inside SNAPTRAP.",
    next: ["blocklist", "log"] },
  { id: "log", mod: "intel", title: "What's in the attack log?",
    kw: ["attack log", "log", "payload", "time service type score", "events list", "history", "raw"],
    a: "The raw events: time, service, classified type, score and the payload the attacker sent. Payloads are untrusted text from the internet — they can contain credentials, exploit strings or scripts. Read them, never run them.",
    next: ["attackers", "types"] },
  { id: "blocklist", mod: "intel", title: "What does Block do? Can I block a harmless person?",
    kw: ["block", "blocklist", "blocked", "unblock", "harmless", "false positive", "innocent", "firewall", "ban"],
    a: "Block records the IP on your SNAPTRAP blocklist; it does not change any firewall. Be careful before copying the list anywhere real: many people can share one IP (offices, campuses, mobile carriers), and researchers or mistyped visitors also touch decoys. Treat entries as 'worth reviewing', not proof.",
    next: ["score", "attackers"] },
  { id: "ml", mod: "intel", title: "How does the ML classifier work?",
    kw: ["ml", "machine learning", "classifier", "model", "random forest", "retrain", "accuracy", "distribution", "prediction", "confidence"],
    a: "A Random Forest looks at 19 features of each event (payload entropy, SQL/shell/brute-force keyword scores, service, time of day, repeat behaviour…) and predicts one of the attack types with a confidence. A superadmin can retrain it, and it retrains nightly from the stored data. The ML Attack Type Distribution chart shows its predictions.",
    next: ["unknown", "types"] },
  { id: "unknown", mod: "intel", title: "Why are some attacks 'unknown'?",
    kw: ["unknown", "uncertain", "low confidence", "novel", "not classified", "unclassified"],
    a: "Either the model's confidence was too low to commit, or the payload looks unlike anything it was trained on. Those are the interesting ones — they may be new techniques — and they're the best candidates for manual review.",
    next: ["ml", "log"] },

  /* ───────── Operator XP ───────── */
  { id: "xp", mod: "xp", title: "How do XP and levels work?",
    kw: ["xp", "level", "levels", "experience", "points", "operator", "gamification", "progress"],
    a: "You earn XP as attacks appear on the battlefield: sqli 150, cred 120, brute 80, unknown 50, scan 30, slow 20. Level n needs n² × 200 XP in total. XP is kept in this browser only (not on the server), so it resets if you log out or switch device.",
    next: ["badges", "battlefield"] },
  { id: "badges", mod: "xp", title: "What are the badges?",
    kw: ["badges", "achievements", "unlock", "first blood", "century", "sql hunter", "brute buster", "net sentinel", "defender", "scanner buster", "elite operator"],
    a: "Eight achievements: First Blood (1 attack), Century (100), SQL Hunter (10 SQLi), Brute Buster (20 brute force), Net Sentinel (50 unique IPs), Defender (2,500 attacks), Scanner Buster (30 scans) and Elite Operator (level 5). They unlock from your real stored totals.",
    next: ["xp"] },

  /* ───────── Control Panel ───────── */
  { id: "token", mod: "control", title: "What is the agent token?",
    kw: ["agent token", "token", "api key", "secret", "snt_live", "x-agent-token", "authenticate agent"],
    a: "The secret your agents send (as X-Agent-Token) to prove which organisation an attack belongs to. Anyone with it can write events into your account, so keep it private and never commit it to git.",
    next: ["deploy", "ports"] },
  { id: "ports", mod: "control", title: "What are the honeypot ports?",
    kw: ["ports", "configure ports", "2222", "8080", "2121", "3306", "ssh", "ftp", "mysql", "services", "decoy"],
    a: "The decoy services and their default ports: SSH 2222, HTTP 8080, FTP 2121, database 3306. Each catches a different attack family. For real attackers to find them, the ports must be reachable from the internet on a public IP.",
    next: ["deploy", "token"] },
  { id: "deploy", mod: "control", title: "How do I deploy an agent?",
    kw: ["deploy", "agent", "download agent", "install agent", "network agent", "docs", "setup", "revoke", "agents"],
    a: "In the Network Agent Console use 'Deploy new agent' to download the agent, and 'Docs' for the steps. Agents report to the API with your token. Revoke an agent from the same table and it disconnects immediately.",
    next: ["token", "ports"] },

  /* ───────── Account & privacy ───────── */
  { id: "password", mod: "account", title: "How do I change my password?",
    kw: ["password", "change password", "reset", "credentials"],
    a: "Open Account (top right) → Change Password. Passwords need 12+ characters with upper and lower case, a number and a symbol, and are stored as Argon2id hashes.",
    next: ["consent"] },
  { id: "consent", mod: "account", title: "How is my data used for training?",
    kw: ["training", "train", "consent", "opt out", "opt-out", "data use", "terms", "privacy", "my data", "who sees"],
    a: "With your consent, attack records (IP, time, service, payload, score) from participating organisations train one shared model. Account details, passwords and tokens are never used. You can opt out any time in Account → Data & consent; it applies from the next retrain. Published results are de-identified.",
    next: ["password", "delete"] },
  { id: "delete", mod: "account", title: "How do I delete my account?",
    kw: ["delete account", "delete my account", "delete the account", "deletion", "remove account", "remove my account", "close account", "danger zone"],
    a: "Account → Danger Zone → Request Account Deletion (type DELETE to confirm). The request is recorded and the maintainer carries it out; your organisation's data goes with it.",
    next: ["consent"] },
  { id: "verify", mod: "account", title: "I never got the verification email",
    kw: ["verification", "verify", "email", "resend", "confirm email", "didn't get", "spam"],
    a: "On the sign-in screen, enter your email and password and choose 'Resend verification email'. Links expire after 24 hours, only the newest link works, and you can ask again after a minute. Check spam too.",
    next: ["password"] },
  { id: "tour", mod: "general", title: "Take the tour",
    kw: ["tour", "walkthrough", "guide me", "show me around", "tutorial", "help", "start"],
    a: "__TOUR__", next: [] },
];

export const SUGGESTED = {
  monitor: ["battlefield", "stats", "simulator", "threatlevel"],
  intel: ["attackers", "blocklist", "ml", "log"],
  xp: ["xp", "badges"],
  control: ["token", "ports", "deploy"],
  account: ["consent", "password", "delete"],
};
