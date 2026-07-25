import { prisma } from "@/lib/prisma";

// Right-to-erasure (§6). Runs as one transaction so a partial erasure can
// never be observed: message content is blanked, in-flight article drafts
// lose this user as a source, all consents are revoked, and the User row is
// soft-deleted with its email scrambled (freeing the address for reuse).
// Callers that erase the *current* session's own account must call
// destroySession() afterward — this function only touches data, not cookies.
export async function eraseUser(userId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Blank content on every message in every thread this user owns. The
    // `redacted` flag is belt-and-suspenders: it excludes the row from the
    // article pipeline even if something else still references the thread.
    const threads = await tx.thread.findMany({
      where: { userId },
      select: { id: true },
    });
    const threadIds = threads.map((t) => t.id);
    if (threadIds.length > 0) {
      await tx.message.updateMany({
        where: { threadId: { in: threadIds } },
        data: { content: "", redacted: true },
      });
    }

    // Pull this user out of any non-published article draft that drew on
    // their conversations. `contains` is a cheap pre-filter over the
    // JSON-encoded string column; the JSON.parse membership check below
    // guards against a false-positive substring match.
    const candidates = await tx.articleDraft.findMany({
      where: {
        status: { not: "published" },
        sourceUserIds: { contains: userId },
      },
    });
    for (const draft of candidates) {
      let ids: string[];
      try {
        ids = draft.sourceUserIds ? (JSON.parse(draft.sourceUserIds) as string[]) : [];
      } catch {
        ids = [];
      }
      if (!ids.includes(userId)) continue;

      const remaining = ids.filter((id) => id !== userId);
      const note = `[erasure ${new Date().toISOString()}] a source user was erased and removed from this draft`;
      await tx.articleDraft.update({
        where: { id: draft.id },
        data: {
          sourceUserIds: JSON.stringify(remaining),
          distinctUsers: Math.max(0, draft.distinctUsers - 1),
          scrubNotes: draft.scrubNotes ? `${draft.scrubNotes}\n${note}` : note,
        },
      });
    }

    // Revoke every still-active consent (kept as an audit trail, not deleted).
    await tx.consent.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Soft-delete the user; scramble the email so it's free for someone else
    // to sign up with (and so the deleted row can't be contacted).
    await tx.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted+${userId}@invalid`,
      },
    });
  });
}
