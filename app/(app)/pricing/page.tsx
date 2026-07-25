import { notFound, redirect } from "next/navigation";
import { CHAT_ENABLED, creditPacks, paymentsProvider } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";
import { getBalance } from "@/lib/credits";
import { startCheckout } from "./actions";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  if (!CHAT_ENABLED) notFound();

  const user = await getCurrentUser();
  if (!user) redirect("/signup");

  const balance = await getBalance(user.id);

  return (
    <div className="animate-fade-in-up space-y-6">
      <section className="card p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Buy <span className="text-brand-600">credits</span>
            </h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Current balance: <strong>{balance}</strong>{" "}
              credit{balance === 1 ? "" : "s"}
            </p>
          </div>

          {paymentsProvider === "stub" && (
            <span className="rounded-full border border-amber-400 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-300">
              Test mode — no real charge
            </span>
          )}
        </div>

        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          Honest note: payment processors charge a fixed fee per transaction,
          so it eats a bigger share of the smaller packs. The larger packs
          give you more credits per dollar actually spent.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {creditPacks.map((pack) => (
          <div key={pack.id} className="card flex flex-col justify-between p-6">
            <div>
              <h2 className="text-lg font-bold">{pack.label}</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {pack.credits} credits
              </p>
              <p className="mt-4 text-2xl font-black">
                ${(pack.amountCents / 100).toFixed(2)}
              </p>
            </div>

            <form action={startCheckout.bind(null, pack.id)} className="mt-6">
              <button type="submit" className="btn-primary w-full">
                Buy
              </button>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
