import type { PrismaClient } from "@prisma/client";

// Prophecy module — source-list import (Phase 2 data layer).
//
// A source list's published entries are provenance: they must land in the DB
// EXACTLY as the list gives them (numbering, wording, refs) and must never be
// duplicated or overwritten by a re-import. That drives every choice here:
// - parsing is pure and total: bad rows become error strings, good rows still
//   import, and the whole original row is kept JSON-encoded in `raw` so
//   nothing the parser didn't understand is lost;
// - `runImport` is idempotent per (sourceListId, entryNumber) — the schema's
//   unique constraint is the backstop, but we skip-and-count in the app layer
//   so re-running a file reports "skipped", not a crash;
// - the CSV parser is hand-rolled (RFC-4180-ish: quoted fields, embedded
//   commas/quotes/newlines) because the repo takes no new dependencies for
//   something this small.

export type ImportRow = {
  entryNumber: string;
  originalWording: string;
  originalPassageRefs?: string;
  originalFulfillmentRefs?: string;
  notes?: string;
  raw: string; // JSON.stringify of the original row object, verbatim provenance
};

// Header/key aliases. Published lists name their columns every which way
// ("No.", "Prophecy", "Fulfillment refs"); we resolve them by normalizing to
// lowercase alphanumerics and matching against these alias sets. First alias
// hit wins; unknown columns are ignored (but survive inside `raw`).
const FIELD_ALIASES: Record<
  "entryNumber" | "originalWording" | "originalPassageRefs" | "originalFulfillmentRefs" | "notes",
  string[]
> = {
  entryNumber: ["entrynumber", "entry", "number", "n", "no", "num"],
  originalWording: ["originalwording", "wording", "text", "claim", "prophecy"],
  originalPassageRefs: [
    "originalpassagerefs",
    "passagerefs",
    "passageref",
    "passages",
    "passage",
    "refs",
    "references",
    "reference",
  ],
  originalFulfillmentRefs: [
    "originalfulfillmentrefs",
    "fulfillmentrefs",
    "fulfillmentref",
    "fulfillments",
    "fulfillment",
  ],
  notes: ["notes", "note", "comments", "comment"],
};

// Case/space/punctuation-insensitive key normalization ("Entry Number" →
// "entrynumber", "passage_refs" → "passagerefs").
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Resolve a normalized key to its canonical field name, or null if unknown.
function resolveField(key: string): keyof typeof FIELD_ALIASES | null {
  const norm = normalizeKey(key);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(norm)) return field as keyof typeof FIELD_ALIASES;
  }
  return null;
}

// CSV field escaping (RFC 4180): quote when the value contains a comma,
// quote, or newline; double embedded quotes. Shared with export.ts so import
// and export round-trip through the same rules.
export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

