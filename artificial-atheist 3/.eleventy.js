import { DateTime } from "luxon";

export default function (eleventyConfig) {
  // Copy static assets straight through to the build output.
  eleventyConfig.addPassthroughCopy({ "src/css": "css" });
  eleventyConfig.addPassthroughCopy({ "src/js": "js" });
  eleventyConfig.addPassthroughCopy({ "src/_headers": "_headers" });
  eleventyConfig.addPassthroughCopy({ "src/robots.txt": "robots.txt" });

  // --- Filters ---
  eleventyConfig.addFilter("readableDate", (d) =>
    DateTime.fromJSDate(d, { zone: "utc" }).toFormat("LLLL d, yyyy")
  );
  eleventyConfig.addFilter("isoDate", (d) =>
    DateTime.fromJSDate(d, { zone: "utc" }).toISODate()
  );
  eleventyConfig.addFilter("shortDate", (d) =>
    DateTime.fromJSDate(d, { zone: "utc" }).toFormat("LLL d")
  );

  // Estimated reading time from raw content length (~200 wpm).
  eleventyConfig.addFilter("readingTime", (content) => {
    const text = String(content).replace(/<[^>]*>/g, " ");
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  });

  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));
  eleventyConfig.addFilter("exclude", (arr, item) =>
    arr.filter((x) => x !== item)
  );

  // --- Topic artwork: seeded geometric pattern per topic ---
  // Deterministic from a seed string (post slug), so each article gets a
  // stable, distinct pattern in its topic's color family. Colors reference
  // CSS vars so light/dark adapt automatically.
  function hashSeed(s) {
    let h = 2166136261;
    for (let i = 0; i < String(s).length; i++) {
      h ^= String(s).charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const C = "var(--topic-color)";

  function patScience(r) {
    const n = 6 + Math.floor(r() * 3);
    const pts = [];
    for (let i = 0; i < n; i++)
      pts.push([30 + r() * 220, 24 + r() * 112]);
    let s = "";
    for (let i = 0; i < pts.length; i++)
      for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
        if (Math.hypot(dx, dy) < 85)
          s += `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${pts[j][0].toFixed(1)}" y2="${pts[j][1].toFixed(1)}" stroke="${C}" stroke-width="0.6" opacity="0.6"/>`;
      }
    for (const [x, y] of pts)
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(2 + r() * 2).toFixed(1)}" fill="${C}" opacity="0.7"/>`;
    return s;
  }
  function patPhilosophy(r) {
    const n = 4 + Math.floor(r() * 3);
    const cx = 110 + r() * 60, cy = 60 + r() * 40;
    let s = "";
    for (let i = 0; i < n; i++) {
      const rad = 14 + i * (10 + r() * 6);
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="${C}" stroke-width="0.7" opacity="${(0.62 - i * 0.07).toFixed(2)}"/>`;
    }
    return s;
  }
  function patSecularism(r) {
    const cols = 6, rows = 4, w = 280 / cols, h = 160 / rows;
    let s = "";
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const x0 = x * w, y0 = y * h, up = (x + y) % 2 === 0;
        const pts = up
          ? `${x0},${y0 + h} ${x0 + w / 2},${y0} ${x0 + w},${y0 + h}`
          : `${x0},${y0} ${x0 + w / 2},${y0 + h} ${x0 + w},${y0}`;
        const fill = r() < 0.18 ? `fill="${C}" opacity="0.2"` : `fill="none"`;
        s += `<polygon points="${pts}" ${fill} stroke="${C}" stroke-width="0.5" opacity="0.45"/>`;
      }
    return s;
  }
  function patReligion(r) {
    const cx = 140, cy = 80, n = 9 + Math.floor(r() * 5);
    const off = r() * Math.PI;
    let s = "";
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * Math.PI * 2;
      const r1 = 18, r2 = 50 + r() * 28;
      s += `<line x1="${(cx + Math.cos(a) * r1).toFixed(1)}" y1="${(cy + Math.sin(a) * r1).toFixed(1)}" x2="${(cx + Math.cos(a) * r2).toFixed(1)}" y2="${(cy + Math.sin(a) * r2).toFixed(1)}" stroke="${C}" stroke-width="0.6" opacity="0.5"/>`;
    }
    s += `<circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="${C}" stroke-width="0.7" opacity="0.6"/>`;
    return s;
  }
  function patNews(r) {
    const cx = 110 + r() * 60, cy = 60 + r() * 40, n = 4 + Math.floor(r() * 3);
    let s = "";
    for (let i = 0; i < n; i++)
      s += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(14 + i * 16).toFixed(1)}" fill="none" stroke="${C}" stroke-width="0.7" opacity="${(0.62 - i * 0.1).toFixed(2)}"/>`;
    return s;
  }
  const PATTERNS = {
    science: patScience,
    philosophy: patPhilosophy,
    secularism: patSecularism,
    religion: patReligion,
    news: patNews,
  };
  eleventyConfig.addShortcode("topicPattern", (topic, seed) => {
    const gen = PATTERNS[String(topic).toLowerCase()] || patScience;
    const r = rng(hashSeed(seed || topic));
    return `<svg class="art-rings" viewBox="0 0 280 160" preserveAspectRatio="xMidYMid slice"><rect width="280" height="160" fill="var(--bg-tint)"/>${gen(r)}</svg>`;
  });

  // --- Collections ---
  // All posts, newest first.
  eleventyConfig.addCollection("posts", (api) =>
    api.getFilteredByGlob("src/posts/*.md").sort((a, b) => b.date - a.date)
  );

  // One collection per topic, derived from each post's `topic` front-matter.
  const TOPICS = ["science", "philosophy", "secularism", "religion", "news"];
  for (const topic of TOPICS) {
    eleventyConfig.addCollection(topic, (api) =>
      api
        .getFilteredByGlob("src/posts/*.md")
        .filter((p) => (p.data.topic || "").toLowerCase() === topic)
        .sort((a, b) => b.date - a.date)
    );
  }

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk", "html"],
  };
}
