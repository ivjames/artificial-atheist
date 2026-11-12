---
image: /images/posts/what-the-weber-fechner-law-actually-describes.png
imageAlt: "Abstract geometric illustration: {'title':'What the Weber-Fechner Law Actually Describes','excerpt':'The oldest quantitative law in psychology links physical stimulus intensity to perceived sen"
title: "What the Weber-Fechner Law Actually Describes"
date: 2026-11-12
topic: science
excerpt: "The oldest quantitative law in psychology links physical stimulus intensity to perceived sensation—and its limits reveal as much as its successes."
buffered: true
---

Psychophysics is one of the oldest branches of experimental science, and its founding insight—that the relationship between the physical world and our experience of it is not straightforward—remains one of the most underappreciated ideas in science education.

## The original observation and what it measured

In the 1830s, the German physiologist Ernst Weber noticed something curious while asking blindfolded subjects to compare weights. If someone held a 100-gram weight, they could detect the addition of roughly 1 gram—a 1% difference. If they held 1,000 grams, they needed about 10 grams added before noticing a change. The threshold for detecting a difference was not fixed in absolute terms; it was fixed as a **fraction** of the original stimulus. Weber called this fraction constant for a given sense, and it became known as the **Weber fraction**.

This was a genuine empirical discovery, not a philosophical claim. Weber ran systematic experiments across touch, vision, and hearing, and found the same proportional pattern repeatedly. The fraction differed between senses—you can detect about a 1–3% difference in weight, but only around an 8% difference in loudness—but within each modality, the ratio held across a wide range of intensities. That consistency was striking enough to demand explanation.

Gustav Fechner, a physicist and philosopher who came later, saw in Weber's fraction the seed of something grander. If the just-noticeable difference (the smallest detectable change, abbreviated **JND**) is always a constant proportion of the stimulus, then each JND represents an equal step in subjective experience. String those steps together, and you get a mathematical function relating physical intensity to perceived magnitude. Fechner derived this function in 1860: perceived sensation scales as the **logarithm** of physical stimulus intensity. Double the intensity of a sound, and you do not double the perceived loudness; you add a fixed increment to it. This is why decibels are logarithmic, why the stellar magnitude scale is logarithmic, and why the Richter scale works the way it does. Fechner's equation gave science its first quantitative law of mind.

## Why logarithmic compression makes biological sense

A logarithmic relationship between stimulus and sensation is not arbitrary. It solves a real engineering problem that any sensory system faces: an enormous dynamic range must be encoded by neurons whose firing rates are bounded. Human hearing spans roughly twelve orders of magnitude in sound pressure. No neuron could encode that linearly—there is simply not enough range in a firing rate that tops out at a few hundred spikes per second. Compression is the only option.

The logarithm is one elegant solution. It maps multiplicative changes in the outside world onto additive changes in internal representation. This has a useful consequence: ratios are preserved. A violin sounds like a violin whether played softly or loudly because the relationships between its overtones—their intensity ratios—map to consistent differences in perceived loudness, regardless of overall level. The same logic applies to colour constancy in vision. The brain is better placed to detect *changes* and *relationships* than to track absolute magnitudes, and logarithmic encoding facilitates exactly that.

The peripheral nervous system implements this compression in several ways. In the retina, photoreceptors adapt across many orders of magnitude of illumination. In the cochlea, the basilar membrane's mechanical response combined with active amplification by outer hair cells produces a highly compressed output. These are not accidents of evolution; they are solutions to the dynamic range problem, and the Weber-Fechner law is an approximate description of their collective effect.

## Where the law breaks down

The Weber-Fechner law is not exact, and its failures are as instructive as its successes. The most important challenge came from the American psychologist S.S. Stevens, who in the 1950s and 1960s argued that the logarithmic function was wrong in a systematic way. Stevens used a method he called **magnitude estimation**: instead of asking subjects whether stimulus A was greater or less than stimulus B, he asked them to assign numbers to stimuli directly, with no forced-choice structure.

