// Prophecy module — mechanical passage-reference canonicalization.
//
// Pure string mechanics over the verbatim ref strings captured in
// data/prophecy/*.json (five source lists, ~1057 entries). The lists cite the
// same passages under wildly different surface forms — "Gen. 3:15" / "Gen 3:15"
// / "Genesis 3:15", "Psa 22:16" / "Psalm 22:16", spaceless "Lev17:11",
// letter-suffixed "Isa 53:5a", trailing periods/semicolons ("Isa. 40:10.",
// "Micah 5:2;"), multi-ref cells ("Isaiah 40:3; Malachi 3:1;") — and this
// module collapses those variants so entries can be grouped passage-by-passage.
//
// Deliberately NO judgment about meaning: no Prisma, no LLM, no editorial
// decisions. Everything here is a coarse, documented, deterministic string
// rule. The output feeds a later human/AI review pass; it is never presented
// as a reviewed finding.

// ---------------------------------------------------------------------------
// Book alias table
// ---------------------------------------------------------------------------

// All 66 Protestant-canon books in canonical order (the array index is the
// book-order index used for sorting groups). Aliases are matched after
// normalization (lowercase, periods and whitespace stripped), so one alias
// covers "Gen." / "Gen" / "gen"; spaceless forms like "1John" and "Lev17:11"
// fall out of the same normalization. Numbered books ("1 Samuel") also get
// roman-numeral variants ("I Samuel", "II Sam") generated below.
const BOOK_TABLE: ReadonlyArray<readonly [name: string, aliases: readonly string[]]> = [
  ["Genesis", ["gen", "ge", "gn"]],
  ["Exodus", ["ex", "exo", "exod"]],
  ["Leviticus", ["lev", "le", "lv"]],
  ["Numbers", ["num", "nu", "nm", "numb"]],
  ["Deuteronomy", ["deut", "deu", "dt"]],
  ["Joshua", ["josh", "jos", "jsh"]],
  ["Judges", ["judg", "jdg", "jg", "jdgs"]],
  ["Ruth", ["ru", "rth"]],
  // No "1s"/"1sa" ultra-short forms: their roman variants ("is", "isa")
  // are Isaiah's aliases.
  ["1 Samuel", ["1sam", "1sm"]],
  ["2 Samuel", ["2sam", "2sm"]],
  ["1 Kings", ["1kings", "1kgs", "1ki", "1k"]],
  ["2 Kings", ["2kings", "2kgs", "2ki", "2k"]],
  ["1 Chronicles", ["1chronicles", "1chron", "1chr", "1ch"]],
  ["2 Chronicles", ["2chronicles", "2chron", "2chr", "2ch"]],
  ["Ezra", ["ezr"]],
  ["Nehemiah", ["neh", "ne"]],
  ["Esther", ["esth", "est", "es"]],
  ["Job", ["jb"]],
  // "Psalm"/"Psa"/"Ps" all normalize to the plural canonical name.
  ["Psalms", ["psalm", "psa", "pss", "ps", "psm"]],
  ["Proverbs", ["prov", "pro", "prv", "pr"]],
  ["Ecclesiastes", ["eccl", "eccles", "ecc", "ec", "qoh"]],
  ["Song of Solomon", ["songofsolomon", "songofsongs", "song", "songs", "sos", "cant", "canticles"]],
  ["Isaiah", ["isa", "is"]],
  ["Jeremiah", ["jer", "je", "jr"]],
  ["Lamentations", ["lam", "la"]],
  ["Ezekiel", ["ezek", "eze", "ezk"]],
  ["Daniel", ["dan", "da", "dn"]],
  ["Hosea", ["hos", "ho"]],
  ["Joel", ["jl", "joe"]],
  ["Amos", ["am", "amo"]],
  ["Obadiah", ["obad", "oba", "ob"]],
  ["Jonah", ["jon", "jnh"]],
  ["Micah", ["mic", "mc"]],
  ["Nahum", ["nah", "na"]],
  ["Habakkuk", ["hab", "hb"]],
  ["Zephaniah", ["zeph", "zep", "zp"]],
  ["Haggai", ["hag", "hg"]],
  ["Zechariah", ["zech", "zec", "zc"]],
  ["Malachi", ["mal", "ml"]],
  ["Matthew", ["matt", "mat", "mt"]],
  ["Mark", ["mrk", "mar", "mk", "mr"]],
  ["Luke", ["luk", "lk", "lu"]],
  ["John", ["joh", "jhn", "jn"]],
  ["Acts", ["act", "ac"]],
  ["Romans", ["rom", "ro", "rm"]],
  ["1 Corinthians", ["1corinthians", "1cor", "1co"]],
  ["2 Corinthians", ["2corinthians", "2cor", "2co"]],
  ["Galatians", ["gal", "ga"]],
  ["Ephesians", ["eph", "ephes"]],
  // "Phil" conventionally means Philippians; Philemon gets "Phlm"/"Phm".
  ["Philippians", ["phil", "php", "philipp"]],
  ["Colossians", ["col", "co"]],
  ["1 Thessalonians", ["1thessalonians", "1thess", "1thes", "1th"]],
  ["2 Thessalonians", ["2thessalonians", "2thess", "2thes", "2th"]],
  ["1 Timothy", ["1timothy", "1tim", "1ti"]],
  ["2 Timothy", ["2timothy", "2tim", "2ti"]],
  ["Titus", ["tit", "ti"]],
  ["Philemon", ["phlm", "phm", "philem"]],
  ["Hebrews", ["heb", "he"]],
  ["James", ["jas", "jam", "jms"]],
  ["1 Peter", ["1peter", "1pet", "1pe", "1pt", "1p"]],
  ["2 Peter", ["2peter", "2pet", "2pe", "2pt", "2p"]],
  ["1 John", ["1john", "1jn", "1jhn", "1jo", "1j"]],
  ["2 John", ["2john", "2jn", "2jhn", "2jo", "2j"]],
  ["3 John", ["3john", "3jn", "3jhn", "3jo", "3j"]],
  ["Jude", ["jud", "jde"]],
  ["Revelation", ["rev", "re", "rv", "apoc"]],
];

