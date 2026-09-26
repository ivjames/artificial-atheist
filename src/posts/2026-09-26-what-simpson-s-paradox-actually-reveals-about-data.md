---
image: /images/posts/what-simpson-s-paradox-actually-reveals-about-data.png
imageAlt: "Abstract geometric illustration: {'title':'What Simpson's Paradox Actually Reveals About Data','excerpt':'Simpson's paradox shows how statistical trends can reverse when data are aggregated, re"
title: "What Simpson's Paradox Actually Reveals About Data"
date: 2026-09-26
topic: science
excerpt: "Simpson's paradox shows how a statistical trend can reverse when data are aggregated, and why understanding causation is essential to reading numbers correctly."
buffered: true
---

A statistical result can be true at every level of a dataset and simultaneously false when those levels are combined. This is not a trick or a footnote — it is a structural feature of how numbers relate to the world, and it goes by the name Simpson's paradox.

## What the paradox actually is

Simpson's paradox occurs when a relationship between two variables disappears or reverses direction once a third variable — a **confounding variable** — is taken into account. Equivalently, a trend visible within each subgroup of a population can vanish or flip when those subgroups are merged into a single aggregate.

The formal mechanics are straightforward. Suppose you are comparing two treatments, A and B, across two patient groups. Treatment A outperforms B in mild cases. Treatment A also outperforms B in severe cases. But when you combine the groups, treatment B looks superior. This happens because the groups differ in size and in baseline risk, and the aggregated average inherits those imbalances. The weighted combination of proportions does not behave like a simple average of proportions.

The paradox was described formally by the statistician Edward Simpson in 1951, though the underlying logic was noted earlier by Karl Pearson and Udny Yule. Its persistence across a century of statistical education signals that it exposes something genuinely counterintuitive about how data and causation relate.

## The Berkeley admissions case

The most cited real-world instance comes from the University of California, Berkeley, in 1973. An analysis of graduate admissions appeared to show a substantial bias against women: men were admitted at a higher rate than women overall. The finding was alarming enough to prompt a formal study, published in *Science* by Bickel, Hammel, and O'Connell.

When the researchers broke the data down by department, the bias largely vanished. In most departments, women were admitted at rates comparable to or higher than men. The aggregate disparity arose because women disproportionately applied to departments with low admission rates for everyone — competitive fields like English and law — while men disproportionately applied to departments with high admission rates, such as engineering. The departments were the confounding variable. The university-wide number was technically accurate and deeply misleading at the same time.

This case illustrates a point that matters far beyond statistics: **aggregation is a choice**, and different aggregations can yield contradictory conclusions from the same underlying data. The data did not lie, but the level of analysis determined what story they appeared to tell.

## Why causation is the real issue

One might think Simpson's paradox is purely a statistical curiosity — a mathematical quirk to be filed away. The statistician Judea Pearl has argued, convincingly, that the paradox is better understood as a symptom of conflating association with causation.

When you ask whether treatment A or B is better, you are asking a causal question: what would happen to a patient if they received one treatment rather than the other? That question cannot be answered by looking at raw proportions. You need to know the causal structure — specifically, whether the confounding variable (say, disease severity) influences both the choice of treatment and the outcome. If it does, aggregating across it without adjustment produces a distorted picture.

Pearl's **do-calculus** formalises this. The quantity you want is not P(recovery | treatment A) — the probability of recovery given that a patient happened to receive A — but P(recovery | do(treatment A)) — the probability of recovery if treatment A were assigned, independently of any confound. These two quantities can differ, sometimes dramatically, and Simpson's paradox is one way that difference becomes visible.

This matters enormously for medicine, policy, and science broadly. Observational data, which make up most of what researchers actually have access to, are saturated with confounders. Every time someone reports a correlation between two variables without specifying the causal model they are assuming, they are leaving open the possibility that the relationship is an artefact of aggregation.

## Real consequences in medicine and public health

The Berkeley example is well-known partly because it had no serious consequences — no one was harmed by the initial misreading. Medical contexts are less forgiving.

A recurring problem in kidney stone treatment research illustrates this. Studies comparing open surgery with percutaneous nephrolithotomy (a less invasive procedure) found that the less invasive method had higher success rates overall. Stratifying by stone size reversed the result: open surgery outperformed the alternative for both small stones and large stones. The aggregate favoured the minimally invasive procedure because surgeons tended to use it on smaller, easier cases, while open surgery was reserved for more difficult presentations. Recommending the minimally invasive procedure based on the aggregate statistic alone would have been the wrong call.

Similar reversals appear in COVID-19 mortality data. Early in the pandemic, some countries showed lower overall case fatality rates than countries with apparently less severe outbreaks — not because their healthcare was better, but because their tested population skewed younger. Age was the confound. Comparing raw fatality rates across populations with different age structures produces numbers that cannot be directly compared.

## What the paradox demands of critical thinking

Simpson's paradox is not a reason to distrust statistics. It is a reason to demand better specified claims from anyone presenting statistical evidence — including scientists, journalists, and advocates.

The key questions are: What subgroups exist in this data? Are those subgroups different in ways that could affect the outcome? Has the analyst adjusted for those differences, and if so, how? What causal model is being assumed, even implicitly?

These are not questions reserved for specialists. They are the minimum required for interpreting any aggregate claim about rates, proportions, or averages. When a headline states that a drug reduces mortality by a given percentage, the relevant follow-up is always: in whom, compared to what baseline population, and what confounders were controlled?

The paradox also has implications for how people evaluate social and political statistics. Arguments about group disparities in income, education, health, or criminal justice routinely aggregate across subgroups in ways that either reveal or conceal underlying structure depending on how the analysis is run. This is not inherently dishonest — sometimes aggregation is the appropriate level of analysis — but it means that disputes about such statistics are often disputes about which causal model to apply, not just disputes about the numbers themselves.

## The paradox and the limits of naive empiricism

There is a broader epistemological point here that connects to debates about the nature of scientific knowledge. A naive empiricist view holds that science is fundamentally about observing patterns in data and generalising from them. Simpson's paradox demonstrates that this view is incomplete. Patterns in data are not self-interpreting. The same observations support contradictory conclusions depending on the causal assumptions the analyst brings to them.

This does not collapse into relativism. It is not the case that any interpretation is as good as any other. Causal structures can be tested, at least partially, through experimental intervention and through the consistency of a model with multiple independent lines of evidence. Randomised controlled trials are valuable precisely because random assignment breaks the link between confounders and treatment, eliminating the conditions that produce Simpson's paradox in the first place.

But most data are not experimental. In epidemiology, economics, education research, and most of the social sciences, researchers are working with observational data and must reason carefully about causal structure. Simpson's paradox is a reminder that this reasoning is unavoidable — you cannot escape causal assumptions by sticking to "just the data." The data never arrive without a context that shapes what they mean.

## Why this matters for scientific literacy

Public discourse about science often treats statistics as a final court of appeal. A number is cited; the debate is supposed to close. Simpson's paradox shows why this is wrong without suggesting that quantitative evidence is therefore worthless.

The lesson is not scepticism about data but **structured scepticism**: always ask what is being held constant, what is being aggregated, and what causal claim is actually being made. A finding that holds within every relevant subgroup is far more robust than one that emerges only in the aggregate. A claim about causation requires a causal model, not just a correlation, however large.

These habits of mind are exactly what critical thinking asks of people evaluating any claim — not reflexive rejection, not credulous acceptance, but the disciplined question: what would I need to know to assess whether this conclusion follows from this evidence? In the case of statistics, Simpson's paradox is one of the clearest demonstrations of why that question is always worth asking.
