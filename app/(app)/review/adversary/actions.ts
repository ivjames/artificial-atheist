"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  adminToken,
  isAdminAuthed,
} from "../pipeline/auth";

// This eval-review surface reuses the same shared admin token/cookie as the
// article pipeline (one operator, one secret). Unlike the pipeline it is NOT
// gated on CHAT_ENABLED — the adversary harness is an operator/eval tool that
// works while the live chat surface is dark. An unset ADMIN_TOKEN means the
// admin surface doesn't exist at all (notFound), never "open".

async function assertAdmin(): Promise<void> {
  if (!adminToken()) notFound();
  if (!(await isAdminAuthed())) redirect("/review/adversary");
}

export async function loginWithToken(formData: FormData): Promise<void> {
  const token = adminToken();
  if (!token) notFound();

  const submitted = String(formData.get("token") ?? "");
  if (submitted !== token) {
    redirect("/review/adversary?error=1");
  }

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/review/adversary");
}

export async function logoutAdmin(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/review/adversary");
}

// Prune a single eval run.
export async function deleteRun(id: string): Promise<void> {
  await assertAdmin();
  await prisma.adversaryRun.delete({ where: { id } });
  revalidatePath("/review/adversary");
}

// Prune every eval run (clears the review queue).
export async function clearAllRuns(): Promise<void> {
  await assertAdmin();
  await prisma.adversaryRun.deleteMany({});
  revalidatePath("/review/adversary");
}