/** One row of the book table: canonical name, order index, normalized aliases. */
export interface BookInfo {
  name: string;
  /** 0-based position in Protestant-canon book order (Genesis=0 … Revelation=65). */
  order: number;
  /** All normalized aliases (lowercase, no periods/spaces), canonical name included. */
  aliases: string[];
}

/** Lowercase a string and drop periods and whitespace — the alias-match form. */
function normalizeAlias(s: string): string {
  return s.toLowerCase().replace(/[.\s ]+/g, "");
}

// Roman-numeral variants for numbered books: "1sam" also gets "isam", etc.
const ROMAN: Record<string, string> = { "1": "i", "2": "ii", "3": "iii" };

/** The full book table with order indexes and expanded normalized aliases. */
export const BOOKS: readonly BookInfo[] = BOOK_TABLE.map(([name, aliases], order) => {
  const all = new Set<string>([normalizeAlias(name)]);
  for (const a of aliases) {
    const n = normalizeAlias(a);
    all.add(n);
    const roman = ROMAN[n[0]];
    if (roman) all.add(roman + n.slice(1));
  }
  const romanName = ROMAN[name[0]];
  if (romanName) all.add(romanName + normalizeAlias(name).slice(1));
  return { name, order, aliases: [...all] };
});

// alias → book, plus the alias list sorted longest-first so greedy prefix
// matching always prefers "psalms" over "psalm" over "ps".
const ALIAS_TO_BOOK = new Map<string, BookInfo>();
for (const book of BOOKS) {
  for (const alias of book.aliases) {
    // Duplicate aliases across books would make matching ambiguous; the test
    // suite asserts this never fires, but guard the invariant here too.
    const prior = ALIAS_TO_BOOK.get(alias);
    if (prior && prior !== book) {
      throw new Error(`prophecy/normalize: alias "${alias}" maps to both ${prior.name} and ${book.name}`);
    }
    ALIAS_TO_BOOK.set(alias, book);
  }
}
const ALIASES_LONGEST_FIRST = [...ALIAS_TO_BOOK.keys()].sort((a, b) => b.length - a.length);

/** Book-order index for a canonical book name (for sorting); null if unknown. */
export function bookOrder(name: string): number | null {
  const book = ALIAS_TO_BOOK.get(normalizeAlias(name));
  return book ? book.order : null;
}

// ---------------------------------------------------------------------------
// canonicalizeRef
// ---------------------------------------------------------------------------

