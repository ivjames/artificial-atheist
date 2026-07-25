// Region gate — the "GDPR sidestep" (LAUNCH-BLOCKERS.md §1/§2). Rather than
// build full EU compliance up front, we decline to serve the chat surface to
// visitors in GDPR / UK-GDPR jurisdictions, so no special-category conversation
// data from those data subjects is ever collected. This narrows — it does not
// eliminate — GDPR exposure (IP geolocation is imperfect; VPNs and travel
// exist), so counsel should still bless it and the Terms should restrict the
// service to permitted regions. It is a risk-reduction control, not a
// compliance substitute.
//
// This module is intentionally PURE and edge-safe: it reads only from a
// header-getter you pass in and from process.env, and imports nothing from
// `next/*` or node. That lets both the Edge middleware (middleware.ts) and
// server code (lib/geo-server.ts) share one decision function. Env is read
// per-call (not at module load) so it stays overridable in tests.

// EU/EEA + UK — the territorial scope of GDPR and the UK GDPR. This is the
// default block set; extend or replace it via GEO_BLOCKED_COUNTRIES.
export const GDPR_COUNTRIES: readonly string[] = [
  // EU 27
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR",
  "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK",
  "SI", "ES", "SE",
  // EEA (non-EU) — GDPR applies via the EEA Agreement
  "IS", "LI", "NO",
  // United Kingdom — UK GDPR
  "GB",
];

function csvEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw || raw.trim() === "") return [];
  return raw
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

function envBool(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw == null || raw.trim() === "") return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

export type GeoConfig = {
  enabled: boolean;
  headerName: string;
  blocked: string[];
  allowed: string[]; // if non-empty, acts as a strict allowlist
  defaultCountry: string | null; // used when no header present (dev/testing)
  failOpen: boolean; // when country is unknown: false = block (default), true = allow
};

export function geoConfig(): GeoConfig {
  const allowed = csvEnv("GEO_ALLOWED_COUNTRIES");
  const blockedOverride = csvEnv("GEO_BLOCKED_COUNTRIES");
  const def = (process.env.GEO_DEFAULT_COUNTRY ?? "").trim().toUpperCase();
  return {
    // On by default: once the chat is live the safe posture is to gate, so a
    // forgotten env var fails toward protection, not exposure. Disable
    // explicitly with GEO_GATE_ENABLED=false.
    enabled: envBool("GEO_GATE_ENABLED", true),
    headerName: (process.env.GEO_COUNTRY_HEADER ?? "x-country-code")
      .trim()
      .toLowerCase(),
    blocked: blockedOverride.length > 0 ? blockedOverride : [...GDPR_COUNTRIES],
    allowed,
    defaultCountry: def || null,
    failOpen: envBool("GEO_FAIL_OPEN", false),
  };
}

// Normalize a raw header value to an uppercase alpha-2 code, or null. CDNs use
// "XX"/"T1" (Tor) for unknown — treat those as unknown.
function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const c = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return null;
  if (c === "XX" || c === "T1") return null;
  return c;
}

// Resolve the visitor's country from ONLY the single configured header, then
// GEO_DEFAULT_COUNTRY (dev fallback). We deliberately do NOT consult any other
// header (cf-ipcountry, x-vercel-ip-country, …): on a proxy that doesn't set
// them they are attacker-controlled request headers, so trusting them would let
// a visitor in a blocked region send a fake country (e.g. `cf-ipcountry: US`)
// and defeat the gate. The trusted proxy MUST set `cfg.headerName` from real
// geolocation AND strip any client-supplied copy (see deploy/nginx-geoip2.conf).
// Behind a CDN that emits its own country header, point GEO_COUNTRY_HEADER at it.
export function resolveCountry(
  get: (name: string) => string | null | undefined,
  cfg: GeoConfig = geoConfig(),
): string | null {
  const c = normalizeCountry(get(cfg.headerName));
  if (c) return c;
  return cfg.defaultCountry;
}

export type GeoDecision = {
  allowed: boolean;
  country: string | null;
  reason: "gate-disabled" | "allowlisted" | "not-allowlisted" | "blocked" | "unknown-region" | "permitted";
};

// Decide whether a country may access the gated surface.
export function geoDecision(
  country: string | null,
  cfg: GeoConfig = geoConfig(),
): GeoDecision {
  if (!cfg.enabled) return { allowed: true, country, reason: "gate-disabled" };

  // Strict allowlist mode wins when configured: only listed countries pass,
  // and an unknown country never passes.
  if (cfg.allowed.length > 0) {
    if (country && cfg.allowed.includes(country)) {
      return { allowed: true, country, reason: "allowlisted" };
    }
    return { allowed: false, country, reason: country ? "not-allowlisted" : "unknown-region" };
  }

  if (country && cfg.blocked.includes(country)) {
    return { allowed: false, country, reason: "blocked" };
  }

  // Unknown region: fail closed by default (can't rule out a GDPR jurisdiction).
  if (!country) {
    return cfg.failOpen
      ? { allowed: true, country, reason: "permitted" }
      : { allowed: false, country, reason: "unknown-region" };
  }

  return { allowed: true, country, reason: "permitted" };
}

// Convenience: resolve + decide in one step from a header getter.
export function decideFromHeaders(
  get: (name: string) => string | null | undefined,
): GeoDecision {
  const cfg = geoConfig();
  return geoDecision(resolveCountry(get, cfg), cfg);
}
