---
image: /images/posts/what-hebbian-plasticity-actually-explains-about-learning.png
imageAlt: "Abstract geometric illustration: {'title':'What Hebbian Plasticity Actually Explains About Learning','excerpt':'Hebb's rule — 'neurons that fire together, wire together' — is everywhere in neur"
title: "What Hebbian Plasticity Actually Explains About Learning"
date: 2026-08-24
topic: science
excerpt: "Hebb's rule — 'neurons that fire together, wire together' — is everywhere in neuroscience, but the slogan obscures as much as it reveals."
buffered: true
---

The phrase "neurons that fire together, wire together" is one of the most quoted lines in all of neuroscience. It is also one of the most misunderstood — invoked to explain everything from childhood education to addiction to religious conversion, yet rarely examined for what it actually does and does not establish.

## What Hebb actually proposed

Donald Hebb's 1949 book *The Organization of Behavior* contained a modest, carefully hedged conjecture: when an axon in cell A repeatedly or persistently takes part in firing cell B, some growth process or metabolic change takes place in one or both cells so that A's efficiency as one of the cells firing B is increased. This is a claim about **synaptic weight** — the strength of a connection between two neurons — not a claim about memory, identity, or the high-level phenomena the slogan is usually wheeled out to explain.

Hebb was not describing a discovered mechanism. He was proposing one that *could* explain associative learning at the cellular level. He had no direct evidence for it in 1949; the tools to observe synaptic change in living tissue simply did not exist. The hypothesis sat, largely unverifiable, for nearly three decades.

## Long-term potentiation and the experimental validation

The first solid experimental support came in 1973, when Timothy Bliss and Terje Lømo published recordings from the rabbit hippocampus showing that a brief, high-frequency burst of electrical stimulation to a pathway could produce a lasting increase in synaptic efficacy — an effect they called **long-term potentiation (LTP)**. The change persisted for hours in their preparations, and subsequent work showed it could last days or weeks in intact animals.

LTP has a Hebbian flavour in a specific sense: it requires *coincident* activity. The best-studied molecular mechanism involves the **NMDA receptor**, a glutamate receptor that functions as a molecular coincidence detector. The NMDA channel opens only when two conditions are met simultaneously — glutamate must bind to it *and* the postsynaptic membrane must already be depolarised (because a magnesium ion blocks the channel at resting potential). This voltage dependence means the synapse strengthens only when the postsynaptic neuron is already active when input arrives — which is precisely the coincidence condition Hebb described.

So far, so clean. But the story gets complicated quickly.

## Where the slogan breaks down

"Neurons that fire together, wire together" implies symmetry and simplicity that real biology does not have. Several findings complicate the picture:

**Timing matters enormously, and in both directions.** Research in the 1990s established **spike-timing-dependent plasticity (STDP)**: if the presynaptic neuron fires *just before* the postsynaptic one (within roughly 20 milliseconds), the synapse strengthens. But if the order is reversed — postsynaptic fires first, presynaptic fires after — the same synapse *weakens*, a process called **long-term depression (LTD)**. The slogan captures only half of this: neurons that fire together in the wrong order get *unwired*. The direction of causality encoded in the timing carries information that the simple co-activation picture discards.

**Not all co-activation produces potentiation.** Low-frequency stimulation of the same pathways that produce LTP when stimulated at high frequency instead produces LTD. The difference is not about co-activation but about the *pattern* of activation — specifically, the degree of postsynaptic depolarisation, which determines how much calcium enters through NMDA receptors. High calcium influx recruits kinases that strengthen synapses; low calcium influx recruits phosphatases that weaken them. This graded, bidirectional response is the **BCM rule** (Bienenstock, Cooper, and Munro, 1982), which predicts a sliding modification threshold and explains, among other things, why sensory deprivation during development weakens rather than strengthens the deprived connections.

