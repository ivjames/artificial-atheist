import { prisma } from "@/lib/prisma";
import { credits as creditCfg } from "@/lib/config";

// Credit ledger helpers. Balance is always derived by summing the append-only
// CreditEntry rows — there is no mutable "balance" column to drift out of sync.

export async function getBalance(userId: string): Promise<number> {
  const agg = await prisma.creditEntry.aggregate({
    where: { userId },
    _sum: { amount: true },
  });
  return agg._sum.amount ?? 0;
}

// Grants the free-question quota exactly once per user (idempotent on the
// "free_grant" kind), called right after email verification.
export async function grantFreeQuotaOnce(userId: string): Promise<void> {
  const existing = await prisma.creditEntry.findFirst({
    where: { userId, kind: "free_grant" },
    select: { id: true },
  });
  if (existing) return;
  await prisma.creditEntry.create({
    data: {
      userId,
      amount: creditCfg.freeQuota * creditCfg.standardCost,
      kind: "free_grant",
      reason: `${creditCfg.freeQuota} free questions on signup`,
    },
  });
}

export async function addPurchasedCredits(
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  await prisma.creditEntry.create({
    data: { userId, amount, kind: "purchase", reason },
  });
}

// Preview-only test top-up. Re-reads the balance and grants a fixed amount ONLY
// while the balance is at/below `threshold`, both inside one transaction (same
// pattern as spendCredits) so concurrent reloads can't each grant off the same
// stale read. Returns the resulting balance.
export async function grantTestCreditsIfLow(
  userId: string,
  amount: number,
  threshold: number,
  reason: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.creditEntry.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const balance = agg._sum.amount ?? 0;
    if (balance > threshold) return balance;
    await tx.creditEntry.create({
      data: { userId, amount, kind: "purchase", reason },
    });
    return balance + amount;
  });
}

export function costForTier(tier: string): number {
  return tier === "premium" ? creditCfg.premiumCost : creditCfg.standardCost;
}

export class InsufficientCreditsError extends Error {
  constructor(readonly required: number, readonly available: number) {
    super("Insufficient credits");
    this.name = "InsufficientCreditsError";
  }
}

// Atomically checks balance and records a spend. Runs in a transaction with a
// re-read so two concurrent turns can't both spend the last credit.
export async function spendCredits(
  userId: string,
  amount: number,
  threadId: string,
  reason: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const agg = await tx.creditEntry.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const balance = agg._sum.amount ?? 0;
    if (balance < amount) {
      throw new InsufficientCreditsError(amount, balance);
    }
    await tx.creditEntry.create({
      data: { userId, amount: -amount, kind: "spend", reason, threadId },
    });
    return balance - amount;
  });
}
