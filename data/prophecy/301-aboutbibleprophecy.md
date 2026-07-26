# Source list: "301 Prophecies Fulfilled by Jesus" (Ray Konig, aboutbibleprophecy.com)

Provenance record for `301-aboutbibleprophecy.json`.

## Source

- URL: https://www.aboutbibleprophecy.com/301-prophecies-fulfilled-by-jesus.htm (canonical per the page's own `<link rel="canonical">`)
- Page title: "301 Prophecies Fulfilled by Jesus"
- Author/site attribution as printed: "By Ray Konig", site "About Bible Prophecy" (aboutbibleprophecy.com). The page states the chart is from Konig's book *301 Prophecies Fulfilled by Jesus* and is "reprinted here at AboutBibleProphecy.com with permission from Ray Konig"; footer: "© Ray Konig. Reprinted here with permission from Ray Konig and from Zealization Publishing House."
- Published (as printed on the page): January 31, 2026
- Accessed: 2026-07-26 (fetched with curl; parsed from the raw HTML)

## Copyright scope — what was and was not captured

This is an authored, in-copyright work (© Ray Konig / Zealization Publishing House).
**Only the index chart lines were captured**: for each numbered row, the printed
number, the "Bible passage" cell, the short "Prophecy" title cell, and the
"Fulfillment" cell, exactly as they appear in the chart on the index page. No
per-prophecy article pages were fetched, no explanation paragraphs or surrounding
prose were reproduced, and nothing beyond the single index page was retrieved.
The chart rows contain no hyperlinks to detail pages, so no detail-page URLs
exist to record in `notes` (no entry has a `notes` field).

## Counts

- Claimed total (title/heading and the page's own framing): **301**
- Actual entries extracted: **301**

The chart contains exactly 301 rows, numbered 1 through 301 consecutively with
no gaps or duplicates. Full coverage; nothing was padded or inferred.

## Structure of the source

- The list is a single `<div class="chart-301">` containing one header row
  (columns: blank / "Bible passage" / "Prophecy" / "Fulfillment") and 301
  `<div class="row">` rows of four `<span class="cell">` cells each:
  number, OT passage, short prophecy title, fulfillment.
- Rows ARE numbered in the source (1..301); `entryNumber` uses those printed
  numbers verbatim.
- Ordering is canonical OT-book order (Genesis 3:15 → Malachi 3:1), with one
  passage often split across several consecutive numbered rows (e.g. Genesis
  3:15 = entries 1-5; Genesis 49:10 = 18-22).
- **The Fulfillment column is not always scripture refs.** 50 of the 301
  fulfillment cells contain no chapter:verse citation:
  - 11 cite whole chapters only (e.g. #59 "Matthew 28, Mark 16, Luke 24, John 20").
  - 39 are prose appeals to history or mixed prose (e.g. #27 "The record of
    history", #187 "Historical record: worldwide spread of Christianity",
    #301 "Jesus is the one and only person to have ever been widely accepted as
    being the promised Messiah"). A further 8 mix verse refs with prose (e.g.
    #20 "Luke 1:32-33, record of history").
  These cells were kept verbatim in `originalFulfillmentRefs` — the field holds
  whatever the Fulfillment column printed, refs or not. No fulfillment cell and
  no passage cell is empty, so the "empty originalPassageRefs" pattern flagged
  as possible does not occur in this source.
- **Repeated passage refs:** 183 distinct OT refs across 301 entries; 67 refs
  appear more than once. Most-repeated: Isaiah 53:5 (7 entries); Genesis 3:15,
  Genesis 49:10, 2 Samuel 7:14, Isaiah 53:12, Daniel 7:13-14, Zechariah 12:10
  (5 each).
- **Letter-suffixed refs:** exactly one, `2 Samuel 7:14a` (entry 41); kept as
  printed. Full book names throughout (no "Gen"/"Mt" abbreviations, unlike the
  324-outoftheoverflow list).
- **Verbatim oddities preserved on purpose** (provenance; nothing corrected):
  - Mixed quote styles: most cells use typographic curly quotes (HTML entities
    `&lsquo;`/`&rsquo;`, decoded to ‘ ’), but a few cells use straight ASCII
    quotes/apostrophes — e.g. entry 271's prophecy cell prints "‘cut off,’"
    (curly) while its fulfillment cell prints "'cut off,'" (straight); entries
    107, 281, 288 use straight apostrophes. Kept exactly as each cell prints.
  - ASCII double-hyphen dashes as printed (e.g. #5 "restore what Adam and Eve
    lost -- eternal life…", #28 "like Moses -- a prophet…").
  - Mixed ref separators within one fulfillment cell (commas, semicolons,
    "and": #14 "Matthew 1:1-2 and Luke 3:34"; #297 ends "…John 18:22, 19:1-3;
    etc." — the "etc." is the source's own).
  - #28's fulfillment cell ends with a period ("…leader, intermediary."); most
    cells have no terminal punctuation.
  - #289 cites an extra-biblical source: "Acts 1-7, historical record
    (Antiquities 20.9.1)".

## Parsing decisions

- Extraction unit: one entry per `<div class="row">` in `chart-301` (header row
  excluded); 301 rows, all parsed with exactly 4 cells, none skipped, none
  unparseable.
- Field mapping is positional, driven by the chart's own columns: cell 1 →
  `entryNumber` (printed number verbatim); cell 2 → `originalPassageRefs`;
  cell 4 → `originalFulfillmentRefs`; cell 3 (the prophecy title) appears only
  inside `originalWording`.
- `originalWording` is the full index line verbatim — the four cells joined in
  printed order (number, passage, title, fulfillment) — with tags stripped,
  HTML entities decoded to Unicode, and whitespace normalized to single
  spaces. No other changes.
- No `notes` fields were needed (no detail-page links, no unparseable rows,
  no empty cells).

## Importing on the droplet

1. Open `/review/prophecy/lists/` (admin-token gated, same cookie as the
   pipeline review surface).
2. Create the list: slug `301-aboutbibleprophecy`, title `301 Prophecies
   Fulfilled by Jesus (Ray Konig, aboutbibleprophecy.com)`, claimedCount `301`,
   description noting the URL above, the Ray Konig / About Bible Prophecy
   attribution, and that only the index chart lines were captured (in-copyright
   work; no article prose).
3. Open the new list, paste the full contents of
   `data/prophecy/301-aboutbibleprophecy.json` into the "Import entries" form,
   set format to `json` (filename e.g. `301-aboutbibleprophecy.json`), and run it.
4. Expected result: 301 created, 0 skipped, 0 errors. Re-running the same paste
   is a no-op (0 created, 301 skipped) — the import is idempotent per entry
   number.
