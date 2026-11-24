---
image: /images/posts/what-circadian-clocks-actually-regulate.png
imageAlt: "Abstract geometric illustration: {'title':'What Circadian Clocks Actually Regulate','excerpt':'Circadian rhythms are not just sleep timers — they govern metabolism, immunity, and gene expressio"
title: "What Circadian Clocks Actually Regulate"
date: 2026-11-24
topic: science
excerpt: "Circadian rhythms are not just sleep timers — they govern metabolism, immunity, and gene expression in ways that reshape medicine and biology."
buffered: true
---

Nearly every living cell on Earth keeps time. From cyanobacteria to human neurons, biological clocks tick through roughly 24-hour cycles that are endogenous — generated from within, not simply triggered by light — and they regulate far more than when you feel sleepy.

## What a circadian clock actually is

The word "circadian" comes from the Latin *circa dies*, meaning "about a day." The mechanism is a **molecular feedback loop**: a set of genes whose protein products accumulate, suppress their own transcription, degrade, and allow the cycle to restart. In mammals, the core loop involves the proteins CLOCK and BMAL1, which bind together and activate genes including *Per* and *Cry*. The PER and CRY proteins accumulate over hours, then inhibit CLOCK–BMAL1 activity, suppressing their own production. As PER and CRY are gradually degraded, the inhibition lifts and the cycle begins again. The whole loop takes roughly 24 hours.

This is not a metaphor for timekeeping. It is a physical oscillator, and its period is set by the rates of protein synthesis, phosphorylation, and degradation. Mutations that speed up or slow down any of those rates shift the period measurably. The tau mutation in hamsters, which shortens the period to about 20 hours, was traced to a single point mutation in the kinase CK1ε, which phosphorylates PER proteins and marks them for degradation. Faster degradation means a shorter cycle. The logic is mechanical in the most literal sense.

## How the clock is entrained to the external world

An endogenous clock that ran at exactly 24 hours would need no external input. Real clocks drift slightly — human free-running periods average about 24.2 hours under constant conditions — so they must be **entrained**, meaning reset daily by external cues called *zeitgebers* (German: "time-givers"). Light is the dominant zeitgeber in most species.

In mammals, light entrainment runs through a dedicated pathway. Specialised retinal ganglion cells — distinct from rods and cones — contain the photopigment **melanopsin** and project directly to the suprachiasmatic nucleus (SCN) in the hypothalamus, the master pacemaker of the mammalian brain. Light exposure in the early morning advances the clock; light in the late evening delays it. This is not a quirk of perception but a property of the molecular oscillator: when light arrives, it triggers rapid induction of *Per1* and *Per2*, resetting the phase of the loop.

The SCN then coordinates peripheral clocks throughout the body — in the liver, lungs, pancreas, skin, and elsewhere — through neural signals, hormonal rhythms (especially cortisol), and body temperature cycles. Those peripheral clocks are largely autonomous oscillators that need to be kept in phase with the central clock. When they fall out of synchrony with each other, the consequences are measurable.

## Beyond sleep: what the clock actually controls

The common reduction of circadian biology to "the sleep-wake cycle" understates the system by an order of magnitude. Roughly **10–15% of all expressed mammalian genes** show circadian oscillation in at least one tissue. Many of these are not sleep-related at all.

Metabolism is tightly clock-gated. Glucose tolerance, insulin sensitivity, and lipid metabolism all peak at specific phases of the day. Studies in humans have shown that an identical meal consumed in the morning produces a substantially lower blood glucose response than the same meal eaten in the evening — not because of what was eaten, but when. The liver's capacity to process carbohydrates oscillates under clock control, and so does the secretion of insulin itself. Mice with liver-specific clock disruptions develop metabolic syndrome even on a normal diet.

The immune system is similarly phase-dependent. Inflammatory cytokine production, the trafficking of immune cells between blood and tissue, and the magnitude of responses to pathogens all vary across the day. This is not a trivial variation. Studies in mice have shown that infection outcome — whether the animal survives a bacterial challenge — can depend on the time of day at which the pathogen is introduced, with differences in mortality rates of 50% or more between the most and least favourable phases. In humans, the timing of vaccination has been shown to affect antibody titres, with morning administration of some vaccines producing stronger responses.

