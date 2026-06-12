#!/usr/bin/env node
/**
 * Artificial Atheist Studio — a local, human-in-the-loop article tool.
 *
 * Seed an idea -> generate a draft with the AI -> review and edit ->
 * publish (writes the Markdown, commits, and optionally pushes, which
 * triggers the existing webhook deploy).
 *
 * Runs only on your machine. Your API key and git credentials stay local;
 * nothing is exposed to the network (binds 127.0.0.1).
 *
 * Run:  npm run studio        then open http://127.0.0.1:4477
 *
 * Env: ANTHROPIC_API_KEY (and optional AA_PROVIDER / AA_MODEL, see providers.mjs)
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { generate as llm, providerInfo } from "../../scripts/providers.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd(); // npm runs scripts from the repo root
const POSTS_DIR = path.join(ROOT, "src", "posts");
const PORT = process.env.STUDIO_PORT ? Number(process.env.STUDIO_PORT) : 4477;
const TOPICS = ["science", "philosophy", "secularism", "religion", "news"];

// ---------- helpers ----------
const slugify = (s) =>
  String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

function readExisting() {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs.readdirSync(POSTS_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, f), "utf8");
      const fm = (raw.match(/^---\n([\s\S]*?)\n---/) || [])[1] || "";
      return {
        file: f,
        title: (fm.match(/title:\s*"?(.*?)"?\s*$/m) || [])[1]?.trim() || "",
        topic: (fm.match(/topic:\s*(.*?)\s*$/m) || [])[1]?.trim().toLowerCase() || "",
      };
    });
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

// Inspect repo state without changing anything.
async function gitStatus() {
  const out = { isRepo: false, branch: "", dirty: false, ahead: 0, behind: 0, hasRemote: false, error: "" };
  try {
    await git(["rev-parse", "--is-inside-work-tree"]);
    out.isRepo = true;
    out.branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
    const porcelain = await git(["status", "--porcelain"]);
    // dirty = uncommitted changes to tracked files other than new posts
    out.dirty = porcelain.split("\n").filter(Boolean).length > 0;
    out.dirtyFiles = porcelain.split("\n").filter(Boolean);
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


function body(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); }
    });
  });
}

function send(res, code, obj) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

// ---------- generation ----------
async function generateArticle({ seed, topic }) {
  const existing = readExisting();
  const titles = existing.map((p) => p.title);
  const topicLine =
    topic && topic !== "auto"
      ? `Topic: ${topic}.`
      : `Choose the single best-fitting topic from: science, philosophy, secularism, religion.`;

  const system = `You write for "Artificial Atheist", a publication on atheism, skepticism, and critical thinking. Voice: clear, rigorous, fair-minded, never sneering. Present the strongest version of positions and note real counterarguments. Sentence case in prose. No purple prose, no filler, no hedging cliches.`;

  const prompt = `Write a complete article based on this idea/seed from the editor:

"""${seed}"""

${topicLine}

Avoid overlapping in subject with these existing articles:
${titles.map((t) => "- " + t).join("\n")}

Return ONLY valid JSON, no markdown fences, with exactly these keys:
{
  "title": "Title Case, under 70 characters, no clickbait",
  "topic": "one of: science | philosophy | secularism | religion | news",
  "excerpt": "One sentence, under 160 characters, plain and informative",
  "body_markdown": "650-900 words. Open with a 1-2 sentence intro paragraph (no heading). Then 3-4 sections each introduced by a '## sentence case heading'. Prose, occasional bold for key terms. No H1. No 'in conclusion' cliche."
}`;

  const raw = await llm({ system, prompt });
  const data = parseJSON(raw);
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

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/") {
      const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(html);
    }

    if (req.method === "GET" && url.pathname === "/api/context") {
      const existing = readExisting();
      const counts = Object.fromEntries(TOPICS.map((t) => [t, 0]));
      for (const p of existing) if (counts[p.topic] !== undefined) counts[p.topic]++;
      return send(res, 200, {
        topics: TOPICS,
        counts,
        titles: existing.map((p) => p.title),
        provider: providerInfo(),
        hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
      });
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const { seed, topic } = await body(req);
      if (!seed || !seed.trim()) return send(res, 400, { error: "Provide a seed idea." });
      if (!process.env.ANTHROPIC_API_KEY)
        return send(res, 400, { error: "ANTHROPIC_API_KEY is not set in this shell." });
      const data = await generateArticle({ seed: seed.trim(), topic });
      return send(res, 200, data);
    }

    if (req.method === "GET" && url.pathname === "/api/gitstatus") {
      return send(res, 200, await gitStatus());
    }

    if (req.method === "POST" && url.pathname === "/api/publish") {
      const d = await body(req);
      const title = (d.title || "").trim();
      const topic = (d.topic || "").toLowerCase();
      if (!title) return send(res, 400, { error: "Title required." });
      if (!TOPICS.includes(topic)) return send(res, 400, { error: "Invalid topic." });
      const date = (d.date || new Date().toISOString().slice(0, 10)).trim();
      const slug = slugify(d.slug || title);
      const filename = `${date}-${slug}.md`;
      const filepath = path.join(POSTS_DIR, filename);
      const overwrite = Boolean(d.overwrite);
      if (fs.existsSync(filepath) && !overwrite)
        return send(res, 409, { error: `File ${filename} already exists.`, filename });

      const log = [];

      // --- Pre-flight git safety (only when we intend to commit) ---
      if (d.commit) {
        const st = await gitStatus();
        if (!st.isRepo)
          return send(res, 500, { error: "Not a git repository — can't commit. Save file only instead.", filename });
        // Refuse to commit on top of a dirty tree we didn't create, unless forced.
        const strayChanges = (st.dirtyFiles || []).filter(
          (l) => !l.includes(`src/posts/${filename}`)
        );
        if (strayChanges.length && !d.allowDirty)
          return send(res, 409, {
            error:
              "Working tree has uncommitted changes unrelated to this article:\n" +
              strayChanges.join("\n") +
              "\n\nCommit or stash them first, or re-publish with 'allow dirty tree' to proceed anyway.",
            needsDirtyOverride: true,
            filename,
          });
        // If behind the remote, pull (rebase) before writing so we don't diverge.
        if (st.hasRemote && st.behind > 0) {
          try {
            await git(["pull", "--rebase", "--autostash"]);
            log.push(`Pulled ${st.behind} new commit(s) from remote before publishing.`);
          } catch (e) {
            return send(res, 500, {
              error:
                "Your clone is " + st.behind + " commit(s) behind and an automatic pull --rebase failed:\n" +
                e.message +
                "\n\nResolve it manually (git pull --rebase), then publish again. Nothing was committed.",
              filename,
            });
          }
        }
      }

      // Write the file (after any pull, so we don't clobber pulled changes)
      fs.writeFileSync(filepath, buildMarkdown({ ...d, title, topic, date }), "utf8");
      log.push(`Wrote src/posts/${filename}`);

      if (d.commit) {
        try {
          await git(["add", "--", `src/posts/${filename}`]); // only this file, never -A
          await git(["commit", "-m", `Add article: ${title}`]);
          log.push("Committed.");
        } catch (e) {
          return send(res, 500, { error: "Commit failed: " + e.message, log, filename });
        }
        if (d.push) {
          try {
            const out = await git(["push"]);
            log.push("Pushed. " + (out || "").split("\n").slice(-1)[0]);
          } catch (e) {
            return send(res, 500, {
              error:
                "Committed locally, but PUSH failed:\n" + e.message +
                "\n\nThe commit is safe in your local repo. Fix the issue (often: git pull --rebase, then git push) to deploy it.",
              log,
              committedNotPushed: true,
              filename,
            });
          }
        }
      }
      return send(res, 200, { ok: true, filename, log });
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  const { provider, model } = providerInfo();
  console.log(`\n  Artificial Atheist Studio`);
  console.log(`  → http://127.0.0.1:${PORT}`);
  console.log(`  provider: ${provider} (${model})`);
  if (!process.env.ANTHROPIC_API_KEY)
    console.log(`  ⚠ ANTHROPIC_API_KEY not set — generation will fail until you export it.\n`);
  else console.log("");
});
