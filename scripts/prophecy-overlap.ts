// Mechanical passage-level overlap statistics across the five prophecy
// source lists in data/prophecy/*.json.
//
// Run: npx tsx scripts/prophecy-overlap.ts
//
// Pure string mechanics on the verbatim ref strings (lib/prophecy/normalize)
// — no DB, no LLM, no editorial judgment. Grouping keys on the FIRST ref of
// each entry's passage cell, and ranges key on their start verse; both are
// coarse, documented choices. Outputs:
//   1. data/prophecy/overlap-stats.md — human-readable stats.
//   2. <scratchpad>/passage-groups.json — the full group array (with
//      fulfillmentRefs) for a later AI naming pass.

import fs from "node:fs";
import path from "node:path";
import { canonicalizeRef, groupEntries, refKey } from "@/lib/prophecy/normalize";

// The five source lists, by data/prophecy/<slug>.json.
const LIST_SLUGS = [
  "301-aboutbibleprophecy",
  "324-outoftheoverflow-2008",
  "356-accordingtothescriptures",
  "70-about-jesus",
  "jewishvoice-messianic",
] as const;

const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(REPO_ROOT, "data", "prophecy");
const STATS_PATH = path.join(DATA_DIR, "overlap-stats.md");
const GROUPS_PATH =
  "/tmp/claude-0/-home-user-artificial-atheist/d9b477bb-50ab-5ec7-a2a6-eb9f43415571/scratchpad/passage-groups.json";

interface RawEntry {
  entryNumber: string;
  originalWording: string;
  originalPassageRefs: string;
  originalFulfillmentRefs: string;
}

interface Entry {
  listSlug: string;
  entryNumber: string;
  wording: string;
  passageRefs: string;
  fulfillmentRefs: string;
}

function loadEntries(): Entry[] {
  const entries: Entry[] = [];
  for (const slug of LIST_SLUGS) {
    const file = path.join(DATA_DIR, `${slug}.json`);
    const raw: RawEntry[] = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const e of raw) {
      entries.push({
        listSlug: slug,
        entryNumber: e.entryNumber,
        wording: e.originalWording,
        passageRefs: e.originalPassageRefs,
        fulfillmentRefs: e.originalFulfillmentRefs,
      });
    }
  }
  return entries;
}

