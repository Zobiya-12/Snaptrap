/* Guided-tour steps for the organisation dashboard.
   A step may switch tab (`mod`) and point at an element with a CSS selector (`sel`) or a function (`find`).
   If the element can't be found the card is simply shown in the middle of the screen. */
const panelByHeading = text => () =>
  [...document.querySelectorAll(".ph")].find(el => el.textContent.trim().startsWith(text))?.closest(".panel") || null;

export const TOUR_STEPS = [
  { mod: "monitor", title: "Welcome to SNAPTRAP",
    body: "This is your honeypot dashboard. Decoy services catch attackers, a model classifies each attempt, and everything shows up here. Two minutes, eight stops." },
  { mod: "monitor", sel: ".hud-mid", title: "Threat and XP",
    body: "Threat is a running total of attacks logged (MEDIUM past 50, HIGH past 200, CRITICAL past 1,000). XP is a game layer: you earn it as attacks land on the battlefield." },
  { mod: "monitor", sel: ".mnav", title: "Four tabs",
    body: "Live Monitor for what's happening now, Threat Intel for attackers and the log, Operator XP for levels and badges, Control Panel for tokens, ports and agents." },
  { mod: "monitor", sel: ".content > div:first-child", title: "The battlefield",
    body: "Every new attack appears here, coloured by type. Use the Wave buttons in the simulator to send test traffic if nothing real is arriving yet." },
  { mod: "monitor", sel: ".content .g4", title: "Your numbers",
    body: "Attacks caught, unique IPs, average threat score (0–100) and how many attack types you've seen." },
  { mod: "intel", sel: "table.tbl", title: "Attackers",
    body: "One row per attacking IP with a risk badge. Click a row for details. Block adds the IP to your blocklist — it doesn't touch a firewall, and shared IPs can belong to innocent people, so review before acting." },
  { mod: "xp", sel: ".panel.c1.glow", title: "Operator XP",
    body: "Levels and eight badges. XP lives in this browser only, so it resets if you log out." },
  { mod: "control", find: panelByHeading("Agent Token"), title: "Agent token",
    body: "The secret your agents use to report to your account. Keep it private. Deploy agents and set honeypot ports further down this page." },
  { mod: "monitor", title: "Meet Snappy",
    body: "That's it. Click the Snappy button any time to ask about anything on the dashboard, or to replay this tour." },
];
