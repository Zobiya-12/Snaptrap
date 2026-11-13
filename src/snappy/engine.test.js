import { matchAnswer, findAnswer, wantsLiveStats } from "./engine";

const id = (q, mod = "general") => { const m = matchAnswer(q, mod); return m && (m.strong ? m.entry.id : "weak:" + m.entry.id); };

test("real dashboard questions are answered from the knowledge base", () => {
  expect(id("what is snaptrap")).toBe("what");
  expect(id("what are the tabs?")).toBe("tabs");
  expect(id("how is the threat score calculated")).toBe("score");
  expect(id("what does brute mean")).toBe("types");
  expect(id("what is the threat level")).toBe("threatlevel");
  expect(findAnswer("score", "general")).not.toBeNull();
});

test("a stray keyword inside an unrelated question does NOT trigger a canned answer", () => {
  for (const q of [
    "what is the score of the cricket match tonight",
    "can you tell me about the history of the roman empire",
    "write me a poem about scanning documents",
    "how do I cook a good unknown recipe for dinner",
    "what is the best overview of machine learning in healthcare",
  ]) {
    const r = id(q);
    expect(r === null || String(r).startsWith("weak:")).toBe(true);   // never a strong (auto-answered) match
  }
});

test("definition questions are not mistaken for live-stats questions", () => {
  expect(wantsLiveStats("how many attacks have I caught so far")).toBe(true);
  expect(wantsLiveStats("what is an IP address and its status codes")).toBe(false);
});

import { KB } from "./kb";
test("every knowledge-base title finds its own entry as a strong match", () => {
  const bad = KB.filter(e => { const m = matchAnswer(e.title, e.mod); return !m || !m.strong || m.entry.id !== e.id; }).map(e => e.id);
  expect(bad).toEqual([]);
});
