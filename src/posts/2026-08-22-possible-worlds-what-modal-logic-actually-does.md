---
image: /images/posts/possible-worlds-what-modal-logic-actually-does.png
imageAlt: "Abstract geometric illustration: {'title':'Possible Worlds: What Modal Logic Actually Does','excerpt':'Possible worlds semantics is a powerful tool for analysing necessity and possibility — but"
title: "Possible Worlds: What Modal Logic Actually Does"
date: 2026-08-22
topic: philosophy
excerpt: "Possible worlds semantics is a powerful tool for analysing necessity and possibility — but it is easy to mistake the scaffolding for a metaphysical claim."
buffered: true
---

Modal logic began as a formal nuisance. Aristotle noticed that "it is necessary that P" and "it is possible that P" behave differently from plain assertions, and logicians spent centuries struggling to give those operators a rigorous meaning. The solution that eventually stuck — possible worlds semantics — is now indispensable across philosophy, linguistics, and theoretical computer science, yet it is persistently misunderstood, both by enthusiasts who treat it as proof that other universes exist and by critics who dismiss it as idle fantasy.

## What the formalism actually says

Standard propositional logic deals in truth values: a sentence is true or false. Modal logic adds two operators: **necessity** (□P, read "necessarily P") and **possibility** (◇P, read "possibly P"). Before the mid-twentieth century, these operators were given only informal readings. In 1959–1963, Saul Kripke supplied a rigorous semantics: interpret a modal statement relative to a set of possible worlds W, a distinguished actual world w₀, and an **accessibility relation** R between worlds. "Necessarily P" is true at a world w if P is true at every world accessible from w. "Possibly P" is true at w if P is true at at least one world accessible from w.

That is the whole technical core. A possible world, formally speaking, is just an index — a label that tells you which assignment of truth values you are evaluating a sentence against. Nothing in the formalism requires those indices to be concrete universes, spatiotemporally real places, or anything metaphysically loaded. They are, at minimum, a notational device that makes validity tractable.

## The accessibility relation and why it matters

Much of the philosophical action happens not in the worlds themselves but in the accessibility relation R. Different constraints on R yield different modal logics with different theorems.

If R is **reflexive** (every world can see itself), you get the system T: whatever is necessary is actual. That seems reasonable — if something couldn't be otherwise, it should be true here. Add **transitivity** (if w₁ sees w₂ and w₂ sees w₃, then w₁ sees w₃) and you get S4: what is necessarily necessary is necessary. Add **symmetry** (if w₁ sees w₂ then w₂ sees w₁) to reflexivity and transitivity and you get S5, the system most often used in philosophical arguments: whatever is possible is necessarily possible.

This matters enormously for theology. Alvin Plantinga's modal ontological argument for God's existence is formulated in S5. The argument runs roughly: God is defined as a being with **maximal greatness** (necessary existence and maximal excellence in every possible world); maximal greatness is possibly instantiated; therefore by S5's axiom (◇□P → □P), God necessarily exists. The logical move is valid within S5. The question critics press — and rightly so — is whether S5 is the correct logic for metaphysical modality, and whether "maximal greatness is possibly instantiated" is a claim one can assert without begging the question. If the concept of a necessarily existent being is coherent only if such a being actually exists, then granting the premise already surrenders the argument. The formalism does not resolve that; it sharpens exactly where the dispute lies.

## David Lewis and the ontological fork in the road

Kripke's semantics left open what possible worlds *are*. David Lewis took the most radical position: **modal realism**. On his view, all possible worlds are concrete, causally isolated universes, as real as ours. The actual world is not metaphysically privileged; "actual" is an indexical like "here" — it just picks out whichever world the speaker inhabits. A talking donkey exists in some possible world; that means there is, somewhere in logical space, a genuine donkey that genuinely talks.

Lewis's payoff was elegance. If worlds are concrete, modal talk reduces to ordinary quantification over individuals: "possibly P" means "there exists a world where P," no primitive modal notions needed. Propositions become sets of worlds. Counterfactuals — "if I had struck the match, it would have lit" — become claims about which worlds are closest to actuality given the antecedent. The entire apparatus of modality gets grounded in something (concrete existence) that Lewis regarded as ontologically perspicuous.

