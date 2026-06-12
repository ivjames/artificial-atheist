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
import Anthropic from "@anthropic-ai/sdk";

const PROVIDER = (process.env.AA_PROVIDER || "claude").toLowerCase();

const DEFAULT_MODEL = {
  claude: "claude-sonnet-4-6",
  // Cloudflare model ids look like "@cf/meta/llama-3.1-8b-instruct"
  cloudflare: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  // DO Gradient model ids, e.g. "llama3.3-70b-instruct"
  digitalocean: "llama3.3-70b-instruct",
};

function model() {
  return process.env.AA_MODEL || DEFAULT_MODEL[PROVIDER];
}

// ---- Claude (Anthropic SDK) ----
async function viaClaude({ system, prompt }) {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY
  const resp = await client.messages.create({
    model: model(),
    max_tokens: 2000,
    system,
    messages: [{ role: "user", content: prompt }],
  });
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

export async function generate({ system, prompt }) {
  switch (PROVIDER) {
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
