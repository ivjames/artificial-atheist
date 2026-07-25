// The two hidden axes behind the intake questions:
//   belief    — does a god exist?      yes = theist,   no = atheist
//   knowledge — can it be known?       knowable = gnostic, unknowable = agnostic
// These are exactly the belief-vs-knowledge distinction the Definitions
// questions teach, so the intake doubles as a lead-in to the content.

export type Belief = "yes" | "no";
export type Knowledge = "knowable" | "unknowable";
export type Stance = { belief: Belief; knowledge: Knowledge };

export const STANCE_KEY = "atheismiq-stance";

export function isStance(v: unknown): v is Stance {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    (s.belief === "yes" || s.belief === "no") &&
    (s.knowledge === "knowable" || s.knowledge === "unknowable")
  );
}

// Independent flags stored on each result for stats:
//   atheist  = doesn't believe a god exists
//   agnostic = thinks it can't be known for certain
export function stanceToFlags({ belief, knowledge }: Stance): {
  atheist: boolean;
  agnostic: boolean;
} {
  return { atheist: belief === "no", agnostic: knowledge === "unknowable" };
}

export function stanceLabel({ belief, knowledge }: Stance): string {
  const know = knowledge === "unknowable" ? "agnostic" : "gnostic";
  const bel = belief === "yes" ? "theist" : "atheist";
  return `${know} ${bel}`;
}

// Plain-English explanation that names the two axes without having asked in jargon.
export function stanceGloss({ belief, knowledge }: Stance): string {
  const beliefPart =
    belief === "yes"
      ? "you lean toward a god or higher power existing"
      : "you don’t hold a belief that a god exists";
  const knowPart =
    knowledge === "unknowable"
      ? "you don’t claim it can be known for certain"
      : "you think it’s something we can ultimately know";
  return `${beliefPart} — that’s the “${belief === "yes" ? "theist" : "atheist"}” part, about belief — and ${knowPart}, the “${knowledge === "unknowable" ? "agnostic" : "gnostic"}” part, about knowledge.`;
}
