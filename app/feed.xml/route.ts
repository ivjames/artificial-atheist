import { getAllPosts } from "@/lib/posts";
import { site } from "@/lib/site";
import { isoDate } from "@/lib/dates";

// Atom feed, ported from the former Eleventy feed.njk. Includes image
// enclosures so the RSS→Facebook path keeps rich cards.
export const dynamic = "force-static";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function GET() {
  const posts = getAllPosts();
  const updated = posts.length ? `${isoDate(posts[0].date)}T00:00:00Z` : "";
  const entries = posts
    .slice(0, 20)
    .map((post) => {
      const url = `${site.url}${post.url}`;
      const enclosure = post.image
        ? `\n    <link rel="enclosure" type="image/png" href="${site.url}${post.image}"/>`
        : "";
      return `  <entry>
    <title>${esc(post.title)}</title>
    <link href="${url}"/>
    <updated>${isoDate(post.date)}T00:00:00Z</updated>
    <id>${url}</id>
    <summary>${esc(post.excerpt)}</summary>${enclosure}
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${esc(site.title)}</title>
  <subtitle>${esc(site.description)}</subtitle>
  <link href="${site.url}/feed.xml" rel="self"/>
  <link href="${site.url}/"/>
  <updated>${updated}</updated>
  <id>${site.url}/</id>
  <author><name>${esc(site.author)}</name></author>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: { "content-type": "application/atom+xml; charset=utf-8" },
  });
}
