#!/usr/bin/env node
/**
 * image-variants.mjs — responsive WebP size variants for post illustrations.
 *
 * The committed 1536px PNGs (~1.8MB each) are the canonical art, but shipping
 * them to every viewport is what tanked LCP in the QA scan. This emits WebP
 * renditions next to each PNG (public/images/posts/<slug>-w<width>.webp) that
 * the publication components serve via <picture> srcset, with the PNG as the
 * fallback. The PNG stays the source of truth (OG tags + feed enclosures keep
 * using it) and variants are derived, never authored.
 *
 * Widths must stay in sync with VARIANT_WIDTHS in lib/images.ts (the Next-side
 * helper can't import an .mjs script, so the list lives in both places).
 *
 * Usage:
 *   import { makeVariants } from "./image-variants.mjs"   // per-image, used by illustrate.mjs
 *   node scripts/image-variants.mjs            # backfill: all PNGs missing/stale variants
 *   node scripts/image-variants.mjs --force    # regenerate everything
 *   node scripts/image-variants.mjs <slug>     # one image by slug
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = process.cwd();
const IMG_DIR = path.join(ROOT, "public", "images", "posts");

// Chosen from the rendered sizes in publication.css at 2x DPR: list thumb
// 80px→320, card ~330px→640, lead ~600px→1344, article hero ~672px→1344.
export const VARIANT_WIDTHS = [320, 640, 960, 1344];

/**
 * Generate the WebP variants for one PNG. Skips variants that already exist
 * and are newer than the source (so re-runs are cheap and idempotent).
 * Returns the number of files written. Throws only on a truly broken source.
 */
export async function makeVariants(pngPath, { force = false } = {}) {
  const base = pngPath.replace(/\.png$/, "");
  let written = 0;
  const srcMtime = fs.statSync(pngPath).mtimeMs;
  for (const w of VARIANT_WIDTHS) {
    const out = `${base}-w${w}.webp`;
    if (!force && fs.existsSync(out) && fs.statSync(out).mtimeMs >= srcMtime) continue;
    await sharp(pngPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(out);
    written++;
  }
  return written;
}

// ---- CLI: backfill all / --force / single slug ----
async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const slug = args.find((a) => !a.startsWith("--"));

  let pngs = fs
    .readdirSync(IMG_DIR)
    .filter((f) => f.endsWith(".png"))
    .map((f) => path.join(IMG_DIR, f));
  if (slug) {
    pngs = pngs.filter((p) => path.basename(p, ".png") === slug);
    if (!pngs.length) {
      console.error("No image for slug:", slug);
      process.exit(1);
    }
  }

  let files = 0;
  let images = 0;
  for (const png of pngs) {
    try {
      const n = await makeVariants(png, { force });
      if (n > 0) {
        images++;
        files += n;
        console.log(`  ${path.basename(png, ".png")}: ${n} variant(s)`);
      }
    } catch (e) {
      console.error(`  FAILED ${path.basename(png)}: ${e.message}`);
      process.exitCode = 1;
    }
  }
  console.log(`Done. ${files} file(s) written across ${images}/${pngs.length} image(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
