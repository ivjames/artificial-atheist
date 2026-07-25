import { getAllPosts } from "@/lib/posts";
import { topicOf } from "@/lib/site";

// Build-time search index for the client-side search page. Replaces the former
// Pagefind index (Pagefind needs a static HTML export to crawl; this app is a
// hybrid Next server, so a small JSON index over the ~dozens of articles is
// simpler and self-contained).
export const dynamic = "force-static";

export function GET() {
  const index = getAllPosts().map((p) => ({
    title: p.title,
    url: p.url,
    excerpt: p.excerpt,
    topic: topicOf(p.topic).name,
    // Plain-text body for matching (tags stripped, whitespace collapsed).
    text: p.html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().toLowerCase(),
  }));
  return Response.json(index);
}
