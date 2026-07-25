import { prisma } from "@/lib/prisma";
import type { Article } from "@prisma/client";

// DB-backed access to the article corpus (the read model synced from markdown by
// scripts/sync-articles.ts). This is what dynamic surfaces use to reference
// articles: the quiz result page, the debate chat agent, and /api/articles.
// The static publication pages still render straight from markdown (lib/posts).

export type ArticleCard = {
  slug: string;
  title: string;
  topic: string;
  excerpt: string;
  url: string;
  image: string | null;
  readingMins: number;
  publishedAt: Date;
};

function toCard(a: Article): ArticleCard {
  return {
    slug: a.slug,
    title: a.title,
    topic: a.topic,
    excerpt: a.excerpt,
    url: a.url,
    image: a.image,
    readingMins: a.readingMins,
    publishedAt: a.publishedAt,
  };
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return prisma.article.findUnique({ where: { slug } });
}

export async function listArticles(opts?: {
  topic?: string;
  limit?: number;
}): Promise<ArticleCard[]> {
  const rows = await prisma.article.findMany({
    where: opts?.topic ? { topic: opts.topic.toLowerCase() } : undefined,
    orderBy: { publishedAt: "desc" },
    take: opts?.limit ?? 50,
  });
  return rows.map(toCard);
}

// The explicit cross-references authored in a post's `related:` front-matter.
export async function getReferences(slug: string): Promise<ArticleCard[]> {
  const row = await prisma.article.findUnique({
    where: { slug },
    include: { references: { orderBy: { publishedAt: "desc" } } },
  });
  return (row?.references ?? []).map(toCard);
}

// Keyword search over the corpus. Title matches rank above body matches; each
// term must appear somewhere (title/excerpt/body). Cheap and good enough for
// citing a handful of articles in chat or surfacing "keep reading" links.
export async function searchArticles(
  query: string,
  limit = 5,
): Promise<ArticleCard[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/).slice(0, 8);

  const rows = await prisma.article.findMany({
    where: {
      AND: terms.map((t) => ({
        OR: [
          { title: { contains: t, mode: "insensitive" as const } },
          { excerpt: { contains: t, mode: "insensitive" as const } },
          { bodyText: { contains: t, mode: "insensitive" as const } },
        ],
      })),
    },
    take: 40,
  });

  const ql = q.toLowerCase();
  const scored = rows.map((a) => {
    const title = a.title.toLowerCase();
    let score = 0;
    if (title.includes(ql)) score += 10;
    for (const t of terms) {
      const tl = t.toLowerCase();
      if (title.includes(tl)) score += 3;
      if (a.excerpt.toLowerCase().includes(tl)) score += 1;
    }
    return { a, score };
  });
  scored.sort(
    (x, y) => y.score - x.score || y.a.publishedAt.getTime() - x.a.publishedAt.getTime(),
  );
  return scored.slice(0, limit).map((s) => toCard(s.a));
}

// Articles for a set of loosely-typed labels (e.g. quiz categories). Matches
// labels against the topic taxonomy first, then keyword-searches the rest, and
// tops up with the latest posts so it always returns something.
export async function relatedForLabels(
  labels: string[],
  limit = 3,
): Promise<ArticleCard[]> {
  const norm = labels.map((l) => l.toLowerCase().trim()).filter(Boolean);
  const picked = new Map<string, ArticleCard>();

  const TOPICS = ["science", "philosophy", "secularism", "religion", "news"];
  const topicHits = norm.filter((l) => TOPICS.includes(l));
  if (topicHits.length) {
    const rows = await prisma.article.findMany({
      where: { topic: { in: topicHits } },
      orderBy: { publishedAt: "desc" },
      take: limit * 2,
    });
    for (const a of rows) picked.set(a.slug, toCard(a));
  }

  for (const label of norm) {
    if (picked.size >= limit) break;
    for (const a of await searchArticles(label, limit)) {
      if (!picked.has(a.slug)) picked.set(a.slug, a);
    }
  }

  if (picked.size < limit) {
    for (const a of await listArticles({ limit })) {
      if (!picked.has(a.slug)) picked.set(a.slug, a);
      if (picked.size >= limit) break;
    }
  }

  return [...picked.values()].slice(0, limit);
}
