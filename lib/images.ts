import fs from "node:fs";
import path from "node:path";

// Build-time lookup for the responsive WebP renditions that
// scripts/image-variants.mjs derives from each committed post PNG
// (public/images/posts/<slug>-w<width>.webp). Widths must stay in sync with
// VARIANT_WIDTHS there. Server-only (uses fs) — the publication pages that
// render Thumb/Hero are all statically generated, so existence is checked
// once at build and a post whose variants haven't been generated yet simply
// falls back to its plain PNG instead of emitting srcset URLs that 404.
export const VARIANT_WIDTHS = [320, 640, 960, 1344];

const cache = new Map<string, string | null>();

/** srcset string for a post image's WebP variants, or null if none exist. */
export function variantSrcSet(image: string): string | null {
  const hit = cache.get(image);
  if (hit !== undefined) return hit;

  let srcSet: string | null = null;
  if (image.startsWith("/images/posts/") && image.endsWith(".png")) {
    const base = image.slice(0, -".png".length);
    const present = VARIANT_WIDTHS.filter((w) =>
      fs.existsSync(path.join(process.cwd(), "public", `${base.slice(1)}-w${w}.webp`)),
    );
    if (present.length) {
      srcSet = present.map((w) => `${base}-w${w}.webp ${w}w`).join(", ");
    }
  }
  cache.set(image, srcSet);
  return srcSet;
}
