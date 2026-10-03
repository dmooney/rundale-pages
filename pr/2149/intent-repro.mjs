// Replays the rundale-intent v1 request exactly as the Google adapter's
// generate-content (Vertex) path sends it, and reports finish reason, token
// split, and raw text. Usage: node intent-repro.mjs <definition.json> <runs> [thinkingBudget|thinkingLevel] <input>...
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(
  "/Users/dmooney/Rundale/endpoints/packages/providers/package.json",
);
const { GoogleGenAI } = require("@google/genai");

const [defPath, runsArg, thinkingArg, ...inputs] = process.argv.slice(2);
const def = JSON.parse(readFileSync(defPath, "utf8"));
const client = new GoogleGenAI({
  vertexai: true,
  project: "limerick-prod",
  location: "global",
});
const thinking =
  thinkingArg === "default"
    ? undefined
    : /^\d+$/.test(thinkingArg)
      ? { thinkingBudget: Number(thinkingArg) }
      : { thinkingLevel: thinkingArg };

for (const playerInput of inputs) {
  for (let i = 0; i < Number(runsArg); i++) {
    const values = {
      contractVersion: { major: 1, minor: 0 },
      sessionID: "repro",
      logicalRequestID: `r${i}`,
      attemptID: `a${i}`,
      baseRevision: { rawValue: 3 },
      idempotencyKey: `k${i}`,
      role: "player_intent",
      playerInput,
    };
    const started = Date.now();
    let response; for (let attempt = 0; ; attempt++) { try { response = await client.models.generateContent({
      model: def.providerConfig.model,
      contents: [
        {
          role: "user",
          parts: [
            { text: `Endpoint input values:\n${JSON.stringify(values)}` },
          ],
        },
      ],
      config: {
        systemInstruction: def.instructions,
        responseMimeType: "application/json",
        ...(process.env.NO_SCHEMA ? {} : { responseJsonSchema: process.env.SCHEMA_FILE ? JSON.parse(readFileSync(process.env.SCHEMA_FILE, "utf8")) : process.env.PLAIN_SCHEMA ? plainSchema(def.outputSchema) : def.outputSchema }),
        maxOutputTokens: def.inferenceConfig.maxOutputTokens,
        ...(thinking ? { thinkingConfig: thinking } : {}),
      },
    }); break; } catch (e) { if (e.status !== 429 || attempt > 8) throw e; await new Promise((ok) => setTimeout(ok, 5000 * (attempt + 1))); } }
    const u = response.usageMetadata ?? {};
    const finish = response.candidates?.[0]?.finishReason;
    console.log(
      JSON.stringify({
        input: playerInput,
        finish,
        candidates: u.candidatesTokenCount,
        thoughts: u.thoughtsTokenCount,
        ms: Date.now() - started,
        text:
          finish === "STOP"
            ? response.text
            : (response.text ?? "").slice(0, 600),
      }),
    );
  }
}

function plainSchema(schema) {
  const props = {};
  for (const [k, v] of Object.entries(schema.properties)) {
    const { maxLength, description, ...rest } = v;
    props[k] = rest;
  }
  return { type: "object", properties: props, required: schema.required };
}
