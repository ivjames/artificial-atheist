// Pre-publication scrub (§5 step 4, Slot C / "scrub"). Reviews a drafted
// article for residual re-identifying context and produces the reviewer-
// facing risk notes. Never publishes — only advances status to "review".
import { prisma } from "@/lib/prisma";
import { callSlot } from "@/lib/models/router";

const SYSTEM_PROMPT = `You are the pre-publication scrub pass for Artificial Atheist, a
publication that synthesizes anonymized visitor arguments into articles. Your job is a CONTENT
TRANSFORMATION, not a find-and-replace: read the whole draft and rewrite any passage that could
re-identify a real person, even indirectly.

This includes but is not limited to: named or narrowly-identifiable places (a specific town,
church, school, employer), family situations ("my wife left me because..."), unique life events,
or any other narrow biographical detail that would let someone who knows the person recognize
them — not just proper names. A detailed situation can identify someone even with no name at all.

Rewrite such passages into generic, illustrative phrasing that preserves the ARGUMENT being made
but removes the identifying specifics — for example, "a visitor described leaving their childhood
church in a small Midwestern town after a family conflict" becomes "some people describe leaving
their faith community after a painful family rift." Keep the rest of the article's wording as
close to the original as reasonably possible: this is a targeted scrub, not a rewrite of the
whole piece.

Respond in EXACTLY this format, with no extra commentary before or after:
<<<SCRUBBED>>>
the full cleaned markdown body
<<<NOTES>>>
a short bullet list of any residual re-identification risks you are NOT fully confident you
caught, for a human reviewer to check personally. If none, write "None identified."`;

function parseScrubOutput(raw: string): { scrubbed: string; notes: string } {
  const scrubbedMatch = raw.match(/<<<SCRUBBED>>>\s*([\s\S]*?)\s*<<<NOTES>>>/);
  const notesMatch = raw.match(/<<<NOTES>>>\s*([\s\S]*)$/);

  if (scrubbedMatch && notesMatch) {
    return { scrubbed: scrubbedMatch[1].trim(), notes: notesMatch[1].trim() };
  }

  // Defensive fallback: if the model didn't follow the format, surface the
  // raw response as-is but flag it loudly so a human checks it by hand.
  return {
    scrubbed: raw.trim(),
    notes: "Scrub model did not return the expected format — review the full draft manually for residual identifying detail.",
  };
}

export async function scrubArticle(draftId: string): Promise<void> {
  const draft = await prisma.articleDraft.findUniqueOrThrow({ where: { id: draftId } });
  const source = draft.draftMarkdown ?? "";
  if (!source.trim()) {
    throw new Error(`scrubArticle(${draftId}): draft has no draftMarkdown to scrub`);
  }

  const result = await callSlot("scrub", {
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: source }],
    maxTokens: 4000,
    temperature: 0.2,
  });

  const { scrubbed, notes } = parseScrubOutput(result.text);

  await prisma.articleDraft.update({
    where: { id: draftId },
    data: { scrubMarkdown: scrubbed, scrubNotes: notes, status: "review" },
  });
}
