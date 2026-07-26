# Prophecy source lists — passage-level overlap

**Mechanical passage-level statistics — derived from verbatim ref strings, NOT reviewed editorial findings.**

Grouping key = canonical book + chapter + first verse of the FIRST ref in each
entry's passage cell ("Isa 53:5a", "Isaiah 53:5" and "Isaiah 53:5, 12" all key
to `Isaiah 53:5`; ranges key on their start verse, so "Isa 53:4-6" keys to
`Isaiah 53:4` and does NOT merge with `Isaiah 53:5` despite overlapping). See
`lib/prophecy/normalize.ts` for the exact rules.

## Per-list counts

| List | Entries | Distinct refKeys |
|---|---:|---:|
| 301-aboutbibleprophecy | 301 | 168 |
| 324-outoftheoverflow-2008 | 315 | 218 |
| 356-accordingtothescriptures | 356 | 255 |
| 70-about-jesus | 70 | 55 |
| jewishvoice-messianic | 15 | 13 |
| **Total** | **1057** | **329** (distinct across all lists) |

1057 entries collapse to 329 distinct passage keys across the five lists.

## Pairwise shared refKeys (5x5)

Diagonal = the list's own distinct-key count.

| | 301 | 324 | 356 | 70 | JV |
|---|---:|---:|---:|---:|---:|
| 301 | **168** | 103 | 110 | 45 | 11 |
| 324 | 103 | **218** | 212 | 40 | 11 |
| 356 | 110 | 212 | **255** | 41 | 11 |
| 70 | 45 | 40 | 41 | **55** | 5 |
| JV | 11 | 11 | 11 | 5 | **13** |

## refKeys by number of lists citing them

| Lists citing | refKeys |
|---:|---:|
| all 5 | 5 |
| exactly 4 | 39 |
| exactly 3 | 62 |
| exactly 2 | 119 |
| exactly 1 | 104 |

Cited by all five lists: `Isaiah 53:7`, `Isaiah 53:9`, `Isaiah 7:14`, `Psalms 22:16`, `Zechariah 9:9`.

## Top 15 most-cited refKeys (by entry count)

| refKey | Total entries | 301 | 324 | 356 | 70 | JV |
|---|---:|---:|---:|---:|---:|---:|
| Isaiah 9:6 | 21 | 4 | 8 | 8 | 1 | 0 |
| Zechariah 9:9 | 18 | 4 | 5 | 6 | 2 | 1 |
| Genesis 49:10 | 17 | 5 | 5 | 5 | 2 | 0 |
| Isaiah 53:12 | 17 | 5 | 5 | 5 | 2 | 0 |
| Daniel 7:13 | 13 | 6 | 3 | 3 | 1 | 0 |
| Genesis 3:15 | 13 | 5 | 2 | 3 | 3 | 0 |
| Isaiah 53:10 | 13 | 4 | 4 | 4 | 1 | 0 |
| Isaiah 53:5 | 13 | 7 | 3 | 3 | 0 | 0 |
| Isaiah 53:8 | 13 | 4 | 4 | 4 | 1 | 0 |
| Isaiah 61:1 | 13 | 4 | 4 | 4 | 1 | 0 |
| Isaiah 53:7 | 12 | 3 | 3 | 3 | 2 | 1 |
| Isaiah 53:9 | 12 | 3 | 3 | 3 | 1 | 2 |
| Zechariah 12:10 | 12 | 5 | 3 | 3 | 1 | 0 |
| Daniel 9:24 | 11 | 2 | 2 | 3 | 4 | 0 |
| Isaiah 50:6 | 11 | 4 | 3 | 3 | 1 | 0 |

## Unparseable passage refs

None — every entry's passage cell yielded a recognizable book reference.

## Isaiah 53 case study

Entries whose first passage ref falls in Isaiah 53 (any verse): 123 of 1057, across 12 distinct verse-level keys.

| List | Isaiah 53 entries |
|---|---:|
| 301-aboutbibleprophecy | 38 |
| 324-outoftheoverflow-2008 | 38 |
| 356-accordingtothescriptures | 35 |
| 70-about-jesus | 9 |
| jewishvoice-messianic | 3 |

---

Generated 2026-07-26T19:47:41.654Z by `scripts/prophecy-overlap.ts`.
