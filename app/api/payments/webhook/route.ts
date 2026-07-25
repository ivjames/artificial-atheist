import { NextResponse } from "next/server";
import { CHAT_ENABLED } from "@/lib/config";
import { getPaymentProvider } from "@/lib/payments";
import { fulfillByRef } from "@/lib/purchase";
import type { FulfillmentEvent } from "@/lib/payments/types";

// Payment provider webhook endpoint (§7). Currently only Stripe delivers
// here (the dev stub is fulfilled synchronously via its own confirm route).
// The body MUST be read as raw text — not request.json() — because
// signature verification hashes the exact bytes the provider sent.
export async function POST(request: Request) {
  if (!CHAT_ENABLED) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: FulfillmentEvent | null;
  try {
    event = await getPaymentProvider().parseWebhook(rawBody, signature);
  } catch (err) {
    console.error("Payment webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event?.paid) {
    await fulfillByRef(event.ref);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