The cost is enormous: an actual infinity of concrete universes, populated by counterparts of every actual individual, most of which we can have no causal contact with whatsoever. Critics argued that Lewis was trading one mystery (irreducible modality) for another (profligate ontology). Lewis accepted the trade. His response was pragmatic: the theory earns its ontological rent by unifying so many analyses.

Most philosophers did not follow him. The dominant alternatives are **ersatzism**: possible worlds are not concrete places but abstract representations — sets of propositions, linguistic descriptions, or structural combinations. On this view, saying "there is a possible world where P" means something like "there is a maximally consistent description of a way things could be, and P is part of it." This is ontologically cheaper but arguably smuggles modality back in through the door: what makes a set of propositions genuinely *possible* rather than merely internally consistent?

## Counterfactuals and causal reasoning

Whatever one thinks of the metaphysics, possible worlds semantics has done serious work in the analysis of **counterfactual conditionals**. Robert Stalnaker and David Lewis independently proposed that "If A had been the case, B would have been the case" is true when, among the possible worlds where A holds, the ones most similar to the actual world are worlds where B also holds.

This framework captures intuitions that simple logical conditionals miss. "If Oswald had not shot Kennedy, Kennedy would not have been shot" feels true; the closest worlds where Oswald abstains are worlds where no other assassin steps in. "If the match had been struck, it would have lit" feels true when the match is dry and oxygen is present; the closest worlds where someone strikes it are worlds where it lights. The analysis is not without problems — "similarity" between worlds is doing heavy lifting, and specifying it precisely without circularity is hard — but it has been productive enough that philosophers of science, linguists, and even legal theorists use it to reason about causation and responsibility.

## What modal logic cannot do on its own

The formalism is a tool for representing and testing the logical structure of modal claims. It cannot, by itself, settle which propositions are genuinely necessary, possible, or impossible. That requires substantive philosophical argument.

Consider the conceivability-to-possibility inference: if you can conceive of a zombie — a being physically identical to a human but with no conscious experience — does that show zombies are metaphysically possible? David Chalmers argues yes, and uses this to argue that consciousness is not purely physical. But conceivability is a cognitive fact about what we can imagine; it is not obvious that it tracks metaphysical possibility. We might be unable to conceive of water lacking hydrogen because of how we acquired the concept of water, not because the world imposes a metaphysical necessity. Kripke himself drew this distinction carefully: "necessary a posteriori" truths (water is H₂O, heat is molecular kinetic energy) are discovered empirically yet hold in all possible worlds, while certain a priori claims turn out to be contingent. Modal logic accommodates this but doesn't generate it — the heavy lifting is done by the theory of reference and natural kinds.

Similarly, the question of which modal system governs metaphysical necessity is not answered by the formalism. S5 is frequently assumed in philosophical arguments because it is the strongest well-behaved system and because it is plausible that metaphysical necessity, if it holds at all, holds essentially. But that plausibility is a philosophical judgment, not a theorem.

## Why this matters for atheism and skepticism

The misuse of modal logic is a recurring pattern in philosophy of religion, and recognising its structure is part of intellectual hygiene. The ontological argument's modal form is genuinely valid in S5 — dismissing it as silly misses the point and leaves the real objections unstated. The real questions are: Is S5 the right logic for metaphysical modality? Is "possibly necessarily existing God" a coherent claim, or does it quietly assume what it sets out to prove? Could a parallel argument establish the necessary existence of a maximally evil being, or a necessarily existent perfect island? (Plantinga addresses the island parody; the discussion is technical and substantive.)

The broader lesson is that modal vocabulary — *necessary*, *possible*, *could not be otherwise* — appears constantly in theological and metaphysical arguments, and it is almost always doing more work than speakers realise. When a theologian says God's existence is *necessary* rather than merely *very probable*, they are not just emphasising confidence; they are making a specific modal claim with specific logical consequences. When a skeptic says miracles are *impossible*, they may mean merely very unlikely (an epistemic claim) or they may mean inconsistent with the laws of nature (a nomological claim) or they may mean metaphysically impossible in all worlds (a much stronger and harder to defend claim).

Possible worlds semantics did not create these distinctions, but it made them precise enough to see. That is what good formal tools do: they do not answer questions, but they clarify what you are actually asking.
