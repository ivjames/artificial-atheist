import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { runImport } from "@/lib/prophecy/import";
import { loadClaimDrafts } from "@/lib/prophecy/draftload";

// Prophecy module — one-shot dataset bootstrap.
//
// Standing up the corpus by hand meant creating five source lists with exactly
// the right slugs and pasting five large JSON files into a textarea, in order,
// before the claim drafts could resolve their `listSlug` references. That is
// tedious and it is precisely where a typo silently orphans 1,080 mappings.
// This does the whole thing from the committed files instead.
//
// Every step is idempotent and additive: lists are created only when missing
// (an existing list is left exactly as the operator has it), entries are
// skipped when their (list, entryNumber) already exists, and claim drafts never
// touch a claim that already exists. Re-running is therefore always safe — it
// is the intended way to pick up a dataset added later.

export type BootstrapDataset = {
  slug: string;
  file: string;
  title: string;
  claimedCount: number | null;
  url: string;
  description: string;
};

export type BootstrapResult = {
  lists: Array<{
    slug: string;
    listCreated: boolean;
    entriesCreated: number;
    entriesSkipped: number;
    errors: string[];
  }>;
  claims: {
    attempted: boolean;
    claimsCreated: number;
    claimsSkipped: number;
    mappingsCreated: number;
    mappingsSkipped: number;
    errors: string[];
  };
  errors: string[];
};

// data/prophecy lives at the repo root, which is process.cwd() for both the
// Next server and the tsx script.
function dataDir(root?: string): string {
  return path.join(root ?? process.cwd(), "data", "prophecy");
}

export function readManifest(root?: string): BootstrapDataset[] {
  const file = path.join(dataDir(root), "manifest.json");
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as {
    datasets?: BootstrapDataset[];
  };
  if (!Array.isArray(parsed.datasets)) {
    throw new Error("bootstrap: manifest.json has no datasets array");
  }
  return parsed.datasets;
}

/**
 * Import every committed dataset, then (unless `skipClaims`) load the AI claim
 * drafts on top. Returns per-list counts so the caller can report exactly what
 * landed; nothing throws for a single bad dataset — its error is collected and
 * the rest still import.
 */
export async function bootstrapProphecyData(
  prisma: PrismaClient,
  opts: { root?: string; skipClaims?: boolean } = {},
): Promise<BootstrapResult> {
  const result: BootstrapResult = {
    lists: [],
    claims: {
      attempted: false,
      claimsCreated: 0,
      claimsSkipped: 0,
      mappingsCreated: 0,
      mappingsSkipped: 0,
      errors: [],
    },
    errors: [],
  };

  let datasets: BootstrapDataset[];
  try {
    datasets = readManifest(opts.root);
  } catch (e) {
    result.errors.push(`manifest: ${e instanceof Error ? e.message : "unreadable"}`);
    return result;
  }

  for (const ds of datasets) {
    try {
      // The list is keyed by slug, not title — the slug is what
      // claims-draft-v1.json references.
      let list = await prisma.prophecySourceList.findUnique({ where: { slug: ds.slug } });
      const listCreated = !list;
      if (!list) {
        list = await prisma.prophecySourceList.create({
          data: {
            slug: ds.slug,
            title: ds.title,
            claimedCount: ds.claimedCount,
            description: `${ds.description} Source: ${ds.url}`,
          },
        });
      }

      const text = fs.readFileSync(path.join(dataDir(opts.root), ds.file), "utf8");
      const imported = await runImport(prisma, {
        sourceListId: list.id,
        format: "json",
        filename: ds.file,
        text,
        importedBy: "bootstrap",
      });

      result.lists.push({
        slug: ds.slug,
        listCreated,
        entriesCreated: imported.created,
        entriesSkipped: imported.skipped,
        errors: imported.errors,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      result.errors.push(`${ds.slug}: ${msg}`);
      result.lists.push({
        slug: ds.slug,
        listCreated: false,
        entriesCreated: 0,
        entriesSkipped: 0,
        errors: [msg],
      });
    }
  }

  if (opts.skipClaims) return result;

  // Claim drafts go last: their mappings resolve by (listSlug, entryNumber), so
  // every entry has to exist first.
  const draftFile = path.join(dataDir(opts.root), "claims-draft-v1.json");
  if (!fs.existsSync(draftFile)) {
    result.errors.push("claims-draft-v1.json not found — lists imported, claims skipped");
    return result;
  }
  try {
    const loaded = await loadClaimDrafts(prisma, fs.readFileSync(draftFile, "utf8"));
    result.claims = { attempted: true, ...loaded };
  } catch (e) {
    result.claims.attempted = true;
    result.claims.errors.push(e instanceof Error ? e.message : "unknown error");
  }

  return result;
}
