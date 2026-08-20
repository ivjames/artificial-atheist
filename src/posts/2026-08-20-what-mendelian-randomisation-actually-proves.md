---
image: /images/posts/what-mendelian-randomisation-actually-proves.png
imageAlt: "Abstract geometric illustration: {'title':'What Mendelian Randomisation Actually Proves','excerpt':'Mendelian randomisation uses genetic variants as natural experiments to test causation, but i"
title: "What Mendelian Randomisation Actually Proves"
date: 2026-08-20
topic: science
excerpt: "Mendelian randomisation uses genetic variants as natural experiments to test causation, but its assumptions are stricter than most coverage admits."
buffered: true
---

Epidemiology has a causation problem. Observational studies can show that people who drink red wine have better cardiovascular outcomes, but they cannot easily rule out the possibility that wealth, diet, or a hundred other factors are doing the real work. Mendelian randomisation promises a way out — and it partly delivers, but only under conditions that are routinely glossed over.

## The core idea: genes as a natural lottery

The logic of Mendelian randomisation rests on how genes are allocated at conception. When an embryo forms, which variant of a gene it inherits is effectively random with respect to the social and environmental circumstances that surround it. This is the key insight. If you want to know whether higher levels of LDL cholesterol cause heart disease, you do not need to randomly assign people to have high LDL — which would be unethical and impractical. Instead, you find genetic variants, known as **single-nucleotide polymorphisms (SNPs)**, that are reliably associated with higher LDL levels. People who happen to carry those variants will, on average, have higher LDL throughout their lives. If they also have higher rates of heart disease, and if you have controlled for the right things, the genetic variant is acting as a kind of instrumental variable — a randomising device that nature provided for free.

The analogy that researchers often use is a randomised controlled trial. In an RCT, randomisation breaks the link between who gets the treatment and every other variable. Mendelian randomisation attempts to achieve the same break by substituting the random inheritance of alleles for deliberate random assignment. When it works, it can distinguish correlation from causation in a way that even very large observational cohorts cannot.

## The three assumptions that hold the method together

Every instrumental variable method depends on assumptions that the instrument itself cannot prove. Mendelian randomisation is no different, and there are three of them.

The first is **relevance**: the genetic variant must genuinely be associated with the exposure you care about. This is the easiest assumption to test. If a SNP is associated with LDL levels in a large genome-wide association study, you have direct statistical evidence. The F-statistic, a measure of instrument strength, gives you a handle on how serious weak-instrument bias might be.

The second is **independence**: the variant must be independent of confounders. This is where the "natural lottery" argument is doing heavy lifting. In well-mixed populations, Mendelian randomisation assumes that the genetic variant is not systematically correlated with socioeconomic status, diet, or any other variable that also affects the outcome. In reality, this can fail through a phenomenon called **population stratification** — the fact that genetic ancestry and social environment are not independent across populations. If a SNP happens to be more common in a particular ethnic group that also has higher rates of a disease for social reasons, the variant will appear causally related to the disease even if it is not. Modern analyses try to control for this using genetic principal components, but the fix is imperfect.

The third assumption is the most treacherous: **exclusion restriction**. It requires that the genetic variant affects the outcome only through the exposure of interest, and through no other pathway. This is called **pleiotropy** when it fails — the same gene affecting multiple traits. The APOE gene, for example, influences both cholesterol metabolism and Alzheimer's risk through at least partially independent mechanisms. If you use APOE variants to instrument for LDL and then ask whether LDL causes Alzheimer's, you will get a confounded answer because the gene is doing other things at the same time. Pleiotropy is ubiquitous in genomics. Most common variants identified in large-scale association studies touch several biological systems. The exclusion restriction can never be directly tested — it can only be made more or less plausible through biological reasoning and sensitivity analyses.

## What it has genuinely established

Despite the caveats, Mendelian randomisation has produced findings that hold up well and that changed clinical thinking. The clearest case is LDL cholesterol and cardiovascular disease. Statin trials already established the causal link, but Mendelian randomisation using variants in the PCSK9 and HMGCR genes confirmed it from an entirely different angle, with lifetime exposure rather than the few years a typical trial covers. The consistency between the two methods is exactly what you would expect if both are tracking something real.

