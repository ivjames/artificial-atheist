import type { PrismaClient } from "@prisma/client";
import { createClaim, mapEntryToClaim } from "@/lib/prophecy/claims";

// Prophecy module — AI claim-draft loader.
//
// Turns an AI-drafted claim-normalization file (data/prophecy/
// claims-draft-v1.json) into draft-status DB records. House rules, in order
// of importance:
// - PROVENANCE IS MANDATORY: the file's meta.model/promptVersion/generatedAt
//   must be present or the WHOLE file is refused — AI output without an audit
//   trail never enters the DB. Created claims get createdBy "ai:<model>" and
//   a creation-revision note carrying the full provenance line; created
//   mappings get an "[ai-draft] " rationale prefix.
// - NEVER DELETE OR OVERWRITE: an existing claim slug is skipped untouched
//   (a human may have edited it — re-runs must not clobber that), but its
//   MISSING mappings are still created; an existing (claim, entry) map is
//   skipped, never upserted-over. Re-running the same file is a no-op.
// - DEGRADE PER ITEM: unknown lists/entries, bad vocab keys, bad match types
//   become error strings; the rest of the file still loads. One bad claim
//   cannot abort the run.

export type DraftLoadResult = {
  claimsCreated: number;
  claimsSkipped: number;
  mappingsCreated: number;
  mappingsSkipped: number;
  errors: string[];
};

// --- shape helpers (manual validation — the repo takes no zod) -------------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Non-empty trimmed string or null.
function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

// Optional string (missing/non-string → "").
function optStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

// Array of non-empty strings (missing → []; anything else → null = invalid).
function strArray(v: unknown): string[] | null {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v)) return null;
  const out: string[] = [];
  for (const item of v) {
    const s = str(item);
    if (s === null) return null;
    out.push(s);
  }
  return out;
}

/**
 * Load an AI-drafted claim-normalization file into draft-status records.
 *
 * File-level problems (unparseable JSON, wrong top-level shape, missing
 * provenance meta) refuse the whole file with a single error and zero
 * writes. Otherwise each claim is processed independently:
 * - existing slug → claimsSkipped, claim left untouched, but its mappings
 *   are still resolved and any missing ones created;
 * - new slug → createClaim (status stays "draft"), createdBy "ai:<model>",
 *   provenance stamped on the creation revision; the file's slug is
 *   authoritative (it is the idempotency key), so the freshly created row is
 *   aligned to it when createClaim's text-derived slug differs.
 * Mappings resolve listSlug → ProphecySourceList and (list, entryNumber) →
 * ProphecySourceListEntry; unknown references become per-item errors. An
 * existing (claim, entry) map is counted skipped — mapEntryToClaim upserts,
 * so it is deliberately NOT called for pairs that already exist.
 */
