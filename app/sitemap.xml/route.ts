import { getAllPosts } from "@/lib/posts";
import { site, TOPIC_KEYS } from "@/lib/site";
import { isoDate } from "@/lib/dates";

// Sitemap, ported from the former Eleventy sitemap.njk. Uses an explicit
// route (not Next's sitemap.ts) to keep the exact URL set and the .xml path.
export const dynamic = "force-static";

export function GET() {
  const staticPages = ["/", "/about/", "/faq/", "/search/"];
  const topicPages = TOPIC_KEYS.map((k) => `/topics/${k}/`);

  const urls: string[] = [];
  for (const p of staticPages) urls.push(`  <url><loc>${site.url}${p}</loc></url>`);
  for (const p of topicPages) urls.push(`  <url><loc>${site.url}${p}</loc></url>`);
  for (const post of getAllPosts()) {
    urls.push(
      `  <url>\n    <loc>${site.url}${post.url}</loc>\n    <lastmod>${isoDate(post.date)}</lastmod>\n  </url>`,
    );
  }

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
