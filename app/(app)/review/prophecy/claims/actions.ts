"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MODERATION_STATES, PROPHECY_VOCAB } from "@/lib/prophecy/vocab";
import {
  bulkUpdateClaimStatus,
  createClaim,
  mergeClaims,
  updateClaimStatus,
} from "@/lib/prophecy/claims";
import { assertProphecyAdmin } from "../actions";

const BASE = "/review/prophecy/claims/";

const CATEGORY_KEYS = PROPHECY_VOCAB.filter((t) => t.kind === "category").map((t) => t.key);
const SUBJECT_KEYS = PROPHECY_VOCAB.filter((t) => t.kind === "subject").map((t) => t.key);

export async function createClaimAction(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const text = String(formData.get("text") ?? "").trim();
  if (!text) redirect(`${BASE}?error=text`);

  const summary = String(formData.get("summary") ?? "").trim();
  const categoryKeys = formData
    .getAll("categoryKeys")
    .map(String)
    .filter((k) => CATEGORY_KEYS.includes(k));
  const subjectKeys = formData
    .getAll("subjectKeys")
    .map(String)
    .filter((k) => SUBJECT_KEYS.includes(k));

  let claim: { id?: string } | null = null;
  let failure = "";
  try {
    claim = (await createClaim(prisma, {
      text,
      summary: summary || undefined,
      categoryKeys: categoryKeys.length ? categoryKeys : undefined,
      subjectKeys: subjectKeys.length ? subjectKeys : undefined,
      createdBy: "admin",
    })) as unknown as { id?: string } | null;
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (failure) {
    redirect(`${BASE}?error=create_failed&detail=${encodeURIComponent(failure.slice(0, 200))}`);
  }

  revalidatePath("/review/prophecy/claims");
  if (claim?.id) redirect(`${BASE}${claim.id}/?created=1`);
  redirect(`${BASE}?created=1`);
}

// Status-transition button target. Bound as changeClaimStatus.bind(null, id,
// status) — one form per allowed next status on the detail page.
export async function changeClaimStatus(id: string, status: string): Promise<void> {
  await assertProphecyAdmin();

  const detail = `${BASE}${id}/`;
  // "superseded" is only ever set by mergeClaims, never by a button.
  if (!(MODERATION_STATES as readonly string[]).includes(status) || status === "superseded") {
    redirect(`${detail}?error=status`);
  }

  const claim = await prisma.prophecyClaim.findUnique({ where: { id } });
  if (!claim) notFound();

  // A merged (superseded) claim is frozen. Re-publishing it would put the
  // duplicate back on the public surface while supersededById still points at
  // the survivor — the merge state would be internally inconsistent and the
  // proposition would appear twice. Un-merging is a separate operation that
  // would have to restore the moved mappings, so it is refused here outright.
  if (claim.status === "superseded" || claim.supersededById) {
    redirect(`${detail}?error=status_superseded`);
  }

  let failure = "";
  try {
    await updateClaimStatus(prisma, id, status);
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (failure) {
    redirect(`${detail}?error=status&detail=${encodeURIComponent(failure.slice(0, 200))}`);
  }

  revalidatePath(`/review/prophecy/claims/${id}`);
  revalidatePath("/review/prophecy/claims");
}

// Bulk status transition over everything matching the index's current filters.
//
// Publishing is what makes a claim public, so this is the one control here that
// changes what the world can see — hence the explicit confirm checkbox in the
// form and the fact that the reverse (→ draft) is offered alongside it, so a
// mistaken publish is one click to undo rather than a support incident.
export async function bulkChangeClaimStatus(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  // Round-trip the filters so the redirect lands back on the same view the
  // operator was looking at when they pressed the button.
  const q = String(formData.get("q") ?? "").trim();
  const statusFilter = String(formData.get("statusFilter") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const back = new URLSearchParams();
  if (q) back.set("q", q);
  if (statusFilter) back.set("status", statusFilter);
  if (category) back.set("category", category);
  const backTo = (extra: Record<string, string>) => {
    const p = new URLSearchParams(back);
    for (const [k, v] of Object.entries(extra)) p.set(k, v);
    return `${BASE}?${p.toString()}`;
  };

  const target = String(formData.get("target") ?? "").trim();
  if (!(MODERATION_STATES as readonly string[]).includes(target) || target === "superseded") {
    redirect(backTo({ error: "status" }));
  }
  // Unchecked checkboxes aren't submitted at all, so this is a real gate: a
  // stray click on "Publish" can't put hundreds of claims on the live site.
  if (!formData.get("confirm")) {
    redirect(backTo({ error: "bulk_unconfirmed" }));
  }

  const minRaw = String(formData.get("minMeanScore") ?? "").trim();
  const minParsed = minRaw === "" ? undefined : Number.parseFloat(minRaw);
  if (minParsed != null && (!Number.isFinite(minParsed) || minParsed < 0 || minParsed > 5)) {
    redirect(backTo({ error: "bulk_min_score" }));
  }

  let failure = "";
  let result: Awaited<ReturnType<typeof bulkUpdateClaimStatus>> | null = null;
  try {
    // NOTE: `status` on this argument object is the TARGET to move claims to.
    // The selection filter is `statusFilter`, passed as `filterStatus`. Same
    // word, opposite roles — an easy pair to transpose.
    result = await bulkUpdateClaimStatus(prisma, {
      q: q || undefined,
      filterStatus: statusFilter || undefined,
      categoryKey: category || undefined,
      status: target,
      minMeanScore: minParsed,
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (failure) {
    redirect(backTo({ error: "bulk_failed", detail: failure.slice(0, 200) }));
  }

  revalidatePath("/review/prophecy/claims");
  // The public surface reads published claims, so it has to be rebuilt too or
  // the site stays empty after a successful publish.
  revalidatePath("/prophecy");
  revalidatePath("/prophecy/claims");

  const r = result!;
  if (r.failed > 0) {
    // A partial run must never look like a clean one — the operator has to know
    // some claims are still at the old status before they walk away.
    console.error(`bulkChangeClaimStatus: ${r.failed} failed\n${r.errors.join("\n")}`);
  }
  redirect(
    backTo({
      bulk: target,
      updated: String(r.updated),
      skipped: String(r.skippedSuperseded + r.skippedBelowScore + r.skippedAlready),
      below: String(r.skippedBelowScore),
      failed: String(r.failed),
      detail: r.errors[0]?.slice(0, 200) ?? "",
    }),
  );
}

// Merge ANOTHER claim (the duplicate) INTO the claim whose detail page hosts
// the form (the canonical survivor). Supersedes, never deletes.
export async function mergeIntoClaim(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const canonicalId = String(formData.get("canonicalId") ?? "").trim();
  const canonical = canonicalId
    ? await prisma.prophecyClaim.findUnique({ where: { id: canonicalId } })
    : null;
  if (!canonical) notFound();

  const detail = `${BASE}${canonical.id}/`;

  const ref = String(formData.get("duplicateRef") ?? "").trim();
  if (!ref) redirect(`${detail}?error=merge_ref`);

  const duplicate = await prisma.prophecyClaim.findFirst({
    where: { OR: [{ slug: ref }, { id: ref }] },
  });
  if (!duplicate) {
    redirect(`${detail}?error=merge_not_found&detail=${encodeURIComponent(ref.slice(0, 100))}`);
  }
  if (duplicate.id === canonical.id) {
    redirect(`${detail}?error=merge_self`);
  }

  const note = String(formData.get("note") ?? "").trim();

  let failure = "";
  try {
    await mergeClaims(prisma, {
      duplicateId: duplicate.id,
      canonicalId: canonical.id,
      note: note || undefined,
    });
  } catch (e) {
    failure = e instanceof Error ? e.message : "unknown error";
  }
  if (failure) {
    redirect(`${detail}?error=merge_failed&detail=${encodeURIComponent(failure.slice(0, 200))}`);
  }

  revalidatePath(`/review/prophecy/claims/${canonical.id}`);
  revalidatePath("/review/prophecy/claims");
  redirect(`${detail}?merged=${encodeURIComponent(duplicate.slug)}`);
}
