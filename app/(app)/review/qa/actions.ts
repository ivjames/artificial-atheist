"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminToken,
  isAdminAuthed,
} from "../pipeline/auth";
import { parseQaExport, saveReport, deleteReport as dbDeleteReport } from "@/lib/qaReports";

// Same shared admin token/cookie as the other /review tools, and like the
// adversary surface this is NOT gated on CHAT_ENABLED — QA reports are an
// operator concern regardless of whether chat is live. Unset ADMIN_TOKEN
// means the surface doesn't exist (notFound), never "open".

async function assertAdmin(): Promise<void> {
  if (!adminToken()) notFound();
  if (!(await isAdminAuthed())) redirect("/review/qa");
}

export async function loginWithToken(formData: FormData): Promise<void> {
  const token = adminToken();
  if (!token) notFound();

  const submitted = String(formData.get("token") ?? "");
  if (submitted !== token) {
    redirect("/review/qa?error=auth");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/review/qa");
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/review/qa");
}

// Save an uploaded/pasted QA export. File wins over the textarea when both
// are supplied. Upserts on the export's run_id, so re-submitting the same
// scan refreshes its stored copy instead of duplicating it.
export async function uploadReport(formData: FormData): Promise<void> {
  await assertAdmin();

  let raw = "";
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    raw = await file.text();
  } else {
    raw = String(formData.get("json") ?? "").trim();
  }
  if (!raw) {
    redirect("/review/qa?error=" + encodeURIComponent("Choose a file or paste the export JSON."));
  }

  let saved: { id: string; created: boolean };
  try {
    const parsed = parseQaExport(raw);
    saved = await saveReport(parsed);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not parse that export.";
    redirect("/review/qa?error=" + encodeURIComponent(msg));
  }

  revalidatePath("/review/qa");
  redirect(`/review/qa/${saved.id}/?saved=${saved.created ? "new" : "updated"}`);
}

export async function deleteReport(id: string): Promise<void> {
  await assertAdmin();
  await dbDeleteReport(id);
  revalidatePath("/review/qa");
  redirect("/review/qa");
}
