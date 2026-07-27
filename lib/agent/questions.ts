// Shared, pure helpers for reasoning about the shape of an agent reply — the
// questions it asks and how long it runs.
//
// The debate persona (persona.ts) forbids the agent from STACKING questions at
// the visitor — "ask AT MOST ONE pointed question … never stack multiple
// questions … or end every turn with one." Two consumers need the same notion
// of what counts as a stacked closing:
//   - lib/agent/adversary.ts `scoreAgentTurns` — the eval metric that flags it.
//   - lib/agent/chat.ts — the live guardrail that trims it before it ships.
// Keeping the logic here means the metric and the guardrail agree by
// construction. Nothing here touches the DB, the model, or any I/O.

// Remove quoted spans so a question the agent QUOTES doesn't count as a question
// the agent ASKS (and, for the guardrail, so a quotation is never cut into).
// Double and curly-single quotes are always quotations. Straight single quotes
// are ambiguous — they're also apostrophes (it's, don't, boys') — so we only
// strip a single-quoted span when it contains sentence punctuation (. ? !), the
// mark of a quoted sentence, never a contraction or possessive. Spans are
// replaced with a space so surrounding words stay separated. The stripped text
// is used ONLY for counting/gating, never as output, so an over-eager strip can
// at worst undercount — it can't corrupt a reply.
export function stripQuotedSpans(text: string): string {
  return text
    .replace(/"[^"]*"/g, " ")
    .replace(/“[^”]*”/g, " ")
    .replace(/‘[^’]*’/g, " ")
    .replace(/'[^']*[.?!][^']*'/g, " ");
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

// A bare list marker ("1.", "2)") that the sentence splitter breaks out as its
// own "sentence". A numbered list of closing questions ("1. Why A? 2. Why B?")
// would otherwise register the ordinal "2." as a declarative sentence between
// the questions and hide the stack, so the run scan treats markers as
// transparent — neither a question nor a run-ending declarative.
const ORDINAL_MARKER = /^\d+[.)]$/;

// The reply's CLOSING run — the contiguous block of question sentences at the
// very end (ordinal markers transparent). A reply that closes "…so which is it,
// design or chance? And why should I trust that?" has two questions in the run;
// a rhetorical question buried in the argument and then answered ("…what caused
// God? That just relocates the problem.") has none, because declarative text
// follows it. Returns the count and the index of the FIRST question in the run
// (where a trim keeps up to, dropping the pile-on after) — firstQ is -1 when
// there is no closing question run.
function trailingQuestionSpan(sentences: string[]): { count: number; firstQ: number } {
  let count = 0;
  let firstQ = -1;
  for (let i = sentences.length - 1; i >= 0; i--) {
    const s = sentences[i].trim();
    if (ORDINAL_MARKER.test(s)) continue;
    if (isQuestionSentence(sentences[i])) {
      count++;
      firstQ = i;
      continue;
    }
    break;
  }
  return { count, firstQ };
}

// How many sentences a reply contains. Backs the eval's length metric
// (scoreAgentTurns) so the "keep it to roughly five to ten sentences" persona
// rule can be flagged the same way the question rules are — position-agnostic,
// counting every terminated sentence plus any unterminated trailing fragment
// (a reply ending mid-clause still spent a sentence's worth of length). Ordinal
// list markers ("1.", "2)") are not sentences, matching the run scan above.
export function sentenceCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const { sentences, tail } = splitSentences(t);
  const n = sentences.filter((s) => !ORDINAL_MARKER.test(s.trim())).length;
  return n + (tail.trim().length > 0 ? 1 : 0);
}

// How many questions sit in the reply's closing run. This is the line between an
// engagement/interrogation close (flagged) and a substantive rhetorical one in
// the body (allowed) — position, not mere presence of a "?".
export function trailingQuestionRun(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  const { sentences, tail } = splitSentences(t);
  // A non-empty unterminated tail means the reply ends on a NON-question
  // fragment (e.g. a truncated clause), so there is no trailing question.
  if (tail.trim().length > 0) return 0;
  return trailingQuestionSpan(sentences).count;
}

// Production backstop for the "at most one closing question" rule. When the
// reply ends by stacking two or more questions at the visitor (the same
// condition scoreAgentTurns flags, quote-aware), keep the FIRST question of the
// closing run — usually the substantive pointed one — and drop the pile-on
// after it. Any other reply is returned unchanged. Whole sentences are removed,
// so the result stays well-formed; original trailing whitespace is preserved.
export function trimStackedClosingQuestions(text: string): string {
  // Gate on the exact metric condition (quote-aware) so the guardrail never
  // edits a reply the eval would consider clean — including one whose only
  // stacked questions sit inside a quotation.
  if (trailingQuestionRun(stripQuotedSpans(text)) < 2) return text;

  const trimmedEnd = text.replace(/\s+$/, "");
  const trailingWs = text.slice(trimmedEnd.length);
  const { sentences, tail } = splitSentences(trimmedEnd);
  // Unterminated tail: the raw text doesn't actually end on a question run
  // (quote-stripping changed the shape) — don't risk a malformed edit.
  if (tail.trim().length > 0) return text;

  const { count, firstQ } = trailingQuestionSpan(sentences);
  // Fewer than two questions in the RAW closing run, or none found: the
  // quote-stripped and raw views disagree, so leave the text alone.
  if (count < 2 || firstQ < 0) return text;

  const kept = sentences.slice(0, firstQ + 1).join("");
  return kept + trailingWs;
}

// Production backstop for the length ceiling. The persona is told to keep a
// reply to a handful of sentences, but against a sophisticated opponent the
// model ignores it and writes ~15 (the eval confirms it). When a reply runs
// past `max` sentences, keep the first `max` and drop the rest. The cut is at a
// SENTENCE boundary — whole sentences only, never mid-word like a token cap —
// so the result stays well-formed; an unterminated trailing fragment is dropped
// with the overflow. Ordinal list markers are transparent (matching
// sentenceCount), and original trailing whitespace is preserved. A reply
// already within the limit is returned unchanged.
//
// Lives in the LIVE chat path only (lib/agent/chat.ts). The eval deliberately
// scores the RAW model output, so this trim never touches what the eval
// measures — /review/adversary keeps showing the true prompt behavior.
export function trimToSentenceLimit(text: string, max: number): string {
  if (max < 1) return text;
  if (sentenceCount(text) <= max) return text;

  const trimmedEnd = text.replace(/\s+$/, "");
  const trailingWs = text.slice(trimmedEnd.length);
  const { sentences } = splitSentences(trimmedEnd);

  // Walk the sentences, counting only non-ordinal ones toward the cap (an
  // ordinal marker like "2." is kept but doesn't consume the budget), and stop
  // once `max` real sentences have been kept.
  let counted = 0;
  let end = 0;
  for (let i = 0; i < sentences.length; i++) {
    if (!ORDINAL_MARKER.test(sentences[i].trim())) counted += 1;
    end = i + 1;
    if (counted >= max) break;
  }

  return sentences.slice(0, end).join("") + trailingWs;
}

// The exact guardrail sequence chat.ts applies to a live reply before it ships:
// cap the length (whole sentences), then drop any stacked closing questions.
// Extracted so the adversary eval can score the AS-SHIPPED reply through the
// same transform production uses — making the dashboard's "shipped" figures
// match what a visitor actually sees, by construction rather than by a second
// copy of the logic drifting out of sync.
export function applyReplyGuards(text: string, maxSentences: number): string {
  return trimStackedClosingQuestions(trimToSentenceLimit(text, maxSentences));
}
