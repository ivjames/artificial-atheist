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
}: {
  src: string;
  className: string;
  sizes: string;
  priority?: boolean;
}) {
  const srcSet = variantSrcSet(src);
  const img = (
    <img
      className={className}
      src={src}
      alt=""
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
    return (
      <Illustration
        className="hero-illustration"
        src={post.image}
        sizes="(max-width: 720px) 100vw, 672px"
        priority
      />
    );
  }
  return <ArtField topic={post.topic} seed={post.slug} />;
}

// `ariaHidden` drops the tag from the accessible name when it sits inside a
// card link — otherwise screen readers announce "Secularism Secularism and
// the Court Witness…" (topic prefix + title), which a QA scan flagged as
// redundant link verbosity. Keep it exposed where it stands alone (post
// header).
export function TopicTag({
  topic,
  ariaHidden = false,
}: {
  topic: string;
  ariaHidden?: boolean;
}) {
  const tp = topicOf(topic);
  return (
    <span
      className="tag"
      style={{ color: "var(--topic-color)" }}
      aria-hidden={ariaHidden || undefined}
    >
      <i aria-hidden="true" className={`ti ${tp.icon}`} /> {tp.name}
    </span>
  );
}

// Standard article card used on the home page and topic archives.
export function PostCard({ post }: { post: Post }) {
  return (
    <Link className="card" href={post.url}>
      <div className="card-img">
        {/* .cards: 3-up ≈330px, 2-up ≤820px, full width ≤560px */}
        <Thumb post={post} sizes="(max-width: 560px) 100vw, (max-width: 820px) 50vw, 330px" />
      </div>
      <div className="card-body" data-topic={post.topic}>
        <TopicTag topic={post.topic} ariaHidden />
        <span className="card-title">{post.title}</span>
        {post.excerpt && <span className="card-excerpt">{post.excerpt}</span>}
        <span className="card-meta">
          <i aria-hidden="true" className="ti ti-clock" /> {post.readingMins} min ·{" "}
          {shortDate(post.date)}
        </span>
      </div>
    </Link>
  );
}

// Compact horizontal list item ("Also worth reading").
export function ListItem({ post }: { post: Post }) {
  const tp = topicOf(post.topic);
  return (
    <Link className="list-item" href={post.url}>
      <div className="list-thumb">
        <Thumb post={post} sizes="80px" />
      </div>
      <div data-topic={post.topic}>
        <span className="tag" style={{ color: "var(--topic-color)" }} aria-hidden="true">
          <i className={`ti ${tp.icon}`} /> {tp.name}
        </span>
        <div className="list-title">{post.title}</div>
        <div className="list-meta">
          {post.readingMins} min · {shortDate(post.date)}
        </div>
      </div>
    </Link>
  );
}