/** Parsed form of one passage reference. */
export interface CanonicalRef {
  /** Canonical full book name, e.g. "Isaiah", "2 Samuel", "Psalms". */
  book: string;
  /** Chapter number; null for a book-only ref with no numerals at all. */
  chapter: number | null;
  /**
   * Normalized verse spec within the chapter: "5", "4-6", "26, 27",
   * "6, 13-14". Empty string for chapter-only refs ("Psalm 110", "Zech. 13:").
   */
  verses: string;
  /** Letter suffix as printed ("Isa 53:5a" → "a"); "" when none. */
  suffix: string;
  /** "Isaiah 53:5"-style rendering: full book name + chapter:verses, suffix stripped. */
  canonical: string;
}

// One verse token: number, optional -range, optional attached letter suffix
// (attached only — a space before the letter would swallow the "a" of
// "…1-2 and Luke 3:34"). Suffixes in the data run a–e (Isa 53:12a…12e).
const VERSE_TOKEN = /^(\d+)(?:\s*-\s*(\d+))?([a-e])?(?![A-Za-z])/;

// Continuation lookahead: ", 27" extends the verse list, but ", 69:4" starts a
// new chapter ref (Psalm 35:19, 69:4) and must NOT be consumed.
const VERSE_CONTINUATION = /^\s*,\s*(?=\d)(?!\d+\s*:)/;

/**
 * Canonicalize ONE passage reference by pure string mechanics.
 *
 * Handles the real variants in data/prophecy: abbreviations with/without
 * periods, spaceless refs ("Lev17:11", "1John 3:8", "Eze.34:23-24"), roman
 * numerals ("II Sam"), letter suffixes ("53:5a"), verse lists and ranges
 * ("9:26,27", "17:12,13a", "1:2-9"), chapter-only refs ("Psalm 110",
 * "Psa. 88", dangling "Zech. 13:"), and trailing junk (periods, semicolons).
 *
 * For a multi-ref string ("Isaiah 40:3; Malachi 3:1;", "Psalm 35:19, 69:4")
 * only the FIRST reference is parsed — a documented coarse choice; grouping
 * keys on the lead ref and the verbatim string is preserved alongside.
 *
 * Returns null only when no leading book name is recognizable. Never throws.
 */
export function canonicalizeRef(raw: string): CanonicalRef | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Normalized copy for alias matching, with an index map back to `trimmed`
  // so the numeric remainder can be sliced out of the original string.
  let norm = "";
  const map: number[] = [];
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "." || /\s/.test(ch)) continue;
    norm += ch.toLowerCase();
    map.push(i);
  }
  if (!norm) return null;

  // Longest alias that prefixes the normalized string, with a boundary check:
  // what follows must be a digit or end-of-string ("jude" must not match
  // "judges2:1"; longest-first ordering already prefers "judges").
  let book: BookInfo | null = null;
  let aliasLen = 0;
  for (const alias of ALIASES_LONGEST_FIRST) {
    if (!norm.startsWith(alias)) continue;
    const next = norm[alias.length];
    if (next !== undefined && !/\d/.test(next)) continue;
    book = ALIAS_TO_BOOK.get(alias)!;
    aliasLen = alias.length;
    break;
  }
  if (!book) return null;

  // Remainder of the ORIGINAL string after the book name (keeps spacing so
  // token regexes see the real separators).
  const rest = aliasLen < map.length ? trimmed.slice(map[aliasLen]) : "";

  // Chapter.
  const chapterMatch = /^\s*(\d+)/.exec(rest);
  if (!chapterMatch) {
    // Book-only ref (no numerals) — e.g. a bare "Malachi".
    return { book: book.name, chapter: null, verses: "", suffix: "", canonical: book.name };
  }
  const chapter = parseInt(chapterMatch[1], 10);
  let pos = chapterMatch[0].length;

  // Verses (only after a ":" — "Psalm 110" and "Acts 1-7" stay chapter-only).
  const tokens: string[] = [];
  let suffix = "";
  const colon = /^\s*:\s*/.exec(rest.slice(pos));
  if (colon) {
    pos += colon[0].length;
    for (;;) {
      const tok = VERSE_TOKEN.exec(rest.slice(pos));
      if (!tok) break;
      tokens.push(tok[2] !== undefined ? `${parseInt(tok[1], 10)}-${parseInt(tok[2], 10)}` : `${parseInt(tok[1], 10)}`);
      if (tok[3]) suffix = tok[3];
      pos += tok[0].length;
      const cont = VERSE_CONTINUATION.exec(rest.slice(pos));
      if (!cont) break; // ";", new book, ", 69:4", trailing "." — all stop here
      pos += cont[0].length;
    }
  }
  const verses = tokens.join(", ");
  const canonical = verses ? `${book.name} ${chapter}:${verses}` : `${book.name} ${chapter}`;
  return { book: book.name, chapter, verses, suffix, canonical };
}

