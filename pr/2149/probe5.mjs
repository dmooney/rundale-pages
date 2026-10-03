import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire("/Users/dmooney/Rundale/endpoints/packages/providers/package.json");
const { GoogleGenAI } = require("@google/genai");
const c = new GoogleGenAI({ vertexai: true, project: "limerick-prod", location: "global" });
const def = JSON.parse(readFileSync(process.argv[2], "utf8"));
const N = Number(process.argv[3] ?? 8);
// [input, expected intent, expected target (null = any), dialogue required]
const cases = [
  ["Mícheál, how are the cattle this week?", "talk", "Mícheál", true],
  ["Róisín, is the kettle on?", "talk", "Róisín", true],
  ["Siobhán, will you walk with me to the well?", "talk", "Siobhán", true],
  ["Michael, how are the cattle this week?", "talk", "Michael", true],
  ["Let us be off, walking on toward the Letter Office", "move", null, false],
  ["have a good look about the place", "look", null, false],
  ["lift the latch on the half-door", "interact", null, false],
];
const env = (input) => `Endpoint input values:\n${JSON.stringify({ contractVersion: { major: 1, minor: 0 }, sessionID: "s", logicalRequestID: "r", attemptID: "a", baseRevision: { rawValue: 3 }, idempotencyKey: "k", role: "player_intent", playerInput: input })}`;
const required = { ...def.outputSchema, required: ["intent", "target", "dialogue", "atmosphere"] };
const accentLine = "\n\nCopy names and words exactly as the player wrote them, including accented letters such as á, é, í, ó, ú; never replace or escape them.";
const variants = {
  baseline: { schema: def.outputSchema, sys: def.instructions },
  "all required": { schema: required, sys: def.instructions },
  "all required + accent line": { schema: required, sys: def.instructions.replace("\n\nRespond ONLY with valid JSON. No explanation.", accentLine + "\n\nRespond ONLY with valid JSON. No explanation.") },
};
const jobs = [];
for (const [label, v] of Object.entries(variants)) for (const [input, intent, target, needsDialogue] of cases) for (let i = 0; i < N; i++)
  jobs.push(async () => {
    let r; for (let a = 0; ; a++) { try { r = await c.models.generateContent({ model: def.providerConfig.model, contents: env(input), config: { systemInstruction: v.sys, responseMimeType: "application/json", responseJsonSchema: v.schema, maxOutputTokens: 256 } }); break; } catch (e) { if (e.status !== 429 || a > 8) throw e; await new Promise((ok) => setTimeout(ok, 4000 * (a + 1))); } }
    const f = r.candidates?.[0]?.finishReason;
    let ok = false; try { const o = JSON.parse(r.text); ok = f === "STOP" && o.intent === intent && (target === null || o.target === target) && (!needsDialogue || !!o.dialogue); } catch {}
    return { label, input, ok, maxtok: f !== "STOP", text: r.text?.replace(/\s+/g, " ").slice(0, 90) };
  });
const results = [];
for (const j of jobs) results.push(await j());
for (const label of Object.keys(variants)) {
  const rs = results.filter((r) => r.label === label);
  console.log(`${label}: clean ${rs.filter((r) => r.ok).length}/${rs.length}, max_tokens ${rs.filter((r) => r.maxtok).length}`);
  for (const [input] of cases) { const s = rs.filter((r) => r.input === input); const bad = s.find((r) => !r.ok); console.log(`   ${s.filter((r) => r.ok).length}/${s.length} ${input}${bad ? "  e.g. " + bad.text : ""}`); }
}
