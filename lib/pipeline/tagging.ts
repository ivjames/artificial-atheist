// Topic tagging (§5 step 1). Every thread needs a topic before it can be
// counted toward a topic cluster. Classification is idempotent: a thread
// that already has a topic is never reclassified.
import { prisma } from "@/lib/prisma";
import { callSlot } from "@/lib/models/router";

// The five AA publication taxonomy keys — every thread topic must resolve to
// exactly one of these (see also lib/pipeline/emit.ts).
export const AA_TOPICS = [
  "science",
  "philosophy",
  "secularism",
  "religion",
  "news",
] as const;
export type AaTopic = (typeof AA_TOPICS)[number];

function isAaTopic(value: string): value is AaTopic {
  return (AA_TOPICS as readonly string[]).includes(value);
}

// Cheap, offline-safe keyword heuristic. Deliberately biased toward
// "religion" (the fallback) since that's the most common debate-chat topic.
const KEYWORDS: Record<AaTopic, string[]> = {
  science: [
    "evolution", "big bang", "cosmology", "biology", "physics", "science",
    "natural selection", "universe", "quantum", "fossil", "dna", "abiogenesis",
  ],
  philosophy: [
    "morality", "moral", "ethics", "meaning of life", "free will",
    "epistemology", "logic", "philosophy", "consciousness", "objective truth",
  ],
  secularism: [
    "separation of church and state", "secular", "government", "constitution",
    "school prayer", "religious freedom", "establishment clause", "theocracy",
  ],
  religion: [
    "god", "bible", "quran", "jesus", "pray", "prayer", "faith", "church",
    "scripture", "islam", "christianity", "afterlife", "soul", "salvation",
  ],
  news: ["news", "today", "recently", "this week", "headline", "current event"],
};

function heuristicTopic(text: string): AaTopic {
  const lower = text.toLowerCase();
  let best: AaTopic = "religion"; // default fallback per spec
  let bestScore = 0;
  for (const topic of AA_TOPICS) {
    const score = KEYWORDS[topic].reduce(
      (n, kw) => n + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = topic;
    }
  }
  return best;
}

/**
 * Classify a thread's topic into one of the five AA taxonomy keys and
 * persist it. Returns the existing topic unchanged if one is already set.
 *
 * Strategy: try a cheap model-assisted classification (Slot C) first for
 * accuracy; validate its output strictly against the five keys; on any
 * failure (no API key, bad output, network error, empty message) fall back
 * to the offline keyword heuristic, which itself defaults to "religion".
 */
export async function assignTopicToThread(threadId: string): Promise<string> {
  const thread = await prisma.thread.findUniqueOrThrow({ where: { id: threadId } });
  if (thread.topic) return thread.topic;

  const firstUserMessage = await prisma.message.findFirst({
    where: { threadId, role: "user" },
    orderBy: { createdAt: "asc" },
  });
  const text = firstUserMessage?.content ?? "";

  let topic: string = heuristicTopic(text);

  if (text.trim()) {
    try {
      const result = await callSlot("scrub", {
        system:
          "Classify the visitor message into EXACTLY ONE of these five words " +
          "and reply with ONLY that single lowercase word, nothing else: " +
          "science, philosophy, secularism, religion, news.",
        messages: [{ role: "user", content: text.slice(0, 2000) }],
        maxTokens: 10,
        temperature: 0,
      });
      const candidate = result.text.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (isAaTopic(candidate)) topic = candidate;
    } catch {
      // Model path is an optional enhancement; heuristic result stands.
    }
  }

  await prisma.thread.update({ where: { id: threadId }, data: { topic } });
  return topic;
}
