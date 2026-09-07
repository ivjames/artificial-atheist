---
image: /images/posts/what-crispr-base-editing-actually-changes.png
imageAlt: "Abstract geometric illustration: {'title':'What CRISPR Base Editing Actually Changes','excerpt':'Base editing rewrites single DNA letters without cutting the double helix — and that distinction"
title: "What CRISPR Base Editing Actually Changes"
date: 2026-09-07
topic: science
excerpt: "Base editing rewrites single DNA letters without cutting the double helix — and that distinction matters more than most popular coverage suggests."
buffered: true
---

CRISPR-Cas9 became a household name by promising to cut and rewrite DNA with surgical precision. Base editing, a refinement developed from 2016 onward, changes the underlying chemistry enough that calling it "CRISPR" risks obscuring what is genuinely new about it.

## What base editing does differently from standard CRISPR

Standard CRISPR-Cas9 works by introducing a **double-strand break** — it cuts both strands of the DNA helix at a target site. The cell then repairs that break through one of two pathways: non-homologous end joining (NHEJ), which is fast but error-prone, or homology-directed repair (HDR), which can insert a desired sequence but requires a template and is inefficient in most cell types. Most therapeutic applications that aim for precise edits have to fight against the cell's own repair machinery.

Base editing bypasses this problem entirely. A base editor is a fusion protein: a catalytically impaired version of Cas9 (which can find and bind a target site but no longer cuts both strands) joined to a chemical enzyme called a **deaminase**. The deaminase doesn't cut DNA — it chemically converts one DNA base into another. The two main classes are cytosine base editors (CBEs), which convert C to T, and adenine base editors (ABEs), which convert A to G. Because DNA base-pairing is symmetrical, those two directions cover all four possible transition mutations.

The result is a targeted, single-letter rewrite without a double-strand break, without needing a repair template, and with far lower rates of the indels (insertions and deletions) that NHEJ produces. For diseases caused by a single point mutation — which includes thousands of inherited conditions — this is a significant practical shift.

## The scale of the target disease space

Roughly half of all known disease-causing single-nucleotide variants in humans are transition mutations: a purine swapped for a purine (A↔G) or a pyrimidine for a pyrimidine (C↔T). That is a large fraction of the roughly 75,000 pathogenic variants catalogued in ClinVar as of the mid-2020s. CBEs and ABEs together can, in principle, correct or model a substantial portion of them.

To make this concrete: sickle-cell disease is caused by a single A-to-T transversion in the HBB gene. That specific mutation is a transversion, not a transition, so base editors cannot directly fix it — but they can reactivate fetal haemoglobin production by editing regulatory sequences, which is an indirect therapeutic route that has shown promise in early trials. Meanwhile, conditions like progeria (caused by a C-to-T mutation in LMNA), certain forms of inherited blindness, and familial hypercholesterolaemia (where specific point mutations in PCSK9 dramatically raise cardiovascular risk) sit squarely within what ABEs and CBEs can address.

This matters for understanding the realistic scope of the technology. Base editing is not a universal rewriting tool. It handles transitions efficiently; transversions still largely require different approaches, including prime editing, a subsequent development from the same laboratory tradition.

## What "precision" actually means here

Popular science writing often uses "precision" as a near-synonym for "safety", which conflates two separate questions. Base editing is precise in the sense that it acts on a specific chemical bond at a defined location. Whether it is safe is an empirical question that depends on off-target activity, bystander edits, and delivery.

**Off-target editing** — changes at unintended genomic sites — remains a real concern. Early CBEs showed elevated off-target rates compared to standard Cas9, partly because the deaminase domain can act on single-stranded DNA more promiscuously than Cas9 cuts. Engineered variants with tightened deaminase activity (such as the BE4max and ABE8e series) have substantially reduced this, but "substantially reduced" is not the same as "eliminated". Any therapeutic application requires genome-wide off-target profiling in the relevant cell type.

**Bystander editing** is a subtler problem. When the guide RNA positions the editor at a target site, a window of several nucleotides around the intended base is exposed to the deaminase. If another C (for a CBE) sits within that editing window, it may also get converted. Narrowing the editing window, which has been achieved through protein engineering, reduces but does not always eliminate bystander edits. Whether a bystander edit is harmful depends entirely on what gene it falls in and what the conversion does to the protein.

