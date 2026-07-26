# Source list: "Messianic Prophecies" (jewishvoice.org)

Provenance record for `jewishvoice-messianic.json`.

## Source

- URL: https://www.jewishvoice.org/article/messianic-prophecies
- Page title: "Messianic Prophecies" (in-page list heading: "List of Messianic Prophecies:")
- Site: Jewish Voice Ministries International (jewishvoice.org), article dated 2017-04-04 on the page
- Compiler: unattributed. The article names no author; the list itself cites no compiler or source. The surrounding prose leans on Peter Stoner's *Science Speaks* (Moody Press, 1963) for its probability argument, but the 15-item list is not attributed to Stoner or anyone else.
- Accessed: 2026-07-26 (fetched with curl; parsed from the raw HTML)

## Counts

- Claimed total for the list: **none stated.** The page introduces it only as "a list of important Messianic prophecies" — no number is given for the list itself.
- Actual entries extracted: **15** (printed numbers 1–15, no gaps).
- The surrounding prose claims Yeshua "fulfilled more than 324 individual prophecies" — that is a claim about Messianic prophecy in general (the same "324" figure as the outoftheoverflow list), NOT a count of this list. Do not record 324 as this dataset's claimedCount; the list is a deliberately short curated selection, which is its value as a contrast to the 300+ compilations.

## Structure of the source

- The list sits between an `<h2>List of Messianic Prophecies:</h2>` heading and a paragraph beginning "In his book, *Science Speaks*…". It is 15 consecutive `<p>` elements, one per entry — no table, no `<ol>`/`<li>` markup.
- Each entry paragraph has the shape: `<strong><em>N. Description</em></strong>`, a `<br/>` (wrapped in React hydration comment markers `<!--$--><br/><!--/$-->`), then the refs line: OT reference(s), the literal bold text "**fulfilled in**", then NT reference(s).
- **Entries ARE numbered in the source** (printed "1."–"15."); `entryNumber` uses the printed numbers, not assigned ordinals.
- References are plain text (no hyperlinks, unlike the outoftheoverflow source). Multiple refs are separated by `;`, with same-book follow-on refs given as bare chapter:verse (e.g. entry 2's "Matthew 3:1-3; 11:10" and entry 4's "Psalms 41:9; 55:12-14").
- Entry 15 deviates from the pattern: its whole refs line (including "fulfilled in") is wrapped in `<em>`, and its `<br/>` has no space after it. Cosmetic only; parsed the same way.
- **Verbatim oddities preserved on purpose** (this dataset is provenance; nothing was corrected):
  - Entry 3 fulfillment: `Luke 35-37` — no chapter number as printed (presumably Luke 19:35-37). Kept exactly.
  - Entry 14 fulfillment: `Acts 2:23-36;13;33-37` — the `;13;33-37` run is as printed (presumably Acts 13:33-37), and `1 Corinthians 11:4-6` is the source's citation for the resurrection (presumably 15:4-6). Both kept exactly.
  - Entry 15 fulfillment: `Mark 5:27, 28` (presumably 15:27-28). Kept exactly.
  - Entry 10 cites only `John 19:28` as fulfillment for pierced hands and feet — looks like the source's own citation slip; kept.
  - Psalm citations follow Masoretic/Hebrew versification in places (`Psalm 69:5`, `Psalm 69:22`, `Psalm 34:21` where English Bibles have 69:4, 69:21, 34:20) — consistent with a Messianic-Jewish ministry; kept per line.
  - Mixed book-name styles as printed: `Matt.` vs `Matthew`, `Psalm` vs `Psalms`.
  - Curly quotes in entry 6 ("to the potter", God's) are the source's Unicode characters, preserved.

## Parsing decisions

- Extraction unit: one entry per list `<p>`; 15 paragraphs, all parsed, none skipped, none unparseable.
- Field split is driven by the source's own markers, not guessing: the text before the `<br/>` is the numbered description; the refs line after it is split on the literal "fulfilled in" — left side is `originalPassageRefs`, right side is `originalFulfillmentRefs`.
- `originalPassageRefs` keeps the trailing `;` exactly as printed (every entry prints a semicolon between the last OT ref and "fulfilled in", e.g. `Micah 5:2;`). Internal separators in both ref fields are kept as printed.
- `entryNumber` = the printed number ("1"–"15"). `originalWording` is the full paragraph verbatim with tags stripped (the `<br/>` collapsed to a single space): whitespace normalized to single spaces, HTML entities decoded to Unicode; no other changes. The printed "N." prefix is part of the line and is kept in `originalWording`.
- No entry lacks passage or fulfillment refs; no `notes` field was needed; no unparseable items.
- Only the 15 list items were captured. The surrounding ministry prose (Stoner probability argument, testimony, prayer invitation) was NOT ingested — links plus limited quotation only, per the module's copyright posture.

## Importing on the droplet

1. Open `/review/prophecy/lists/` (admin-token gated, same cookie as the pipeline review surface).
2. Create the list: slug `jewishvoice-messianic`, title `Messianic Prophecies (jewishvoice.org)`, claimedCount left empty (the source states no count for the list; do not enter 324 — see Counts above), description noting the URL above and that entry numbers are the source's own printed 1–15.
3. Open the new list, paste the full contents of `data/prophecy/jewishvoice-messianic.json` into the "Import entries" form, set format to `json` (filename e.g. `jewishvoice-messianic.json`), and run it.
4. Expected result: 15 created, 0 skipped, 0 errors. Re-running the same paste is a no-op (15 skipped) — the import is idempotent per entry number.
