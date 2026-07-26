import { CHAT_ENABLED } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth/session";

// Tiny auth-state probe for the account submenu (components/AccountMenu).
// Reads the session cookie and reports ONLY whether the visitor is signed in —
// no email, no id, no PII in the body. While the chat surface is dark
// (CHAT_ENABLED=false) the whole logged-in surface 404s, so the probe short
// -circuits to "not authed" and the menu stays hidden.
//
// Kept out of SSG (reads cookies + DB per request); the client fetches it from
// the otherwise-static footer so the publication itself stays fully static.
export const dynamic = "force-dynamic";

export async function GET() {
  if (!CHAT_ENABLED) {
    return Response.json({ chatEnabled: false, authed: false });
  }
  try {
    const user = await getCurrentUser();
    return Response.json({ chatEnabled: true, authed: Boolean(user) });
  } catch {
    // DB hiccup — fail closed to the signed-out menu rather than 500.
    return Response.json({ chatEnabled: true, authed: false });
  }
}
