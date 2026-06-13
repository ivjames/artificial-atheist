/**
 * comments.mjs — storage + AI moderation for article comments.
 *
 * Storage: data/comments/<slug>.json (dynamic data, git-ignored).
 * Moderation: Claude Haiku, tuned to ALLOW civil disagreement (including
 * religious views) and reject only spam / abuse / threats / slurs / gibberish.
 * Fail-safe: missing key or API error -> verdict "review" (never auto-publish).
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "data", "comments");
const MOD_MODEL = process.env.AA_MOD_MODEL || "claude-haiku-4-5-20251001";

fs.mkdirSync(DATA_DIR, { recursive: true });

const safeSlug = (s) => String(s).replace(/[^a-z0-9-]/gi, "").slice(0, 80);
const file = (slug) => path.join(DATA_DIR, safeSlug(slug) + ".json");

function read(slug) {
  const f = file(slug);
  if (!fs.existsSync(f)) return { comments: [] };
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return { comments: [] }; }
}
function write(slug, data) {
  fs.writeFileSync(file(slug), JSON.stringify(data, null, 2), "utf8");
}
const ipHash = (ip) =>
  crypto.createHash("sha256").update(String(ip) + "aa-salt").digest("hex").slice(0, 16);

// ---- AI moderation ----
export async function moderate({ author, body }) {
  if (!process.env.ANTHROPIC_API_KEY)
    return { verdict: "review", reason: "no API key — held for manual review", model: "none" };

  const system = `You moderate comments on "Artificial Atheist", a publication on atheism, skepticism, and critical thinking. The audience includes religious believers who disagree, and that disagreement is WELCOME — it is the point of the discussion.

APPROVE: on-topic comments, questions, and civil disagreement of any viewpoint, including strongly-worded religious or anti-atheist arguments, as long as they argue rather than attack.

REJECT only: spam or advertising, links to unrelated sites, slurs or hate toward a group, personal harassment or insults aimed at a person, threats or calls for violence, doxxing or personal info, sexual content, or content-free gibberish.

REVIEW: genuinely borderline cases you are unsure about.

Judge the comment, not the opinion. A rude tone alone is not grounds for rejection; targeted abuse is. Disagreeing with atheism is never grounds for rejection.`;

  const prompt = `Comment author: ${author || "anonymous"}
Comment body:
"""${body}"""

Return ONLY JSON: {"verdict":"approve|reject|review","reason":"brief","severity":"none|low|high"}`;

  try {
    const client = new Anthropic();
    const resp = await client.messages.create({
      model: MOD_MODEL,
      max_tokens: 100,
      system,
      messages: [{ role: "user", content: prompt }],
    });
    let t = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    t = t.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
    const f = t.indexOf("{"), l = t.lastIndexOf("}");
    if (f > 0 || l < t.length - 1) t = t.slice(f, l + 1);
    const v = JSON.parse(t);
    if (!["approve", "reject", "review"].includes(v.verdict)) v.verdict = "review";
    return { verdict: v.verdict, reason: v.reason || "", severity: v.severity || "none", model: MOD_MODEL };
  } catch (e) {
    return { verdict: "review", reason: "moderation error: " + e.message, model: MOD_MODEL };
  }
}

// ---- submission ----
export async function submitComment(slug, { author, body, ip }) {
  const data = read(slug);
  const mod = await moderate({ author, body });
  const status = mod.verdict === "approve" ? "approved" : mod.verdict === "reject" ? "rejected" : "pending";
  const comment = {
    id: crypto.randomBytes(8).toString("hex"),
    author: String(author || "Anonymous").slice(0, 60),
    body: String(body).slice(0, 4000),
    date: new Date().toISOString(),
    status,
    ipHash: ipHash(ip),
    moderation: mod,
  };
  data.comments.push(comment);
  write(slug, data);
  return { status, id: comment.id };
}

// ---- public read (approved only, stripped) ----
export function approvedComments(slug) {
  return read(slug).comments
    .filter((c) => c.status === "approved")
    .map((c) => ({ id: c.id, author: c.author, body: c.body, date: c.date }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}
export function approvedCount(slug) {
  return read(slug).comments.filter((c) => c.status === "approved").length;
}

// ---- admin moderation ----
export function queue() {
  const out = [];
  if (!fs.existsSync(DATA_DIR)) return out;
  for (const f of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"))) {
    const slug = f.replace(/\.json$/, "");
    for (const c of read(slug).comments)
      if (c.status === "pending")
        out.push({ slug, id: c.id, author: c.author, body: c.body, date: c.date, moderation: c.moderation });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
export function decide(slug, id, verdict) {
  const data = read(slug);
  const c = data.comments.find((x) => x.id === id);
  if (!c) return { error: "not found" };
  c.status = verdict === "approve" ? "approved" : "rejected";
  c.moderation = { ...(c.moderation || {}), manualVerdict: verdict, manualAt: new Date().toISOString() };
  write(slug, data);
  return { ok: true, status: c.status };
}
export function stats() {
  let approved = 0, pending = 0, rejected = 0;
  if (!fs.existsSync(DATA_DIR)) return { approved, pending, rejected };
  for (const f of fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json")))
    for (const c of read(f.replace(/\.json$/, "")).comments)
      c.status === "approved" ? approved++ : c.status === "pending" ? pending++ : rejected++;
  return { approved, pending, rejected };
}
