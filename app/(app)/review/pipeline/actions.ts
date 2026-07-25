"use server";

import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CHAT_ENABLED } from "@/lib/config";
import { prisma } from "@/lib/prisma";
import { runClustering } from "@/lib/pipeline/cluster";
import { draftArticle } from "@/lib/pipeline/draft";
import { scrubArticle } from "@/lib/pipeline/scrub";
import { toArticleFile, slugify, pacificDateISO } from "@/lib/pipeline/emit";
import { ADMIN_COOKIE, ADMIN_COOKIE_MAX_AGE, adminToken, isAdminAuthed } from "./auth";

// Every action below re-checks the admin cookie itself — server actions are
// independently invokable network endpoints, so the page-level gate alone
// is not enough. !CHAT_ENABLED means the feature doesn't exist (notFound);
// an unauthenticated admin gets sent back to the login form on the same page.
async function assertAdmin(): Promise<void> {
  if (!CHAT_ENABLED) notFound();
  if (!(await isAdminAuthed())) redirect("/review/pipeline");
}

// Sets the httpOnly admin cookie once the submitted token matches ADMIN_TOKEN.
// This is the one admin action that runs WITHOUT an existing valid cookie —
// that's the point of it.
export async function loginWithToken(formData: FormData): Promise<void> {
  if (!CHAT_ENABLED) notFound();
  const token = adminToken();
  if (!token) notFound();

  const submitted = String(formData.get("token") ?? "");
  if (submitted !== token) {
    redirect("/review/pipeline?error=1");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/review/pipeline");
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/review/pipeline");
}

// Runs clustering (§5 step 2) on demand instead of waiting for the scheduled
// job. Distinct-user threshold logic lives entirely in lib/pipeline/cluster.
export async function runClusterNow(): Promise<void> {
  await assertAdmin();
  await runClustering();
  revalidatePath("/review/pipeline");
}

// Runs Slot B (write) then Slot C (scrub) for a queued draft, landing it in
// "review" status. Nothing here publishes — that's approveDraft, and only a
// human clicking Approve triggers it.
export async function draftNow(id: string): Promise<void> {
  await assertAdmin();
  await draftArticle(id);
  await scrubArticle(id);
  revalidatePath("/review/pipeline");
}

// Human approval (the only path to "approved"). Stages the emitted AA
// markdown file into pipeline-output/ at the repo root — committing that
// file into the artificial-atheist repo's src/posts/ is a deliberate,
// separate, manual step (this app has no access to that repo).
export async function approveDraft(id: string): Promise<void> {
  await assertAdmin();
  const draft = await prisma.articleDraft.findUniqueOrThrow({ where: { id } });

  const dateISO = pacificDateISO();
  const { filename, content } = toArticleFile(draft, dateISO);
  const publishedSlug = slugify(draft.title ?? "untitled");

  const outDir = path.join(process.cwd(), "pipeline-output");
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, filename), content, "utf8");

  await prisma.articleDraft.update({
    where: { id },
    data: { status: "approved", publishedSlug, reviewedBy: "admin" },
  });

  revalidatePath("/review/pipeline");
  redirect(`/review/pipeline?approved=${encodeURIComponent(filename)}`);
}

export async function rejectDraft(id: string): Promise<void> {
  await assertAdmin();
  await prisma.articleDraft.update({
    where: { id },
    data: { status: "rejected", reviewedBy: "admin" },
  });
  revalidatePath("/review/pipeline");
}

export async function updateDraftMeta(
  id: string,
  title: string,
  excerpt: string,
): Promise<void> {
  await assertAdmin();
  await prisma.articleDraft.update({
    where: { id },
    data: { title: title.trim(), excerpt: excerpt.trim() },
  });
  revalidatePath("/review/pipeline");
}
