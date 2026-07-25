// Sync the markdown corpus (src/posts) into the Article read-model table.
//
// Markdown stays the source of truth: authoring, the generate/illustrate/buffer
// pipeline, and static rendering are all unchanged. This mirrors the published
// posts into Postgres so dynamic surfaces (quiz, chat, /api/articles) can query
// and cross-reference the corpus. Idempotent: run it on every deploy (deploy.sh
// calls `npm run articles:sync`) and by hand any time.
//
//   npm run articles:sync        (needs DATABASE_URL; reads src/posts)
//
// It upserts every post, prunes Article rows whose markdown no longer exists,
// and resolves each post's `related:` front-matter into the article↔article
// self-relation (dangling slugs are skipped, not fatal).

import { PrismaClient } from "@prisma/client";
import { getAllPosts } from "../lib/posts";

const prisma = new PrismaClient();

async function main() {
  const posts = getAllPosts();
  const slugs = posts.map((p) => p.slug);
  console.log(`Syncing ${posts.length} article(s) → Article table…`);

  // 1) Upsert scalar fields for every post (relations wired in pass 2, once all
  //    rows exist so references can point at freshly-added articles).
  for (const p of posts) {
    const data = {
      title: p.title,
      topic: p.topic,
      excerpt: p.excerpt,
      image: p.image ?? null,
      url: p.url,
      bodyText: p.text,
      wordCount: p.text.split(/\s+/).filter(Boolean).length,
      readingMins: p.readingMins,
      publishedAt: p.date,
      syncedAt: new Date(),
    };
    await prisma.article.upsert({
      where: { slug: p.slug },
      create: { slug: p.slug, ...data },
      update: data,
    });
  }

  // 2) Resolve `related:` slugs into the self-relation. `set` makes it fully
  //    declarative — removing a slug from front-matter removes the link.
  const known = new Set(slugs);
  for (const p of posts) {
    const refs = p.related.filter((s) => s !== p.slug && known.has(s));
    const dangling = p.related.filter((s) => s !== p.slug && !known.has(s));
    if (dangling.length) {
      console.warn(`  ${p.slug}: skipping unknown related slug(s): ${dangling.join(", ")}`);
    }
    await prisma.article.update({
      where: { slug: p.slug },
      data: { references: { set: refs.map((slug) => ({ slug })) } },
    });
  }

  // 3) Prune Article rows whose markdown was removed. Guarded: never prune when
  //    the corpus read came back empty (a bad read must not wipe the table).
  if (slugs.length > 0) {
    const deleted = await prisma.article.deleteMany({
      where: { slug: { notIn: slugs } },
    });
    if (deleted.count) console.log(`Pruned ${deleted.count} removed article(s).`);
  } else {
    console.warn("No posts found — skipping prune to avoid wiping the table.");
  }

  console.log("Article sync complete.");
}

main()
  .catch((err) => {
    console.error("Article sync failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
