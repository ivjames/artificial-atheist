import { notFound, redirect } from "next/navigation";
import { CHAT_ENABLED } from "@/lib/config";
import { isAgeConfirmed } from "@/lib/age";
import { confirmAdult, divertMinor } from "./actions";

// Reads/writes the age cookie per request.
export const dynamic = "force-dynamic";

// The 18+ self-declaration gate (§4) in front of the debate chat.
export default async function AgePage() {
  if (!CHAT_ENABLED) notFound();
  if (await isAgeConfirmed()) redirect("/chat");

  return (
    <div className="card mx-auto mt-10 max-w-md animate-fade-in-up p-8 text-center">
      <h1 className="text-2xl font-black tracking-tight">Before you continue</h1>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        The debate chat is written for adults. This is a self-declared check,
        not a verified age check — we&apos;re taking your word for it, not
        confirming it.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <form action={confirmAdult}>
          <button type="submit" className="btn-primary w-full py-3">
            I am 18 or older
          </button>
        </form>
        <form action={divertMinor}>
          <button type="submit" className="btn-ghost w-full py-3">
            I am under 18
          </button>
        </form>
      </div>
    </div>
  );
}
