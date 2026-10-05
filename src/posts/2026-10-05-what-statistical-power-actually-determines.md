---
image: /images/posts/what-statistical-power-actually-determines.png
imageAlt: "Abstract geometric illustration: {'title':'What Statistical Power Actually Determines','excerpt':'Statistical power is routinely misunderstood, even by working scientists — here's what it actua"
title: "What Statistical Power Actually Determines"
date: 2026-10-05
topic: science
excerpt: "Statistical power is routinely misunderstood, even by working scientists. Here is what it actually controls and why the confusion matters."
buffered: true
---

Power is one of those concepts that gets invoked constantly in scientific debate and understood rarely. A study is dismissed as "underpowered," a clinical trial is praised for being "well-powered," and the word does real work — shaping what gets published, what gets funded, and what gets believed. Getting it right is not a matter of statistical pedantry; it determines whether entire literatures are trustworthy.

## What power actually is

**Statistical power** is the probability that a study will return a statistically significant result *given that the effect being tested is real and of a specified size*. If power is 0.80, there is an 80% chance of detecting a true effect and a 20% chance of missing it entirely — a **false negative**, also called a Type II error.

Power is not a single number attached to a study design in the abstract. It is a function of three things: the significance threshold (alpha, typically set at 0.05), the sample size, and the effect size the study is designed to detect. Change any one of these and power changes. That dependency is crucial and frequently lost in translation.

The standard benchmark of 80% power, which Jacob Cohen popularised in his 1977 textbook on statistical power for behavioral sciences, was never derived from first principles. Cohen acknowledged it was a convention, chosen partly because it implied a 4:1 ratio between the probability of avoiding a false negative and the acceptable false positive rate of 5%. Other fields use different conventions. In drug trials for serious diseases, 90% power is common. In exploratory neuroscience studies, power of 40% or below is, embarrassingly, standard.

## The false-negative problem and what follows from it

A false negative does not merely mean a missed result. It has a structural consequence that compounds over time: the scientific record becomes selectively populated with positive findings.

Here is why. If many laboratories run small, underpowered studies on a real phenomenon, most of them will return null results. Those null results will frequently go unpublished — not because of fraud, but because journals prefer positive results and authors know it. The minority of studies that happened, by chance, to cross the significance threshold get published. Readers then see a literature that looks unanimous when it is actually a skewed sample.

This selection effect was formalised by John Ioannidis in his 2005 paper "Why Most Published Research Findings Are False," which used Bayesian reasoning to show that when base rates of true effects are low and power is low, the positive predictive value of a significant result can fall well below 50%. Critics have argued that Ioannidis's assumptions are pessimistic and that the situation varies enormously by field, and they are right. But the structural point survives: power and publication bias interact, and together they inflate the apparent consistency of evidence.

The **winner's curse** is a related phenomenon. When a true effect is small and studies are underpowered, the studies that do reach significance tend to be those that overestimated the effect — because only an inflated estimate was large enough to cross the threshold. This means that the first published estimate of an effect is typically too large, and replication attempts with better-powered designs return smaller numbers. What looks like a failure to replicate is sometimes just regression to a more accurate estimate.

## Why increasing sample size is not always the answer

The obvious remedy for low power is larger samples, but this framing obscures a more fundamental issue: the effect size.

If a true effect is very small, the sample required for 80% power may be in the hundreds of thousands. Certain genetic association studies require samples of this magnitude precisely because individual genetic variants contribute tiny fractions of variance to complex traits. Genome-wide association studies (GWAS) adapted by raising the significance threshold to account for multiple comparisons, requiring *p* < 5×10⁻⁸ rather than 0.05, which in turn demands enormous samples — now routinely achieved through international consortia pooling data from dozens of cohorts.

The lesson from genomics is instructive for psychology and medicine. When a field's theoretical priors suggest that effects are likely to be small and heterogeneous, designing studies around an assumed large effect size is not optimism; it is a methodological error that guarantees underpowering for real effects of realistic magnitude. Much of the social priming literature from the 2000s, for example, assumed effect sizes drawn from small, selected samples — effect sizes that subsequent meta-analyses found were substantially inflated. Studies powered to detect the inflated effect were systematically underpowered to detect the real one.

