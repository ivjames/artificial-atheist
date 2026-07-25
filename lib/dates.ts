import { DateTime } from "luxon";

// Date helpers ported from the former Eleventy `.eleventy.js` filters. Post
// front-matter dates are date-only (`2026-07-25`) and were parsed by Eleventy
// in UTC; keep that so displayed dates never shift by a timezone.

export function readableDate(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).toFormat("LLLL d, yyyy");
}

export function isoDate(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).toISODate() ?? "";
}

export function shortDate(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).toFormat("LLL d");
}

// Estimated reading time from raw text (~200 wpm), matching the old filter.
export function readingTime(text: string): number {
  const plain = String(text).replace(/<[^>]*>/g, " ");
  const words = plain.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
