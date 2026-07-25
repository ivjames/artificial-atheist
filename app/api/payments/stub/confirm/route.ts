import { NextResponse } from "next/server";
import { CHAT_ENABLED, SITE_URL, paymentsProvider } from "@/lib/config";
import { fulfillByRef } from "@/lib/purchase";

// ============================================================================
// DEV / TEST STUB ONLY — NOT A REAL PAYMENT CALLBACK.
// ----------------------------------------------------------------------------
// This simulates an instant, always-successful payment so the purchase ->
// credit flow can be exercised before Stripe keys are provisioned (§7). It
// refuses to run unless `paymentsProvider` (lib/config) currently resolves
// to "stub" — i.e. it is inert the moment a real provider is configured.
// Never point real users or real checkouts at this route.
// ============================================================================
export async function GET(request: Request) {
  if (!CHAT_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (paymentsProvider !== "stub") {
    return NextResponse.json(
      { error: "Stub confirm route is disabled while a real payment provider is configured" },
      { status: 403 },
    );
  }

  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  await fulfillByRef(ref);

  return NextResponse.redirect(new URL("/account?purchased=1", SITE_URL), { status: 303 });
}
