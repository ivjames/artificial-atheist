import crypto from "node:crypto";
import type {
  CheckoutRequest,
  CheckoutSession,
  FulfillmentEvent,
  PaymentProvider,
} from "@/lib/payments/types";

// ============================================================================
// DEV / TEST STUB — NOT A REAL PAYMENT PROVIDER.
// ----------------------------------------------------------------------------
// This exists ONLY so the checkout -> credit-fulfillment flow can be built
// and tested end-to-end before Stripe keys are provisioned (§7/§8). It never
// talks to a real payment network and never moves real money. It MUST NOT be
// selected in a real deployment — lib/payments/index.ts only wires this in
// when `paymentsProvider` (lib/config) resolves to "stub", which itself only
// happens when STRIPE_SECRET_KEY is absent. Do not import this directly
// outside of lib/payments/index.ts.
// ============================================================================

export const stubProvider: PaymentProvider = {
  name: "stub",

  // "Checkout" is instant: the returned url is a same-origin route that
  // immediately marks the purchase paid and credits the ledger, simulating a
  // successful payment with no external redirect and no real charge.
  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const suffix = crypto.randomBytes(6).toString("hex");
    const ref = `stub_${req.userId}_${req.pack.id}_${suffix}`;
    return { url: `/api/payments/stub/confirm?ref=${ref}`, ref };
  },

  // The stub has no webhook channel — fulfillment happens synchronously via
  // the confirm route, so there is never anything for this to parse.
  async parseWebhook(): Promise<FulfillmentEvent | null> {
    return null;
  },
};