## The multiple-comparisons problem and its interaction with power

Power calculations are typically conducted for a single, pre-specified hypothesis. Once a study tests many hypotheses simultaneously — dozens of brain regions in an fMRI scan, thousands of metabolites in a metabolomics panel, hundreds of personality items in a survey — the landscape changes in two opposing ways that are frequently confused.

Multiple comparisons inflate the Type I error rate: if you test 100 independent null hypotheses at alpha = 0.05, you expect 5 false positives by chance alone. Corrections like Bonferroni or the false discovery rate procedure of Benjamini and Hochberg adjust the threshold downward to control this inflation. But a lower threshold means a harder bar to clear, which reduces power for each individual test. This is not a paradox; it is a genuine trade-off. Controlling false positives costs you true positives.

The appropriate response depends on context. In confirmatory research where a specific hypothesis was stated in advance, strict Type I error control is paramount. In exploratory research designed to generate hypotheses, some relaxation of thresholds may be acceptable, provided the results are clearly labelled as preliminary and are not treated as established findings. The problem arises when exploratory analyses are dressed up as confirmatory — when researchers test many outcomes, find a significant one, and then write the paper as though that outcome was the primary hypothesis all along. This practice, known as **HARKing** (Hypothesising After Results are Known), does not technically involve lying about any individual number; it involves misrepresenting the inferential structure of the investigation.

## What pre-registration actually fixes

Pre-registration — the practice of submitting a study's hypotheses, sample size, and analysis plan to a public registry before data collection begins — addresses several of these problems simultaneously, though not all of them.

By locking in the primary hypothesis and the power calculation, pre-registration separates confirmatory from exploratory analysis. A pre-registered study with adequate power and a null result is now publishable as a meaningful contribution rather than a drawer-filling failure. Journals that operate **Registered Reports**, a format in which peer review and conditional acceptance occur before data are collected, have shown that the rate of null results in such publications is substantially higher than in traditional publications — roughly 50% compared to the historical norm of around 10% to 15%. This is almost certainly not because pre-registered studies are worse science; it is because they are not subject to the same publication filter.

What pre-registration does not fix is a bad power calculation. A researcher can pre-register a study powered at 30% for a realistic effect size, collect the data, find nothing, publish it as a null result, and have done everything correctly by procedural standards while still producing a study that is largely uninformative. Power has to be estimated against a plausible effect size, which requires either prior data, a meta-analysis, or explicit reasoning about what minimum effect would be theoretically meaningful. Picking an effect size because it yields a manageable sample — working backward from resource constraints to a convenient number — is as misleading as not pre-registering at all.

## Why this matters beyond methodology seminars

The practical stakes are not abstract. Underpowered clinical trials have led to the adoption of treatments that do not work and, occasionally, to the rejection of treatments that do. A 2016 analysis of trials supporting FDA drug approvals found that a substantial proportion were powered to detect effect sizes larger than those observed at approval, meaning the true effect was likely smaller than anticipated — with consequences for how aggressively the drug should be prescribed and at what cost.

In psychology and the social sciences, underpowered studies populated textbooks and informed policy for decades. The "ego depletion" effect — the idea that willpower is a depletable resource — was supported by hundreds of published studies, most small, most significant. A large pre-registered multi-lab replication in 2016 found no aggregate effect. Whether the phenomenon is real, small, or zero remains contested, but the evidentiary base that seemed solid was built largely on studies too small to distinguish a modest real effect from noise.

For readers evaluating scientific claims — whether in news coverage, public health guidance, or religious apologetics that appeal to scientific authority — the relevant question is not simply "was this study statistically significant?" It is: how large a sample was used, what effect size was assumed, was the hypothesis stated in advance, and has the result been replicated in an adequately powered independent study? These questions are not exotic demands. They are the minimum needed to distinguish a finding from a fluctuation.

Statistical power is ultimately a statement about the sensitivity of an instrument. A thermometer that can only distinguish temperatures to the nearest 10 degrees is not useless, but it will miss most of what is interesting about fever. Designing studies with inadequate power and then treating their outputs as reliable maps of reality is the same error — and it has been expensive enough, long enough, that the scientific community is no longer in a position to treat it as a secondary concern.
