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
    return Math.max(1, Math.round(words / 200));
  });

  eleventyConfig.addFilter("limit", (arr, n) => arr.slice(0, n));
  eleventyConfig.addFilter("exclude", (arr, item) =>
    arr.filter((x) => x !== item)
  );

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
