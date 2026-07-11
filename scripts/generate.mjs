#!/usr/bin/env node
/**
 * generate.mjs — the content engine.
 *
 * 1. Reads every existing post's title + topic (dedup awareness).
 * 2. Picks the topic with the fewest articles (keeps the site balanced).
 * 3. Asks the configured provider for a NEW non-overlapping article.
 * 4. Rejects near-duplicate titles, then writes a Markdown file.
 *
 * Provider is selected by AA_PROVIDER (claude | cloudflare | digitalocean).
 * See scripts/providers.mjs for per-provider env requirements.
 *
 * Run:  node scripts/generate.mjs
 *       AA_PROVIDER=cloudflare node scripts/generate.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generate as llm, providerInfo } from "./providers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "src", "posts");
const TOPICS = ["science", "philosophy", "secularism", "religion"]; // news is hand-written, excluded from rotation

function readExisting() {
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  const posts = [];
  for (const f of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
    const m = raw.match(/^---\n([\s\S]*?)\n---/);
    if (!m) continue;
    const fm = m[1];
    const title = (fm.match(/title:\s*"?(.*?)"?\s*$/m) || [])[1] || "";
    const topic = (fm.match(/topic:\s*(.*?)\s*$/m) || [])[1] || "";
    posts.push({ file: f, title: title.trim(), topic: topic.trim().toLowerCase() });
  }
  return posts;
}

function pickTopic(posts) {
  const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
  for (const p of posts) if (counts[p.topic] !== undefined) counts[p.topic]++;
  return TOPICS.slice().sort((a, b) => counts[a] - counts[b] || Math.random() - 0.5)[0];
}

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const normalize = (s) =>
  s.toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();

function tooSimilar(title, existing) {
  const a = new Set(normalize(title).split(" ").filter((w) => w.length > 3));
  for (const e of existing) {
    const b = new Set(normalize(e.title).split(" ").filter((w) => w.length > 3));
    const overlap = [...a].filter((w) => b.has(w)).length;
    if (overlap / Math.max(1, Math.min(a.size, b.size)) >= 0.6) return e.title;
  }
  return null;
}

function buildPrompt(topic, existingTitles) {
  const system = `You write for "Artificial Atheist", a publication on atheism, skepticism, and critical thinking. Voice: clear, rigorous, fair-minded, never sneering. You present the strongest version of positions and note real counterarguments. Sentence case in prose. No purple prose, no filler, no hedging cliches.`;
  const prompt = `Write a NEW article for the topic: ${topic}.

It must NOT overlap in subject with any of these existing articles:
${existingTitles.map((t) => "- " + t).join("\n")}

Pick a fresh, specific angle within ${topic} that none of the above cover.

Return ONLY valid JSON, no markdown fences, with exactly these keys:
{
  "title": "Title Case, under 70 characters, no clickbait",
  "excerpt": "One sentence, under 160 characters, plain and informative",
  "body_markdown": "700-900 words. Start with a 1-2 sentence intro paragraph (no heading). Then 3-4 sections each introduced by a '## Sentence case heading'. Use prose, occasional bold for key terms. No H1. No 'In conclusion' cliche."
}`;
  return { system, prompt };
}

function parseJSON(text) {
  let t = text.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  // some open models wrap or prepend prose; grab the outermost {...}
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first > 0 || last < t.length - 1) t = t.slice(first, last + 1);
  try {
    return JSON.parse(t);
  } catch {
    // Claude sometimes emits literal newlines inside JSON strings; escape them
    return JSON.parse(t.replace(/\n/g, "\\n"));
  }
}

function writePost(data, topic, existing, { dryRunDir } = {}) {
  const dup = tooSimilar(data.title, existing);
  if (dup) {
    console.error(
      `Title too similar to existing ("${dup}").` +
        (dryRunDir ? " (dry-run: writing draft anyway)" : " Skipping.")
    );
    if (!dryRunDir) process.exit(0);
  }
  const today = process.env.AA_DATE || new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
  const slug = slugify(data.title);
  const dir = dryRunDir || POSTS_DIR;
  const filename = `${today}-${slug}.md`;
  const filepath = path.join(dir, filename);
  if (fs.existsSync(filepath) && !dryRunDir) {
    console.error("Slug already exists today. Skipping.");
    process.exit(0);
  }
  const out = [
    "---",
    `title: "${data.title.replace(/"/g, "'")}"`,
    `date: ${today}`,
    `topic: ${topic}`,
    `excerpt: "${data.excerpt.replace(/"/g, "'")}"`,
    "---",
    "",
    data.body_markdown.trim(),
    "",
  ].join("\n");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, out, "utf8");
  return filename;
}

async function main() {
  // Test mode: write a draft to drafts/ instead of publishing into src/posts,
  // skip the dedup/slug exits, and skip illustration. Combine with
  // AA_PROVIDER=mock to exercise the full parse+write pipeline offline (no API
  // key, no cost). Enable with --dry-run or AA_DRY_RUN=1.
  const dryRun = process.argv.includes("--dry-run") || process.env.AA_DRY_RUN === "1";

  const info = providerInfo();
  const existing = readExisting();
  const topic = pickTopic(existing);
  const { system, prompt } = buildPrompt(topic, existing.map((p) => p.title));

  console.log(`Provider: ${info.provider} (${info.model}) — topic: ${topic}${dryRun ? " [DRY RUN]" : ""}`);
  const raw = await llm({ system, prompt });

  let data;
  try {
    data = parseJSON(raw);
  } catch (e) {
    console.error("Provider did not return valid JSON:\n", raw.slice(0, 500));
    process.exit(1);
  }

  const dryRunDir = dryRun ? path.join(__dirname, "..", "drafts") : undefined;
  const filename = writePost(data, topic, existing, { dryRunDir });
  if (dryRun) {
    console.log(`Dry run OK — wrote drafts/${filename} (nothing published, no illustration).`);
    return;
  }
  console.log(`Wrote ${filename}`);

  // Generate the illustration (non-fatal: post keeps the tessellation fallback on failure)
  try {
    const { illustratePost } = await import("./illustrate.mjs");
    const img = await illustratePost(filename);
    console.log(img ? `Illustration: ${img}` : "No illustration (using tessellation fallback)");
  } catch (e) {
    console.warn("Illustration step skipped:", e.message);
  }

  // Push the article to Facebook via Buffer (non-fatal: discussion routing is
  // best-effort, and the post is already committed regardless). Skips silently
  // when BUFFER_ACCESS_TOKEN is unset. Queues by default; set BUFFER_NOW=1 to
  // publish immediately. Note the illustration was just re-read from disk into
  // the post's frontmatter, so the Buffer share picks up the image too.
  try {
    const { bufferPostFromFile } = await import("./buffer.mjs");
    await bufferPostFromFile(filename);
  } catch (e) {
    console.warn("Buffer push skipped:", e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
