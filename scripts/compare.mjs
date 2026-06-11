#!/usr/bin/env node
/**
 * compare.mjs — A/B the providers on identical input.
 *
 * Runs the SAME topic + prompt through every provider you have credentials
 * for, and writes each result to drafts/<provider>-<slug>.md so you can read
 * them side by side. Nothing is published; this never touches src/posts.
 *
 * It only runs a provider if its required env vars are present, so you can
 * compare just Claude + Cloudflare, or add DO when you have a key.
 *
 * Run:  node scripts/compare.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "src", "posts");
const DRAFTS_DIR = path.join(__dirname, "..", "drafts");
const TOPICS = ["science", "philosophy", "secularism", "religion"];

function readExisting() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  return files.map((f) => {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
    const fm = (raw.match(/^---\n([\s\S]*?)\n---/) || [])[1] || "";
    return {
      title: (fm.match(/title:\s*"?(.*?)"?\s*$/m) || [])[1]?.trim() || "",
      topic: (fm.match(/topic:\s*(.*?)\s*$/m) || [])[1]?.trim().toLowerCase() || "",
    };
  });
}

function pickTopic(posts) {
  const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  for (const p of posts) if (counts[p.topic] !== undefined) counts[p.topic]++;
  return TOPICS.slice().sort((a, b) => counts[a] - counts[b])[0];
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);

function parseJSON(text) {
  let t = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const f = t.indexOf("{"), l = t.lastIndexOf("}");
  if (f > 0 || l < t.length - 1) t = t.slice(f, l + 1);
  return JSON.parse(t);
}

// Which providers have credentials available right now?
function availableProviders() {
  const list = [];
  if (process.env.ANTHROPIC_API_KEY) list.push("claude");
  if (process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN) list.push("cloudflare");
  if (process.env.DO_INFERENCE_KEY) list.push("digitalocean");
  return list;
}

async function main() {
  const providers = availableProviders();
  if (!providers.length) {
    console.error("No provider credentials found. Set ANTHROPIC_API_KEY and/or CF_* and/or DO_INFERENCE_KEY.");
    process.exit(1);
  }

  const existing = readExisting();
  const topic = pickTopic(existing);
  const titles = existing.map((p) => p.title);

  const system = `You write for "Artificial Atheist", a publication on atheism, skepticism, and critical thinking. Voice: clear, rigorous, fair-minded, never sneering. You present the strongest version of positions and note real counterarguments. Sentence case in prose. No purple prose, no filler.`;
  const prompt = `Write a NEW article for the topic: ${topic}.
Do NOT overlap with these existing titles:
${titles.map((t) => "- " + t).join("\n")}
Pick a fresh, specific angle.
Return ONLY valid JSON with keys: title, excerpt, body_markdown (700-900 words, intro paragraph then 3-4 '## sentence case' sections, no H1).`;

  fs.mkdirSync(DRAFTS_DIR, { recursive: true });
  console.log(`Topic: ${topic}\nComparing: ${providers.join(", ")}\n`);

  for (const provider of providers) {
    process.env.AA_PROVIDER = provider;
    // re-import fresh so the provider env is read each time
    const { generate, providerInfo } = await import("./providers.mjs?" + Date.now());
    const info = providerInfo();
    const t0 = Date.now();
    try {
      const raw = await generate({ system, prompt });
      const data = parseJSON(raw);
      const ms = Date.now() - t0;
      const words = data.body_markdown.split(/\s+/).length;
      const file = path.join(DRAFTS_DIR, `${provider}-${slugify(data.title)}.md`);
      fs.writeFileSync(
        file,
        `---\nprovider: ${provider}\nmodel: ${info.model}\nlatency_ms: ${ms}\nword_count: ${words}\ntopic: ${topic}\ntitle: "${data.title.replace(/"/g, "'")}"\nexcerpt: "${data.excerpt.replace(/"/g, "'")}"\n---\n\n# ${data.title}\n\n${data.body_markdown}\n`,
        "utf8"
      );
      console.log(`  ${provider.padEnd(13)} ${info.model.padEnd(40)} ${ms}ms  ${words}w  -> drafts/${path.basename(file)}`);
    } catch (e) {
      console.log(`  ${provider.padEnd(13)} FAILED: ${e.message}`);
    }
  }

  console.log(`\nDrafts written to drafts/. Read them side by side, then delete the folder.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
