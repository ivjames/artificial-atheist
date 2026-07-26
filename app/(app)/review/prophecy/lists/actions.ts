"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MATCH_TYPES } from "@/lib/prophecy/vocab";
import { runImport } from "@/lib/prophecy/import";
import { mapEntryToClaim } from "@/lib/prophecy/claims";
import { assertProphecyAdmin } from "../actions";

const BASE = "/review/prophecy/lists/";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "list"
  );
}

export async function createList(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${BASE}?error=title`);

  const sourceId = String(formData.get("sourceId") ?? "").trim();
  if (sourceId) {
    const src = await prisma.prophecySource.findUnique({ where: { id: sourceId } });
    if (!src) redirect(`${BASE}?error=source`);
  }

  const countRaw = String(formData.get("claimedCount") ?? "").trim();
  let claimedCount: number | null = null;
  if (countRaw) {
    const n = Number.parseInt(countRaw, 10);
    if (!Number.isInteger(n) || String(n) !== countRaw || n < 0 || n > 100000) {
      redirect(`${BASE}?error=count`);
    }
    claimedCount = n;
  }

  const base = slugify(title);
  let slug = base;
  for (let n = 2; await prisma.prophecySourceList.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }

  const created = await prisma.prophecySourceList.create({
    data: { slug, title, sourceId: sourceId || null, claimedCount },
  });

  revalidatePath("/review/prophecy/lists");
  redirect(`${BASE}${created.id}/?created=1`);
}

// Import pasted CSV/JSON into a source list via lib/prophecy/import.runImport.
// Results ({created, skipped, errors}) surface as redirect query params.
export async function importIntoList(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const listId = String(formData.get("listId") ?? "").trim();
  const list = listId
    ? await prisma.prophecySourceList.findUnique({ where: { id: listId } })
    : null;
  if (!list) notFound();

  const detail = `${BASE}${list.id}/`;

  const format = String(formData.get("format") ?? "").trim();
  if (format !== "csv" && format !== "json") redirect(`${detail}?error=format`);

  const text = String(formData.get("text") ?? "").trim();
  if (!text) redirect(`${detail}?error=empty`);

  const filename = String(formData.get("filename") ?? "").trim();

  let result: { batchId: string; created: number; skipped: number; errors: string[] } | null = null;
  let failure = "";
  try {
    result = await runImport(prisma, {
      sourceListId: list.id,
      format,
      filename: filename || undefined,
      text,
      importedBy: "admin",
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (!result) {
    redirect(`${detail}?error=import_failed&detail=${encodeURIComponent(failure.slice(0, 200))}`);
  }

  const errs = Array.isArray(result.errors) ? result.errors : [];
  const params = new URLSearchParams({
    created: String(result.created),
    skipped: String(result.skipped),
    errors: String(errs.length),
  });
  if (errs.length) {
    params.set("errdetail", errs.slice(0, 3).map(String).join(" | ").slice(0, 300));
  }

  revalidatePath(`/review/prophecy/lists/${list.id}`);
  redirect(`${detail}?${params.toString()}`);
}

// Map one verbatim source-list entry onto a normalized claim. The claim is
// addressed by slug OR id (text input); unresolved refs come back as
// ?error=claim_not_found so the operator stays on the entries table.
export async function mapEntry(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const listId = String(formData.get("listId") ?? "").trim();
  const entryId = String(formData.get("entryId") ?? "").trim();
  const entry = entryId
    ? await prisma.prophecySourceListEntry.findUnique({ where: { id: entryId } })
    : null;
  if (!entry || entry.sourceListId !== listId) notFound();

  const detail = `${BASE}${listId}/`;

  const ref = String(formData.get("claimRef") ?? "").trim();
  if (!ref) redirect(`${detail}?error=claim`);

  const matchType = String(formData.get("matchType") ?? "").trim();
  if (!(MATCH_TYPES as readonly string[]).includes(matchType)) {
    redirect(`${detail}?error=matchtype`);
  }

  const confRaw = String(formData.get("confidence") ?? "").trim();
  const confidence = Number.parseInt(confRaw, 10);
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 5) {
    redirect(`${detail}?error=confidence`);
  }

  const rationale = String(formData.get("rationale") ?? "").trim();

  const claim = await prisma.prophecyClaim.findFirst({
    where: { OR: [{ slug: ref }, { id: ref }] },
  });
  if (!claim) {
    redirect(`${detail}?error=claim_not_found&detail=${encodeURIComponent(ref.slice(0, 100))}`);
  }

  let failure = "";
  try {
    await mapEntryToClaim(prisma, {
      claimId: claim.id,
      entryId: entry.id,
      matchType,
      confidence,
      rationale: rationale || undefined,
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (failure) {
    redirect(`${detail}?error=map_failed&detail=${encodeURIComponent(failure.slice(0, 200))}`);
  }

  revalidatePath(`/review/prophecy/lists/${listId}`);
  redirect(`${detail}?mapped=${encodeURIComponent(entry.entryNumber)}`);
}
