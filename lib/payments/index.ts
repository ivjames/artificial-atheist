import { paymentsProvider } from "@/lib/config";
import type { PaymentProvider } from "@/lib/payments/types";
import { stripeProvider } from "@/lib/payments/stripe";
import { stubProvider } from "@/lib/payments/stub";

// Single selection point for which PaymentProvider backs the app (§7).
// `paymentsProvider` (lib/config) already defaults to "stub" unless
// STRIPE_SECRET_KEY is present, so this just mirrors that choice — swapping
// vendors, or falling back to the stub in dev, never touches call sites.
export function getPaymentProvider(): PaymentProvider {
  return paymentsProvider === "stripe" ? stripeProvider : stubProvider;
}
