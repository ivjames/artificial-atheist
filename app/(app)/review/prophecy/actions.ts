"use server";

import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
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
