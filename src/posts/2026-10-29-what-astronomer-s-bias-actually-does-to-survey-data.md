---
image: /images/posts/what-astronomer-s-bias-actually-does-to-survey-data.png
imageAlt: "Abstract geometric illustration: {'title':'What Astronomer's Bias Actually Does to Survey Data','excerpt':'Selection effects in astronomical surveys systematically distort what we think we know"
title: "What Astronomer's Bias Actually Does to Survey Data"
date: 2026-10-29
topic: science
excerpt: "Selection effects in astronomical surveys systematically distort what we think we know about the universe — and correcting for them is harder than it looks."
buffered: true
---

When you point a telescope at the sky, you do not see the universe. You see the part of the universe your instrument can reach, on the nights your instrument was pointed there, filtered through every decision made before the data were collected. That gap between observation and reality is not a minor technical footnote — it shapes virtually every large claim astronomers make about the cosmos.

## The Malmquist bias and what it does to distance estimates

The clearest and oldest example is **Malmquist bias**, named after the Swedish astronomer Gunnar Malmquist, who described it in the 1920s. The core problem is simple: intrinsically bright objects are visible at greater distances than faint ones. Any magnitude-limited survey — one that records only objects brighter than some threshold — will therefore oversample luminous objects and undersample dim ones.

The consequence is not merely that faint objects go uncounted. It is that when you average the properties of objects at a given distance, the average is pulled toward the bright end. You infer that objects at large distances are, on average, more luminous than nearby ones — and you might conclude from this that luminosity evolves with cosmic time, or that your distance estimates are wrong, when in fact you are measuring an artefact of your own detection threshold.

Correcting for Malmquist bias requires knowing — or modelling — the true luminosity function of whatever population you are studying: the underlying distribution of intrinsic brightnesses. But that function is itself estimated from surveys, which are themselves subject to the bias. The circularity is not fatal, but it demands careful statistical treatment, and in practice the corrections are uncertain. Several claimed detections of luminosity evolution in quasar populations in the 1970s and 1980s were substantially revised once better Malmquist corrections were applied.

## The Eddington bias and how noise inflates counts

Related but distinct is **Eddington bias**, described by Arthur Eddington in 1913. When measuring a quantity with noise — the flux of a faint galaxy, say — sources near the detection threshold are more likely to scatter upward into detectability than bright sources are to scatter downward out of it. This is simply because there are many more faint sources than bright ones; the underlying number counts rise steeply toward lower luminosities.

The result is that surveys near their detection limits count more objects than truly exist above the threshold, because noise pushes faint objects over the line. Worse, the measured fluxes of those marginal detections are biased high: you are more likely to catch a faint source on a night when noise is working in its favour, so the recorded brightness is not representative of the true brightness.

This matters enormously for studies of the faint end of galaxy luminosity functions, for number counts of sub-millimetre galaxies, and for any claim that involves comparing the density of objects at different epochs. The Eddington correction is in principle straightforward — it requires knowing the noise properties of the instrument and the slope of the underlying counts — but in practice both inputs carry uncertainty, and the correction can be large: factors of two or more in some radio and sub-millimetre surveys.

## Pointing decisions and the observer effect

Beyond instrumental sensitivity, **survey strategy** introduces its own biases. Telescopes are pointed by people with hypotheses, and those hypotheses shape what gets observed. Rich galaxy clusters were intensively studied for decades before field galaxies received comparable attention, because clusters were easier to find and more dramatic to look at. This generated an enormous literature on cluster galaxy properties — elliptical morphologies, red colours, suppressed star formation — which was initially over-generalised to galaxies as a class.

The same dynamic appears in exoplanet research. The radial velocity method, which dominated planet detection before the Kepler mission, is far more sensitive to massive planets on short orbits than to small planets on long ones. The early exoplanet census was therefore dominated by **hot Jupiters** — gas giants orbiting within a fraction of an astronomical unit of their stars — which are actually rare. Roughly one percent of sun-like stars host a hot Jupiter. For a period, these objects defined public and scientific intuitions about what planetary systems look like. Kepler's transit photometry, sensitive to a different slice of parameter space, revealed that small rocky planets on longer orbits are vastly more common. The universe had not changed; the instrument had.

