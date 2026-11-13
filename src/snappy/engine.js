import { KB } from "./kb";

const STOP = new Set(("a an the is are was were do does did how what why who where when can could should would i me my we you your it its of to in on for and or with this that there these those be been being about please tell show " +
  "mean means meaning explain define describe give need want help use get").split(" "));
const words = s => (s.toLowerCase().match(/[a-z0-9\-_.]+/g) || []).filter(w => !STOP.has(w));

/* Score every entry against the question and say how SURE the match is.
   A stray keyword inside an unrelated question ("what's the score of my cricket match") used to be
   enough to trigger a canned answer, so a match now also has to COVER the question:
     - strong: at least half of the question's words are explained by one entry, or
               it is a one- or two-word question that matches a single keyword.
     - weak:   something matched, but most of the question is about something else.
   Strong matches are answered from the knowledge base; weak ones go to the AI first (if enabled)
   and are only offered as "closest topic" when the AI can't answer. */
export function matchAnswer(question, mod) {
  const q = question.toLowerCase();
  const qset = new Set(words(question));
  if (!qset.size) return null;
  let best = null;
  for (const e of KB) {
    let s = 0, phrase = false;
    const covered = new Set();
    for (const k of e.kw) {
      if (k.includes(" ")) {
        if (q.includes(k)) { s += 3; phrase = true; words(k).forEach(w => covered.add(w)); }
      } else if (qset.has(k)) { s += 2; covered.add(k); }
    }
    for (const w of words(e.title)) if (qset.has(w)) { s += 0.5; covered.add(w); }
    if (s < 2) continue;
    const total = s + (e.mod === mod ? 0.75 : 0);          // the tab you're on only breaks ties
    const cov = [...qset].filter(w => covered.has(w)).length / qset.size;
    if (!best || total > best.total) best = { entry: e, total, cov, phrase };
  }
  if (!best) return null;
  const strong = best.cov >= 0.5 || (!best.phrase && qset.size <= 2);
  return { entry: best.entry, strong };
}

/* Strong matches only (kept for callers that just want an answer or null). */
export function findAnswer(question, mod) {
  const m = matchAnswer(question, mod);
  return m && m.strong ? m.entry : null;
}

export const byId = id => KB.find(e => e.id === id);

/* Questions about *your* numbers get a live answer from /attacks/stats. */
export const wantsLiveStats = q => /\b(how many|total|count|summary|stats?|so far|today|right now|status)\b/i.test(q) &&
  /\b(attack|attacks|ip|ips|attacker|attackers|caught|threat)\b/i.test(q) &&
  /\b(my|our|we|i|have|has|so far|how many|total|today|right now)\b/i.test(q);   // "what is an IP address?" is not a stats question

export function describeStats(s) {
  if (!s || s.error) return "I couldn't load your numbers just now.";
  const bt = Object.entries(s.by_type || {}).sort((a, b) => b[1] - a[1]);
  const bs = Object.entries(s.by_service || {}).sort((a, b) => b[1] - a[1]);
  if (!s.total_attacks) return "No attacks logged yet. Use the Wave buttons on Live Monitor to generate some test traffic, or deploy an agent.";
  return `You've logged ${s.total_attacks.toLocaleString()} attacks from ${(s.unique_ips || 0).toLocaleString()} unique IPs.` +
    (bt.length ? ` Most common type: ${bt[0][0]} (${bt[0][1].toLocaleString()}).` : "") +
    (bs.length ? ` Most targeted service: ${bs[0][0]} (${bs[0][1].toLocaleString()}).` : "");
}
