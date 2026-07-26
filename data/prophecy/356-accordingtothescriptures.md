# Source list: "356 Prophecies Fulfilled in Jesus Christ" (accordingtothescriptures.org)

Provenance record for `356-accordingtothescriptures.json`.

## Source

- URL: https://www.accordingtothescriptures.org/prophecy/353prophecies.html
  (the historical filename says "353prophecies"; the page it serves is the
  current, expanded 356-entry version — the list has grown in place over the
  years, which is why this genre circulates as "351/353/356 prophecies").
- Page title: "AccordingtotheScriptures.org :: 356 Prophecies Fulfilled in Jesus Christ"
  (in-page `<h1>`: "356 Prophecies Fulfilled in Jesus Christ")
- Compiler/attribution as printed: the list is published by
  AccordingtotheScriptures.org (footer: "Copyright © 2018
  AccordingtotheScriptures.org. All rights reserved."; HTML meta author:
  "Noel Chartier"). No individual compiler is credited on the list itself.
  A reader comment on the page (Alastair Jolley, May 2025) explicitly
  attributes authorship to the site collectively: "I am not the author of
  '356 Prophecies Fulfilled in Jesus Christ'. They call themselves,
  'According to the Scriptures'."
- Accessed: 2026-07-26 (fetched with `curl -sL`; parsed from the raw HTML,
  ISO-8859-1 encoded).

## Counts

- Claimed total (title/heading): **356**
- Actual entries extracted: **356**

The counts match exactly: the entry table contains 356 `<tr>` rows, numbered
1..356 sequentially with no gaps and no duplicate numbers. Note the mismatch
with the URL (353) and with the "351" count this list is often mirrored
under — those are earlier revisions of the same list; this dataset is the
356-entry version as served at the access date.

## Structure of the source

- The list is a single 3-column HTML table (columns headed "Scripture" /
  "Prophecy" / "Fulfillment" in a separate header table above it). One entry
  per row: first cell = printed number + OT reference, second cell =
  description, third cell = NT fulfillment reference(s).
- Entries ARE numbered in the source ("1." .. "356."), in canonical OT-book
  order (Genesis → Malachi). The printed numbers are used verbatim as
  `entryNumber`.
- Four entries (4, 5, 17, 291) wrap their cells in `data-tooltip` mouseover
  links pointing at commentary/apologetic notes elsewhere on the page. Per
  the capture policy (numbered claim lines only, no surrounding commentary),
  the tooltip note text is NOT captured; the anchor text itself is the claim
  line and is captured normally.
- **No letter-suffixed sub-splits** (unlike the outoftheoverflow list): a
  verse is repeated whole instead. 263 distinct OT refs across 356 entries;
  48 refs appear more than once. Most-repeated: Isa. 9:6 (8 entries),
  Zech. 9:9 (6), Gen. 49:10 (5), Isa. 53:12 (5), Isa. 49:6 / Isa. 53:3 /
  Isa. 53:8 / Isa. 53:10 / Zech. 11:12-13 (4 each), Gen. 3:15 (3).
- No two entries are identical whole lines (number stripped); repeated OT
  refs always carry distinct descriptions. Deduplication against other lists
  is Phase 5 editorial work, not done here.
- **Verbatim oddities preserved on purpose** (this dataset is provenance;
  nothing was corrected):
  - Entry 211 Scripture cell reads `Isa. 40:10.` — trailing period as
    printed.
  - Entries 11 and 144 carry a second OT ref inside the description
    parenthetical, as printed: "Seed of Isaac (Gen. 21:12)" and "He is from
    everlasting (Micah 5:2)". Only the first-cell ref goes in
    `originalPassageRefs`; the parenthetical stays in the wording.
  - Mixed/inconsistent NT abbreviation styles kept per line: `Matthew` vs
    `Mt.`, `Hebrews` vs `Heb.`, `Act 2:30` (entry 160, missing "s"),
    `1Ti 3:16` (entry 294), `Php. 2:5-9` (entry 241), spaceless `1John` /
    `1Peter` / `1Cor.` throughout.
  - Mixed separator styles between multiple fulfillment refs (`,` and `;`,
    sometimes both in one cell) kept as printed.
- Two table rows (163, 233) close their first cell with `</td >` (space
  before `>`); the parser accepts both forms. Cosmetic markup only — the
  entries themselves are ordinary.

## Parsing decisions

- Extraction unit: one entry per `<tr>` of the 356-row entry table (the
  page's third table; tables 1, 2 and 4 are a scripture-quote preamble, the
  column-header row, and the footer). 356 rows, all parsed, none skipped,
  **none unparseable**.
- Field split follows the table cells: cell 1 minus the leading `N.` is
  `originalPassageRefs`; cell 2 is the description; cell 3 is
  `originalFulfillmentRefs` including printed separators. `entryNumber` is
  the printed number from cell 1, verbatim (as a string).
- `originalWording` is the full claim line verbatim — printed number +
  Scripture cell + Prophecy cell + Fulfillment cell in row order — with tags
  stripped, HTML entities decoded, and whitespace normalized to single
  spaces; no other changes.
- Tooltip anchors (`<a data-tooltip=…>`) are stripped like any tag; their
  anchor text is kept in place.
- No entries required a `notes` field (no missing refs, no unparseable
  lines).

## Importing on the droplet

1. Open `/review/prophecy/lists/` (admin-token gated, same cookie as the
   pipeline review surface).
2. Create the list: slug `356-accordingtothescriptures`, title
   `356 Prophecies Fulfilled in Jesus Christ (accordingtothescriptures.org)`,
   claimedCount `356`, description noting the URL above (including that the
   historical filename says 353) and that entry numbers are the source's own
   printed numbers.
3. Open the new list, paste the full contents of
   `data/prophecy/356-accordingtothescriptures.json` into the "Import
   entries" form, set format to `json` (filename e.g.
   `356-accordingtothescriptures.json`), and run it.
4. Expected result: 356 created, 0 skipped, 0 errors. Re-running the same
   paste is a no-op (356 skipped) — the import is idempotent per entry
   number.
