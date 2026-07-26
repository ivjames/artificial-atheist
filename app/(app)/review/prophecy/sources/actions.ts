"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PROPHECY_VOCAB } from "@/lib/prophecy/vocab";
import { assertProphecyAdmin } from "../actions";

const SOURCE_TYPE_KEYS = PROPHECY_VOCAB.filter((t) => t.kind === "source_type").map((t) => t.key);

const BASE = "/review/prophecy/sources/";

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "source"
  );
}

export async function createSource(formData: FormData): Promise<void> {
  await assertProphecyAdmin();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${BASE}?error=title`);

  const type = String(formData.get("type") ?? "").trim();
  if (!SOURCE_TYPE_KEYS.includes(type)) redirect(`${BASE}?error=type`);

  const author = String(formData.get("author") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();

  const yearRaw = String(formData.get("year") ?? "").trim();
  let year: number | null = null;
  if (yearRaw) {
    const n = Number.parseInt(yearRaw, 10);
    if (!Number.isInteger(n) || String(n) !== yearRaw || n < -4000 || n > 2100) {
      redirect(`${BASE}?error=year`);
    }
    year = n;
  }

  // Slug from title, with a numeric suffix on collision.
  const base = slugify(title);
  let slug = base;
  for (let n = 2; await prisma.prophecySource.findUnique({ where: { slug } }); n++) {
    slug = `${base}-${n}`;
  }

  const created = await prisma.prophecySource.create({
    data: { slug, type, title, author, year, url },
  });

  revalidatePath("/review/prophecy/sources");
  redirect(`${BASE}?created=${encodeURIComponent(created.slug)}`);
}
