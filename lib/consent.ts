import { prisma } from "@/lib/prisma";

// Consent bookkeeping (§6): each kind is granted/revoked independently and
// unbundled from access — "terms" is required to use the service, but
// "article_use" never gates anything. A user can have at most one *active*
// (non-revoked) row per kind at a time; re-granting an already-active kind is
// a no-op so history doesn't fill with duplicate rows.

export type ConsentKind = "terms" | "article_use";

export async function grantConsent(userId: string, kind: ConsentKind): Promise<void> {
  const active = await prisma.consent.findFirst({
    where: { userId, kind, revokedAt: null },
    select: { id: true },
  });
  if (active) return;
  await prisma.consent.create({ data: { userId, kind } });
}

export async function revokeConsent(userId: string, kind: ConsentKind): Promise<void> {
  await prisma.consent.updateMany({
    where: { userId, kind, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// True iff there's a currently-active (non-revoked) row for this kind.
export async function hasConsent(userId: string, kind: ConsentKind): Promise<boolean> {
  const active = await prisma.consent.findFirst({
    where: { userId, kind, revokedAt: null },
    select: { id: true },
  });
  return active !== null;
}

export async function listConsents(userId: string) {
  return prisma.consent.findMany({
    where: { userId },
    orderBy: { grantedAt: "desc" },
  });
}
