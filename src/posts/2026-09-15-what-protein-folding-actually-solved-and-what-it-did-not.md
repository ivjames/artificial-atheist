---
image: /images/posts/what-protein-folding-actually-solved-and-what-it-did-not.png
imageAlt: "Abstract geometric illustration: {'title':'What Protein Folding Actually Solved and What It Did Not','excerpt':'AlphaFold's structural predictions are a genuine breakthrough, but understanding "
title: "What Protein Folding Actually Solved and What It Did Not"
date: 2026-09-15
topic: science
excerpt: "AlphaFold's structural predictions are a genuine breakthrough, but understanding how proteins fold in living cells remains a harder problem."
buffered: true
---

When DeepMind's AlphaFold2 was declared a solution to the "protein folding problem" in 2020, the headlines were justified in one sense and misleading in another. The achievement was real; the framing compressed several distinct problems into one.

## What the folding problem actually is

A protein is a chain of amino acids — anywhere from a few dozen to several thousand of them — strung together in a specific sequence. That sequence is determined by the gene encoding it. Once synthesised, the chain folds into a precise three-dimensional shape, and that shape determines what the protein does: whether it catalyses a chemical reaction, carries a signal, forms part of a structural scaffold, or recognises a specific molecule.

The puzzle, formally posed by Cyrus Levinthal in 1969, is this: if a protein tried every possible conformation at random, it would take longer than the age of the universe to find its correct fold. Yet proteins fold in microseconds to seconds. Nature solves this problem reliably, billions of times per second, in every living cell. Understanding *how* is the scientific question. Predicting *what shape results* from a given sequence is a related but distinct engineering question.

AlphaFold2 answered the engineering question with extraordinary accuracy. Given an amino acid sequence, it predicts the folded structure to near-atomic resolution for most proteins. This matters enormously for drug discovery, enzyme design, and understanding the molecular basis of disease. Predicting the structure of a bacterial enzyme, for instance, can accelerate the design of antibiotics that precisely target it. The practical upside is not in dispute.

## What AlphaFold actually does

AlphaFold2 is a deep learning system trained on the Protein Data Bank — a repository of roughly 200,000 experimentally determined protein structures accumulated over five decades of crystallography, cryo-electron microscopy, and NMR spectroscopy. The model learned to map sequence to structure by identifying patterns in co-evolution: amino acid positions that tend to mutate together across species are likely to be physically close in the folded protein, because they interact directly.

The system does not simulate the folding process. It does not model water molecules jostling the chain, hydrophobic residues clustering away from the aqueous environment, or transient intermediate states. It maps input to output — sequence in, structure out — using learned statistical regularities. This is genuinely impressive and scientifically useful, but it is not a mechanistic explanation of how folding happens.

Analogy: a system that perfectly predicts where a ball will land after being thrown does not, by itself, explain Newtonian mechanics. Predictive accuracy and mechanistic understanding are different things, and conflating them leads to misplaced confidence about what has been settled.

## The kinetics problem remains open

Levinthal's paradox points to a **kinetic** question: what is the pathway? Proteins do not search conformational space randomly. They fold along energy landscapes — surfaces that funnel the chain toward its lowest-energy conformation through a series of intermediate states. The study of these landscapes, transition states, and folding pathways is an active research field that AlphaFold has not resolved.

Why does this matter beyond intellectual tidiness? Because the folding pathway determines what can go wrong. Misfolded proteins, or proteins that fold correctly but then misfold later, are implicated in Alzheimer's disease, Parkinson's disease, type 2 diabetes, and a range of prion disorders. In each case, understanding the *route* by which a protein converts from its functional form to a pathological aggregate is essential for therapeutic intervention. Knowing the structure of the healthy endpoint tells you the destination; it does not tell you how the protein got lost on the way.

Molecular dynamics simulations — which model atomic-level physics over time — can trace folding pathways for small proteins, but they remain computationally expensive and are largely limited to proteins of modest size. For large, multi-domain proteins, direct simulation of the folding process from an unstructured chain remains out of reach.

## The cellular environment complicates everything

In a test tube, some proteins fold spontaneously and correctly. In a living cell, things are messier. The cytoplasm is densely crowded with other macromolecules — a condition called **macromolecular crowding** — which affects the thermodynamics and kinetics of folding in ways that are difficult to model.