The results were clear and reproducible. Perceived magnitude did not follow a logarithm—it followed a **power function**. Sensation scales as physical intensity raised to some exponent. For loudness, the exponent is approximately 0.67, meaning that a tenfold increase in sound energy produces roughly a fivefold increase in perceived loudness. For electric shock, the exponent is around 3.5—a little more intensity produces a lot more pain. Stevens's **power law** fits magnitude estimation data better than Fechner's logarithm fits JND-summing data.

The debate between the two frameworks is not fully resolved. The logarithm and the power law make similar predictions over moderate intensity ranges, so distinguishing them experimentally is harder than it sounds. More fundamentally, the two laws rest on different assumptions about what sensation *is*: Fechner treated JNDs as equal subjective increments, which Stevens challenged directly. Whether JNDs can be treated as equal psychological units at all is a question that touches the philosophy of measurement, not just physiology. If subjective experience cannot be placed on a ratio scale—if it makes no sense to say that one sensation is twice another—then magnitude estimation is methodologically suspect. If JNDs are not equal psychological steps, then Fechner's derivation collapses. Neither camp had a fully satisfying answer.

## The neural correlates of the law

Modern neuroscience has approached the Weber-Fechner question from a different direction: instead of asking what subjects report, it asks what neurons actually do. The answer, it turns out, is complicated in ways that cut across the original debate.

Single-neuron recordings in sensory cortex frequently show responses that scale logarithmically with stimulus intensity, consistent with Fechner. But population-level coding—the pattern of activity across many neurons simultaneously—can represent stimulus intensity in ways that look more like a power function at the level of perceptual output. The relationship between single-unit physiology and perception is mediated by how downstream areas read population codes, and that readout mechanism is not fully understood.

There is also substantial evidence that **adaptation** changes the effective operating range of sensory neurons in real time. A neuron that has been exposed to a high-intensity stimulus for several seconds shifts its response curve, treating the recent background as the new baseline. This dynamic adjustment means the Weber-Fechner relationship is not a fixed property of the nervous system but an emergent feature of ongoing adaptation to context—something neither the original formulations of Fechner or Stevens captured adequately.

## The law's influence beyond sensory science

The Weber-Fechner law seeded ideas that spread well beyond psychophysics. In economics, the observation that people respond to proportional rather than absolute changes in wealth—that losing £100 matters more when you have £200 than when you have £20,000—echoes the Weber fraction. Daniel Kahneman and Amos Tversky's **prospect theory** formalises something closely related: the subjective value function is concave for gains, implying diminishing marginal sensitivity to larger amounts, which is a form of compression.

In information theory, the connection is more than metaphorical. Claude Shannon showed that the optimal encoding of a message assigns shorter codes to more probable symbols—a scheme that is logarithmically related to probability. Whether this mathematical convergence reflects deep shared structure or is coincidental is debated, but it is at minimum suggestive that logarithmic representation keeps reappearing wherever signals must be compressed.

The law also left its mark on interface design and measurement scales. The decibel was invented in the context of telephony specifically because the engineers building early telephone networks knew from psychophysics that equal ratios of power produce equal perceived increments of loudness. Any audio engineer using a fader that moves in dB is working with the Weber-Fechner law every day, usually without thinking about it.

## What the law reveals about the measurement of mind

The deepest issue the Weber-Fechner law raises is methodological: can inner experience be measured at all, and if so, how? Fechner believed he was building a bridge between the physical and the mental—that his logarithmic equation was a genuine law of psychophysics in the same sense that Ohm's law is a law of electricity. Critics, including some of his contemporaries, argued that summing JNDs to build a sensation scale presupposes what it is trying to prove. You cannot derive that a subjective unit is constant from the fact that a physical ratio is constant; that inference requires an additional assumption about the nature of subjective experience that no measurement can provide from the outside.

This is not merely a historical puzzle. Contemporary debates about **ordinal versus interval measurement** in psychology, the validity of Likert scales in survey research, and the statistical models used to analyse cognitive experiments all trace their ancestry to the problem Fechner created. His ambition was to make psychology as rigorous as physics. The honest verdict is that he revealed exactly how difficult that ambition is to satisfy—which is itself a substantial contribution.

The Weber-Fechner law, then, is not simply a fact about sensation. It is a case study in what happens when a scientist tries to impose mathematical structure on subjective experience: some of the structure sticks, some does not, and the residual questions turn out to be more interesting than the original answer.