// Hand-rolled RFC-4180-ish record parser. Returns rows of raw string cells.
// Handles: quoted fields, embedded commas/quotes ("" escape)/newlines inside
// quotes, \r\n and \n record separators. Deliberately forgiving about
// unterminated quotes (treats EOF as end of field) — provenance imports are
// one-shot human-supervised runs, not an adversarial input surface.
function parseCsvRecords(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'; // escaped quote
          i += 2;
        } else {
          inQuotes = false;
          i += 1;
        }
      } else {
        field += c;
        i += 1;
      }
    } else if (c === '"') {
      inQuotes = true;
      i += 1;
    } else if (c === ",") {
      pushField();
      i += 1;
    } else if (c === "\r") {
      i += text[i + 1] === "\n" ? 2 : 1;
      pushRow();
    } else if (c === "\n") {
      i += 1;
      pushRow();
    } else {
      field += c;
      i += 1;
    }
  }
  // Flush the trailing record unless the file ended exactly on a newline.
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop records that are entirely empty (blank trailing lines).
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Coerce an arbitrary JSON value to a trimmed string ("14" and 14 are the
// same entry number as far as a source list is concerned).
function asString(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Parse a CSV or JSON import file into ImportRows.
 *
 * JSON: an array of objects; keys are alias-resolved (entryNumber|entry|
 * number|n, originalWording|wording|text|claim, etc.).
 * CSV: header row required, same alias resolution, case/space-insensitive.
 *
 * Rows missing entryNumber or wording become per-row error strings
 * ("row 7: missing entryNumber" — row numbers are 1-based over data rows,
 * i.e. the CSV header row is not counted) while good rows are still
 * returned. File-level problems (invalid JSON, missing header column)
 * produce a single error and no rows.
 */
export function parseImportFile(
  text: string,
  format: "csv" | "json",
): { rows: ImportRow[]; errors: string[] } {
  const rows: ImportRow[] = [];
  const errors: string[] = [];

  // Build an ImportRow from a canonical-field record + the original object,
  // recording per-row errors for the two required fields.
  const addRow = (
    fields: Partial<Record<keyof typeof FIELD_ALIASES, string>>,
    original: Record<string, unknown>,
    rowNum: number,
  ) => {
    const missing: string[] = [];
    if (!fields.entryNumber) missing.push("entryNumber");
    if (!fields.originalWording) missing.push("originalWording");
    if (missing.length) {
      errors.push(...missing.map((m) => `row ${rowNum}: missing ${m}`));
      return;
    }
    rows.push({
      entryNumber: fields.entryNumber!,
      originalWording: fields.originalWording!,
      originalPassageRefs: fields.originalPassageRefs || undefined,
      originalFulfillmentRefs: fields.originalFulfillmentRefs || undefined,
      notes: fields.notes || undefined,
      raw: JSON.stringify(original),
    });
  };

  if (format === "json") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return { rows, errors: [`invalid JSON: ${e instanceof Error ? e.message : String(e)}`] };
    }
    if (!Array.isArray(parsed)) {
      return { rows, errors: ["invalid JSON: expected a top-level array of objects"] };
    }
    parsed.forEach((item, idx) => {
      const rowNum = idx + 1;
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        errors.push(`row ${rowNum}: not an object`);
        return;
      }
      const obj = item as Record<string, unknown>;
      const fields: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
      for (const [key, value] of Object.entries(obj)) {
        const field = resolveField(key);
        // First alias hit wins; don't let a later "text" column overwrite an
        // explicit "originalWording".
        if (field && !fields[field]) fields[field] = asString(value);
      }
      addRow(fields, obj, rowNum);
    });
    return { rows, errors };
  }

  // CSV
  const records = parseCsvRecords(text);
  if (records.length === 0) return { rows, errors: ["empty CSV file"] };

  const headers = records[0].map((h) => h.trim());
  // Column index per canonical field (first alias hit wins, as above).
  const columnFor: Partial<Record<keyof typeof FIELD_ALIASES, number>> = {};
  headers.forEach((h, idx) => {
    const field = resolveField(h);
    if (field && columnFor[field] === undefined) columnFor[field] = idx;
  });
  // A header that resolves neither required column is a file-level error —
  // flagging every data row would just repeat the same mistake N times.
  const headerMissing: string[] = [];
  if (columnFor.entryNumber === undefined) headerMissing.push("entryNumber");
  if (columnFor.originalWording === undefined) headerMissing.push("originalWording");
  if (headerMissing.length) {
    return {
      rows,
      errors: headerMissing.map((m) => `header: no column resolves to ${m}`),
    };
  }

  records.slice(1).forEach((cells, idx) => {
    const rowNum = idx + 1; // 1-based over data rows (header not counted)
    // Original row as a header→value object; short rows pad with "".
    const original: Record<string, string> = {};
    headers.forEach((h, col) => {
      original[h] = (cells[col] ?? "").trim();
    });
    const fields: Partial<Record<keyof typeof FIELD_ALIASES, string>> = {};
    for (const [field, col] of Object.entries(columnFor)) {
      fields[field as keyof typeof FIELD_ALIASES] = (cells[col] ?? "").trim();
    }
    addRow(fields, original, rowNum);
  });

  return { rows, errors };
}

/**
 * Import a parsed file into a source list. Creates a ProphecyImportBatch,
 * then creates one ProphecySourceListEntry per parsed row — UNLESS an entry
 * with that (sourceListId, entryNumber) already exists, in which case the row
 * is counted as skipped and the existing entry is left untouched. Re-running
 * the same file is therefore a no-op (idempotent), and a within-file
 * duplicate entry number is also caught (the first occurrence wins).
 *
 * Batch status: "parsed" when at least one row parsed, "failed" when zero.
 * Parse errors are stored on the batch's notes for later audit.
 */
export async function runImport(
  prisma: PrismaClient,
  args: {
    sourceListId: string;
    format: "csv" | "json";
    filename?: string;
    text: string;
    importedBy?: string;
  },
): Promise<{ batchId: string; created: number; skipped: number; errors: string[] }> {
  const { rows, errors } = parseImportFile(args.text, args.format);

  // The batch record exists even for a failed parse — a bad file is exactly
  // the thing an auditor needs to see.
  const batch = await prisma.prophecyImportBatch.create({
    data: {
      sourceListId: args.sourceListId,
      format: args.format,
      filename: args.filename ?? "",
      importedBy: args.importedBy ?? "",
      status: "pending",
    },
  });

  let created = 0;
  let skipped = 0;

  for (const row of rows) {
    // Sequential check-then-create: an earlier row in this same run that used
    // the same entryNumber will be found here, so in-file dups skip too. The
    // schema's @@unique([sourceListId, entryNumber]) backstops any race.
    const existing = await prisma.prophecySourceListEntry.findUnique({
      where: {
        sourceListId_entryNumber: {
          sourceListId: args.sourceListId,
          entryNumber: row.entryNumber,
        },
      },
      select: { id: true },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.prophecySourceListEntry.create({
      data: {
        sourceListId: args.sourceListId,
        batchId: batch.id,
        entryNumber: row.entryNumber,
        originalWording: row.originalWording,
        originalPassageRefs: row.originalPassageRefs ?? "",
        originalFulfillmentRefs: row.originalFulfillmentRefs ?? "",
        originalRaw: row.raw,
        notes: row.notes ?? "",
      },
    });
    created += 1;
  }

  await prisma.prophecyImportBatch.update({
    where: { id: batch.id },
    data: {
      status: rows.length === 0 ? "failed" : "parsed",
      notes: errors.join("\n"),
    },
  });

  return { batchId: batch.id, created, skipped, errors };
}
