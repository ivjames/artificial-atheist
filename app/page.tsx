import Link from "next/link";
import { getAllPosts, topicCount } from "@/lib/posts";
import { site, topics, topicOf, TOPIC_KEYS } from "@/lib/site";
import { readableDate } from "@/lib/dates";
import { PostCard, ListItem, Thumb } from "@/components/site/pub";

// The publication home page. Static — rendered from the markdown articles in
// src/posts at build time. Ported from the former Eleventy index.njk.
export default function HomePage() {
  const posts = getAllPosts();
  const lead = posts[0];
  const leadTopic = lead ? topicOf(lead.topic) : null;

  return (
    <div className="aa-pub">
      <div className="wrap">
        {lead && leadTopic && (
          <section className="lead" data-topic={lead.topic}>
            <Link className="lead-img" href={lead.url} aria-label={lead.title}>
              {/* .lead: 1.5fr column of the 1080px wrap ≈600px, stacked ≤820px */}
              <Thumb post={lead} sizes="(max-width: 820px) 100vw, 600px" priority />
            </Link>
            <div className="lead-content">
              <span className="tag" style={{ color: "var(--topic-color)" }}>
                <i className={`ti ${leadTopic.icon}`} /> {leadTopic.name} · Featured
              </span>
              <h1>
                <Link href={lead.url}>{lead.title}</Link>
              </h1>
              <p className="lead-deck">{lead.excerpt}</p>
              <div className="meta">
                <span>
                  <i className="ti ti-calendar" />
                  {readableDate(lead.date)}
                </span>
                <span>
                  <i className="ti ti-clock" />
                  {lead.readingMins} min read
                </span>
                <Link className="read-link" href={lead.url}>
                  Read <i className="ti ti-arrow-right" style={{ fontSize: 14 }} />
                </Link>
              </div>
            </div>
          </section>
        )}

        {posts.length > 1 && (
          <>
            <div className="eyebrow">Recent articles</div>
            <div className="cards">
              {posts.slice(1, 4).map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          </>
        )}

        <div className="split">
          <div>
            <div className="eyebrow">Also worth reading</div>
            <div className="list">
              {posts.slice(4, 8).map((post) => (
                <ListItem key={post.slug} post={post} />
              ))}
            </div>
          </div>
          <div>
            <div className="eyebrow">Browse by topic</div>
            <div className="topics-col">
              {TOPIC_KEYS.map((key) => {
                const tp = topics[key];
                const count = topicCount(key);
                return (
                  <Link className="topic-card" key={key} href={`/topics/${key}/`}>
                    <div className="topic-ic" style={{ background: tp.tintLight }}>
                      <i className={`ti ${tp.icon}`} style={{ color: tp.light }} />
                    </div>
                    <div>
                      <div className="topic-name">{tp.name}</div>
                      <div className="topic-count">
                        {count} article{count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        <div className="about-block">
          <h2>About {site.title}</h2>
          <p>
            {site.description} Every article is generated and curated with AI, then
            organized for clarity and rigour - an experiment in what machine-authored
            inquiry can look like.
          </p>
        </div>
      </div>
    </div>
  );
}