Drug pharmacokinetics and pharmacodynamics are also clock-regulated. The absorption, distribution, metabolism, and excretion of compounds depends on enzymes and transporters that oscillate. Chemotherapy drugs, for example, often have narrow therapeutic windows where efficacy is high and toxicity is low — and that window is partly time-of-day dependent. The formal study of this is **chronopharmacology**, and it remains underapplied in clinical practice, partly because trial design rarely controls for administration time.

## Circadian disruption and what it costs

Disrupting the alignment between internal clocks and the external environment — a state called **circadian misalignment** — has measurable biological costs. The clearest human evidence comes from shift workers, who regularly eat, sleep, and are active at phases misaligned from both their endogenous clocks and the light-dark cycle. Shift work is associated with elevated risks of metabolic disease, cardiovascular disease, certain cancers (particularly breast and colorectal), and impaired immune function. These are not small effects. The International Agency for Research on Cancer classifies shift work involving circadian disruption as a probable human carcinogen (Group 2A), based on sufficient animal evidence and limited human evidence.

Social jet lag — the weekly phase shift that occurs when people sleep later on weekends than weekdays — is widespread in industrialised populations and correlates with metabolic risk markers even at modest magnitudes (one to two hours of weekly misalignment). The effect is not explained by sleep loss alone; phase misalignment appears to carry independent costs.

The molecular mechanism linking disruption to disease involves several pathways. Clock genes directly regulate **cell cycle checkpoints**, including the transcription of *Wee1*, which inhibits CDK1 and gates cells into mitosis. Clock disruption loosens this gate, allowing cells to proliferate with less oversight — a plausible route to increased cancer risk. Clock components also interact directly with metabolic sensors, including SIRT1 (a NAD-dependent deacetylase involved in energy sensing) and AMPK, integrating timekeeping with the cell's energetic state.

## What clock biology changes about medicine

The clinical implications are still being worked out, but several are already clear enough to influence practice. **Chronotherapy** — timing drug administration to the phase of peak efficacy or minimum toxicity — has shown benefit in oncology trials. A landmark trial of colon cancer chemotherapy by Francis Lévi and colleagues found that chronomodulated delivery significantly improved tumour response rates and reduced toxicity compared to constant-rate infusion of the same drugs.

Blood pressure follows a circadian pattern, typically rising sharply in the early morning — the period of highest cardiovascular event risk. Some antihypertensive drugs taken at bedtime produce better 24-hour blood pressure profiles than the same dose taken in the morning, and randomised controlled trial data (notably the Hygia Chronotherapy Trial, though with some methodological controversy) suggest this matters for outcomes. The controversy over that specific trial does not undermine the general principle; it illustrates that the field is active and contested in the normal scientific way.

Diagnosis may also benefit from circadian awareness. Biomarkers measured in clinical blood draws vary substantially by time of day — cortisol, testosterone, haemoglobin A1c, iron, and many others oscillate. Ignoring collection time introduces variance that standard reference ranges do not account for.

## Why this matters for how we think about biology

Circadian biology sits at an unusual intersection. It is mechanistic enough to satisfy reductionist analysis — the clock can be described at the level of protein interactions and phosphorylation rates — but it also imposes a constraint that cuts across every level of biological organisation. Time is not a background variable in physiology. It is a structured dimension that the organism actively tracks and uses to coordinate itself.

This has implications for experimental design that biology is still absorbing. Many cell culture and animal experiments are conducted at arbitrary times, without controlling or even recording the phase of the circadian clock. If 10–15% of the transcriptome oscillates, experiments on those genes without phase control are, to some degree, measuring noise. Reproducibility problems in biology are not all attributable to circadian effects — but some unknown fraction of them are.

The more fundamental point is that organisms are not simply machines that happen to have a clock attached. The clock is woven into the machinery itself. What appears to be a fixed property of a cell or tissue — its metabolic rate, its drug sensitivity, its immune tone — is in fact a time-varying property governed by an oscillator that evolution has conserved from bacteria to mammals across roughly three billion years. That conservation is itself evidence of how central timekeeping is to life. Any biology that ignores it is working with an incomplete picture of what it is describing.
