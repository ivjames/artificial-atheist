---
image: /images/posts/the-frame-problem-what-action-requires-us-to-ignore.png
imageAlt: "Abstract geometric illustration: {'title':'The Frame Problem: What Action Requires Us to Ignore','excerpt':'The frame problem asks how any reasoning system — human or artificial — knows which f"
title: "The Frame Problem: What Action Requires Us to Ignore"
date: 2026-09-08
topic: philosophy
excerpt: "The frame problem asks how any reasoning system — human or artificial — knows which facts stay fixed when something in the world changes."
buffered: true
---

When you move a coffee cup from one side of a table to the other, you somehow know that the cup's colour has not changed, that the table still exists, that the room has not rearranged itself behind you. This sounds trivial. It is not. The problem of deciding, for any given action, which facts about the world remain unaffected — and doing so without checking every fact one by one — is called the **frame problem**, and it has resisted clean solution for over fifty years.

## Where the problem comes from

The frame problem was first stated precisely by John McCarthy and Patrick Hayes in a 1969 paper on formalising common-sense reasoning. They were trying to give a logic-based account of how an agent plans actions. In their formal system, every fact had to be explicitly stated, and every action had to be accompanied by a list of what it changed. The difficulty was immediate: if you assert that moving a block from position A to position B changes the block's location, you also need to assert that it does *not* change the block's colour, the colour of every other block, the position of every other block, the temperature of the room, and so on — an infinite list. No finite set of axioms can enumerate all the things an action leaves unchanged.

Their proposed fix — **frame axioms**, explicit statements of non-change — only renamed the problem. For any world of realistic complexity, the number of frame axioms explodes combinatorially. The deeper issue is that the burden of specifying what stays fixed is just as large as specifying what changes, and in realistic situations it is far larger, because most facts are unaffected by any given action.

## Why it is a philosophical problem, not merely an engineering one

It is tempting to treat the frame problem as a quirk of early AI formalisms that later, more flexible systems simply sidestepped. But that reading misses what the problem is actually about. The frame problem is a symptom of a deeper puzzle: **relevance**. How does any reasoner, biological or artificial, identify which features of its situation matter for the task at hand and filter out everything else?

This is not just a question about logic systems. Philosophical accounts of belief revision — how an agent updates its beliefs when it learns something new — run into the same wall. When you learn that it is raining outside, you update your belief about whether to carry an umbrella. You do not update your belief about the population of Iceland or the boiling point of water. But *why not*? What determines the boundary of relevant updating? No formal system has given a fully general answer, because determining relevance seems to require already understanding the situation in a way that the formal system was supposed to produce.

Daniel Dennett, in a 1987 essay, distinguished three versions of the problem. The first is the technical version McCarthy and Hayes faced. The second is the problem of *representing* the fact that most things do not change — which requires some way of encoding default assumptions without listing them all. The third, which Dennett considered the hardest, is the problem of *recognising* which aspects of a situation are relevant before committing to a plan, a problem he thought might resist any purely computational solution. These three versions are related but distinct, and conflating them has caused genuine confusion in the literature.

## Default logic and its limits

The most influential formal response to the frame problem has been **default logic** and its relatives — non-monotonic logics that allow conclusions to be drawn "by default" unless there is specific reason to think otherwise. In Patrick Hayes's later work, and in the circumscription approach developed by McCarthy, the idea is to assume that things do not change unless change is explicitly stated. This inverts the original burden: instead of listing everything that stays the same, you list only what changes and assume everything else is preserved.

This works reasonably well in constrained, well-defined domains. A robot moving boxes in a warehouse can operate with circumscription because the relevant facts are few and well-catalogued. But the approach breaks down at the boundary of the domain. Real situations bleed into one another. Suppose the robot's action of moving a box causes a small vibration that topples a glass on a nearby shelf. Did the robot "move the box" in a way that also changed the glass's position? Circumscription has no principled way to determine whether the glass's position is part of the "box-moving" action's frame unless someone explicitly anticipates the possibility. And anticipating all such possibilities in advance returns us to the original problem.

