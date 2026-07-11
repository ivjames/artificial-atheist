#!/usr/bin/env node
/**
 * buffer.mjs — push new articles to Facebook (and any other connected
 * channel) via Buffer.
 *
 * Discussion for Artificial Atheist lives on Facebook, not on-site comments.
 * Rather than hand-posting every article, the generator hands each freshly
 * written post to Buffer, which queues it to the connected Facebook page.
 * The article URL is sent as a Facebook linkAttachment; Facebook scrapes the
 * per-post OpenGraph tags (base.njk emits og:title / og:description / og:image),
 * so the share renders a rich preview card with the illustration — no re-upload.
 *
 * Uses Buffer's GraphQL API (https://api.buffer.com) with a Bearer API key.
 * (The old classic REST API at api.bufferapp.com rejects modern public tokens
 * with "Public API tokens are not accepted for REST API access".) Env:
 *   BUFFER_ACCESS_TOKEN  (required to actually post; unset ⇒ skip, no error)
 *   BUFFER_PROFILE_IDS   (comma-separated Buffer channel ids; unset ⇒ try to
 *                         auto-detect Facebook channels — but keys that lack the
 *                         channels-read scope must set this explicitly)
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
const API = "https://api.buffer.com"; // Buffer GraphQL endpoint

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

/** Run a GraphQL operation against the Buffer API. */
async function graphql(query, variables) {
  const token = process.env.BUFFER_ACCESS_TOKEN;
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.errors) {
    throw new Error(`Buffer GraphQL ${res.status}: ${JSON.stringify(body.errors || body)}`);
  }
  return body.data;
}

const CHANNELS_QUERY = `
  query Channels {
    account {
      organizations {
        channels {
          id
          service
        }
      }
    }
  }`;

const CREATE_POST = `
  mutation CreatePost($input: CreatePostInput!) {
    createPost(input: $input) {
      __typename
      ... on PostActionSuccess { post { id } }
      ... on MutationError { message }
    }
  }`;

/** Resolve the Buffer channel ids to post to. */
async function resolveChannelIds() {
  const configured = (process.env.BUFFER_PROFILE_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  // Default: every connected Facebook channel across all organizations. Some
  // API keys are scoped so they can publish but not enumerate channels (the
  // channels query returns FORBIDDEN); in that case set BUFFER_PROFILE_IDS to
  // the channel id(s) explicitly.
  let data;
  try {
    data = await graphql(CHANNELS_QUERY, {});
  } catch (e) {
    throw new Error(
      `Could not list Buffer channels (${e.message}). Set BUFFER_PROFILE_IDS to your channel id(s) to skip auto-detection.`
    );
  }
  const channels = (data?.account?.organizations || []).flatMap((o) => o.channels || []);
  return channels
    .filter((c) => String(c.service || "").toLowerCase().includes("facebook"))
    .map((c) => c.id);
}

/**
 * Queue (or immediately publish) a link share for one article.
 * Returns an array of created post ids, or null when skipped (no token).
 */
export async function postToBuffer(meta, { now } = {}) {
  if (!process.env.BUFFER_ACCESS_TOKEN) {
    console.warn("BUFFER_ACCESS_TOKEN unset — skipping Buffer push.");
    return null;
  }
  const channelIds = await resolveChannelIds();
  if (!channelIds.length) {
    console.warn("No Buffer Facebook channels found — skipping Buffer push.");
    return null;
  }

  const publishNow = now ?? process.env.BUFFER_NOW === "1";
  const caption = meta.excerpt ? `${meta.title}\n\n${meta.excerpt}` : meta.title;
  const mode = publishNow ? "shareNow" : "addToQueue";
  // Facebook requires a post type. The article URL goes in linkAttachment so
  // Facebook renders a link card scraped from the per-post OG tags (title,
  // excerpt, illustration) — no image re-upload.
  const metadata = { facebook: { type: "post", linkAttachment: { url: meta.url } } };

  const postIds = [];
  for (const channelId of channelIds) {
    const data = await graphql(CREATE_POST, {
      input: { text: caption, channelId, schedulingType: "automatic", mode, metadata },
    });
    const result = data.createPost;
    if (result.__typename !== "PostActionSuccess") {
      throw new Error(`Buffer createPost error (channel ${channelId}): ${result.message}`);
    }
    postIds.push(result.post?.id);
  }

  console.log(
    `Buffer: ${publishNow ? "published" : "queued"} "${meta.title}" to ${postIds.length} channel(s).`
  );
  return postIds;
}

/**
 * Resolve a post argument to an on-disk path. Accepts:
 *   - an absolute path,
 *   - a path relative to the current directory (e.g. the repo-root-relative
 *     "src/posts/2026-...md" the CLI / Share-to-Buffer action passes),
 *   - a bare filename (e.g. the "2026-...md" generate.mjs passes), resolved
 *     against src/posts.
 */
function resolvePostPath(filename) {
  if (path.isAbsolute(filename)) return filename;
  if (fs.existsSync(filename)) return path.resolve(filename);
  return path.join(POSTS_DIR, filename);
}

/** Convenience wrapper used by generate.mjs: post straight from a filename. */
export async function bufferPostFromFile(filename, opts = {}) {
  const filepath = resolvePostPath(filename);
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
