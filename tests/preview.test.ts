import { describe, it, expect, afterEach } from "vitest";
import { isPreviewMode, isPreviewGrant, previewToken } from "@/lib/preview";

afterEach(() => {
  delete process.env.CHAT_PREVIEW_TOKEN;
});

describe("preview lock", () => {
  it("is off when no token is configured", () => {
    expect(isPreviewMode()).toBe(false);
    expect(previewToken()).toBeNull();
    // With preview off, nothing is ever a grant.
    expect(isPreviewGrant("anything")).toBe(false);
    expect(isPreviewGrant(undefined)).toBe(false);
  });

  it("treats blank/whitespace token as off", () => {
    process.env.CHAT_PREVIEW_TOKEN = "   ";
    expect(isPreviewMode()).toBe(false);
    expect(isPreviewGrant("")).toBe(false);
  });

  it("grants only on an exact match when a token is set", () => {
    process.env.CHAT_PREVIEW_TOKEN = "s3cret-link";
    expect(isPreviewMode()).toBe(true);
    expect(isPreviewGrant("s3cret-link")).toBe(true);
    expect(isPreviewGrant("wrong")).toBe(false);
    expect(isPreviewGrant("")).toBe(false);
    expect(isPreviewGrant(undefined)).toBe(false);
    expect(isPreviewGrant(null)).toBe(false);
  });
});