// ---------------------------------------------------------------------------
// refKey
// ---------------------------------------------------------------------------

/**
 * Canonical grouping key for a ref: book + chapter + FIRST verse number, so
 * "Isa 53:5a", "Isa 53:5b", "Isaiah 53:5" and "Isaiah 53:5, 12" all key to
 * "Isaiah 53:5".
 *
 * Ranges group by their START verse: "Isa 53:4-6" keys to "Isaiah 53:4".
 * That is a deliberately coarse mechanical choice — a range and its start
 * verse group together, but "53:4-6" and "53:5" do NOT, even though they
 * overlap. Overlap detection would be a judgment call; this is not.
 *
 * Chapter-only refs key to "Psalms 110" (no verse part); book-only refs to
 * the bare book name. Returns null when canonicalizeRef does.
 */
export function refKey(raw: string): string | null {
  const ref = canonicalizeRef(raw);
  if (!ref) return null;
  if (ref.chapter === null) return ref.book;
  const start = /^(\d+)/.exec(ref.verses);
  return start ? `${ref.book} ${ref.chapter}:${start[1]}` : `${ref.book} ${ref.chapter}`;
}

// ---------------------------------------------------------------------------
// groupEntries
// ---------------------------------------------------------------------------

/** Minimum shape groupEntries needs; extra fields (fulfillmentRefs…) ride along. */
export interface GroupableEntry {
  listSlug: string;
  entryNumber: string;
  wording: string;
  passageRefs: string;
}

/** One cross-list passage group. */
export interface PassageGroup<T extends GroupableEntry = GroupableEntry> {
  /** refKey of the members' first ref, or "unparsed:<raw>" when unparseable. */
  key: string;
  /** "Isaiah 53:5"-style label for the group (the raw string for unparsed groups). */
  canonical: string;
  entries: T[];
}

/**
 * Group entries across lists by the refKey of the FIRST ref in passageRefs.
 * Entries whose passageRefs yield no recognizable book land in their own
 * "unparsed:<raw>" group (one group per distinct raw string).
 *
 * Groups are sorted by biblical book order, then chapter, then start verse
 * (chapter-only before versed refs within a chapter); unparsed groups sort
 * last, alphabetically. Entries within a group keep input order.
 */
export function groupEntries<T extends GroupableEntry>(entries: T[]): PassageGroup<T>[] {
  const groups = new Map<string, PassageGroup<T>>();
  for (const entry of entries) {
    const key = refKey(entry.passageRefs);
    const raw = entry.passageRefs.trim();
    const finalKey = key ?? `unparsed:${raw}`;
    let group = groups.get(finalKey);
    if (!group) {
      group = { key: finalKey, canonical: key ?? raw, entries: [] };
      groups.set(finalKey, group);
    }
    group.entries.push(entry);
  }

  // Sort key: [bookOrder, chapter, verseStart] parsed back out of the refKey
  // (unparsed groups get order Infinity).
  const sortTuple = (g: PassageGroup<T>): [number, number, number, string] => {
    if (g.key.startsWith("unparsed:")) return [Number.POSITIVE_INFINITY, 0, 0, g.key];
    const m = /^(.*?)(?:\s(\d+)(?::(\d+))?)?$/.exec(g.key)!;
    const order = bookOrder(m[1]) ?? Number.POSITIVE_INFINITY;
    return [order, m[2] ? parseInt(m[2], 10) : 0, m[3] ? parseInt(m[3], 10) : 0, g.key];
  };
  return [...groups.values()].sort((a, b) => {
    const ta = sortTuple(a);
    const tb = sortTuple(b);
    for (let i = 0; i < 3; i++) {
      if (ta[i] !== tb[i]) return (ta[i] as number) - (tb[i] as number);
    }
    return (ta[3] as string).localeCompare(tb[3] as string);
  });
}
