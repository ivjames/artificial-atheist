import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
// Relative (not "@/lib/dates") so this module is importable by plain tsx
// scripts (scripts/sync-articles.ts) that don't resolve the "@/" alias.
import { readingTime } from "./dates";

// Article store for the publication surface. Articles remain plain markdown
// files in `src/posts/` (the scheduled generate/illustrate/buffer pipeline
// keeps writing them there), and Next reads them at build time. This replaces
// the former Eleventy `posts` collection + `post.njk` render path.

export type Post = {
  slug: string; // filename minus the `YYYY-MM-DD-` date prefix and `.md`
  url: string; // /posts/<slug>/
  title: string;
  date: Date; // parsed UTC (date-only front-matter)
  topic: string; // lowercase topic key
  excerpt: string;
  image?: string; // /images/posts/<slug>.png when illustrated
  imageAlt?: string; // description of the illustration (illustrate.mjs stamps it for new art)
  buffered?: boolean;
  html: string; // rendered article body
  text: string; // plaintext body (tags stripped) for search / word count
  readingMins: number;
  related: string[]; // explicit cross-references (slugs) from `related:` front-matter
};

const POSTS_DIR = path.join(process.cwd(), "src", "posts");

const md = new MarkdownIt({ html: true, linkify: false, typographer: false });

// Eleventy's fileSlug: strip a leading ISO date and the extension.
function toSlug(filename: string): string {
  return filename.replace(/\.md$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

let cache: Post[] | null = null;

function loadAll(): Post[] {
  if (cache) return cache;

  let files: string[] = [];
  try {
    files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));
  } catch {
    return (cache = []);
  }

  const posts: Post[] = [];
  for (const file of files) {
    // Skip the Eleventy directory-data file if it is still present.
    if (file === "posts.json") continue;
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), "utf8");
    const { data, content } = matter(raw);
    if (!data.title || !data.date) continue;

    const slug = toSlug(file);
    // Front-matter `date` is date-only. gray-matter/js-yaml parses an unquoted
    // `2026-07-25` into a Date (already UTC midnight); a quoted value stays a
    // string we parse as UTC. Handle both so the date never shifts a day.
    const date =
      data.date instanceof Date
        ? data.date
        : new Date(`${String(data.date).slice(0, 10)}T00:00:00Z`);

    // `related:` may be a YAML list or a comma-separated string of slugs.
    const related: string[] = Array.isArray(data.related)
      ? data.related.map((s: unknown) => String(s).trim()).filter(Boolean)
      : typeof data.related === "string"
        ? data.related.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const html = md.render(content);
    posts.push({
      slug,
      url: `/posts/${slug}/`,
      title: String(data.title),
      date,
      topic: String(data.topic || "science").toLowerCase(),
      excerpt: String(data.excerpt || ""),
      image: data.image ? String(data.image) : undefined,
      imageAlt: data.imageAlt ? String(data.imageAlt) : undefined,
      buffered: Boolean(data.buffered),
      html,
      text: html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(),
      readingMins: readingTime(content),
      related,
    });
  }

  posts.sort((a, b) => b.date.getTime() - a.date.getTime());
  return (cache = posts);
}

export function getAllPosts(): Post[] {
  return loadAll();
}

export function getPost(slug: string): Post | undefined {
  return loadAll().find((p) => p.slug === slug);
}

export function getPostsByTopic(topic: string): Post[] {
  const key = topic.toLowerCase();
  return loadAll().filter((p) => p.topic === key);
}

// Cross-references for an article. Explicit `related:` slugs win (in order,
// deduped, self excluded); if fewer than `n`, top up with same-topic posts.
// This is what the article page renders statically — no DB needed at build.
export function relatedPosts(post: Post, n = 3): Post[] {
  const all = loadAll();
  const bySlug = new Map(all.map((p) => [p.slug, p]));
  const picked: Post[] = [];
  const seen = new Set<string>([post.slug]);

  for (const slug of post.related) {
    const ref = bySlug.get(slug);
    if (ref && !seen.has(ref.slug)) {
      picked.push(ref);
      seen.add(ref.slug);
    }
    if (picked.length >= n) return picked;
  }

  for (const p of all) {
    if (picked.length >= n) break;
    if (p.topic === post.topic && !seen.has(p.slug)) {
      picked.push(p);
      seen.add(p.slug);
    }
  }
  return picked;
}

export function topicCount(topic: string): number {
  return getPostsByTopic(topic).length;
}
