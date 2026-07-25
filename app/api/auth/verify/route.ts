import { NextRequest, NextResponse } from "next/server";
import { CHAT_ENABLED } from "@/lib/config";
import { consumeMagicLink } from "@/lib/auth/tokens";
import { createSession } from "@/lib/auth/session";
import { grantFreeQuotaOnce } from "@/lib/credits";

export const dynamic = "force-dynamic";

// Magic-link redemption endpoint (§4). GET so it works as a plain email
// link click; consumes the token exactly once and starts the session.
export async function GET(request: NextRequest) {
  if (!CHAT_ENABLED) return new Response(null, { status: 404 });

  const token = request.nextUrl.searchParams.get("token");
  const userId = token ? await consumeMagicLink(token) : null;

  if (!userId) {
    return NextResponse.redirect(new URL("/signup?error=expired", request.url));
  }

  await createSession(userId);
  // Idempotent — only grants the free-quota ledger entry the first time.
  await grantFreeQuotaOnce(userId);

  return NextResponse.redirect(new URL("/chat", request.url));
}
