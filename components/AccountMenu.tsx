"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/(app)/account/actions";

// Footer submenu for the logged-in / app-surface routes. These pages
// (/chat, /account, /pricing, /signup) live outside the publication nav and,
// until now, had no on-site links — you had to know the URLs. This renders
// them once the chat surface is live, and switches between the signed-out and
// signed-in sets based on a tiny /api/me probe.
//
// Why a client component + fetch instead of reading the session in the layout:
// the root layout wraps the whole publication, which is statically generated.
// Reading cookies there would force every page dynamic. Fetching auth state
// from the client keeps the publication static and this menu still accurate.

type Me = { chatEnabled: boolean; authed: boolean };

export default function AccountMenu({ chatEnabled }: { chatEnabled: boolean }) {
  // Seed from the server-known flag so nothing renders while chat is dark.
  const [me, setMe] = useState<Me | null>(
    chatEnabled ? null : { chatEnabled: false, authed: false },
  );

  useEffect(() => {
    if (!chatEnabled) return;
    let alive = true;
    fetch("/api/me", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : { chatEnabled: true, authed: false }))
      .then((data: Me) => {
        if (alive) setMe(data);
      })
      .catch(() => {
        if (alive) setMe({ chatEnabled: true, authed: false });
      });
    return () => {
      alive = false;
    };
  }, [chatEnabled]);

  // Dark, unresolved, or explicitly disabled → render nothing.
  if (!me || !me.chatEnabled) return null;

  return (
    <nav className="account-menu" aria-label="Your account">
      <span className="account-menu-label">
        <i className="ti ti-user-circle" /> Account
      </span>
      {me.authed ? (
        <>
          <a href="/chat/">
            <i className="ti ti-messages" /> Debate
          </a>
          <a href="/account/">
            <i className="ti ti-settings" /> Settings
          </a>
          <a href="/pricing/">
            <i className="ti ti-coins" /> Credits
          </a>
          <form action={logout}>
            <button type="submit">
              <i className="ti ti-logout" /> Log out
            </button>
          </form>
        </>
      ) : (
        <a href="/signup/">
          <i className="ti ti-login" /> Sign in
        </a>
      )}
    </nav>
  );
}
