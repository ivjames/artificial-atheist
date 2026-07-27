// Shared, pure helpers for reasoning about the questions in an agent reply.
//
// The debate persona (persona.ts) forbids the agent from STACKING questions at
// the visitor — "ask AT MOST ONE pointed question … never stack multiple
// questions … or end every turn with one." Two consumers need the same notion
// of what counts as a stacked closing:
//   - lib/agent/adversary.ts `scoreAgentTurns` — the eval metric that flags it.
//   - lib/agent/chat.ts — the live guardrail that trims it before it ships.
// Keeping the logic here means the metric and the guardrail agree by
// construction. Nothing here touches the DB, the model, or any I/O.

// Remove double-quoted spans (straight and curly) so a question the agent
// QUOTES doesn't count as a question the agent ASKS. Replaced with a space so
// the surrounding words stay separated. Single quotes are deliberately left
// alone — stripping them would swallow apostrophes in contractions (it's, don't).
export function stripQuotedSpans(text: string): string {
  return text
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ");
}

// Split into sentences, keeping terminal punctuation and any trailing
// brackets/quotes ("?)"). Matches are contiguous, so anything left over after
// the final match is an unterminated trailing fragment.
function splitSentences(text: string): { sentences: string[]; tail: string } {
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*/g) || [];
  const covered = sentences.join("").length;
  return { sentences, tail: text.slice(covered) };
}

function isQuestionSentence(sentence: string): boolean {
  return /\?["')\]]*$/.test(sentence.trim());
}

// How many question sentences sit in the reply's CLOSING run — the contiguous
// block of question sentences at the very end. A reply that closes
// "…so which is it — design or chance? And why should I trust that?" has a run
// of 2 (questions fired at the visitor); a rhetorical question buried in the
// argument and then answered ("…what caused God? That just relocates the
// problem.") has a run of 0, because declarative text follows it. This is the
// line between an engagement/interrogation question (flagged) and a substantive
// rhetorical one (allowed) — position, not mere presence of a "?".
export function trailingQuestionRun(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const { sentences, tail } = splitSentences(t);
  // A non-empty unterminated tail means the reply ends on a NON-question
  // fragment (e.g. a truncated clause), so there is no trailing question.
  if (tail.trim().length > 0) return 0;
  let run = 0;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (isQuestionSentence(sentences[i])) run++;
    else break;
  }
  return run;
}

// Production backstop for the "at most one closing question" rule. When the
// reply ends by stacking two or more questions at the visitor (the same
// condition scoreAgentTurns flags), keep the FIRST question of the closing run
// — usually the substantive pointed one — and drop the pile-on after it. Any
// other reply is returned unchanged. Whole sentences are removed, so the result
// stays well-formed; original trailing whitespace is preserved.
export function trimStackedClosingQuestions(text: string): string {
  // Gate on the exact metric condition (quote-aware) so the guardrail never
  // edits a reply the eval would consider clean.
  if (trailingQuestionRun(stripQuotedSpans(text)) < 2) return text;

  const trimmedEnd = text.replace(/\s+$/, "");
  const trailingWs = text.slice(trimmedEnd.length);
  const { sentences, tail } = splitSentences(trimmedEnd);
  // Unterminated tail: the raw text doesn't actually end on a question run
  // (quote-stripping changed the shape) — don't risk a malformed edit.
  if (tail.trim().length > 0) return text;

  let start = sentences.length;
  for (let i = sentences.length - 1; i >= 0; i--) {
    if (isQuestionSentence(sentences[i])) start = i;
    else break;
  }
  // Fewer than two questions in the RAW closing run: the quote-stripped view
  // and the raw view disagree, so leave the text alone rather than mis-cut it.
  if (sentences.length - start < 2) return text;

  const kept = sentences.slice(0, start + 1).join("");
  return kept + trailingWs;
}
