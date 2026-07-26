# Source list: "Chart of Old Testament prophecies fulfilled by Jesus" (about-jesus.org)

Provenance record for `70-about-jesus.json`.

## Source

- URL: https://www.about-jesus.org/complete-chart-prophecies-jesus.htm (single page; the whole chart is on this one URL — no pagination, no other pages fetched)
- Page title (`<title>`): "List of Old Testament prophecies fulfilled by Jesus"; in-page `<h1>`: "Chart of Old Testament prophecies fulfilled by Jesus"
- Site: about-jesus.org (og:site_name "About Jesus")
- Attribution as printed: "This article is contributed by Ray Konig, the author of *301 Prophecies Fulfilled by Jesus*, *Jesus the Messiah*, *Jesus the Prophet*, *Jesus the Miracle Worker*, and *100 Fulfilled Bible Prophecies*." Byline: "By Ray Konig / Published: April 11, 2018. / Revised: May 7, 2024." Footer: "© Ray Konig and About-Jesus.org"
- Accessed: 2026-07-26 (fetched with curl; parsed from the raw HTML)

## Counts

- Claimed total (page body: "The chart below shows 70 major prophecies from the Old Testament that predicted a savior"): **70**
- Actual entries extracted: **70** — claimed and actual match exactly.

Note the page distinguishes this 70-row chart of "major prophecies" from the author's book count of 301 and cites scholarly range 191 (Payne) to 456 (Edersheim); those are commentary, not part of this dataset. This dataset is the 70-row chart only.

## Structure of the source

- The chart is a `<div class="chart-prophecies-jesus">` of `<div class="row">` elements, each with exactly four `<div class="cell">` children: row number, "Bible passage", "Prophecy", "Fulfillment" (per the header row, whose first cell is blank; the header row is not a data row and was not extracted).
- **Rows ARE numbered in the source**, 1–70 in the first cell, sequential with no gaps or duplicates. `entryNumber` is that printed number verbatim (as a string).
- The "Prophecy" description in most rows is a hyperlink to a per-prophecy article on aboutbibleprophecy.com (the author's companion site); 12 rows (13, 15, 35, 41, 43, 44, 54, 56, 57, 58, 62, 67) are plain text with no link. Link targets are not retained in the dataset (tags stripped, text kept); this is noted here instead.
- **Fulfillment cells are not always pure references.** Twelve rows append prose after the NT refs, usually beginning "History: ..." (rows 9, 10, 11, 12, 18, 19, 22, 63, 64, 68) or other explanatory sentences (rows 15, 25, 69). The whole cell is kept verbatim in `originalFulfillmentRefs` — the cell is the source's fulfillment column, prose and all.
- Row 25's fulfillment cell embeds a hyperlink to the author's book: "... according to *Jesus the Miracle Worker*" (Amazon link; text kept, tag stripped).
- Row 69 cites Old Testament passages (Daniel 7:13-14, 12:1-2) in the *fulfillment* column and states "To be fulfilled in the future when Jesus returns." — i.e. the source itself marks it unfulfilled. Kept as printed.
- **Repeated passage refs:** Genesis 3:15 (rows 1, 2, 59), Genesis 49:10 (6, 12), Isaiah 53:7 (38, 39), Isaiah 50:4-10 (43, 44), Daniel 9:24-26 (11, 37), Psalm 110 (63, 69), Malachi 3:1 (19, 21), Isaiah 53:12 (42, 54), plus the Psalm 22 cluster (rows 46-52 covering Psalm 22 / 22:1 / 22:6 / 22:8 / 22:15 / 22:16 / 22:17-18 / 22:18). Not deduplicated — Phase 5 editorial work, not done here.
- **Verbatim oddities preserved on purpose** (nothing was corrected):
  - Row 22 fulfillment: "Jesus began his public ministy in AD 26." — "ministy" typo as printed.
  - Rows 1 and 2 use ASCII double-hyphen dashes ("savior -- the Messiah --") as printed.
  - Straight (ASCII) quote characters throughout: row 32 `"new covenant"`, rows 56/57 `"cut off ..."`, row 42 `'numbered with the transgressors'`.
  - Full book names ("Genesis", "Matthew") rather than abbreviations — unlike the 324-list dataset; kept per source.
  - Row 67 fulfillment ends with a stray trailing period after the refs ("Acts 1:8, 13:47-48.") while row 64's otherwise-identical refs are followed by a History sentence; punctuation kept exactly per cell.

## Parsing decisions

- Extraction unit: one entry per `<div class="row">` (header row excluded); 70 rows, all parsed, none skipped, **none unparseable**.
- Field mapping is by cell position, not guessing: cell 1 → `entryNumber` (printed number verbatim), cell 2 → `originalPassageRefs` (Bible-passage cell verbatim), cell 4 → `originalFulfillmentRefs` (fulfillment cell verbatim, including any "History: ..." prose), cell 3 is the description.
- `originalWording` is the whole row's text joined in reading order — number, passage, description, fulfillment — with tags stripped, whitespace normalized to single spaces, and HTML entities decoded; no other changes. (The printed row number is part of the row, so it leads the wording; it duplicates `entryNumber` by design.)
- Only chart rows were captured. The surrounding article prose (scholar-count commentary, book plugs, related links, sidebar) is commentary, not list entries, and was deliberately excluded (links + limited quotation only, per the site's copyright).
- No entries required a `notes` field.

## Importing on the droplet

1. Open `/review/prophecy/lists/` (admin-token gated, same cookie as the pipeline review surface).
2. Create the list: slug `70-about-jesus`, title `Chart of Old Testament prophecies fulfilled by Jesus (about-jesus.org)`, claimedCount `70`, description noting the URL above, the Ray Konig attribution, and that entry numbers are the chart's own printed row numbers.
3. Open the new list, paste the full contents of `data/prophecy/70-about-jesus.json` into the "Import entries" form, set format to `json` (filename e.g. `70-about-jesus.json`), and run it.
4. Expected result: 70 created, 0 skipped, 0 errors. Re-running the same paste is a no-op (70 skipped) — the import is idempotent per entry number.
