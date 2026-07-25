import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPosts, getPost, relatedPosts } from "@/lib/posts";
import { site, topicOf } from "@/lib/site";
import { readableDate, isoDate } from "@/lib/dates";
import { Hero, TopicTag, PostCard } from "@/components/site/pub";

// Article pages, statically generated from src/posts markdown. Ported from the
// former Eleventy post.njk (+ base.njk head/JSON-LD).

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  const image = post.image ? [post.image] : undefined;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: post.url },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: post.url,
      siteName: site.title,
      images: image,
      publishedTime: isoDate(post.date),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      images: image,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const tp = topicOf(post.topic);
  const related = relatedPosts(post, 3);
  const abs = (path: string) => `${site.url}${path}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${site.url}/#org`,
        name: site.title,
        url: `${site.url}/`,
        description: site.description,
        logo: `${site.url}/favicon.svg`,
      },
      {
        "@type": "Article",
        headline: post.title,
        description: post.excerpt,
        ...(post.image ? { image: abs(post.image) } : {}),
        url: abs(post.url),
        datePublished: isoDate(post.date),
        dateModified: isoDate(post.date),
        mainEntityOfPage: { "@type": "WebPage", "@id": abs(post.url) },
        author: { "@id": `${site.url}/#org` },
        publisher: { "@id": `${site.url}/#org` },
        isAccessibleForFree: true,
        articleSection: tp.name,
      },
    ],
  };

  return (
    <div className="aa-pub">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article className="article" data-topic={post.topic}>
        <div className="article-hero-img">
          <Hero post={post} />
        </div>

        <TopicTag topic={post.topic} />
        <h1>{post.title}</h1>

        <div className="article-meta">
          <span>
            <i className="ti ti-calendar" />
            {readableDate(post.date)}
          </span>
          <span>
            <i className="ti ti-clock" />
            {post.readingMins} min read
          </span>
        </div>

        <div className="prose" dangerouslySetInnerHTML={{ __html: post.html }} />

        {site.affiliate.amazonTag && (
          <p className="affiliate-disclosure">{site.affiliate.disclosure}</p>
        )}

        {site.donate.enabled && (
          <a className="donate-cta" href={site.donate.url} target="_blank" rel="noopener">
            <i className="ti ti-heart" /> {site.donate.label}
          </a>
        )}

        {related.length > 0 && (
          <div className="related">
            <div className="eyebrow">
              {post.related.length > 0 ? "Related reading" : `More in ${tp.name}`}
            </div>
            <div className="cards">
              {related.map((p) => (
                <PostCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
