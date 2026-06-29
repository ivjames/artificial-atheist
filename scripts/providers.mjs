/**
 * providers.mjs — swappable text-generation backends.
 *
 * One function, generate({ system, prompt }), routes to whichever provider
 * AA_PROVIDER selects. All three return a plain string (the model's text).
 *
 *   AA_PROVIDER = claude | cloudflare | digitalocean   (default: claude)
 *
 * Required env per provider:
 *   claude        ANTHROPIC_API_KEY        [AA_MODEL]
 *   cloudflare    CF_ACCOUNT_ID, CF_API_TOKEN   [AA_MODEL]
 *   digitalocean  DO_INFERENCE_KEY         [AA_MODEL]
 *
 * Default model per provider is chosen below if AA_MODEL is unset.
 */
const PROVIDER = (process.env.AA_PROVIDER || "claude").toLowerCase();

const DEFAULT_MODEL = {
  claude: "claude-sonnet-4-6",
  // Cloudflare model ids look like "@cf/meta/llama-3.1-8b-instruct"
  cloudflare: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  // DO Gradient model ids, e.g. "llama3.3-70b-instruct"
  digitalocean: "llama3.3-70b-instruct",
  // Offline stub for test mode — no network, no key, no cost.
  mock: "mock",
};

function model() {
  return process.env.AA_MODEL || DEFAULT_MODEL[PROVIDER];
}

// ---- Claude (Anthropic SDK) ----
// Use a forced tool call for structured output. The API guarantees that a
// tool_use block's `input` is valid JSON matching the schema, so we never have
// to parse model-hand-escaped JSON (the recurring cause of generate failures:
// an unescaped quote anywhere in ~800 words of markdown broke JSON.parse).
const ARTICLE_TOOL = {
  name: "publish_article",
  description: "Submit the finished article for publication.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Title Case, under 70 characters, no clickbait" },
      excerpt: { type: "string", description: "One sentence, under 160 characters" },
      body_markdown: { type: "string", description: "700-900 words of Markdown; see prompt for structure" },
    },
    required: ["title", "excerpt", "body_markdown"],
  },
};

async function viaClaude({ system, prompt }) {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const resp = await client.messages.create({
    model: model(),
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: prompt }],
    tools: [ARTICLE_TOOL],
    tool_choice: { type: "tool", name: ARTICLE_TOOL.name },
  });
  const toolUse = resp.content.find((b) => b.type === "tool_use" && b.name === ARTICLE_TOOL.name);
  if (toolUse) return JSON.stringify(toolUse.input);
  // Should not happen with a forced tool_choice, but fall back to text so the
  // caller's parseJSON can still try.
  return resp.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

// ---- Cloudflare Workers AI (OpenAI-compatible chat endpoint) ----
async function viaCloudflare({ system, prompt }) {
  const acct = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!acct || !token) throw new Error("CF_ACCOUNT_ID and CF_API_TOKEN required");
  const url = `https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/${model()}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_tokens: 2000,
    }),
  });
  if (!r.ok) throw new Error(`Cloudflare AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  // Workers AI returns { result: { response: "..." } }
  return j.result?.response ?? j.result?.choices?.[0]?.message?.content ?? "";
}

// ---- DigitalOcean Gradient serverless inference (OpenAI-compatible) ----
async function viaDigitalOcean({ system, prompt }) {
  const key = process.env.DO_INFERENCE_KEY;
  if (!key) throw new Error("DO_INFERENCE_KEY required");
  const r = await fetch("https://inference.do-ai.run/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model(),
      max_tokens: 2000,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!r.ok) throw new Error(`DO inference ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

// ---- Mock (offline test stub) ----
// Returns a fixed, valid-JSON article as a raw text string — the same shape the
// open-model providers return — so `node scripts/generate.mjs --dry-run` can
// exercise the full parse + write pipeline with no API key, no network, no cost.
// The body deliberately includes embedded "double quotes", a brace { and a
// blank line so it also smoke-tests JSON parsing of awkward content.
async function viaMock() {
  return JSON.stringify({
    title: "A Mock Article for Pipeline Testing",
    excerpt: "This is a stub response used by test mode; it is never published.",
    body_markdown:
      "This placeholder body exists only so the generator can be run end to end without calling a real model.\n\n" +
      '## Why a mock exists\n\nIt lets you verify parsing and file writing after edits, including awkward characters like "scare quotes" and a stray { brace.\n\n' +
      "## What it proves\n\nIf this file lands in drafts/ cleanly, the parse and write path is healthy.",
  });
}

export async function generate({ system, prompt }) {
  switch (PROVIDER) {
    case "mock":
      return viaMock({ system, prompt });
    case "cloudflare":
      return viaCloudflare({ system, prompt });
    case "digitalocean":
      return viaDigitalOcean({ system, prompt });
    case "claude":
    default:
      return viaClaude({ system, prompt });
  }
}

export function providerInfo() {
  return { provider: PROVIDER, model: model() };
}
