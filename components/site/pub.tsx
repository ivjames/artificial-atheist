import Link from "next/link";
import { topicPattern, TOPIC_ICONS } from "@/lib/art";
import { topicOf } from "@/lib/site";
import { shortDate } from "@/lib/dates";
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

// Illustration when the post has one, else the tessellation. `priority` is
// for the above-the-fold lead image: lazy-loading the LCP element delays it.
export function Thumb({ post, priority = false }: { post: Post; priority?: boolean }) {
  if (post.image) {
    return (
      <img
        className="thumb-illustration"
        src={post.image}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
      />
    );
  }
  return <ArtField topic={post.topic} seed={post.slug} />;
}

export function Hero({ post }: { post: Post }) {
  if (post.image) {
    return (
      <img
        className="hero-illustration"
        src={post.image}
        alt=""
        loading="eager"
        fetchPriority="high"
      />
    );
  }
  return <ArtField topic={post.topic} seed={post.slug} />;
}

export function TopicTag({ topic }: { topic: string }) {
  const tp = topicOf(topic);
  return (
    <span className="tag" style={{ color: "var(--topic-color)" }}>
      <i className={`ti ${tp.icon}`} /> {tp.name}
    </span>
  );
}

// Standard article card used on the home page and topic archives.
export function PostCard({ post }: { post: Post }) {
  return (
    <Link className="card" href={post.url}>
      <div className="card-img">
        <Thumb post={post} />
      </div>
      <div className="card-body" data-topic={post.topic}>
        <TopicTag topic={post.topic} />
        <span className="card-title">{post.title}</span>
        {post.excerpt && <span className="card-excerpt">{post.excerpt}</span>}
        <span className="card-meta">
          <i className="ti ti-clock" /> {post.readingMins} min · {shortDate(post.date)}
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
        <Thumb post={post} />
      </div>
      <div data-topic={post.topic}>
        <span className="tag" style={{ color: "var(--topic-color)" }}>
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
