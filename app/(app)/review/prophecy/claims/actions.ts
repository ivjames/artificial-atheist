"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { MODERATION_STATES, PROPHECY_VOCAB } from "@/lib/prophecy/vocab";
import { createClaim, mergeClaims, updateClaimStatus } from "@/lib/prophecy/claims";
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