It has also produced important negative results. Observational studies consistently found that higher vitamin D levels were associated with lower rates of depression, autoimmune disease, and mortality. When Mendelian randomisation studies used variants that predict circulating vitamin D as instruments, the associations mostly evaporated. This is a strong signal that the observational link is driven by confounders — perhaps that healthy, outdoors-active people have both higher vitamin D and better health — rather than by vitamin D itself. Multiple large randomised trials of vitamin D supplementation subsequently confirmed the null result. The Mendelian randomisation findings came first and were vindicated.

C-reactive protein is another instructive case. It is a marker of inflammation reliably associated with cardiovascular risk in observational data. Genetic instruments for CRP suggested it might not be a cause but merely a bystander — a reflection of underlying inflammation rather than a driver of arterial disease. Clinical trials of CRP-lowering strategies have not produced clear cardiovascular benefit, consistent with that interpretation.

## Where the method can mislead

The same technique has generated claims that have not held up, and the pattern is instructive. Studies using Mendelian randomisation to probe the effects of body mass index on various outcomes are particularly vulnerable because BMI is influenced by enormous numbers of genetic variants, each with tiny effect sizes. When you aggregate hundreds of weak instruments into a **polygenic score**, you gain statistical power but increase the risk that at least some of the variants are pleiotropic. Sensitivity analyses — such as the weighted median method, MR-Egger regression, and the MR-PRESSO test — can detect some forms of pleiotropy, but they make their own assumptions and they are not a cure.

The alcohol and health literature illustrates the risk of overconfidence. For years, Mendelian randomisation studies using variants in the alcohol metabolism gene ALDH2 (abundant in East Asian populations) suggested that alcohol caused various cancers and cardiovascular harm, which aligned well with prior expectations. But the same variants affect acetaldehyde metabolism independently of drinking behaviour, meaning the exclusion restriction may be violated. Applying Western-derived genetic instruments for alcohol consumption to different populations has produced inconsistent results. The biology is harder to disentangle than the elegant design suggests.

There is also a subtler issue with what Mendelian randomisation actually estimates. Genetic variants typically fix the direction of an exposure from birth. The estimate you obtain reflects the effect of a lifetime of slightly higher or lower exposure, not the effect of a short-term intervention. This is sometimes an advantage — it captures long-run biological effects that trials might miss — but it means the result is not necessarily the same as what a clinician would observe after prescribing a drug for two years. The causal question being answered is real but narrower than it appears.

## The publication and hype problem

Mendelian randomisation papers are cheap to produce at scale. A researcher with access to a large biobank and summary statistics from genome-wide association studies can run hundreds of exposure-outcome pairs in an afternoon. The consequence is a literature flooded with exploratory analyses dressed up as causal inference. Journals and press offices amplify findings that confirm intuitions or surprise with counterintuitive claims. The corrective machinery — replication, triangulation with other methods, biological mechanistic work — moves more slowly.

This is not a flaw unique to Mendelian randomisation. It is the general problem of a powerful but assumption-laden tool meeting a publication incentive structure that rewards novelty. The responsible use of the method requires stating the assumptions explicitly, reporting sensitivity analyses, and being honest about which findings are hypothesis-generating and which are well-corroborated. The best practitioners in the field do this. Much of the applied literature does not.

## What to make of a Mendelian randomisation finding

Reading a Mendelian randomisation study critically requires asking a small number of targeted questions. Is the instrument strong — is the F-statistic well above the conventional threshold of ten? Is population stratification accounted for? Are there known pleiotropic pathways that could connect the genetic variant to the outcome independently of the exposure? Do the sensitivity analyses give consistent estimates, or do they diverge when different assumptions are relaxed? Is the finding consistent with evidence from other methods — animal models, trials, clinical pharmacology?

When the answers to those questions are reassuring, Mendelian randomisation earns its claim to causal inference. When they are not, the result sits closer to an interesting hypothesis than a settled conclusion. The method is neither magic nor worthless. It is a tool with a clearly specified set of conditions under which it performs well, and those conditions are more demanding than the breathless coverage of any particular finding tends to acknowledge.

The deeper lesson is one that runs through all of epidemiology: correlation is common, instruments are rare, and good causal evidence is hard to obtain even when you have a clever design. Mendelian randomisation made the problem easier. It did not make it easy.
