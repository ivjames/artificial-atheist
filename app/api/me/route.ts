import { CHAT_ENABLED } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";
import { isAdminAuthed } from "@/app/(app)/review/pipeline/auth";

// Tiny auth-state probe for the footer account menu (components/AccountMenu).
// Reports ONLY booleans — no email, id, or PII in the body:
//   - authed: the visitor holds a valid user session (chat surface).
//   - admin:  the visitor holds the operator admin cookie (review surface).
// While the chat surface is dark (CHAT_ENABLED=false) the logged-in user
// surface 404s, so `authed` short-circuits to false — but `admin` is still
// reported, because the /review/** operator tools are intentionally NOT gated
// on CHAT_ENABLED.
//
// Kept out of SSG (reads cookies + DB per request); the client fetches it from
// the otherwise-static footer so the publication itself stays fully static.
export const dynamic = "force-dynamic";

// Per-user auth state must never be cached — a stale copy from before sign-in
// or admin login would leave the footer showing the wrong links.
const NO_STORE = { "cache-control": "no-store" } as const;

export async function GET() {
  const admin = await isAdminAuthed().catch(() => false);

  if (!CHAT_ENABLED) {
    return Response.json({ chatEnabled: false, authed: false, admin }, { headers: NO_STORE });
  }
  try {
    const user = await getCurrentUser();
    return Response.json({ chatEnabled: true, authed: Boolean(user), admin }, { headers: NO_STORE });
  } catch {
    // DB hiccup — fail closed to the signed-out menu rather than 500.
    return Response.json({ chatEnabled: true, authed: false, admin }, { headers: NO_STORE });
  }
}
