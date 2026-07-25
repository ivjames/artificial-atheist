// Topic clustering (§5 step 2) — decides which topics are ready to become an
// article draft.
//
// ============================================================================
// FIRM RULE: eligibility is gated on the COUNT OF DISTINCT USERS who raised a
// topic, never on the number of questions/messages/threads. A single prolific
// user asking the same topic a hundred times must NEVER make it eligible —
// only >= clusterMinUsers *different* people crossing the same topic does.
// No article is ever derived from a single user.
// ============================================================================
import { prisma } from "@/lib/prisma";
import { clusterMinUsers } from "@/lib/config";
import type { ArticleDraft } from "@prisma/client";

export async function runClustering(): Promise<ArticleDraft[]> {
  // Only threads belonging to users who (a) are not deleted/erased and
  // (b) hold a currently-active "article_use" consent grant may ever be
  // counted toward a cluster (§6 unbundled, revocable consent).
  const threads = await prisma.thread.findMany({
    where: {
      topic: { not: null },
      user: {
        deletedAt: null,
        consents: { some: { kind: "article_use", revokedAt: null } },
      },
    },
    select: { topic: true, userId: true },
  });

  // topic -> Set(userId). The Set is what enforces "distinct users, not
  // question count" — repeated threads/messages from the same user simply
  // collapse into the same set entry.
  const distinctUsersByTopic = new Map<string, Set<string>>();
  for (const t of threads) {
    if (!t.topic) continue;
    const set = distinctUsersByTopic.get(t.topic) ?? new Set<string>();
    set.add(t.userId);
    distinctUsersByTopic.set(t.topic, set);
  }

  const created: ArticleDraft[] = [];
  for (const [topic, userIds] of distinctUsersByTopic) {
    if (userIds.size < clusterMinUsers) continue; // below the distinct-user threshold — not eligible

    // Don't double-queue a topic that already has a draft somewhere in the
    // pipeline (queued through approved/rejected); only a topic whose prior
    // draft has actually published is free to cluster again.
    const existing = await prisma.articleDraft.findFirst({
      where: { topic, status: { not: "published" } },
    });
    if (existing) continue;

    const draft = await prisma.articleDraft.create({
      data: {
        topic,
        aaTopic: topic, // tagging already writes one of the 5 AA taxonomy keys
        distinctUsers: userIds.size,
        sourceUserIds: JSON.stringify(Array.from(userIds)),
        status: "queued",
      },
    });
    created.push(draft);
  }

  return created;
}
