#!/usr/bin/env node
/**
 * illustrate.mjs — generate a flat/geometric editorial illustration for a post.
 *
 * Style is LOCKED by a fixed scaffold; only the subject (derived from the
 * article via a short Claude call) and the topic palette vary. This keeps
 * every illustration visually consistent.
 *
 * Image model: OpenAI GPT Image (mini by default). Set OPENAI_API_KEY.
 *   Override model with AA_IMAGE_MODEL (default "gpt-image-1-mini").
 *
 * Usage:
 *   import { illustratePost } from "./illustrate.mjs"  // returns "/images/posts/<slug>.png" or null
 *   node scripts/illustrate.mjs --all        # backfill every post missing an image
 *   node scripts/illustrate.mjs <slug>       # (re)generate one post by slug
 *
 * Never throws into the caller's pipeline: on any failure it returns null and
 * logs, so a post still publishes with the tessellation fallback.
 */
import fs from "node:fs";
import path from "node:path";
import { generate as llm } from "./providers.mjs";

const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "src", "posts");
const IMG_DIR = path.join(ROOT, "src", "images", "posts");
const IMG_MODEL = process.env.AA_IMAGE_MODEL || "gpt-image-1-mini";
const IMG_SIZE = process.env.AA_IMAGE_SIZE || "1536x864"; // 16:9 wide banner

// Topic -> palette hint fed to the image model (kept close to the site colors).
const PALETTE = {
  science: "deep cobalt blue with pale sky-blue accents",
  philosophy: "deep violet with soft lavender accents",
  secularism: "deep teal-green with mint accents",
  religion: "warm terracotta with soft clay accents",
  news: "slate grey-blue with muted steel accents",
};

const STYLE = (palette, subject) =>
  `Flat vector editorial illustration, composed as a WIDE HORIZONTAL BANNER. ` +
  `Bold simple geometric shapes arranged across the full width, balanced and centered, ` +
  `with calm empty margins along the top and bottom edges (nothing important near the very top or bottom). ` +
  `Limited palette of ${palette} on an off-white background, generous negative space, crisp flat color, ` +
  `subtle grain only. No text, no words, no letters, no numbers, no logos, no human faces, ` +
  `no photorealism, no heavy gradients. Conceptual and abstract, calm and intelligent tone. ` +
  `Subject: ${subject}.`;

function parseFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : "";
  const get = (k) => (fm.match(new RegExp("^" + k + ":\\s*\"?(.*?)\"?\\s*$", "m")) || [])[1] || "";
  return { title: get("title").trim(), topic: get("topic").trim().toLowerCase(), excerpt: get("excerpt").trim(), hasImage: /^image:/m.test(fm) };
}

function slugOf(file) {
  return file.replace(/^\d{4}-\d{2}-\d{2}-/, "").replace(/\.md$/, "");
}

// Derive a short, depiction-friendly visual subject from the article.
async function subjectFor({ title, topic, excerpt }) {
  try {
    const prompt = `Article title: "${title}"
Topic: ${topic}
Summary: ${excerpt}

In ONE short phrase (max ~12 words), describe a flat geometric illustration concept that captures this article's theme. Use concrete objects, symbols, or abstract forms — never text, words, faces, or famous people. Reply with only the phrase.`;
    const out = await llm({ system: "You suggest concise, abstract illustration concepts.", prompt });
    return out.trim().replace(/^["']|["']$/g, "").slice(0, 160);
  } catch {
    // fallback subject keeps generation possible even if Claude is down
    return `abstract geometric forms evoking ${topic}`;
  }
}

async function generateImage(prompt, outPath) {
  if (!process.env.OPENAI_API_KEY) {
    console.warn("  (no OPENAI_API_KEY — skipping image generation)");
    return false;
  }
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI();
  const opts = {
    model: IMG_MODEL,
    prompt,
    quality: process.env.AA_IMAGE_QUALITY || "low",
    output_format: "png",
    n: 1,
  };
  let resp;
  try {
    resp = await client.images.generate({ ...opts, size: IMG_SIZE });
  } catch (e) {
    // mini models may reject non-preset sizes; fall back to the 3:2 preset
    if (/size/i.test(e.message) && IMG_SIZE !== "1536x1024") {
      console.warn(`  size ${IMG_SIZE} rejected; retrying at 1536x1024`);
      resp = await client.images.generate({ ...opts, size: "1536x1024" });
    } else throw e;
  }
  const b64 = resp.data?.[0]?.b64_json;
  if (!b64) throw new Error("no image data returned");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
  return true;
}

// Upsert an `image:` line into a post's frontmatter.
function setFrontmatterImage(file, webPath) {
  const fp = path.join(POSTS_DIR, file);
  let raw = fs.readFileSync(fp, "utf8");
  if (/^image:/m.test(raw.split("---")[1] || "")) {
    raw = raw.replace(/^image:.*$/m, `image: ${webPath}`);
  } else {
    raw = raw.replace(/^---\n/, `---\nimage: ${webPath}\n`);
  }
  fs.writeFileSync(fp, raw, "utf8");
}

/**
 * Generate (or regenerate) the illustration for one post file.
 * Returns the web path (e.g. "/images/posts/foo.png") or null on failure.
 */
export async function illustratePost(file, { force = false } = {}) {
  const fp = path.join(POSTS_DIR, file);
  const raw = fs.readFileSync(fp, "utf8");
  const meta = parseFront(raw);
  const slug = slugOf(file);
  const webPath = `/images/posts/${slug}.png`;
  const outPath = path.join(IMG_DIR, `${slug}.png`);

  if (!force && fs.existsSync(outPath)) {
    if (!meta.hasImage) setFrontmatterImage(file, webPath);
    return webPath;
  }

  try {
    const subject = await subjectFor(meta);
    const palette = PALETTE[meta.topic] || PALETTE.science;
    const prompt = STYLE(palette, subject);
    console.log(`  illustrating ${slug}: ${subject}`);
    const ok = await generateImage(prompt, outPath);
    if (!ok) return null;
    setFrontmatterImage(file, webPath);
    return webPath;
  } catch (e) {
    console.warn(`  illustration failed for ${slug}: ${e.message}`);
    return null; // post keeps the tessellation fallback
  }
}

// ---- CLI: backfill / single ----
async function main() {
  const arg = process.argv[2];
  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  let targets;
  if (arg === "--all") {
    targets = files.filter((f) => !parseFront(fs.readFileSync(path.join(POSTS_DIR, f), "utf8")).hasImage);
  } else if (arg) {
    targets = files.filter((f) => slugOf(f) === arg.replace(/\.md$/, ""));
    if (!targets.length) { console.error("No post with slug:", arg); process.exit(1); }
  } else {
    console.log("Usage: node scripts/illustrate.mjs --all | <slug>");
    process.exit(0);
  }
  console.log(`Generating ${targets.length} illustration(s) with ${IMG_MODEL}…`);
  let ok = 0;
  for (const f of targets) {
    const r = await illustratePost(f, { force: arg !== "--all" });
    if (r) ok++;
  }
  console.log(`Done. ${ok}/${targets.length} generated.`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
