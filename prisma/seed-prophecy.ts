import type { PrismaClient } from "@prisma/client";
import { PROPHECY_VOCAB } from "../lib/prophecy/vocab";

// Seed the prophecy controlled vocabulary (ProphecyVocabTerm). Pure upserts
// keyed on (kind, key): idempotent, deploy-safe, never deletes — retired
// terms are soft-disabled via `active`, not removed here. Runs on EVERY
// deploy (called unconditionally from seed.ts main()), unlike the question
// seed which skips when data exists. sortOrder = position within kind.
export async function seedProphecyVocab(prisma: PrismaClient) {
  const positionInKind = new Map<string, number>();

  for (const term of PROPHECY_VOCAB) {
    const sortOrder = positionInKind.get(term.kind) ?? 0;
    positionInKind.set(term.kind, sortOrder + 1);

    await prisma.prophecyVocabTerm.upsert({
      where: { kind_key: { kind: term.kind, key: term.key } },
      update: {
        label: term.label,
        description: term.description,
        sortOrder,
      },
      create: {
        kind: term.kind,
        key: term.key,
        label: term.label,
        description: term.description,
        sortOrder,
      },
    });
  }

  console.log(
    `Prophecy vocab: upserted ${PROPHECY_VOCAB.length} terms across ${positionInKind.size} kinds.`
  );
}
