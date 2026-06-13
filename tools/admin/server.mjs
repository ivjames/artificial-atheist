#!/usr/bin/env node
/**
 * Artificial Atheist — Admin dashboard server.
 *
 * Runs on the droplet, bound to 127.0.0.1, proxied by nginx at /admin/ behind
 * HTTP basic auth. Panels: Dashboard (status), Studio (seed -> generate ->
 * edit -> publish), Articles (list / edit / delete). Publishing commits and
 * pushes, which triggers the existing webhook deploy.
 *
 * Env (via systemd EnvironmentFile):
 *   ANTHROPIC_API_KEY   required for generation
 *   STUDIO_PORT         optional, default 4477
 *   AA_PROVIDER/AA_MODEL optional (see scripts/providers.mjs)
 *
 * All fetch paths in the UI are relative, so the app works under the /admin/
 * prefix (nginx strips it) or at root (local testing).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate as llm, providerInfo } from "../../scripts/providers.mjs";
import * as comments from "./comments.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();
const POSTS_DIR = path.join(ROOT, "src", "posts");
const PORT = process.env.STUDIO_PORT ? Number(process.env.STUDIO_PORT) : 4477;
const TOPICS = ["science", "philosophy", "secularism", "religion", "news"];

const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function parseFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { title: "", topic: "", date: "", excerpt: "", body_markdown: raw };
  const fm = m[1];
  const get = (k) => (fm.match(new RegExp("^" + k + ":\\s*\"?(.*?)\"?\\s*$", "m")) || [])[1] || "";
  return {
    title: get("title").trim(),
    topic: get("topic").trim().toLowerCase(),
    date: get("date").trim(),
    excerpt: get("excerpt").trim(),
    image: get("image").trim(),
    body_markdown: m[2].trim(),
  };
}

function readExisting() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const p = parseFront(fs.readFileSync(path.join(POSTS_DIR, f), "utf8"));
      return { file: f, ...p };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

function parseJSON(text) {
  let t = String(text).trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const f = t.indexOf("{"), l = t.lastIndexOf("}");
  if (f > 0 || l < t.length - 1) t = t.slice(f, l + 1);
  return JSON.parse(t);
}

function git(args) {
  return new Promise((resolve, reject) => {
    execFile("git", args, { cwd: ROOT }, (err, stdout, stderr) => {
      if (err) reject(new Error((stderr || stdout || err.message).trim()));
      else resolve((stdout + stderr).trim());
    });
  });
}

async function gitStatus() {
  const out = { isRepo: false, branch: "", dirty: false, dirtyFiles: [], ahead: 0, behind: 0, hasRemote: false, lastCommits: [], error: "" };
  try {
    await git(["rev-parse", "--is-inside-work-tree"]);
    out.isRepo = true;
    out.branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
    const porcelain = await git(["status", "--porcelain"]);
    out.dirtyFiles = porcelain.split("\n").filter(Boolean);
    out.dirty = out.dirtyFiles.length > 0;
    try {
      const log = await git(["log", "-5", "--pretty=%h\u001f%s\u001f%cr"]);
      out.lastCommits = log.split("\n").filter(Boolean).map((l) => {
        const [hash, subject, when] = l.split("\u001f");
        return { hash, subject, when };
      });
    } catch {}
    try {
      await git(["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"]);
      out.hasRemote = true;
      await git(["fetch", "--quiet"]);
      const counts = await git(["rev-list", "--left-right", "--count", "HEAD...@{u}"]);
      const [ahead, behind] = counts.split(/\s+/).map(Number);
      out.ahead = ahead || 0;
      out.behind = behind || 0;
    } catch { out.hasRemote = false; }
  } catch (e) { out.error = e.message; }
  return out;
}

async function generateArticle({ seed, topic }) {
  const titles = readExisting().map((p) => p.title);
  const topicLine =
    topic && topic !== "auto"
      ? `Topic: ${topic}.`
      : `Choose the single best-fitting topic from: science, philosophy, secularism, religion.`;
  const system = `You write for "Artificial Atheist", a publication on atheism, skepticism, and critical thinking. Voice: clear, rigorous, fair-minded, never sneering. Present the strongest version of positions and note real counterarguments. Sentence case in prose. No purple prose, no filler.`;
  const prompt = `Write a complete article based on this seed from the editor:

"""${seed}"""

${topicLine}

Avoid overlapping with these existing articles:
${titles.map((t) => "- " + t).join("\n")}

Return ONLY valid JSON, no fences, keys: title, topic (science|philosophy|secularism|religion|news), excerpt (<160 chars), body_markdown (650-900 words; intro paragraph then 3-4 '## sentence case' sections; no H1).`;
  const data = parseJSON(await llm({ system, prompt }));
  if (topic && topic !== "auto") data.topic = topic;
  if (!TOPICS.includes(String(data.topic).toLowerCase())) data.topic = "philosophy";
  return data;
}

function buildMarkdown({ title, date, topic, excerpt, body_markdown }) {
  return [
    "---",
    `title: "${String(title).replace(/"/g, "'")}"`,
    `date: ${date}`,
    `topic: ${String(topic).toLowerCase()}`,
    `excerpt: "${String(excerpt).replace(/"/g, "'")}"`,
    "---",
    "",
    String(body_markdown).trim(),
    "",
  ].join("\n");
}

const body = (req) => new Promise((resolve) => {
  let b = ""; req.on("data", (c) => (b += c));
  req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
});
const send = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

// Shared git-safe commit of a single path (or removal). Pulls if behind.
async function safeGitCommit({ files, message, push, allowDirty, removing }) {
  const st = await gitStatus();
  if (!st.isRepo) throw Object.assign(new Error("Not a git repository."), { http: 500 });
  const stray = (st.dirtyFiles || []).filter((l) => !files.some((f) => l.includes(f)));
  if (stray.length && !allowDirty)
    throw Object.assign(new Error("Unrelated uncommitted changes:\n" + stray.join("\n") + "\n\nResolve them or retry with allow-dirty."), { http: 409, needsDirtyOverride: true });
  const log = [];
  if (st.hasRemote && st.behind > 0) {
    await git(["pull", "--rebase", "--autostash"]);
    log.push(`Pulled ${st.behind} commit(s) before publishing.`);
  }
  for (const f of files) await git([removing ? "rm" : "add", "--", f]);
  await git(["commit", "-m", message]);
  log.push("Committed.");
  if (push) {
    const out = await git(["push"]);
    log.push("Pushed. " + (out || "").split("\n").slice(-1)[0]);
  }
  return log;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = url.pathname;

    if (req.method === "GET" && (p === "/" || p === "/index.html")) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(fs.readFileSync(path.join(__dirname, "index.html"), "utf8"));
    }

    if (req.method === "GET" && p === "/api/context") {
      const ex = readExisting();
      const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
      for (const a of ex) if (counts[a.topic] !== undefined) counts[a.topic]++;
      return send(res, 200, { topics: TOPICS, counts, total: ex.length, titles: ex.map((a) => a.title), provider: providerInfo(), hasKey: Boolean(process.env.ANTHROPIC_API_KEY) });
    }

    if (req.method === "GET" && p === "/api/gitstatus") return send(res, 200, await gitStatus());

    // ---------- PUBLIC comment routes (exposed without auth via nginx, rate-limited) ----------
    if (req.method === "GET" && p === "/api/comments/get") {
      const slug = url.searchParams.get("slug") || "";
      res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "public, max-age=30" });
      return res.end(JSON.stringify({ comments: comments.approvedComments(slug) }));
    }

    if (req.method === "POST" && p === "/api/comments/submit") {
      const d = await body(req);
      const slug = (d.slug || "").trim();
      const author = (d.author || "").trim();
      const text = (d.body || "").trim();
      // cheap pre-AI gates
      if (d.website) return send(res, 200, { status: "ok" }); // honeypot filled -> pretend success, drop
      const elapsed = Number(d.elapsed || 0);
      if (elapsed > 0 && elapsed < 3000) return send(res, 200, { status: "ok" }); // submitted too fast
      if (!slug || !text) return send(res, 400, { error: "Missing comment." });
      if (text.length < 2 || text.length > 4000) return send(res, 400, { error: "Comment length out of range." });
      if ((text.match(/https?:\/\//g) || []).length > 3) return send(res, 200, { status: "ok" }); // link spam -> drop
      const ip = req.headers["x-real-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "";
      const r = await comments.submitComment(slug, { author, body: text, email: (d.email || "").trim(), ip });
      // Don't reveal reject reasons to submitters (avoid tipping spammers).
      const msg = r.status === "approved" ? "posted" : "submitted — pending review";
      return send(res, 200, { status: "ok", result: r.status === "approved" ? "posted" : "pending", message: msg });
    }

    // ---------- ADMIN moderation routes (behind /admin/ basic auth) ----------
    if (req.method === "GET" && p === "/api/mod/queue")
      return send(res, 200, { queue: comments.queue(), stats: comments.stats() });

    if (req.method === "POST" && p === "/api/mod/decide") {
      const d = await body(req);
      return send(res, 200, comments.decide(d.slug, d.id, d.verdict));
    }

    if (req.method === "GET" && p === "/api/articles")
      return send(res, 200, { articles: readExisting().map(({ file, title, topic, date, excerpt }) => ({ file, title, topic, date, excerpt })) });

    if (req.method === "GET" && p === "/api/article") {
      const file = path.basename(url.searchParams.get("file") || "");
      const fp = path.join(POSTS_DIR, file);
      if (!file.endsWith(".md") || !fs.existsSync(fp)) return send(res, 404, { error: "Not found." });
      return send(res, 200, { file, ...parseFront(fs.readFileSync(fp, "utf8")) });
    }

    if (req.method === "POST" && p === "/api/illustrate") {
      const d = await body(req);
      const file = path.basename(d.file || "");
      if (!file.endsWith(".md") || !fs.existsSync(path.join(POSTS_DIR, file)))
        return send(res, 404, { error: "Save the article first, then illustrate." });
      if (!process.env.OPENAI_API_KEY)
        return send(res, 400, { error: "OPENAI_API_KEY is not set on the server." });
      try {
        const { illustratePost } = await import("../../scripts/illustrate.mjs");
        const img = await illustratePost(file, { force: Boolean(d.force) });
        if (!img) return send(res, 500, { error: "Illustration failed (see server logs)." });
        return send(res, 200, { ok: true, image: img });
      } catch (e) {
        return send(res, 500, { error: e.message });
      }
    }

    if (req.method === "POST" && p === "/api/generate") {
      const { seed, topic } = await body(req);
      if (!seed || !seed.trim()) return send(res, 400, { error: "Provide a seed idea." });
      if (!process.env.ANTHROPIC_API_KEY) return send(res, 400, { error: "ANTHROPIC_API_KEY is not set." });
      return send(res, 200, await generateArticle({ seed: seed.trim(), topic }));
    }

    if (req.method === "POST" && p === "/api/publish") {
      const d = await body(req);
      const title = (d.title || "").trim();
      const topic = (d.topic || "").toLowerCase();
      if (!title) return send(res, 400, { error: "Title required." });
      if (!TOPICS.includes(topic)) return send(res, 400, { error: "Invalid topic." });
      const date = (d.date || new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" })).trim();
      const slug = slugify(d.slug || title);
      const filename = `${date}-${slug}.md`;
      const filepath = path.join(POSTS_DIR, filename);
      const originalFile = d.originalFile ? path.basename(d.originalFile) : "";
      const renamed = originalFile && originalFile !== filename;
      if (fs.existsSync(filepath) && !d.overwrite && !renamed)
        return send(res, 409, { error: `File ${filename} already exists.`, filename });

      fs.writeFileSync(filepath, buildMarkdown({ ...d, title, topic, date }), "utf8");
      const log = [`Wrote src/posts/${filename}`];
      const files = [`src/posts/${filename}`];
      if (renamed && fs.existsSync(path.join(POSTS_DIR, originalFile))) {
        fs.rmSync(path.join(POSTS_DIR, originalFile));
        files.push(`src/posts/${originalFile}`);
        log.push(`Removed old src/posts/${originalFile}`);
      }
      if (!d.commit) return send(res, 200, { ok: true, filename, log });
      try {
        const glog = await safeGitCommit({ files, message: `${renamed ? "Update" : "Add"} article: ${title}`, push: d.push, allowDirty: d.allowDirty });
        return send(res, 200, { ok: true, filename, log: log.concat(glog) });
      } catch (e) {
        return send(res, e.http || 500, { error: (e.committedNotPushed ? "Committed locally, push failed:\n" : "") + e.message, log, filename, needsDirtyOverride: e.needsDirtyOverride });
      }
    }

    if (req.method === "POST" && p === "/api/delete") {
      const d = await body(req);
      const file = path.basename(d.file || "");
      const fp = path.join(POSTS_DIR, file);
      if (!file.endsWith(".md") || !fs.existsSync(fp)) return send(res, 404, { error: "Not found." });
      try {
        const glog = await safeGitCommit({ files: [`src/posts/${file}`], message: `Remove article: ${file}`, push: d.push !== false, allowDirty: d.allowDirty, removing: true });
        return send(res, 200, { ok: true, log: [`Deleted ${file}`].concat(glog) });
      } catch (e) {
        // if git rm failed, fall back to plain unlink so the file still goes
        try { if (fs.existsSync(fp)) fs.rmSync(fp); } catch {}
        return send(res, e.http || 500, { error: e.message, needsDirtyOverride: e.needsDirtyOverride });
      }
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const { provider, model } = providerInfo();
  console.log(`\n  Artificial Atheist Admin → http://127.0.0.1:${PORT}`);
  console.log(`  provider: ${provider} (${model})`);
  if (!process.env.ANTHROPIC_API_KEY) console.log(`  ⚠ ANTHROPIC_API_KEY not set — generation disabled.\n`);
  else console.log("");
});
