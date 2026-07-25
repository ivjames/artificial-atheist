import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsByTopic } from "@/lib/posts";
import { topics, TOPIC_KEYS, topicOf } from "@/lib/site";
import { PostCard } from "@/components/site/pub";

// Topic archive pages, statically generated one per topic. Ported from the
// former Eleventy topics.njk (paginated over site.topics).

export function generateStaticParams() {
  return TOPIC_KEYS.map((topic) => ({ topic }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic } = await params;
  if (!topics[topic]) return {};
  const tp = topics[topic];
  return {
    title: tp.name,
    alternates: { canonical: `/topics/${topic}/` },
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ topic: string }>;
}) {
  const { topic } = await params;
  if (!topics[topic]) notFound();

  const tp = topicOf(topic);
  const posts = getPostsByTopic(topic);

  return (
    <div className="aa-pub">
      <div className="wrap">
        <div className="archive-head" data-topic={topic}>
          <h1>
            <i className={`ti ${tp.icon}`} style={{ color: "var(--topic-color)" }} /> {tp.name}
          </h1>
        </div>

        {posts.length > 0 ? (
          <div className="cards">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        ) : (
          <p style={{ color: "var(--text-soft)" }}>No articles in this topic yet.</p>
        )}
      </div>
    </div>
  );
}