export async function loadClaimDrafts(
  prisma: PrismaClient,
  fileText: string,
): Promise<DraftLoadResult> {
  const result: DraftLoadResult = {
    claimsCreated: 0,
    claimsSkipped: 0,
    mappingsCreated: 0,
    mappingsSkipped: 0,
    errors: [],
  };
  const refuse = (msg: string): DraftLoadResult => ({ ...result, errors: [msg] });

  // --- file-level validation: any failure here refuses the whole file ------
  let parsed: unknown;
  try {
    parsed = JSON.parse(fileText);
  } catch (e) {
    return refuse(`invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!isRecord(parsed)) return refuse("invalid file: expected a top-level object");

  const meta = parsed.meta;
  if (!isRecord(meta)) {
    return refuse(
      "invalid file: missing meta — provenance is mandatory for AI output, refusing the whole file",
    );
  }
  const model = str(meta.model);
  const promptVersion = str(meta.promptVersion);
  const generatedAt = str(meta.generatedAt);
  if (!model || !promptVersion || !generatedAt) {
    return refuse(
      "invalid file: meta.model, meta.promptVersion, and meta.generatedAt are required — provenance is mandatory for AI output, refusing the whole file",
    );
  }

  const claims = parsed.claims;
  if (!Array.isArray(claims)) return refuse("invalid file: claims must be an array");

  const provenance = `AI draft — model=${model} promptVersion=${promptVersion} generatedAt=${generatedAt}`;

  // listSlug → source list id (null = known-missing), cached across claims.
  const listIdBySlug = new Map<string, string | null>();
  const resolveListId = async (listSlug: string): Promise<string | null> => {
    if (!listIdBySlug.has(listSlug)) {
      const list = await prisma.prophecySourceList.findUnique({
        where: { slug: listSlug },
        select: { id: true },
      });
      listIdBySlug.set(listSlug, list?.id ?? null);
    }
    return listIdBySlug.get(listSlug) ?? null;
  };

  // --- per-claim processing (one bad claim never aborts the run) -----------
  for (let ci = 0; ci < claims.length; ci += 1) {
    const rawClaim: unknown = claims[ci];
    const label = () =>
      isRecord(rawClaim) && str(rawClaim.slug) ? `claim "${str(rawClaim.slug)}"` : `claim #${ci + 1}`;

    try {
      if (!isRecord(rawClaim)) {
        result.errors.push(`${label()}: not an object`);
        continue;
      }
      const slug = str(rawClaim.slug);
      const text = str(rawClaim.text);
      if (!slug || !text) {
        result.errors.push(`${label()}: slug and text are required non-empty strings`);
        continue;
      }
      const categoryKeys = strArray(rawClaim.categoryKeys);
      const subjectKeys = strArray(rawClaim.subjectKeys);
      if (categoryKeys === null || subjectKeys === null) {
        result.errors.push(`${label()}: categoryKeys/subjectKeys must be string arrays`);
        continue;
      }
      const mappings = rawClaim.mappings ?? [];
      if (!Array.isArray(mappings)) {
        result.errors.push(`${label()}: mappings must be an array`);
        continue;
      }

      // Resolve the claim: existing slug is skipped UNTOUCHED (a human may
      // have edited it), new slug is created as a draft with provenance.
      const existing = await prisma.prophecyClaim.findUnique({
        where: { slug },
        select: { id: true },
      });
      let claimId: string;
      if (existing) {
        claimId = existing.id;
        result.claimsSkipped += 1;
      } else {
        const created = await createClaim(prisma, {
          text,
          summary: optStr(rawClaim.summary) || undefined,
          categoryKeys: categoryKeys.length ? categoryKeys : undefined,
          subjectKeys: subjectKeys.length ? subjectKeys : undefined,
          createdBy: `ai:${model}`,
          revisionNote: provenance,
        });
        claimId = created.id;
        // The file's slug is the idempotency key, so the stored row must
        // carry it. createClaim derives its slug from the text; align the
        // just-created row when they differ (we already know the file slug
        // is free — the findUnique above returned nothing; the @unique
        // backstops any race). This touches only the row created moments
        // ago, never pre-existing data.
        if (created.slug !== slug) {
          await prisma.prophecyClaim.update({ where: { id: claimId }, data: { slug } });
        }
        result.claimsCreated += 1;
      }

      // Mappings run for created AND skipped claims — a re-run with new
      // mappings still fills the gaps. Per-mapping try/catch so one bad
      // reference doesn't sink its siblings.
      for (let mi = 0; mi < mappings.length; mi += 1) {
        const rawMap: unknown = mappings[mi];
        try {
          if (!isRecord(rawMap)) {
            result.errors.push(`${label()} mapping #${mi + 1}: not an object`);
            continue;
          }
          const listSlug = str(rawMap.listSlug);
          const entryNumber = str(rawMap.entryNumber);
          if (!listSlug || !entryNumber) {
            result.errors.push(
              `${label()} mapping #${mi + 1}: listSlug and entryNumber are required non-empty strings`,
            );
            continue;
          }
          const mapLabel = `${label()} mapping ${listSlug}#${entryNumber}`;

          const sourceListId = await resolveListId(listSlug);
          if (!sourceListId) {
            result.errors.push(`${mapLabel}: unknown source list "${listSlug}"`);
            continue;
          }
          const entry = await prisma.prophecySourceListEntry.findUnique({
            where: { sourceListId_entryNumber: { sourceListId, entryNumber } },
            select: { id: true },
          });
          if (!entry) {
            result.errors.push(`${mapLabel}: no entry "${entryNumber}" in list "${listSlug}"`);
            continue;
          }

          // Existing map → skip. mapEntryToClaim upserts, so calling it here
          // would overwrite a possibly human-refined mapping — never do that.
          const existingMap = await prisma.prophecyClaimEntryMap.findUnique({
            where: { claimId_entryId: { claimId, entryId: entry.id } },
            select: { id: true },
          });
          if (existingMap) {
            result.mappingsSkipped += 1;
            continue;
          }

          // matchType/confidence validation is mapEntryToClaim's job — its
          // throws land in this catch and become per-item errors.
          await mapEntryToClaim(prisma, {
            claimId,
            entryId: entry.id,
            matchType: optStr(rawMap.matchType),
            confidence: typeof rawMap.confidence === "number" ? rawMap.confidence : NaN,
            rationale: `[ai-draft] ${optStr(rawMap.rationale)}`,
          });
          result.mappingsCreated += 1;
        } catch (e) {
          result.errors.push(
            `${label()} mapping #${mi + 1}: ${e instanceof Error ? e.message : String(e)}`,
          );
        }
      }
    } catch (e) {
      result.errors.push(`${label()}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
