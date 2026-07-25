// Article drafting (§5 step 3, Slot B / "writer"). Turns a queued topic
// cluster into a synthesized first draft. Never publishes anything itself —
// it only advances status to "scrubbing" for the Slot C pass.
import { prisma } from "@/lib/prisma";
import { callSlot } from "@/lib/models/router";
import { clusterMinUsers } from "@/lib/config";

// Bound the synthesis input so no single contributor's material can dominate
// the prompt (and so we never ship a near-transcript of one person).
const MAX_MESSAGES_PER_USER = 6;
const PER_USER_CHAR_CAP = 1200;

const SYSTEM_PROMPT = `You are the article-writing voice of Artificial Atheist, a firmly
naturalist, evidence-first publication on atheism and skepticism. You will be given a numbered
list of short, anonymized excerpts of arguments/questions raised about ONE topic. Each numbered
item comes from a DIFFERENT PERSON — there is no relationship between item order and anything
else.

Write an article that SYNTHESIZES the common thread running across these contributions into one
well-argued piece — the classic framing is "A common argument we hear is X — here's the
response." Treat the numbered items only as evidence that a theme recurs; do NOT quote, closely
paraphrase, or reconstruct any single item as if it were one person's conversation, and do not
mention chats, visitors, users, or how many people were involved.

House voice: blunt, analytical, confident, concise — no hedging filler. Argue a firm naturalist
position from evidence.

Respond in EXACTLY this format, with no extra commentary before or after:
<<<TITLE>>>
one line, no surrounding quotes
<<<EXCERPT>>>
one or two plain sentences summarizing the article
<<<BODY>>>
the full markdown article body (no frontmatter — start directly with the content)`;

function parseWriterOutput(raw: string): { title: string; excerpt: string; body: string } {
  const titleMatch = raw.match(/<<<TITLE>>>\s*([\s\S]*?)\s*<<<EXCERPT>>>/);
  const excerptMatch = raw.match(/<<<EXCERPT>>>\s*([\s\S]*?)\s*<<<BODY>>>/);
  const bodyMatch = raw.match(/<<<BODY>>>\s*([\s\S]*)$/);

  if (titleMatch && excerptMatch && bodyMatch) {
    return {
      title: titleMatch[1].trim(),
      excerpt: excerptMatch[1].trim(),
      body: bodyMatch[1].trim(),
    };
  }

  // Defensive fallback if the model ignored the delimiter format — still
  // capture something reviewable rather than throwing away the generation.
  const body = raw.trim();
  const firstLine = body.split("\n").find((l) => l.trim().length > 0) ?? "Untitled draft";
  return {
    title: firstLine.replace(/^#+\s*/, "").slice(0, 120),
    excerpt: firstLine.slice(0, 200),
    body,
  };
}

/**
 * Slot B: synthesize a draft article for a queued topic cluster.
 *
 * FIRM RULE re-enforced here (not just at clustering time): consent can be
 * revoked, and users can be erased, between clustering and drafting. This
 * re-verifies live consent/deletion state for every contributing user and
 * refuses to draft at all if fewer than clusterMinUsers valid, distinct,
 * consented contributors remain — an article is never derived from a
 * single person, no matter when in the pipeline that would happen.
 */
export async function draftArticle(draftId: string): Promise<void> {
  const draft = await prisma.articleDraft.findUniqueOrThrow({ where: { id: draftId } });
  const candidateUserIds: string[] = draft.sourceUserIds ? JSON.parse(draft.sourceUserIds) : [];

  const validUsers = await prisma.user.findMany({
    where: {
      id: { in: candidateUserIds },
      deletedAt: null,
      consents: { some: { kind: "article_use", revokedAt: null } },
    },
    select: { id: true },
  });
  const validUserIds = validUsers.map((u) => u.id);

  if (validUserIds.length < clusterMinUsers) {
    throw new Error(
      `draftArticle(${draftId}): only ${validUserIds.length} consented distinct user(s) remain ` +
        `for topic "${draft.topic}" (need >= ${clusterMinUsers}); refusing to draft from too few users`,
    );
  }

  await prisma.articleDraft.update({ where: { id: draftId }, data: { status: "drafting" } });

  // Per-user summary: only that user's own, non-redacted questions on
  // threads tagged with this topic — never raw identifying context beyond
  // the message text itself, and capped in length and message count.
  const contributions: string[] = [];
  for (const userId of validUserIds) {
    const messages = await prisma.message.findMany({
      where: {
        role: "user",
        redacted: false,
        thread: { userId, topic: draft.topic },
      },
      orderBy: { createdAt: "asc" },
      take: MAX_MESSAGES_PER_USER,
      select: { content: true },
    });
    if (messages.length === 0) continue;
    contributions.push(messages.map((m) => m.content).join(" ").slice(0, PER_USER_CHAR_CAP));
  }

  const synthesisInput = contributions.map((c, i) => `${i + 1}. ${c}`).join("\n\n");

  const result = await callSlot("writer", {
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Topic: ${draft.topic}\n\nAnonymized visitor arguments/questions on this topic:\n\n${synthesisInput}`,
      },
    ],
    maxTokens: 3000,
    temperature: 0.6,
  });

  const { title, excerpt, body } = parseWriterOutput(result.text);

  // Persist the actually-used contributor set (may be a subset of the
  // original cluster if some consent lapsed between clustering and drafting).
  await prisma.articleDraft.update({
    where: { id: draftId },
    data: {
      title,
      excerpt,
      draftMarkdown: body,
      status: "scrubbing",
      distinctUsers: validUserIds.length,
      sourceUserIds: JSON.stringify(validUserIds),
    },
  });
}
