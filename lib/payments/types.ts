import type { CreditPack } from "@/lib/config";

// Payment provider abstraction (§7). Stripe is the intended vendor but keys
// aren't provisioned yet, so a dev stub implements the same interface and lets
// the credit/purchase flow be built and tested end-to-end now. Swap by env
// (PAYMENTS_PROVIDER / STRIPE_SECRET_KEY) with no app-code change.

export type CheckoutSession = {
  // URL to send the browser to. For the stub this is a local confirm page.
  url: string;
  // Provider's reference id for this checkout (stored on Purchase.providerRef).
  ref: string;
};

export type CheckoutRequest = {
  userId: string;
  pack: CreditPack;
  successUrl: string;
  cancelUrl: string;
};

// Result of interpreting a provider webhook / callback into a fulfillment
// decision the app can act on (credit the ledger).
export type FulfillmentEvent = {
  ref: string; // matches Purchase.providerRef
  paid: boolean;
};

export interface PaymentProvider {
  readonly name: string;
  createCheckout(req: CheckoutRequest): Promise<CheckoutSession>;
  // Parses a raw webhook body (+ signature header) into a fulfillment event,
  // or null if the event is irrelevant. Throws on signature failure.
  parseWebhook(rawBody: string, signature: string | null): Promise<FulfillmentEvent | null>;
}
