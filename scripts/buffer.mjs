#!/usr/bin/env node
/**
 * buffer.mjs — push new articles to Facebook (and any other connected
 * profile) via Buffer.
 *
 * Discussion for Artificial Atheist lives on Facebook, not on-site comments.
 * Rather than hand-posting every article, the generator hands each freshly
 * written post to Buffer, which queues it to the connected Facebook page.
 * Facebook scrapes the article URL's OpenGraph tags (base.njk emits per-post
 * og:title / og:description / og:image), so a plain link share renders a rich
 * preview card with the illustration — no need to re-upload the image.
 *
 * Uses Buffer's classic REST API (api.bufferapp.com/1) with a legacy access
 * token. Env:
 *   BUFFER_ACCESS_TOKEN  (required to actually post; unset ⇒ skip, no error)
 *   BUFFER_PROFILE_IDS   (optional, comma-separated Buffer profile ids;
 *                         unset ⇒ auto-target every connected Facebook profile)
 *   BUFFER_NOW           (optional, "1" ⇒ publish immediately instead of
 *                         adding to the Buffer queue; default is queue)
 *
 * As a module:  import { bufferPostFromFile } from "./buffer.mjs"
 * As a CLI:     node scripts/buffer.mjs src/posts/2026-07-09-....md
 *               node scripts/buffer.mjs --now src/posts/2026-07-09-....md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import site from "../src/_data/site.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "src", "posts");
const API = "https://api.bufferapp.com/1";

/** Strip eleventy's leading date prefix + extension to recover the URL slug. */
function slugFromFilename(filename) {
  return path.basename(filename).replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

/** Pull the frontmatter fields we need out of a post's markdown. */
function readPostMeta(filepath) {
  const raw = fs.readFileSync(filepath, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const fm = m ? m[1] : "";
  const field = (name) => {
    const hit = fm.match(new RegExp(`^${name}:\\s*"?(.*?)"?\\s*$`, "m"));
    return hit ? hit[1].trim() : "";
  };
  const slug = slugFromFilename(filepath);
  const image = field("image");
  return {
    title: field("title").replace(/'/g, "'"),
    excerpt: field("excerpt"),
    topic: field("topic"),
    url: `${site.url}/posts/${slug}/`,
    image: image ? `${site.url}${image}` : "",
  };
}

async function bufferGET(pathname) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const res = await fetch(`${API}${pathname}?access_token=${encodeURIComponent(token)}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Buffer GET ${pathname} → ${res.status}: ${JSON.stringify(body)}`);
  return body;
}

async function bufferPOST(pathname, params) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const form = new URLSearchParams();
  form.set("access_token", token);
  for (const [k, v] of params) form.append(k, v);
  const res = await fetch(`${API}${pathname}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(`Buffer POST ${pathname} → ${res.status}: ${JSON.stringify(body)}`);
  }
  return body;
}

/** Resolve the Buffer profile ids to post to. */
async function resolveProfileIds() {
  const configured = (process.env.BUFFER_PROFILE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  // Default: every connected Facebook profile (page or profile).
  const profiles = await bufferGET("/profiles.json");
  return profiles
    .filter((p) => String(p.service || "").toLowerCase().includes("facebook"))
    .map((p) => p.id);
}

/**
 * Queue (or immediately publish) a link share for one article.
 * Returns the Buffer API response, or null when skipped (no token).
 */
export async function postToBuffer(meta, { now } = {}) {
  if (!process.env.BUFFER_ACCESS_TOKEN) {
    console.warn("BUFFER_ACCESS_TOKEN unset — skipping Buffer push.");
    return null;
  }
  const profileIds = await resolveProfileIds();
  if (!profileIds.length) {
    console.warn("No Buffer Facebook profiles found — skipping Buffer push.");
    return null;
  }

  const publishNow = now ?? process.env.BUFFER_NOW === "1";
  const caption = meta.excerpt ? `${meta.title}\n\n${meta.excerpt}` : meta.title;

  const params = [];
  for (const id of profileIds) params.push(["profile_ids[]", id]);
  params.push(["text", caption]);
  params.push(["media[link]", meta.url]);
  params.push(["media[title]", meta.title]);
  if (meta.excerpt) params.push(["media[description]", meta.excerpt]);
  if (meta.image) {
    params.push(["media[picture]", meta.image]);
    params.push(["media[thumbnail]", meta.image]);
  }
  if (publishNow) params.push(["now", "true"]);

  const body = await bufferPOST("/updates/create.json", params);
  const n = (body.updates || []).length || profileIds.length;
  console.log(
    `Buffer: ${publishNow ? "published" : "queued"} "${meta.title}" to ${n} profile(s).`
  );
  return body;
}

/** Convenience wrapper used by generate.mjs: post straight from a filename. */
export async function bufferPostFromFile(filename, opts = {}) {
  const filepath = path.isAbsolute(filename) ? filename : path.join(POSTS_DIR, filename);
  const meta = readPostMeta(filepath);
  return postToBuffer(meta, opts);
}

// --- CLI ---------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const now = args.includes("--now");
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Usage: node scripts/buffer.mjs [--now] <path-to-post.md>");
    process.exit(1);
  }
  bufferPostFromFile(target, { now })
    .then((r) => process.exit(r === null ? 0 : 0))
    .catch((e) => {
      console.error(e.message || e);
      process.exit(1);
    });
}
