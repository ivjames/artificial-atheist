import Stripe from "stripe";
import type {
  CheckoutRequest,
  CheckoutSession,
  FulfillmentEvent,
  PaymentProvider,
} from "@/lib/payments/types";

// Stripe-backed payment provider (§7). The client is constructed lazily (not
// at module load) so the app can boot — and the dev stub can run — before
// STRIPE_SECRET_KEY exists; the key is only required once this provider is
// actually invoked.

const STRIPE_API_VERSION = "2025-02-24.acacia" as const;

let client: Stripe | null = null;

function getClient(): Stripe {
  if (client) return client;
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — the stripe payment provider cannot be " +
        "used. Leave PAYMENTS_PROVIDER unset (or set it to \"stub\") to use " +
        "the dev stub until Stripe keys are provisioned.",
    );
  }
  client = new Stripe(apiKey, { apiVersion: STRIPE_API_VERSION });
  return client;
}

export const stripeProvider: PaymentProvider = {
  name: "stripe",

  async createCheckout(req: CheckoutRequest): Promise<CheckoutSession> {
    const session = await getClient().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: req.pack.amountCents,
            product_data: {
              name: `${req.pack.label} — ${req.pack.credits} credits`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId: req.userId,
        packId: req.pack.id,
        credits: String(req.pack.credits),
      },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
    });

    if (!session.url) {
      // Shouldn't happen for a freshly-created payment-mode session, but the
      // SDK types `url` as nullable (e.g. an already-expired session).
      throw new Error("Stripe did not return a checkout url");
    }
    return { url: session.url, ref: session.id };
  },

  async parseWebhook(
    rawBody: string,
    signature: string | null,
  ): Promise<FulfillmentEvent | null> {
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not set");
    }

    // Throws Stripe.errors.StripeSignatureVerificationError on a bad/forged
    // signature — left to propagate so the route can answer 400.
    const event = getClient().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      return { ref: session.id, paid: true };
    }
    return null;
  },
};
