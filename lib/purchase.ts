import type { Purchase } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { addPurchasedCredits } from "@/lib/credits";
import type { CreditPack } from "@/lib/config";

// Purchase lifecycle helpers (§7). A Purchase row is created "pending" before
// the user is sent to the provider's checkout, given the provider's reference
// once checkout is created, and finally marked "paid" (crediting the ledger)
// once the provider confirms payment — via webhook (Stripe) or the confirm
// route (stub).

export async function createPendingPurchase(
  userId: string,
  providerName: string,
  pack: CreditPack,
): Promise<Purchase> {
  return prisma.purchase.create({
    data: {
      userId,
      provider: providerName,
      packId: pack.id,
      credits: pack.credits,
      amountCents: pack.amountCents,
      status: "pending",
    },
  });
}

export async function attachRef(purchaseId: string, ref: string): Promise<void> {
  await prisma.purchase.update({
    where: { id: purchaseId },
    data: { providerRef: ref },
  });
}

// Credits the ledger for the Purchase matching `ref`, exactly once.
// Idempotent: a Purchase already "paid" is left untouched so a re-delivered
// webhook (or a re-visited stub confirm link) never double-credits. Before
// crediting, the status is atomically claimed via a conditional update
// (only succeeds from a non-"paid" state) so two concurrent fulfillment
// attempts for the same ref can't both win the race and double-credit.
export async function fulfillByRef(ref: string): Promise<void> {
  const purchase = await prisma.purchase.findUnique({ where: { providerRef: ref } });
  if (!purchase) return;
  if (purchase.status === "paid") return;

  const { count } = await prisma.purchase.updateMany({
    where: { id: purchase.id, status: { not: "paid" } },
    data: { status: "paid" },
  });
  if (count === 0) return; // another call already claimed/fulfilled this ref

  await addPurchasedCredits(
    purchase.userId,
    purchase.credits,
    `Credit pack: ${purchase.packId}`,
  );
}