**Synaptic changes can be input-specific but not cell-specific.** A single neuron receives thousands of inputs. LTP induced at one set of synapses does not automatically spread to all other synapses on the same neuron. This **synapse specificity** is important: it means the cell can store many different associations simultaneously rather than updating all its connections uniformly. But it also means the slogan — which talks about *neurons* — is operating at the wrong level of description. The locus of plasticity is the individual synapse, not the cell.

## What Hebbian plasticity does not explain about memory

Because LTP is activity-dependent and long-lasting, it became the dominant model for the cellular basis of memory — sometimes described as the synaptic basis of learning. This is plausible but requires heavy qualification.

LTP as induced in laboratory preparations typically involves artificially intense, synchronised electrical stimulation — nothing like the sparse, irregular firing patterns that characterise normal neural activity. Demonstrating that *natural* learning modifies synapses in a Hebbian manner has proven technically demanding. Some of the most direct evidence comes from studies of fear conditioning in rodents, where synapses in the amygdala strengthen in a way that occludes further LTP induction — suggesting those synapses were already potentiated by the learning experience. But "occlusion" evidence is indirect; it shows that LTP-like changes occurred, not that they were the *cause* of the memory.

More fundamentally, **Hebbian plasticity does not explain how specific memories are retrieved**. Strengthening a synapse makes that connection more likely to activate its target in future, but nothing in the basic Hebb rule specifies how a particular pattern of activity will be reinstated by a cue. Retrieval requires some account of pattern completion — how a partial input reconstructs a full stored pattern — and this requires network-level models (like attractor networks) that go well beyond Hebb's original postulate.

## The role of neuromodulators and the gating problem

A further complication: if Hebbian plasticity operated continuously during all waking experience, the brain would be constantly rewriting every co-activated synapse. This would be catastrophic — it would interfere with existing memories every time overlapping neural populations were active. Somehow, plasticity must be *gated*: selectively enabled when something worth learning is happening.

The answer involves **neuromodulators** — diffuse chemical signals released by small subcortical nuclei in response to behavioural relevance. Dopamine, acetylcholine, and norepinephrine all modulate whether Hebbian-like changes actually stick. Dopamine in particular has been linked to **reward prediction error**: it surges when an outcome is better than expected and dips when worse. This temporal difference signal, described in reinforcement learning theory by Sutton and Barto and mapped onto dopaminergic neurons by Wolfram Schultz in the 1990s, provides the "teaching signal" that Hebb's rule lacks. Pure Hebbian plasticity has no notion of whether a learned association is *useful* — neuromodulatory gating is what ties synaptic change to behavioural consequence.

This means real biological learning is not Hebbian in the pure sense. It is Hebbian-plus-gating, and the gating is doing much of the explanatory work that the slogan attributes to co-activation alone.

## Why the misconceptions matter

When the slogan migrates out of neuroscience — into popular psychology, education policy, or arguments about religious conditioning — it typically loses all the constraints that make the underlying science credible. Claims that early religious instruction "wires children's brains for belief" by exploiting Hebbian plasticity are not false in every respect, but they are radically underdetermined by anything Hebb's rule actually says. Co-activation of concepts does not guarantee permanent synaptic change; timing, neuromodulatory context, developmental stage, and prior synaptic history all constrain whether and what changes occur.

The same applies to overclaimed applications in education ("multi-sensory learning wires concepts more deeply") and addiction science ("repeated co-activation of drug cues and drug effects rewires reward circuits"). These claims may track real phenomena — drug-related cue conditioning does involve LTP-like changes in dopaminergic circuits — but they typically invoke Hebb as a rhetorical seal of approval on arguments that require far more mechanistic specificity to be convincing.

Hebbian plasticity is a genuine and important insight. The NMDA receptor as a coincidence detector is among the more elegant molecular mechanisms neuroscience has identified. But "neurons that fire together, wire together" is a mnemonic, not a theory. Treating it as the latter is a good example of how a well-chosen slogan can make a partial truth feel complete — and how even scientific ideas benefit from the same critical scrutiny we apply to any other claim.
