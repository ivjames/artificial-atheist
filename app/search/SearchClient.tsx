"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Entry = {
  title: string;
  url: string;
  excerpt: string;
  topic: string;
  text: string;
};

// Lightweight client-side article search over the build-time JSON index.
export default function SearchClient() {
  const [index, setIndex] = useState<Entry[]>([]);
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/search-index.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Entry[]) => {
        if (alive) {
          setIndex(Array.isArray(data) ? data : []);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (query.length < 2) return [];
    const terms = query.split(/\s+/);
    return index
      .map((e) => {
        const hay = `${e.title} ${e.excerpt} ${e.topic} ${e.text}`.toLowerCase();
        const titleHay = e.title.toLowerCase();
        let score = 0;
        for (const t of terms) {
          if (!hay.includes(t)) return { e, score: -1 };
          if (titleHay.includes(t)) score += 5;
          score += 1;
        }
        return { e, score };
      })
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((r) => r.e);
  }, [q, index]);

  return (
    <div className="aa-search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search articles"
        aria-label="Search articles"
        autoFocus
      />
      <div className="search-results">
        {q.trim().length >= 2 && results.length === 0 && loaded && (
          <p className="search-empty">No articles match &ldquo;{q.trim()}&rdquo;.</p>
        )}
        {results.map((e) => (
          <Link className="list-item" href={e.url} key={e.url}>
            <div>
              <div className="list-title">{e.title}</div>
              {e.excerpt && <div className="card-excerpt">{e.excerpt}</div>}
              <div className="list-meta">{e.topic}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