More importantly, many proteins do not fold alone. They require **molecular chaperones**: proteins whose job is to assist the folding of other proteins, prevent unwanted aggregation, and sometimes actively unfold misfolded chains so they can try again. The major chaperone families — HSP70s, HSP90s, chaperonins like GroEL/GroES — are themselves complex molecular machines with their own conformational cycles. AlphaFold can predict the structure of a chaperone, but it cannot yet model the dynamic interaction between a chaperone and its client protein as folding proceeds.

There is also the question of **co-translational folding**: many proteins begin folding while they are still being synthesised. The ribosome extrudes the amino acid chain domain by domain, and the chain starts to fold before it is complete. The rate of translation — how fast the ribosome moves along the messenger RNA — influences which intermediate structures form. Synonymous codons (different DNA triplets that code for the same amino acid) can affect translation speed and therefore folding outcomes, a subtle layer of regulation that sequence-to-structure prediction tools do not capture.

## Intrinsically disordered proteins break the paradigm

A further complication: a significant fraction of eukaryotic proteins — estimates range from 30 to 50 percent depending on the organism and the threshold used — do not fold into stable, fixed three-dimensional structures at all. These **intrinsically disordered proteins (IDPs)** exist as dynamic ensembles of conformations. They function through this disorder, often adopting transient structure only when they encounter a binding partner.

AlphaFold2 struggles with IDPs. Its confidence metric (the pLDDT score) reliably flags disordered regions as low-confidence predictions, which is honest and useful. But the prediction of how a disordered region behaves — what conformations it samples, how it folds upon binding, what post-translational modifications regulate it — remains largely outside the tool's scope. Disordered proteins are disproportionately involved in gene regulation, cell signalling, and the formation of membraneless organelles (liquid-liquid phase separation), all of which are active research frontiers.

## What this means for how science communicates breakthroughs

The protein folding story is a case study in the difficulty of communicating scientific progress without overclaiming. The researchers at DeepMind and the scientific community were generally careful in their papers. The problem was partly with the word "solved," which has a satisfying finality that scientific progress rarely deserves.

Science advances on multiple levels simultaneously: engineering capability, mechanistic understanding, and scope of applicability. AlphaFold2 dramatically extended engineering capability. It provided new tools for mechanistic investigation (you can now ask how mutations affect structure, computationally, at scale). But it did not deliver mechanistic understanding of the folding process itself, and it was designed for a subset of proteins — stably folded, single-chain structures — that does not encompass the full diversity of the proteome.

This matters for how non-specialists evaluate claims about scientific breakthroughs. **Benchmark success** — outperforming all prior methods on a defined task — is a meaningful achievement, but benchmarks are defined by what we can currently measure. The task AlphaFold2 excelled at (matching experimentally determined structures) is the task for which we had ground-truth data. The tasks we cannot yet benchmark — predicting folding pathways, modelling chaperone-assisted folding, characterising disordered ensembles — remain open precisely because they are harder to measure.

Skeptical engagement with scientific announcements does not mean dismissing them. It means asking: what exactly was tested? What was not tested? What does success on this benchmark tell us, and what does it leave silent? These are questions scientists themselves ask, and extending them to public discourse raises the quality of how we understand progress.

## Where the field actually stands

AlphaFold2, and the rapidly improving tools that followed it (including RoseTTAFold, ESMFold, and AlphaFold3 with its expanded scope to nucleic acids and small molecules), have genuinely transformed structural biology. The Protein Data Bank grew by decades' worth of structural knowledge within a few years as researchers used computational predictions to guide and accelerate experimental work. Drug discovery pipelines have been reshaped. Understanding of evolutionary relationships between proteins has deepened.

The remaining problems — folding kinetics, chaperone networks, co-translational folding, intrinsically disordered proteins, membrane protein dynamics, and the folding of proteins under cellular stress — are not embarrassing gaps left over from an otherwise complete picture. They are active research programmes with real funding, real experimental methods, and real progress. They are the next layer of the question, visible more clearly now precisely because the first layer has been handled so well.

Science rarely solves a problem cleanly. It typically transforms a problem: answering one formulation so thoroughly that a deeper formulation becomes the new frontier. That is what happened with protein folding. The achievement deserves recognition on those terms — neither inflated into a complete solution nor deflated by noting what remains unknown.
