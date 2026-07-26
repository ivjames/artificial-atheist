import { describe, expect, it } from "vitest";
import {
  BOOKS,
  bookOrder,
  canonicalizeRef,
  groupEntries,
  refKey,
} from "@/lib/prophecy/normalize";

// Mechanical passage-ref canonicalization (lib/prophecy/normalize). Every
// canonicalizeRef case below is a verbatim string from data/prophecy/*.json —
// the five source lists' real surface variants — so these tests pin the exact
// mechanics the overlap stats (scripts/prophecy-overlap.ts) depend on. Pure
// string work: no DB, no fixtures beyond inline literals.

describe("canonicalizeRef — real variants from the source lists", () => {
  // [raw, book, chapter, verses, suffix, canonical]
  const cases: Array<[string, string, number | null, string, string, string]> = [
    // Full names, dotted and undotted abbreviations.
    ["Genesis 3:15", "Genesis", 3, "15", "", "Genesis 3:15"],
    ["Gen. 3:15", "Genesis", 3, "15", "", "Genesis 3:15"],
    ["Gen 3:15", "Genesis", 3, "15", "", "Genesis 3:15"],
    ["Psa 22:16", "Psalms", 22, "16", "", "Psalms 22:16"],
    ["Psalm 34:20", "Psalms", 34, "20", "", "Psalms 34:20"],
    ["Micah 5:2", "Micah", 5, "2", "", "Micah 5:2"],
    ["Mic. 5:2", "Micah", 5, "2", "", "Micah 5:2"],
    ["Zech. 12:10", "Zechariah", 12, "10", "", "Zechariah 12:10"],
    ["Deut 18:15", "Deuteronomy", 18, "15", "", "Deuteronomy 18:15"],
    ["Deuteronomy 18:15", "Deuteronomy", 18, "15", "", "Deuteronomy 18:15"],
    ["Mal. 3:1", "Malachi", 3, "1", "", "Malachi 3:1"],
    ["Hos. 11:1", "Hosea", 11, "1", "", "Hosea 11:1"],
    // Spaceless refs, with and without the abbreviation dot.
    ["Lev17:11", "Leviticus", 17, "11", "", "Leviticus 17:11"],
    ["Eze.34:23-24", "Ezekiel", 34, "23-24", "", "Ezekiel 34:23-24"],
    ["1John 3:8", "1 John", 3, "8", "", "1 John 3:8"],
    // Numbered books, arabic and roman.
    ["2 Samuel 7:14a", "2 Samuel", 7, "14", "a", "2 Samuel 7:14"],
    ["2 Sam 7:14a", "2 Samuel", 7, "14", "a", "2 Samuel 7:14"],
    ["II Samuel 7:14", "2 Samuel", 7, "14", "", "2 Samuel 7:14"],
    ["I Cor 15:4", "1 Corinthians", 15, "4", "", "1 Corinthians 15:4"],
    ["1Ti 3:16", "1 Timothy", 3, "16", "", "1 Timothy 3:16"],
    ["1 Chr 17:11", "1 Chronicles", 17, "11", "", "1 Chronicles 17:11"],
    ["2 Ki. 2:11", "2 Kings", 2, "11", "", "2 Kings 2:11"],
    // Letter suffixes: on a single verse, on a list, on a range.
    ["Isa 53:5a", "Isaiah", 53, "5", "a", "Isaiah 53:5"],
    ["Psa 78:2b", "Psalms", 78, "2", "b", "Psalms 78:2"],
    ["1 Chr 17:12,13a", "1 Chronicles", 17, "12, 13", "a", "1 Chronicles 17:12, 13"],
    ["Dan 7:13-14a", "Daniel", 7, "13-14", "a", "Daniel 7:13-14"],
    ["Isa 59:15-16b", "Isaiah", 59, "15-16", "b", "Isaiah 59:15-16"],
    // Ranges and comma lists, with/without spaces.
    ["Php. 2:5-9", "Philippians", 2, "5-9", "", "Philippians 2:5-9"],
    ["Gen 9:26,27", "Genesis", 9, "26, 27", "", "Genesis 9:26, 27"],
    ["Gen. 9:26, 27", "Genesis", 9, "26, 27", "", "Genesis 9:26, 27"],
    ["Isaiah 7:6,13-14", "Isaiah", 7, "6, 13-14", "", "Isaiah 7:6, 13-14"],
    ["Song 5:16", "Song of Solomon", 5, "16", "", "Song of Solomon 5:16"],
    // Trailing junk: periods, semicolons, dangling colon.
    ["Isa. 40:10.", "Isaiah", 40, "10", "", "Isaiah 40:10"],
    ["Micah 5:2;", "Micah", 5, "2", "", "Micah 5:2"],
    ["Zech. 13:", "Zechariah", 13, "", "", "Zechariah 13"],
    // Chapter-only refs.
    ["Psa. 88", "Psalms", 88, "", "", "Psalms 88"],
    ["Psalm 110", "Psalms", 110, "", "", "Psalms 110"],
    // Multi-ref cells: only the FIRST ref is parsed.
    ["Isaiah 40:3; Malachi 3:1;", "Isaiah", 40, "3", "", "Isaiah 40:3"],
    ["Psalm 35:19, 69:4", "Psalms", 35, "19", "", "Psalms 35:19"],
    ["Psalms 41:9; 55:12-14;", "Psalms", 41, "9", "", "Psalms 41:9"],
    ["Psalm 22:16; Zechariah 12:10; Isaiah 53:5, 12;", "Psalms", 22, "16", "", "Psalms 22:16"],
    // "and"-joined refs (fulfillment style) must not eat the "a" of "and".
    ["Matthew 1:1-2 and Luke 3:34", "Matthew", 1, "1-2", "", "Matthew 1:1-2"],
  ];

  it.each(cases)("%s", (raw, book, chapter, verses, suffix, canonical) => {
    expect(canonicalizeRef(raw)).toEqual({ book, chapter, verses, suffix, canonical });
  });

  it("returns null (never throws) when no book is recognizable", () => {
    expect(canonicalizeRef("The record of history")).toBeNull();
    expect(canonicalizeRef("")).toBeNull();
    expect(canonicalizeRef("   ")).toBeNull();
    expect(canonicalizeRef("42:1")).toBeNull();
  });
});

