// Emit step (§5 step 6): render an approved ArticleDraft into the exact
// markdown file format the artificialatheist.com Eleventy build expects
// (see artificial-atheist/CLAUDE.md — frontmatter then body, filename
// `YYYY-MM-DD-<slug>.md`, dropped into src/posts/).
import type { ArticleDraft } from "@prisma/client";

// Kebab-case slug for the AA filename/permalink. AA permalinks are
// slug-only, and duplicate slugs across posts break the Eleventy build, so
// keep this deterministic and bounded in length.
export function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents (post-NFKD combining marks)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return slug || "untitled";
}

function yamlEscape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

// AA's "today" convention is America/Los_Angeles, not UTC (the droplet runs
// UTC) — see artificial-atheist/CLAUDE.md. A naive `toISOString().slice(0,10)`
// can land on the wrong calendar day near midnight Pacific, which risks a
// duplicate-slug collision with that day's other posts. Compute the publish
// date in Pacific time so files emitted here line up with AA's own dating.
export function pacificDateISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/**
 * Render the AA-format frontmatter + markdown body. Prefers the Slot C
 * scrubMarkdown; falls back to draftMarkdown only if scrubbing never ran
 * (should not happen for an approved draft, but keeps this pure/defensive).
 */
export function toArticleFile(
  draft: ArticleDraft,
  dateISO: string,
): { filename: string; content: string } {
  const title = draft.title?.trim() || "Untitled";
  const excerpt = draft.excerpt?.trim() || "";
  const aaTopic = draft.aaTopic?.trim() || "religion";
  const body = (draft.scrubMarkdown ?? draft.draftMarkdown ?? "").trim();
  const slug = slugify(title);

  const frontmatterLines = [
    "---",
    `title: "${yamlEscape(title)}"`,
    `date: ${dateISO}`,
    `topic: ${aaTopic}`,
    `excerpt: "${yamlEscape(excerpt)}"`,
    "---",
  ];

  const content = `${frontmatterLines.join("\n")}\n\n${body}\n`;
  const filename = `${dateISO}-${slug}.md`;
  return { filename, content };
}