**Delivery** is the problem that most constrains clinical translation. The base editor protein plus its guide RNA must reach the target cells. For ex vivo therapies — where cells are extracted, edited in culture, and reinfused — delivery is manageable. For in vivo editing, the most common vehicles are lipid nanoparticles (LNPs) and adeno-associated viruses (AAVs). Base editor coding sequences are large, sometimes exceeding the packaging capacity of a single AAV particle, which has forced split-intein approaches that reassemble the protein inside the cell. LNPs work well for liver-targeted applications but have limited tropism for other tissues. The liver bias of current delivery explains why the most advanced clinical programmes target liver-expressed genes.

## The first human trials and what they show

The first clinical data on base editing in humans came from trials targeting transthyretin amyloidosis (ATTR), a condition in which misfolded transthyretin protein accumulates in tissues. The strategy was to use an ABE delivered by LNPs to knock down liver production of transthyretin by editing a splice site in the TTR gene — not correcting a mutation, but inducing one to reduce protein output. Early results reported reductions in serum transthyretin of over 90%, sustained over months of follow-up, with a single dose. That is a meaningful clinical signal, even if long-term durability and safety data are not yet mature.

Separately, trials for sickle-cell disease and beta-thalassaemia have used base editing approaches to reactivate fetal haemoglobin — editing BCL11A enhancer sequences in haematopoietic stem cells ex vivo. These sit alongside, and partly compete with, standard CRISPR-Cas9 approaches approved in late 2023 for the same indications. The existence of multiple editing strategies for the same disease is scientifically healthy; it means clinical outcomes across platforms can eventually be compared.

What the trials do not yet tell us is how these therapies perform over decades, whether integration events from viral delivery cause problems at low frequency over time, or whether immune responses to editor proteins will limit re-dosing. Those questions are not rhetorical: they are what years three through twenty of the data will need to answer.

## What base editing does not resolve about the ethics of genetic intervention

Base editing's relative precision makes some ethical objections to earlier gene-editing approaches less forceful, but it does not dissolve them. The distinction between **somatic editing** (changing the DNA of a specific patient's cells, with effects that die with that patient) and **germline editing** (changing an embryo's DNA, with effects that can be inherited) is not a technical property of base editing — it is a function of where and how the tool is applied.

A base editor applied to a human embryo is a germline intervention with all the attendant concerns about heritable changes, consent by future persons, and population-level genetic effects. The disgraced 2018 experiment by He Jiankui used standard CRISPR-Cas9, not base editing, but the ethical analysis would not fundamentally change if he had used a more precise tool. Precision reduces the probability of accidental off-target harm; it does not address the question of whether the intended edit is one society has any right to make heritable.

The question of **enhancement versus treatment** is similarly unresolved. If a base editor can lower cardiovascular risk by knocking down PCSK9 expression, is that treating a disease or enhancing a healthy person? If the same edit can be made in an embryo, who decides whether a future person should have it? These questions do not require base editing as a special trigger — they apply to any sufficiently precise intervention — but base editing's improving efficacy makes them more pressing because the technical barriers are falling faster than the governance frameworks.

## Why the chemistry matters for how we talk about the technology

There is a standing temptation in science communication to collapse distinctions that seem technical in order to reach a general audience more easily. "CRISPR" becomes a shorthand for all gene editing; "gene editing" becomes a shorthand for rewriting biology at will. Each compression loses something real.

Base editing is distinct from prime editing, which uses a reverse transcriptase to write new sequences from an RNA template and can in principle make all twelve types of point mutation plus small insertions and deletions. Prime editing is more versatile but currently less efficient in many contexts. Both differ from epigenome editing, which uses similar targeting machinery but modifies chemical marks on histones or DNA without changing the sequence at all — changes that may be reversible and are not inherited through the germline in the same way.

Keeping these distinctions clear is not pedantry. It affects how patients assess treatment options, how regulators frame oversight, how courts handle intellectual property disputes (the CRISPR patent litigation between the Broad Institute and UC Berkeley has run for years and turns partly on the definition of what counts as the same invention), and how policymakers draw lines around what requires special governance. A technology that is described only by its most dramatic features tends to get governed by its most dramatic fears. The actual chemistry of base editing — no double-strand break, a defined editing window, a specific subset of addressable mutations — is a more useful foundation for both hope and caution than the general promise that we can now rewrite DNA.

That precision of description is, in the end, the same thing we ask of the editing tools themselves.