describe("refKey — grouping semantics", () => {
  it("collapses letter suffixes: 53:5a == 53:5b == 53:5", () => {
    expect(refKey("Isa 53:5a")).toBe("Isaiah 53:5");
    expect(refKey("Isa 53:5b")).toBe("Isaiah 53:5");
    expect(refKey("Isaiah 53:5")).toBe("Isaiah 53:5");
    expect(refKey("Isa. 53:5")).toBe("Isaiah 53:5");
  });

  it("keys ranges and lists on their START verse (coarse, documented)", () => {
    expect(refKey("Isa 53:4-6")).toBe("Isaiah 53:4");
    expect(refKey("Isaiah 53:4")).toBe("Isaiah 53:4");
    // A range does NOT merge with a verse inside it — start-verse only.
    expect(refKey("Isa 53:4-6")).not.toBe(refKey("Isaiah 53:5"));
    expect(refKey("Gen 9:26,27")).toBe("Genesis 9:26");
  });

  it("keys chapter-only refs without a verse part", () => {
    expect(refKey("Psalm 110")).toBe("Psalms 110");
    expect(refKey("Zech. 13:")).toBe("Zechariah 13");
  });

  it("keys multi-ref strings on the first ref", () => {
    expect(refKey("Isaiah 40:3; Malachi 3:1;")).toBe("Isaiah 40:3");
    expect(refKey("Psalm 35:19, 69:4")).toBe("Psalms 35:19");
  });

  it("returns null for unrecognizable strings", () => {
    expect(refKey("fulfilled in history")).toBeNull();
  });
});

describe("groupEntries", () => {
  const entry = (listSlug: string, entryNumber: string, passageRefs: string) => ({
    listSlug,
    entryNumber,
    wording: `${entryNumber} ${passageRefs} something`,
    passageRefs,
  });

  it("groups by first-ref refKey, routes unparseables, sorts by book order", () => {
    const groups = groupEntries([
      entry("a", "1", "Isa 53:5a"),
      entry("b", "2", "Isaiah 53:5"),
      entry("a", "3", "Gen. 3:15"),
      entry("b", "4", "Isaiah 53:5, 12;"),
      entry("c", "5", "The record of history"),
      entry("c", "6", "Zech 9:9b"),
    ]);

    expect(groups.map((g) => g.key)).toEqual([
      "Genesis 3:15",
      "Isaiah 53:5",
      "Zechariah 9:9",
      "unparsed:The record of history",
    ]);
    const isa = groups.find((g) => g.key === "Isaiah 53:5")!;
    expect(isa.canonical).toBe("Isaiah 53:5");
    expect(isa.entries.map((e) => e.entryNumber)).toEqual(["1", "2", "4"]);
    const unparsed = groups.find((g) => g.key.startsWith("unparsed:"))!;
    expect(unparsed.canonical).toBe("The record of history");
    expect(unparsed.entries).toHaveLength(1);
  });

  it("sorts within a book by chapter then start verse, chapter-only first", () => {
    const groups = groupEntries([
      entry("a", "1", "Psa 110:4"),
      entry("a", "2", "Psalm 110"),
      entry("a", "3", "Psa 22:16"),
      entry("a", "4", "Psa 110:1"),
    ]);
    expect(groups.map((g) => g.key)).toEqual([
      "Psalms 22:16",
      "Psalms 110",
      "Psalms 110:1",
      "Psalms 110:4",
    ]);
  });

  it("preserves extra fields (fulfillmentRefs) on grouped entries", () => {
    const groups = groupEntries([{ ...entry("a", "1", "Gen 3:15"), fulfillmentRefs: "John 3:16" }]);
    expect(groups[0].entries[0].fulfillmentRefs).toBe("John 3:16");
  });
});

describe("book alias table sanity", () => {
  it("covers all 66 books in canonical order", () => {
    expect(BOOKS).toHaveLength(66);
    expect(BOOKS[0]).toMatchObject({ name: "Genesis", order: 0 });
    expect(BOOKS[65]).toMatchObject({ name: "Revelation", order: 65 });
    expect(bookOrder("Isaiah")).toBe(22);
    expect(bookOrder("Matthew")).toBe(39);
    expect(bookOrder("not a book")).toBeNull();
  });

  it("no two books share an alias", () => {
    const seen = new Map<string, string>();
    for (const book of BOOKS) {
      for (const alias of book.aliases) {
        const prior = seen.get(alias);
        expect(
          prior === undefined || prior === book.name,
          `alias "${alias}" claimed by both ${prior} and ${book.name}`,
        ).toBe(true);
        seen.set(alias, book.name);
      }
    }
  });
});
