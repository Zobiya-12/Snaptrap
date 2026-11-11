import { KB } from "./kb";

const STOP = new Set("a an the is are was were do does did how what why who where when can could should would i me my we you your it its of to in on for and or with this that there these those be been being about please tell show".split(" "));
const words = s => (s.toLowerCase().match(/[a-z0-9\-_.]+/g) || []).filter(w => !STOP.has(w));

/* Score every entry against the question. Phrases in `kw` are worth more than single words;
   entries from the tab you're on get a small boost. Returns the best entry or null. */
export function findAnswer(question, mod) {
  const q = question.toLowerCase();
  const qw = new Set(words(question));
  let best = null, bestScore = 0;
  for (const e of KB) {
    let s = 0;
    for (const k of e.kw) {
      if (k.includes(" ") ? q.includes(k) : qw.has(k)) s += k.includes(" ") ? 3 : 2;
    }
    for (const w of words(e.title)) if (qw.has(w)) s += 0.5;
    if (s > 0 && e.mod === mod) s += 0.75;
    if (s > bestScore) { best = e; bestScore = s; }
  }
  return bestScore >= 2 ? best : null;
}

export const byId = id => KB.find(e => e.id === id);

/* Questions about *your* numbers get a live answer from /attacks/stats. */
export const wantsLiveStats = q => /\b(how many|total|count|summary|stats?|so far|today|right now|status)\b/i.test(q) &&
  /\b(attack|attacks|ip|ips|attacker|attackers|caught|threat)\b/i.test(q);

export function describeStats(s) {
  if (!s || s.error) return "I couldn't load your numbers just now.";
  const bt = Object.entries(s.by_type || {}).sort((a, b) => b[1] - a[1]);
  const bs = Object.entries(s.by_service || {}).sort((a, b) => b[1] - a[1]);
  if (!s.total_attacks) return "No attacks logged yet. Use the Wave buttons on Live Monitor to generate some test traffic, or deploy an agent.";
  return `You've logged ${s.total_attacks.toLocaleString()} attacks from ${(s.unique_ips || 0).toLocaleString()} unique IPs.` +
    (bt.length ? ` Most common type: ${bt[0][0]} (${bt[0][1].toLocaleString()}).` : "") +
    (bs.length ? ` Most targeted service: ${bs[0][0]} (${bs[0][1].toLocaleString()}).` : "");
}
