---
image: /images/posts/what-the-base-rate-fallacy-costs-us-in-medicine.png
title: "What the Base Rate Fallacy Costs Us in Medicine"
date: 2026-07-19
topic: science
excerpt: "Ignoring how common a condition is before interpreting a test result leads to systematic errors in diagnosis—and understanding why is straightforward."
buffered: true
---

Probability is not intuitive. When a doctor orders a diagnostic test, or a patient reads that a screening caught something, the number that matters most is almost always the one that goes unmentioned: how common is this condition in the first place?

## The mechanics of the fallacy

The **base rate fallacy** occurs when someone focuses on specific, case-level information while neglecting the prior probability of an event. In medicine, the base rate is the **prevalence** of a condition in the population being tested. Ignore it, and even a seemingly reliable test can mislead badly.

Here is a concrete example. Suppose a disease affects 1 in 1,000 people. A test for it has 99% sensitivity (it correctly identifies 99% of people who have the disease) and 99% specificity (it correctly clears 99% of people who do not). Both numbers sound excellent. Now suppose a randomly selected person tests positive. What is the probability they actually have the disease?

Most people guess somewhere around 99%. The correct answer is roughly 9%.

The arithmetic is straightforward. In a population of 100,000: about 100 people have the disease, and the test catches 99 of them. But 99,900 people do not have it, and 1% of those—about 999—will still test positive. So of roughly 1,098 positive results, only 99 come from people who are actually sick. That is about 9%.

This is not a flaw in the test. It is a consequence of low prevalence interacting with imperfect specificity.

## Why clinicians and patients both get this wrong

Studies going back to Casscells, Schoenberger, and Graboys in 1978 showed that even trained physicians answered base-rate problems poorly when the numbers were presented abstractly. The psychologists Daniel Kahneman and Amos Tversky identified the underlying cognitive mechanism: people weight vivid, specific information—"the test came back positive"—more heavily than statistical background information. The positive result feels like a fact about the individual. The prevalence feels like a fact about a crowd.

This asymmetry is not irrational in all contexts. In everyday reasoning, when someone tells you something specific about a situation, it usually is more informative than a general prior. The problem arises when the specific information is itself probabilistic and noisy, because then the base rate becomes essential rather than merely useful.

There is also an **incentive structure** that makes the problem worse in clinical settings. Ordering a test signals diligence. Telling a patient that a positive result probably means nothing, given low prevalence, is a harder conversation than ordering a follow-up test. The system rewards action on results rather than probabilistic restraint.

## What Bayes' theorem actually does here

The correct tool is **Bayes' theorem**, which formalises exactly how to update a prior probability (the base rate) given new evidence (the test result). It is not mystical; it is multiplication and division. The posterior probability of disease given a positive test equals the probability of a positive test given disease, multiplied by the prior probability of disease, divided by the overall probability of a positive test by any cause.

What this framework makes explicit is that a test result is never a standalone fact. It is evidence that shifts a prior. How far it shifts that prior depends on how strong the test is and how rare the condition is. A positive result on a test for a condition with 0.01% prevalence moves the needle far less than the same result for a condition affecting 30% of the presenting population.

This is why screening programs are designed with population selection in mind. Mammography guidelines, PSA testing debates, and COVID-19 surveillance all hinge on the same logic: if you screen a low-risk population, you generate a high ratio of false positives to true positives, with real downstream costs—anxiety, unnecessary biopsies, overtreatment.

## The broader lesson for critical thinking

The base rate fallacy is not confined to medicine. It appears in forensic probability (the prosecutor's fallacy presents match statistics without reference to how many people share a DNA profile), in machine-learning classification (a model that is 99% accurate on a dataset where 99% of entries are one class has learned nothing), and in everyday reasoning about risk.

The common thread is a failure to ask the prior question: **how often does this kind of thing happen, absent any specific evidence?** That question feels abstract compared to the vivid case in front of us, but skipping it is how systematic error enters reasoning that feels entirely rigorous.

Understanding base rates does not require advanced mathematics. It requires the habit of asking, before interpreting any result, what world that result is landing in—and how densely the thing being tested for already populates that world. Building that habit is, in a real sense, what evidence-based reasoning means in practice.
