"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { loadClaimDrafts } from "@/lib/prophecy/draftload";
import { bootstrapProphecyData } from "@/lib/prophecy/bootstrap";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminToken,
  isAdminAuthed,
} from "../pipeline/auth";

// The prophecy admin surface reuses the same shared admin token/cookie as the
// article pipeline (one operator, one secret). Like /review/adversary it is
// NOT gated on CHAT_ENABLED — this is an operator tool that works while the
// chat surface is dark. An unset ADMIN_TOKEN means the surface doesn't exist
// at all (notFound), never "open".

// Every prophecy server action re-checks the cookie itself — actions are
// independently invokable network endpoints, so page-level gates alone are
// not enough. Unauthenticated callers land on the dashboard's login form.
export async function assertProphecyAdmin(): Promise<void> {
  if (!adminToken()) notFound();
  if (!(await isAdminAuthed())) redirect("/review/prophecy/");
}

// Sets the httpOnly admin cookie once the submitted token matches ADMIN_TOKEN.
// This is the one action that runs WITHOUT an existing valid cookie.
export async function loginWithToken(formData: FormData): Promise<void> {
  const token = adminToken();
  if (!token) notFound();

  const submitted = String(formData.get("token") ?? "");
  if (submitted !== token) {
    redirect("/review/prophecy/?error=1");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/review/prophecy/");
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/review/prophecy/");
}

// One-click loader for the AI-drafted claim-normalization file. Reads
// data/prophecy/claims-draft-v1.json from the deployed working tree and turns
// it into draft claims + entry mappings (idempotent — see lib/prophecy/
// draftload.ts). The redirect carries only counts; individual error strings
// go to the server log so the URL stays small.
export async function loadClaimDraftsAction(): Promise<void> {
  await assertProphecyAdmin();

  const filePath = path.join(process.cwd(), "data", "prophecy", "claims-draft-v1.json");
  let fileText: string | null = null;
  try {
    fileText = await readFile(filePath, "utf8");
  } catch {
    fileText = null;
  }
  if (fileText === null) redirect("/review/prophecy/?draftload=missing");

  const result = await loadClaimDrafts(prisma, fileText!);
  if (result.errors.length) {
    console.error(
      `loadClaimDraftsAction: ${result.errors.length} error(s) loading ${filePath}\n` +
        result.errors.map((e) => `  - ${e}`).join("\n"),
    );
  }

  revalidatePath("/review/prophecy");
  const counts = [
    result.claimsCreated,
    result.claimsSkipped,
    result.mappingsCreated,
    result.mappingsSkipped,
    result.errors.length,
  ].join(",");
  redirect(`/review/prophecy/?draftload=${counts}`);
}

// One-shot corpus bootstrap: import every dataset named in
// data/prophecy/manifest.json (creating each source list under the exact slug
// the claim drafts reference), then load the claim drafts on top. Saves the
// operator from hand-creating five lists and pasting five large JSON files in
// the right order — the step where a slug typo silently orphans every mapping.
// Idempotent throughout; safe to re-run after adding a dataset.
export async function bootstrapDatasetsAction(): Promise<void> {
  await assertProphecyAdmin();

  const result = await bootstrapProphecyData(prisma);

  const listErrors = result.lists.reduce((n, l) => n + l.errors.length, 0);
  const allErrors = [
    ...result.errors,
    ...result.lists.flatMap((l) => l.errors.map((e) => `${l.slug}: ${e}`)),
    ...result.claims.errors,
  ];
  if (allErrors.length) {
    console.error(
      `bootstrapDatasetsAction: ${allErrors.length} error(s)\n` +
        allErrors.map((e) => `  - ${e}`).join("\n"),
    );
  }

  revalidatePath("/review/prophecy");
  const counts = [
    result.lists.filter((l) => l.listCreated).length,
    result.lists.reduce((n, l) => n + l.entriesCreated, 0),
    result.lists.reduce((n, l) => n + l.entriesSkipped, 0),
    result.claims.claimsCreated,
    result.claims.mappingsCreated,
    listErrors + result.errors.length + result.claims.errors.length,
  ].join(",");
  redirect(`/review/prophecy/?bootstrap=${counts}`);
}