The boundary of a "relevant domain" cannot itself be determined from within that domain. Deciding what counts as an appropriate closure of the frame requires judgment that sits outside the formal system.

## What embodied and situated cognition contribute

One influential response, drawn from phenomenology and later developed in cognitive science, holds that the frame problem is an artefact of the **Cartesian picture** of mind as an inner logical engine operating on symbolic representations of an outer world. On this view, the problem dissolves once we reconceive cognition as inherently embodied and situated.

Hubert Dreyfus made this argument at length, drawing on Heidegger's account of **ready-to-hand** engagement with tools. When you use a hammer, you do not represent the hammer's weight, balance, and position as discrete propositional facts; you simply act, and the hammer recedes from explicit awareness. The frame problem, Dreyfus argued, only arises if you insist on translating this fluid, embodied competence into a list of discrete facts requiring updating. An agent that is genuinely embedded in its environment does not need to decide which facts to keep fixed, because it is not storing facts in the first place — it is maintaining a pattern of ongoing engagement.

This is a serious point, but it has limits as a solution. It may explain why biological agents with long evolutionary histories do not experience the frame problem as a bottleneck. It does not explain what those agents are doing when they *do* reason explicitly — when they plan a novel action in an unfamiliar environment, or when they deliberate about the future consequences of choices they have never made before. In those cases, something like explicit representation seems unavoidable, and the frame problem re-enters through that door.

## The relevance of the problem to epistemology

The frame problem has direct implications for epistemology, and specifically for **belief revision**. The dominant formal framework for belief revision, developed by Carlos Alchourrón, Peter Gärdenfors, and David Makinson and known as **AGM theory**, specifies rationality constraints on how beliefs should be revised when new information arrives. Among these constraints is the principle of **minimal change**: when revising beliefs, alter as little as possible while accommodating the new information.

Minimal change is intuitively plausible, but it inherits the frame problem under another name. What counts as "minimal"? Minimality must be measured against some metric of distance between belief states, and that metric encodes assumptions about which beliefs are more central, which more peripheral, which more easily surrendered. Those assumptions are not derivable from the formal theory itself; they must be brought to the theory from outside. The frame problem, here, is the problem of where the metric comes from.

This matters beyond AI and formal epistemology. Whenever a person encounters evidence that conflicts with a deeply held belief — religious, political, or scientific — the question of how to revise is exactly the frame problem in human dress. Which surrounding beliefs must go? Which can stay? There is no neutral algorithm. The structure of one's existing beliefs shapes what revision even looks like, which is part of why motivated reasoning is so robust. The frame problem is not a bug in early AI programming; it is a feature of rationality itself.

## What the problem actually shows

The frame problem is sometimes dismissed as a solved engineering problem, handled adequately by modern machine learning systems that do not rely on symbolic logic at all. Large neural networks learn implicit representations of which features of an input are relevant for which outputs, without anyone explicitly specifying the frame. In a narrow sense, this is true: such systems do not suffer from the combinatorial explosion of frame axioms.

But learning-based systems face their own version of the problem. They generalise from training distributions, and their implicit assumptions about what is relevant are fixed by those distributions. When the situation changes in ways that fall outside the training distribution — a new context, an unusual combination of familiar features — the system's implicit "frame" can fail silently and dramatically. The brittleness of current AI systems in out-of-distribution settings is precisely the frame problem wearing different clothes.

The deeper philosophical lesson is this: any reasoning system, formal or connectionist, biological or artificial, must make background assumptions about what is stable and what is variable. Those assumptions cannot all be made explicit, because making them explicit requires further assumptions about relevance, and so on. **Relevance is not reducible to rules about relevance.** This is not a counsel of despair. It is a precise description of what reasoning requires: a kind of pre-theoretical orientation toward the world that formal systems can approximate but cannot fully replace.

McCarthy and Hayes thought they had found a technical puzzle. They had found something closer to a constitutive feature of mind — the requirement that every reasoner, to function at all, must already know, in some sense, what matters. Philosophy has not yet given that prior knowledge a satisfying account.