function main(): void {
  const entries = loadEntries();
  const groups = groupEntries(entries);

  // Per-list tallies.
  const perListEntries = new Map<string, number>(LIST_SLUGS.map((s) => [s, 0]));
  const perListKeys = new Map<string, Set<string>>(LIST_SLUGS.map((s) => [s, new Set()]));
  const unparsed: Entry[] = [];
  for (const e of entries) {
    perListEntries.set(e.listSlug, (perListEntries.get(e.listSlug) ?? 0) + 1);
    const key = refKey(e.passageRefs);
    if (key === null) {
      unparsed.push(e);
    } else {
      perListKeys.get(e.listSlug)!.add(key);
    }
  }

  const parsedGroups = groups.filter((g) => !g.key.startsWith("unparsed:"));
  const allKeys = new Set(parsedGroups.map((g) => g.key));

  // Pairwise shared-key matrix.
  const shared = (a: string, b: string): number => {
    const setA = perListKeys.get(a)!;
    const setB = perListKeys.get(b)!;
    let n = 0;
    for (const k of setA) if (setB.has(k)) n++;
    return n;
  };

  // How many lists cite each key.
  const listsPerKey = new Map<string, number>();
  for (const key of allKeys) {
    let n = 0;
    for (const slug of LIST_SLUGS) if (perListKeys.get(slug)!.has(key)) n++;
    listsPerKey.set(key, n);
  }
  const byListCount = (n: number): string[] =>
    [...listsPerKey.entries()].filter(([, c]) => c === n).map(([k]) => k);

  // Top keys by total entry count, with per-list breakdown.
  const topGroups = [...parsedGroups]
    .sort((a, b) => b.entries.length - a.entries.length || a.key.localeCompare(b.key))
    .slice(0, 15);

  // Isaiah 53 case study: entries whose FIRST passage ref lands in Isaiah 53.
  const isa53PerList = new Map<string, number>(LIST_SLUGS.map((s) => [s, 0]));
  for (const e of entries) {
    const ref = canonicalizeRef(e.passageRefs);
    if (ref && ref.book === "Isaiah" && ref.chapter === 53) {
      isa53PerList.set(e.listSlug, (isa53PerList.get(e.listSlug) ?? 0) + 1);
    }
  }
  const isa53Total = [...isa53PerList.values()].reduce((a, b) => a + b, 0);
  const isa53Keys = [...allKeys].filter((k) => k.startsWith("Isaiah 53:")).length;

  // ---- overlap-stats.md ----
  const short: Record<string, string> = {
    "301-aboutbibleprophecy": "301",
    "324-outoftheoverflow-2008": "324",
    "356-accordingtothescriptures": "356",
    "70-about-jesus": "70",
    "jewishvoice-messianic": "JV",
  };
  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push("# Prophecy source lists — passage-level overlap");
  push();
  push(
    "**Mechanical passage-level statistics — derived from verbatim ref strings, NOT reviewed editorial findings.**",
  );
  push();
  push(
    "Grouping key = canonical book + chapter + first verse of the FIRST ref in each",
  );
  push(
    'entry\'s passage cell ("Isa 53:5a", "Isaiah 53:5" and "Isaiah 53:5, 12" all key',
  );
  push(
    'to `Isaiah 53:5`; ranges key on their start verse, so "Isa 53:4-6" keys to',
  );
  push(
    "`Isaiah 53:4` and does NOT merge with `Isaiah 53:5` despite overlapping). See",
  );
  push("`lib/prophecy/normalize.ts` for the exact rules.");
  push();

  push("## Per-list counts");
  push();
  push("| List | Entries | Distinct refKeys |");
  push("|---|---:|---:|");
  for (const slug of LIST_SLUGS) {
    push(`| ${slug} | ${perListEntries.get(slug)} | ${perListKeys.get(slug)!.size} |`);
  }
  push(`| **Total** | **${entries.length}** | **${allKeys.size}** (distinct across all lists) |`);
  push();
  push(
    `${entries.length} entries collapse to ${allKeys.size} distinct passage keys across the five lists.`,
  );
  push();

  push("## Pairwise shared refKeys (5x5)");
  push();
  push("Diagonal = the list's own distinct-key count.");
  push();
  push(`| | ${LIST_SLUGS.map((s) => short[s]).join(" | ")} |`);
  push(`|---|${LIST_SLUGS.map(() => "---:").join("|")}|`);
  for (const a of LIST_SLUGS) {
    const cells = LIST_SLUGS.map((b) => (a === b ? `**${perListKeys.get(a)!.size}**` : `${shared(a, b)}`));
    push(`| ${short[a]} | ${cells.join(" | ")} |`);
  }
  push();

  push("## refKeys by number of lists citing them");
  push();
  push("| Lists citing | refKeys |");
  push("|---:|---:|");
  for (let n = 5; n >= 1; n--) push(`| ${n === 5 ? "all 5" : `exactly ${n}`} | ${byListCount(n).length} |`);
  push();
  const inAll = byListCount(5).sort();
  if (inAll.length > 0) {
    push(`Cited by all five lists: ${inAll.map((k) => `\`${k}\``).join(", ")}.`);
    push();
  }

  push("## Top 15 most-cited refKeys (by entry count)");
  push();
  push(`| refKey | Total entries | ${LIST_SLUGS.map((s) => short[s]).join(" | ")} |`);
  push(`|---|---:|${LIST_SLUGS.map(() => "---:").join("|")}|`);
  for (const g of topGroups) {
    const perList = LIST_SLUGS.map((s) => g.entries.filter((e) => e.listSlug === s).length);
    push(`| ${g.key} | ${g.entries.length} | ${perList.join(" | ")} |`);
  }
  push();

  push("## Unparseable passage refs");
  push();
  if (unparsed.length === 0) {
    push("None — every entry's passage cell yielded a recognizable book reference.");
  } else {
    push(`${unparsed.length} entr${unparsed.length === 1 ? "y" : "ies"} could not be keyed:`);
    push();
    for (const e of unparsed) {
      push(`- ${e.listSlug} #${e.entryNumber}: \`${e.passageRefs}\``);
    }
  }
  push();

  push("## Isaiah 53 case study");
  push();
  push(
    `Entries whose first passage ref falls in Isaiah 53 (any verse): ${isa53Total} of ${entries.length}, across ${isa53Keys} distinct verse-level keys.`,
  );
  push();
  push("| List | Isaiah 53 entries |");
  push("|---|---:|");
  for (const slug of LIST_SLUGS) push(`| ${slug} | ${isa53PerList.get(slug)} |`);
  push();

  push("---");
  push();
  push(`Generated ${new Date().toISOString()} by \`scripts/prophecy-overlap.ts\`.`);
  push();

  fs.writeFileSync(STATS_PATH, lines.join("\n"));

  // ---- passage-groups.json (already book/chapter/verse sorted) ----
  fs.mkdirSync(path.dirname(GROUPS_PATH), { recursive: true });
  fs.writeFileSync(GROUPS_PATH, JSON.stringify(groups, null, 2));

  console.log(`entries: ${entries.length}`);
  console.log(`distinct refKeys: ${allKeys.size}`);
  console.log(`groups written (incl. unparsed): ${groups.length}`);
  console.log(`unparsed entries: ${unparsed.length}`);
  console.log(`wrote ${STATS_PATH}`);
  console.log(`wrote ${GROUPS_PATH}`);
}

main();
