---
image: /images/posts/what-action-potentials-actually-encode.png
imageAlt: "Abstract geometric illustration: {'title':'What Action Potentials Actually Encode','excerpt':'Neurons fire in spikes, but the information those spikes carry is far less settled than most textbo"
title: "What Action Potentials Actually Encode"
date: 2026-10-02
topic: science
excerpt: "Neurons fire in spikes, but the information those spikes carry is far less settled than most textbooks suggest."
buffered: true
---

The action potential is one of the most studied events in biology. A neuron's membrane voltage swings from roughly −70 millivolts to +40 millivolts and back again in about two milliseconds, and this spike propagates down the axon to the next cell. What that spike means — what information it carries, and how downstream neurons read it — is a question that remains genuinely open in ways that matter for neuroscience, artificial intelligence, and the philosophy of mind.

## The rate coding assumption and its limits

The dominant view throughout most of the twentieth century was **rate coding**: the idea that a neuron's firing rate, averaged over some window of time, is the relevant signal. A sensory neuron responding to a bright light fires more action potentials per second than one responding to a dim light. The more intense the stimulus, the higher the rate. This is clean, measurable, and consistent with a large body of experimental data going back to Edgar Adrian's recordings in the 1920s.

The problem is that rate coding, taken as the whole story, runs into a timing puzzle. Many behaviours — catching a fly ball, recognising a spoken word, recoiling from pain — unfold over timescales of tens to hundreds of milliseconds. If the relevant signal is a firing rate averaged over, say, 100 milliseconds, and a typical neuron fires at perhaps 20–50 spikes per second under active conditions, then the brain is working with a handful of spikes per neuron per behavioural event. Averaging a handful of spikes to extract a rate is statistically noisy. It also throws away something potentially useful: the precise timing of each spike relative to other spikes or to the stimulus.

## Temporal coding and what it would require

The alternative — **temporal coding** — holds that the exact timing of individual spikes, not just their average rate, carries information. The most studied version of this is **spike timing-dependent plasticity (STDP)**, the observation that whether a synapse strengthens or weakens depends on whether the presynaptic spike arrives a few milliseconds before or after the postsynaptic cell fires. This millisecond-level sensitivity suggests that synapses can, in principle, read timing information. It does not, by itself, prove that the brain routinely uses it.

A stronger form of temporal coding is the idea of a **latency code**: the first neuron to fire after a stimulus onset carries the most informative signal, and the brain reads information from the order and latency of spikes rather than their rate. Experiments in the olfactory system of insects, and in the primate visual cortex, have found evidence consistent with latency coding for rapid stimulus discrimination. The difficulty is distinguishing a genuine latency code from a rate code that simply builds up faster for stronger stimuli.

## The population problem

Even if individual neurons encode information in their firing rates or spike times, the brain does not read single neurons in isolation. What matters is the activity pattern across thousands or millions of neurons — a **population code**. The question then shifts: what is the relevant variable in a population?

One influential answer is that the brain tracks the **vector of firing rates** across a population, and the represented quantity corresponds to the direction of that vector in a high-dimensional space. This framework, associated with work on motor cortex by Apostolos Georgopoulos in the 1980s, showed that the direction of an intended arm movement could be predicted by summing the preferred directions of individual neurons, each weighted by its firing rate. It was elegant and influential, but subsequent work showed that the population vector is not the only way to read motor cortex — different decoding algorithms produce different answers, and it is not obvious which one the downstream circuitry uses.

A more recent framework treats neural population activity as living on a **low-dimensional manifold** within the high-dimensional space of all possible activity patterns. The idea is that, even though a region like motor cortex contains millions of neurons, the actual trajectory of activity during behaviour traces a path through a much smaller subspace. This has been confirmed in several systems using dimensionality reduction techniques like principal component analysis. Whether this manifold structure reflects the computational geometry of the code, or is simply a consequence of correlated inputs and shared anatomy, remains contested.

## The role of noise and variability

Neurons are famously noisy. Present the same stimulus twice under identical conditions, and a cortical neuron will fire a different number of spikes on each presentation. This **trial-to-trial variability** was long treated as a nuisance — biological noise obscuring the true signal. The rate-coding framework handles this by assuming the brain averages over many neurons (or many trials), washing out the noise.

But variability in neural responses is not purely random. It is **correlated across neurons**: when one neuron fires more than usual, neighbouring neurons with similar tuning tend to as well. These **noise correlations** (also called co-variability or shared variability) directly limit how much information a population can carry, because correlated noise cannot be averaged away by pooling more neurons. The structure of noise correlations — how they depend on the similarity of neurons' preferred stimuli, on attention, on task demands — has become a major research area. There is now good evidence that attention reduces noise correlations in visual cortex, which would increase the population's information capacity. Whether the brain is genuinely exploiting this, or whether it is a byproduct of top-down inputs, is not settled.

## What optogenetics and large-scale recording changed

Two technical developments in the past two decades have shifted the empirical landscape substantially. **Optogenetics** — introduced in functional form by the Deisseroth laboratory around 2005 — allows researchers to drive or silence specific neuron types with light pulses with millisecond precision. This made it possible to test causal claims rather than just correlational ones: if a particular firing pattern encodes a particular percept, artificially inserting that pattern should produce the percept.

The results have been instructive and sometimes humbling. Optogenetic stimulation of orientation-selective neurons in mouse visual cortex can bias perception toward the preferred orientation of those neurons, consistent with a rate code for orientation. But the effects are often small, context-dependent, and sensitive to the exact stimulation parameters in ways that a simple rate code would not predict.

**Large-scale electrophysiology** — recording from hundreds to thousands of neurons simultaneously using silicon probes like Neuropixels — has revealed that the dynamics of neural populations during behaviour are far richer than single-unit recordings suggested. Neurons that appeared to be simple stimulus encoders turn out to modulate their firing with movement, licking, arousal, and the passage of time. The clean tuning curves of textbook neuroscience are partly an artefact of averaging away these other dimensions. What a neuron "encodes" depends heavily on what variables you choose to regress its firing rate against.

## Why this matters beyond neuroscience

None of this is merely technical housekeeping. The question of what action potentials encode connects directly to debates about how the brain could implement cognition, and therefore to what an adequate theory of mind must explain.

Artificial neural networks — the foundation of modern machine learning — were inspired loosely by rate coding. They use continuous activation values, not discrete spikes. **Spiking neural networks** attempt to replicate the temporal structure of biological firing, and there is active research on whether spiking networks offer computational advantages in efficiency or representational power. The answer depends on whether temporal coding is genuinely used by the brain, not just available in principle.

The debate also matters for understanding perception and consciousness. If the brain represents the world through population codes on low-dimensional manifolds, then perceptual experience is tied to the geometry of those manifolds, and changes in experience correspond to trajectories through a geometric space. This is a very different picture from the classical view of neurons as feature detectors, each encoding a specific property of the world. It is a picture in which the representational content of neural activity is distributed, relational, and context-dependent — which makes the question of how any physical process gives rise to subjective experience considerably harder to frame, let alone answer.

The action potential is not a bit. It is not a rate. It is a spike in time, embedded in a network, read by downstream circuits whose decoding strategy we have not fully characterised. Decades of careful measurement have established what the spike is, physically, with great precision. What it means computationally is a different question, and the honest answer is that neuroscience is still working it out.