## Confirmation and the file-drawer problem in observational science

Astronomy shares with other sciences a version of the publication bias problem, though its manifestation is specific to observational work. When a new survey instrument comes online, early papers tend to report striking detections: unusual objects, extreme properties, unexpected correlations. Non-detections and null results are harder to publish and less rewarding to write.

This creates a literature that is systematically skewed toward the extremes of whatever distribution is being studied. If you are trying to characterise the typical properties of a class of objects — the average metallicity of dwarf galaxies, say, or the typical merger rate of galaxy pairs — a literature built on exceptional cases will mislead you. The problem is compounded because follow-up observations are disproportionately directed at the most interesting objects from previous surveys, reinforcing the initial selection.

There is no clean solution. Modern sky surveys — the Sloan Digital Sky Survey, the Dark Energy Survey, the upcoming Vera Rubin Observatory's Legacy Survey of Space and Time — try to mitigate this by conducting systematic, well-characterised sweeps of large sky areas with uniform selection criteria, so that the completeness of the sample can be quantified. The key virtue of such surveys is not just the volume of data but the ability to say precisely what was and was not detectable, and therefore to model the selection function.

## The selection function and what it means to model it

The **selection function** is the probability that an object with given true properties would appear in a catalogue, given the survey design. Writing it down forces clarity about every source of bias: the sky coverage, the magnitude limit, the colour cuts used to select targets for spectroscopic follow-up, the atmospheric conditions on observing nights, the algorithms used to detect sources in images.

Modern cosmological analyses — measuring the large-scale structure of the universe, fitting dark energy models, constraining neutrino masses — depend on getting the selection function right. If the model is wrong, the inferred cosmological parameters are wrong, and in a way that may not be apparent from internal consistency checks. The data can look perfectly reasonable while encoding a systematic error.

A concrete example: photometric redshift surveys estimate galaxy distances from broadband colours rather than spectra, because spectroscopy is expensive and slow. The colour-to-redshift mapping is imperfect, and the errors are not random — they depend on galaxy type, redshift, and the particular filter set used. A galaxy at redshift 0.3 with unusual colours might be mistakenly assigned a redshift of 0.6. When millions of such assignments are used to map the three-dimensional distribution of matter and measure the growth rate of structure, systematic photometric redshift errors propagate directly into cosmological conclusions. Several cosmic shear analyses over the past decade have spent as much effort characterising photometric redshift systematics as on all other sources of uncertainty combined.

## Why this matters beyond technical astronomy

The lesson of astronomical selection effects extends well beyond telescope design. It is an unusually clean case study in a general epistemological problem: the data you collect are shaped by the tools, decisions, and limitations of collection, and those shapes are not always visible in the data themselves. A catalogue looks like a list of facts. It is actually a list of facts filtered through a complex and partly unknown function.

This is not a reason for scepticism about astronomy, which has corrected for these effects with increasing sophistication and arrived at a remarkably detailed and coherent picture of the universe. It is a reason to pay attention to how knowledge is generated, not just to the knowledge itself. The history of Malmquist corrections, of the hot Jupiter overcount, of photometric redshift systematics, is a history of science catching its own errors — not because individual scientists are unusually self-critical, but because competing groups with different instruments and methods eventually produce results that cannot all be right, forcing a reckoning.

That process is slow, sometimes painful, and never fully complete. There are almost certainly selection effects operating in current surveys that have not yet been identified. The appropriate response is not paralysis but calibrated confidence: strong on the findings that have survived multiple independent methodologies, cautious on those that rest on a single survey or technique, and alert to the fact that what you cannot detect is as theoretically important as what you can.
