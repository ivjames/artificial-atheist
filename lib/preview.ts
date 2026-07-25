// Pre-launch preview lock. When CHAT_PREVIEW_TOKEN is set (and CHAT_ENABLED is
// true), the chat surface is private: a visitor gets in only by opening any
// chat URL once with `?preview=<token>`, which sets a cookie; everyone else
// sees a 404, so the chat is invisible to the public. This is the "safe
// preview" — exercise the full flow end-to-end with no public exposure and no
// HTTP basic-auth popup. A valid preview cookie also bypasses the region gate
// (the authorized tester may be anywhere). Clear CHAT_PREVIEW_TOKEN to go fully
// public (region gate then governs). Edge-safe: env + pure logic only.

export const PREVIEW_COOKIE = "aa_preview";
export const PREVIEW_PARAM = "preview";

// The shared secret. Null/empty means preview mode is OFF (not private).
export function previewToken(): string | null {
  const t = (process.env.CHAT_PREVIEW_TOKEN ?? "").trim();
  return t === "" ? null : t;
}

export function isPreviewMode(): boolean {
  return previewToken() !== null;
}

// A presented value (from the cookie or the query param) grants access only if
// preview mode is on and it matches the token exactly.
export function isPreviewGrant(value: string | null | undefined): boolean {
  const t = previewToken();
  return t !== null && typeof value === "string" && value === t;
}
