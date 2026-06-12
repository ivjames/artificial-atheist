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

  // All patterns are true tessellations in the topic color (var --topic-color),
  // sized for the 280x160 art field. A few cells get a faint fill for texture;
  // the seed shifts which cells, giving per-article variation.
  const W = 280, H = 160;
  function patScience(r) {
    // hexagonal tiling
    let s = "", R = 19, dx = R * 1.5, dy = R * 0.866, col = 0;
    for (let cx = -R; cx < W + R; cx += dx) {
      const off = (col % 2) ? dy : 0; col++;
      for (let cy = -R + off; cy < H + R; cy += dy * 2) {
        let p = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i);
          p.push(`${(cx + R * Math.cos(a)).toFixed(1)},${(cy + R * Math.sin(a)).toFixed(1)}`);
        }
        const f = r() < 0.18 ? `fill="${C}" opacity="0.16"` : `fill="none"`;
        s += `<polygon points="${p.join(" ")}" ${f} stroke="${C}" stroke-width="0.6" opacity="0.4"/>`;
      }
    }
    return s;
  }
  function patPhilosophy(r) {
    // diamond (rotated square) tiling
    const cols = 8, rows = 5, w = W / cols, h = H / rows;
    let s = "";
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const cx = x * w + w / 2, cy = y * h + h / 2;
        const p = `${cx},${(cy - h / 2).toFixed(1)} ${(cx + w / 2).toFixed(1)},${cy} ${cx},${(cy + h / 2).toFixed(1)} ${(cx - w / 2).toFixed(1)},${cy}`;
        const f = r() < 0.18 ? `fill="${C}" opacity="0.16"` : `fill="none"`;
        s += `<polygon points="${p}" ${f} stroke="${C}" stroke-width="0.55" opacity="0.4"/>`;
      }
    return s;
  }
  function patSecularism(r) {
    // triangular tiling
    const cols = 7, rows = 4, w = W / cols, h = H / rows;
    let s = "";
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const x0 = x * w, y0 = y * h, up = (x + y) % 2 === 0;
        const pts = up
          ? `${x0},${y0 + h} ${x0 + w / 2},${y0} ${x0 + w},${y0 + h}`
          : `${x0},${y0} ${x0 + w / 2},${y0 + h} ${x0 + w},${y0}`;
        const f = r() < 0.2 ? `fill="${C}" opacity="0.18"` : `fill="none"`;
        s += `<polygon points="${pts}" ${f} stroke="${C}" stroke-width="0.5" opacity="0.42"/>`;
      }
    return s;
  }
  function patReligion(r) {
    // rhombille tiling (hexagons split into 3 rhombi -> isometric cubes)
    let s = "", R = 24, dx = R * 1.5, dy = R * 0.866, col = 0;
    for (let cx = 0; cx < W + R; cx += dx) {
      const off = (col % 2) ? dy : 0; col++;
      for (let cy = off; cy < H + R; cy += dy * 2) {
        const v = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i);
          v.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
        }
        const hexP = v.map((q) => q.map((n) => n.toFixed(1)).join(",")).join(" ");
        s += `<polygon points="${hexP}" fill="none" stroke="${C}" stroke-width="0.5" opacity="0.34"/>`;
        for (let i = 0; i < 6; i += 2)
          s += `<line x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${v[i][0].toFixed(1)}" y2="${v[i][1].toFixed(1)}" stroke="${C}" stroke-width="0.5" opacity="0.34"/>`;
      }
    }
    return s;
  }
  function patNews(r) {
    // vertical brick tiling (small scale to match the others' rhythm)
    const cols = 8, bw = W / cols, bh = H / 3.5;
    let s = "";
    for (let x = 0; x < cols; x++) {
      const off = (x % 2) ? -bh / 2 : 0;
      for (let y = off; y < H; y += bh) {
        const f = r() < 0.18 ? `fill="${C}" opacity="0.15"` : `fill="none"`;
        s += `<rect x="${(x * bw).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" ${f} stroke="${C}" stroke-width="0.5" opacity="0.4"/>`;
      }
    }
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
