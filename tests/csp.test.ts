import { describe, it, expect } from "vitest";
import { readdirSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
// @ts-expect-error — plain .mjs module (no type declarations)
import { APP_PATHS, STATIC_CSP, STATIC_CSP_SOURCE, nonceCsp } from "@/lib/csp.mjs";

// The CSP split (lib/csp.mjs) depends on THREE lists staying in sync:
// APP_PATHS, the app/(app)/ directory, and the middleware matcher literal.
// A drift breaks silently in opposite directions — a new (app) route missing
// from the lists gets the static unsafe-inline policy (lost hardening), while
// a static route added to them gets a nonce policy its prerendered scripts
// can't satisfy (broken page). These tests make the drift loud instead.

const ROOT = path.resolve(__dirname, "..");

function appGroupDirs(): string[] {
  const dir = path.join(ROOT, "app", "(app)");
  return readdirSync(dir)
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort();
}

describe("CSP path split", () => {
  it("APP_PATHS matches the app/(app)/ directory exactly", () => {
    expect([...APP_PATHS].sort()).toEqual(appGroupDirs());
  });

  it("middleware matcher covers every app path (bare + wildcard)", () => {
    const src = readFileSync(path.join(ROOT, "middleware.ts"), "utf8");
    for (const p of APP_PATHS) {
      expect(src, `matcher missing "/${p}"`).toContain(`"/${p}"`);
      expect(src, `matcher missing "/${p}/:path*"`).toContain(`"/${p}/:path*"`);
    }
  });

  it("static CSP source excludes exactly the app paths", () => {
    for (const p of APP_PATHS) expect(STATIC_CSP_SOURCE).toContain(p);
    // Regex sanity: the lookahead rejects app paths and admits publication paths.
    const re = new RegExp(`^${STATIC_CSP_SOURCE.replace(/^\//, "\\/")}$`);
    for (const p of APP_PATHS) expect(re.test(`/${p}/`), `/${p}/ must be excluded`).toBe(false);
    for (const ok of ["/", "/about/", "/posts/some-slug/", "/topics/science/", "/feed.xml"]) {
      expect(re.test(ok), `${ok} must be included`).toBe(true);
    }
  });
});

describe("CSP policies", () => {
  it("static policy keeps unsafe-inline for SSG hydration scripts", () => {
    expect(STATIC_CSP).toContain("script-src 'self' 'unsafe-inline'");
    expect(STATIC_CSP).toContain("object-src 'none'");
  });

  it("nonce policy is strict: nonce + strict-dynamic + hashes, no unsafe-inline in script-src", () => {
    const csp = nonceCsp("abc123", ["sha256-x", "sha256-y"]);
    const scriptSrc = csp.split(";").find((d: string) => d.trim().startsWith("script-src"))!;
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'sha256-x'");
    expect(scriptSrc).toContain("'sha256-y'");
    expect(scriptSrc).not.toContain("unsafe-inline");
    // style-src intentionally keeps unsafe-inline (inline <style> is allowed).
    expect(csp).toContain("style-src 'self' 'unsafe-inline'");
  });
});
