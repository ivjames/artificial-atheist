# Source list: "324 prophecies fulfilled by Jesus" (outoftheoverflow.com, 2008)

Provenance record for `324-outoftheoverflow-2008.json`.

## Source

- URL: https://outoftheoverflow.com/2008/10/20/324-prophecies-fulfilled-by-jesus/
- Page title: "324 prophecies fulfilled by Jesus" (blog: "The Overflow"; in-page heading: "324 Messianic Prophecies Fulfilled")
- Published: 2008-10-20 (WordPress blog post, categories "Devotional Thoughts" / "Theology", tag "324 Messianic Prophecies")
- Compiler: unattributed. The post names no author or original compiler and cites no source for the list. This is a widely re-circulated list; this blog copy is simply the identified version we ingested. The anonymity is recorded here as a provenance fact.
- Accessed: 2026-07-26 (fetched with curl; parsed from the raw HTML)

## Counts

- Claimed total (the list's own title/heading): **324**
- Actual entries extracted: **315**

The page does not contain 324 lines. It contains 315 `<br />`-separated lines in a single `<p>` block. The 9-entry shortfall is a property of this copy of the list as published; we did not attempt to reconcile it against other circulating versions. Do not quote "324" as the entry count of this dataset.

## Structure of the source

- The entire list is one centered `<p>` element between the page's `<h2>` heading and a trailing (empty, ad-script-only) paragraph. Lines are separated by `<br />`. There is no preamble text, no scripture-quote blocks, and no trailing commentary inside the list block.
- Entries are NOT numbered in the source. They are ordered lines in canonical OT-book order, each of the form: OT reference, short description, one or more NT references.
- Every scripture reference is a Bible Gateway hyperlink; the description text between the links is plain text.
- **Letter-suffixed sub-splits:** 92 of the 315 entries split a single verse or verse range into lettered sub-entries (e.g. `Isa 53:5a` / `Isa 53:5b` / `Isa 53:5c`). Isaiah 53 alone is split into 37 entries (53:2a through 53:12e). Other heavily split passages: Zech 9:9 (a-f), Zech 11:12-13 (a-d), Zech 13:7 (a-d), Isa 50:6 (a-c), Dan 9:26 (a-c), Mic 5:2 (a-c). In the HTML, some suffix letters are inside the hyperlink text and some are bare text glued directly after the closing `</a>` (e.g. `2 Sam 7:14</a>a`, which prints as "2 Sam 7:14a"); the parser handles both.
- **Repeated passage refs:** 284 distinct OT refs across 315 entries; 18 refs appear more than once (beyond the letter splits). Most-repeated: Isa 9:6 (8 entries), Gen 49:10 (5), Gen 14:18 (3), Psa 110:1 (3), Isa 9:7 (3), Isa 49:6 (3).
- **No exact duplicate whole lines**, but identical descriptions recur under different OT refs, e.g. "Descendant of David" (4 entries: Jer 23:5-6a, Jer 33:14-15, Eze 17:22-24, Eze 34:23-24), "The Messiah would be God" (3), "God's servant" (3), "David's Seed" (2 Sam 7:12 and 1 Chr 17:11), "Not a bone of Him broken" (Num 9:12 and Psa 34:20; cf. also Ex 12:46), "The bodily ascension to heaven illustrated" (Gen 5:24 and 2 Ki 2:11). Deduplication is Phase 5 editorial work, not done here.
- **Verbatim oddities preserved on purpose** (this dataset is provenance; nothing was corrected):
  - Missing spaces in refs as printed: `Lev14:11`, `Lev16:15-17`, `Lev16:27`, `Lev17:11`, `Heb11:18`.
  - Entry 31 fulfillment refs read `Mt 26;28; Mk 10:45` — the `;28;` is bare text between two hyperlinks in the source (probably intended as Mt 26:28). Kept exactly as printed.
  - Entry 50: "I will be His Father, Hemy Son" (run-together "He my" in the source).
  - Entry 3 cites `Mk 6:19` as the fulfillment for Gen 5:24 (ascension); entry 141 cites `Psa 1:23` as a passage ref. Both look like the source's own citation errors; kept as printed.
  - Mixed abbreviation styles throughout (`Jn`/`John`, `Psa`/`Ps`, `Mt`, `Mk`) — kept as printed per line.

## Parsing decisions

- Extraction unit: one entry per `<br />`-separated line of the list `<p>`; 315 lines, all parsed, none skipped, none unparseable.
- Field split is driven by the hyperlink markup, not by guessing at text: the first `<a>` on a line (plus any lowercase letter run glued immediately after it) is `originalPassageRefs`; everything from the second `<a>` to end of line (tags stripped) is `originalFulfillmentRefs`, including printed separators (`,`, `;`) between multiple NT refs; the plain text between them is the description.
- `entryNumber` is the ordinal position `"1"`..`"315"` in page order, assigned at import — the source itself is unnumbered. Sub-splits keep their printed ref (e.g. `Isa 53:5a`) in `originalPassageRefs`.
- `originalWording` is the full line verbatim with tags stripped: whitespace normalized to single spaces and HTML entities decoded to Unicode (curly quotes, dashes); no other changes.
- No entries required a `notes` field (no missing NT refs, no unparseable lines).

## Importing on the droplet

1. Open `/review/prophecy/lists/` (admin-token gated, same cookie as the pipeline review surface).
2. Create the list: slug `324-outoftheoverflow-2008`, title `324 prophecies fulfilled by Jesus (outoftheoverflow.com, 2008)`, claimedCount `324`, description noting the URL above and that entry numbers are ordinals assigned at import (the source list is unnumbered).
3. Open the new list, paste the full contents of `data/prophecy/324-outoftheoverflow-2008.json` into the "Import entries" form, set format to `json` (filename e.g. `324-outoftheoverflow-2008.json`), and run it.
4. Expected result: 315 created, 0 skipped, 0 errors. Re-running the same paste is a no-op (315 skipped) — the import is idempotent per entry number.
