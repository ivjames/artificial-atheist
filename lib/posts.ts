import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import { readingTime } from "@/lib/dates";

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
  buffered?: boolean;
  html: string; // rendered article body
  readingMins: number;
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
    // Front-matter `date` is date-only; force UTC so it never shifts a day.
    const date = new Date(`${String(data.date).slice(0, 10)}T00:00:00Z`);

    posts.push({
      slug,
      url: `/posts/${slug}/`,
      title: String(data.title),
      date,
      topic: String(data.topic || "science").toLowerCase(),
      excerpt: String(data.excerpt || ""),
      image: data.image ? String(data.image) : undefined,
      buffered: Boolean(data.buffered),
      html: md.render(content),
      readingMins: readingTime(content),
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

export function relatedPosts(post: Post, n = 3): Post[] {
  return getPostsByTopic(post.topic)
    .filter((p) => p.slug !== post.slug)
    .slice(0, n);
}

export function topicCount(topic: string): number {
  return getPostsByTopic(topic).length;
}
