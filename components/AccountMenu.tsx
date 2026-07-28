"use client";

import { useEffect, useState } from "react";
import { logout } from "@/app/(app)/account/actions";

// Footer submenu for the app-surface routes that live outside the publication
// nav and otherwise have no on-site links. Two independent groups, each shown
// only when the relevant gate is satisfied:
//   - Account: the logged-in user routes (/chat, /account, /pricing), shown
//     once the chat surface is live AND the visitor is signed in. There is no
//     anonymous "Sign in" entry — it's kept off the live site.
//   - Review: the operator/eval routes (/review/adversary, /review/pipeline),
//     shown only when the visitor holds the admin cookie. These are NOT gated
//     on CHAT_ENABLED, so this group can appear while chat is still dark.
//
// Why a client component + fetch instead of reading cookies in the layout: the
// root layout wraps the statically generated publication. Reading cookies there
// would force every page dynamic. Fetching the (PII-free) auth booleans from
// the client keeps the publication static while still tailoring the menu.

type Me = { chatEnabled: boolean; authed: boolean; admin: boolean };

export default function AccountMenu() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    let alive = true;
    // `no-store`: auth state changes within a session (sign in / admin login),
    // so the probe must never be served from the browser cache — a stale copy
    // from before login would hide the Account/Review links even once authed.
    fetch("/api/me", { headers: { accept: "application/json" }, cache: "no-store" })
      .then((r) =>
        r.ok ? r.json() : { chatEnabled: false, authed: false, admin: false },
      )
      .then((data: Me) => {
        if (alive) setMe(data);
      })
      .catch(() => {
        if (alive) setMe({ chatEnabled: false, authed: false, admin: false });
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!me) return null;
  // Only surface the Account group to a signed-in user. The anonymous state used
  // to show a "Sign in" link; that's intentionally gone so no sign-in entry
  // appears on the live site.
  const showAccount = me.chatEnabled && me.authed;
  const showReview = me.admin;
  if (!showAccount && !showReview) return null;

  return (
    <nav className="account-menu" aria-label="Account and operator links">
      {showAccount && (
        <div className="account-menu-group">
          <span className="account-menu-label">
            <i className="ti ti-user-circle" /> Account
          </span>
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
        </div>
      )}

      {showReview && (
        <div className="account-menu-group">
          <span className="account-menu-label">
            <i className="ti ti-shield-check" /> Review
          </span>
          <a href="/review/adversary/">
            <i className="ti ti-swords" /> Adversary eval
          </a>
          <a href="/review/pipeline/">
            <i className="ti ti-article" /> Pipeline
          </a>
        </div>
      )}
    </nav>
  );
}
