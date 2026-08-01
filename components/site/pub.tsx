import Link from "next/link";
import { topicPattern, TOPIC_ICONS } from "@/lib/art";
import { topicOf } from "@/lib/site";
import { shortDate } from "@/lib/dates";
import { variantSrcSet } from "@/lib/images";
import type { Post } from "@/lib/posts";

// Presentational pieces for the publication surface, ported from the former
// Eleventy `art.njk`, `index.njk`, `topics.njk`, and `post.njk`. Topic accent
// colors come from `[data-topic]` CSS (light default + dark override in
// publication.css), so no per-element inline color or injected <style> is
// needed the way the Nunjucks templates did it.

// Seeded tessellation field with the topic icon on top.
export function ArtField({ topic, seed }: { topic: string; seed: string }) {
  const t = topic.toLowerCase();
  const icon = TOPIC_ICONS[t] || "ti-circle";
  return (
    <div className="art-field" data-t={t} aria-hidden="true">
      <div
        style={{ display: "contents" }}
        dangerouslySetInnerHTML={{ __html: topicPattern(t, seed) }}
      />
      <i className={`ti ${icon} art-icon`} />
    </div>
  );
}

// Post illustration with responsive WebP renditions when they exist
// (scripts/image-variants.mjs), falling back to the full-size committed PNG.
// `sizes` should state the rendered CSS width so the browser picks the
// smallest sufficient variant — the whole point of the QA LCP fix.
function Illustration({
  src,
  className,
  sizes,
  priority = false,
  alt = "",
}: {
  src: string;
  className: string;
  sizes: string;
  priority?: boolean;
  alt?: string;
}) {
  const srcSet = variantSrcSet(src);
  const img = (
    <img
      className={className}
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
    />
  );
  if (!srcSet) return img;
  return (
    <picture>
      <source type="image/webp" srcSet={srcSet} sizes={sizes} />
      {img}
    </picture>
  );
}

// Illustration when the post has one, else the tessellation. `priority` is
// for the above-the-fold lead image: lazy-loading the LCP element delays it.
export function Thumb({
  post,
  sizes = "100vw",
  priority = false,
}: {
  post: Post;
  sizes?: string;
  priority?: boolean;
}) {
  if (post.image) {
    return (
      <Illustration
        className="thumb-illustration"
        src={post.image}
        sizes={sizes}
        priority={priority}
      />
    );
  }
  return <ArtField topic={post.topic} seed={post.slug} />;
}

export function Hero({ post }: { post: Post }) {
  if (post.image) {
    // .article is 720px max with 1.5rem side padding → ~672px rendered width.
    // The hero gets the post's imageAlt when one exists (stamped by
    // illustrate.mjs for new art); card/list Thumbs stay alt="" because there
    // the image is decorative-redundant next to the title link.
    return (
      <Illustration
        className="hero-illustration"
        src={post.image}
        sizes="(max-width: 720px) 100vw, 672px"
        priority
        alt={post.imageAlt ?? ""}
      />
    );
  }
  return <ArtField topic={post.topic} seed={post.slug} />;
}

// Exposed to assistive tech: since the card link wraps only the title, the
// tag sits OUTSIDE the link and gives screen-reader users the topic context
// without polluting the link's accessible name. (It was aria-hidden back when
// the whole card was one <a> and the tag leaked into the link name.)
export function TopicTag({ topic }: { topic: string }) {
  const tp = topicOf(topic);
  return (
    <span className="tag" style={{ color: "var(--topic-color)" }}>
      <i aria-hidden="true" className={`ti ${tp.icon}`} /> {tp.name}
    </span>
  );
}

// Standard article card used on the home page and topic archives.
// The link wraps ONLY the title, so its accessible name is the title alone —
// wrapping the whole card made screen readers announce title+excerpt+meta as
// one run-on link name (QA scan, WCAG 2.4.4). A ::after overlay on
// .card-link keeps the full card clickable, and the excerpt/meta stay plain
// text so assistive tech still reads them in place.
export function PostCard({ post }: { post: Post }) {
  return (
    <article className="card">
      <div className="card-img">
        {/* .cards: 3-up ≈330px, 2-up ≤820px, full width ≤560px */}
        <Thumb post={post} sizes="(max-width: 560px) 100vw, (max-width: 820px) 50vw, 330px" />
      </div>
      <div className="card-body" data-topic={post.topic}>
        <TopicTag topic={post.topic} />
        {/* h2 so screen-reader users can skim archives by heading (QA scan,
            WCAG 1.3.1). Every page using cards has exactly one h1 above them,
            so h2 never skips a level. Styling rides on the class, not the tag. */}
        <h2 className="card-title">
          <Link className="card-link" href={post.url}>
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <span className="card-excerpt">{post.excerpt}</span>}
        <span className="card-meta">
          <i aria-hidden="true" className="ti ti-clock" /> {post.readingMins} min ·{" "}
          {shortDate(post.date)}
        </span>
      </div>
    </article>
  );
}

// Compact horizontal list item ("Also worth reading"). Same stretched-link
// pattern as PostCard: the link's accessible name is the title only.
export function ListItem({ post }: { post: Post }) {
  const tp = topicOf(post.topic);
  return (
    <article className="list-item">
      <div className="list-thumb">
        <Thumb post={post} sizes="80px" />
      </div>
      <div data-topic={post.topic}>
        <span className="tag" style={{ color: "var(--topic-color)" }}>
          <i aria-hidden="true" className={`ti ${tp.icon}`} /> {tp.name}
        </span>
        <h2 className="list-title">
          <Link className="card-link" href={post.url}>
            {post.title}
          </Link>
        </h2>
        <div className="list-meta">
          {post.readingMins} min · {shortDate(post.date)}
        </div>
      </div>
    </article>
  );
}
