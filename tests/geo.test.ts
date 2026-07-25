import { describe, it, expect, afterEach } from "vitest";
import { geoDecision, resolveCountry, decideFromHeaders, geoConfig } from "@/lib/geo";

// Snapshot/restore the env keys the geo module reads, so each test is isolated.
const GEO_KEYS = [
  "GEO_GATE_ENABLED",
  "GEO_COUNTRY_HEADER",
  "GEO_BLOCKED_COUNTRIES",
  "GEO_ALLOWED_COUNTRIES",
  "GEO_FAIL_OPEN",
  "GEO_DEFAULT_COUNTRY",
];
afterEach(() => {
  for (const k of GEO_KEYS) delete process.env[k];
});

// Header getter from a plain map (keys lowercased, as real headers are matched).
function getter(h: Record<string, string>) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(h)) lower[k.toLowerCase()] = v;
  return (name: string) => lower[name.toLowerCase()] ?? null;
}

describe("geoDecision (default blocklist = EU/EEA + UK)", () => {
  it("blocks GDPR-region countries", () => {
    for (const c of ["DE", "FR", "IE", "GB", "NO", "IS", "LI"]) {
      expect(geoDecision(c).allowed, c).toBe(false);
    }
  });

  it("permits non-GDPR countries", () => {
    for (const c of ["US", "CA", "AU", "JP", "BR"]) {
      expect(geoDecision(c).allowed, c).toBe(true);
    }
  });

  it("fails closed when the country is unknown", () => {
    const d = geoDecision(null);
    expect(d.allowed).toBe(false);
    expect(d.reason).toBe("unknown-region");
  });

  it("fails open on unknown country when GEO_FAIL_OPEN=true", () => {
    process.env.GEO_FAIL_OPEN = "true";
    expect(geoDecision(null, geoConfig()).allowed).toBe(true);
  });

  it("passes everything through when the gate is disabled", () => {
    process.env.GEO_GATE_ENABLED = "false";
    expect(geoDecision("DE", geoConfig()).allowed).toBe(true);
  });
});

describe("strict allowlist mode", () => {
  it("serves only allowlisted countries and blocks unknowns", () => {
    process.env.GEO_ALLOWED_COUNTRIES = "US,CA";
    const cfg = geoConfig();
    expect(geoDecision("US", cfg).allowed).toBe(true);
    expect(geoDecision("CA", cfg).allowed).toBe(true);
    expect(geoDecision("DE", cfg).allowed).toBe(false);
    expect(geoDecision("AU", cfg).allowed).toBe(false); // not on the list
    expect(geoDecision(null, cfg).allowed).toBe(false); // unknown never passes
  });
});

describe("custom blocklist override", () => {
  it("replaces the default block set", () => {
    process.env.GEO_BLOCKED_COUNTRIES = "US";
    const cfg = geoConfig();
    expect(geoDecision("US", cfg).allowed).toBe(false);
    expect(geoDecision("DE", cfg).allowed).toBe(true); // no longer blocked
  });
});

describe("resolveCountry", () => {
  it("reads the configured header", () => {
    expect(resolveCountry(getter({ "x-country-code": "de" }))).toBe("DE");
  });

  it("does NOT trust other/spoofable headers (anti-bypass)", () => {
    // Only the configured header is trusted. A blocked-region visitor must not
    // be able to slip a fake country through cf-ipcountry / vercel headers.
    expect(resolveCountry(getter({ "cf-ipcountry": "US" }))).toBeNull();
    expect(resolveCountry(getter({ "x-vercel-ip-country": "US" }))).toBeNull();
    expect(resolveCountry(getter({ "x-geo-country": "US" }))).toBeNull();
    // Configured header decides even when a spoof header disagrees.
    expect(
      resolveCountry(getter({ "x-country-code": "DE", "cf-ipcountry": "US" })),
    ).toBe("DE");
  });

  it("treats malformed / placeholder values as unknown", () => {
    expect(resolveCountry(getter({ "x-country-code": "XX" }))).toBeNull();
    expect(resolveCountry(getter({ "x-country-code": "T1" }))).toBeNull();
    expect(resolveCountry(getter({ "x-country-code": "USA" }))).toBeNull();
    expect(resolveCountry(getter({}))).toBeNull();
  });

  it("honors a configured header name and a dev default", () => {
    process.env.GEO_COUNTRY_HEADER = "x-my-country";
    process.env.GEO_DEFAULT_COUNTRY = "us";
    const cfg = geoConfig();
    expect(resolveCountry(getter({ "x-my-country": "NL" }), cfg)).toBe("NL");
    expect(resolveCountry(getter({}), cfg)).toBe("US"); // default kicks in
  });
});

describe("decideFromHeaders (resolve + decide)", () => {
  it("blocks an EU header and permits a US header", () => {
    expect(decideFromHeaders(getter({ "x-country-code": "DE" })).allowed).toBe(false);
    expect(decideFromHeaders(getter({ "x-country-code": "US" })).allowed).toBe(true);
  });

  it("blocks when no country header is present (fail closed)", () => {
    expect(decideFromHeaders(getter({})).allowed).toBe(false);
  });
});
