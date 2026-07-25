"use server";

import { redirect } from "next/navigation";
import { CHAT_ENABLED, SITE_URL, findPack } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";
import { attachRef, createPendingPurchase } from "@/lib/purchase";
import { getPaymentProvider } from "@/lib/payments";

// Server action backing the /pricing "Buy" buttons (§7/§8). Everything is
// re-validated here — the pack id posted from the client form is untrusted,
// and this can be invoked directly (not just from a rendered page).
export async function startCheckout(packId: string): Promise<void> {
  if (!CHAT_ENABLED) {
    throw new Error("Chat is not enabled");
  }

  const user = await getCurrentUser();
  if (!user) {
    redirect("/signup");
  }

  const pack = findPack(packId);
  if (!pack) {
    throw new Error(`Unknown credit pack: ${packId}`);
  }

  const provider = getPaymentProvider();
  const purchase = await createPendingPurchase(user.id, provider.name, pack);

  const session = await provider.createCheckout({
    userId: user.id,
    pack,
    successUrl: `${SITE_URL}/account?purchased=1`,
    cancelUrl: `${SITE_URL}/pricing`,
  });

  await attachRef(purchase.id, session.ref);

  // Provider urls are absolute (Stripe) or site-relative (stub); redirect()
  // handles both.
  redirect(session.url);
}
