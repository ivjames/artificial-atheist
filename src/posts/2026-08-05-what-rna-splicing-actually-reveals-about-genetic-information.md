---
image: /images/posts/what-rna-splicing-actually-reveals-about-genetic-information.png
imageAlt: "Abstract geometric illustration: {'title':'What RNA Splicing Actually Reveals About Genetic Information','excerpt':'The same DNA sequence can produce hundreds of different proteins, transformin"
title: "What RNA Splicing Actually Reveals About Genetic Information"
date: 2026-08-05
topic: science
excerpt: "The same DNA sequence can produce hundreds of different proteins. Understanding how and why transforms what we mean by a 'gene.'"
buffered: true
---

The discovery that a single human gene can encode hundreds of distinct proteins is one of the most disorienting findings in modern biology. It quietly dismantled a clean story — one gene, one protein, one function — that had anchored molecular biology for decades.

## The problem that splicing solved

When molecular biologists first mapped genes in bacteria during the 1950s and 1960s, the logic seemed straightforward. A stretch of DNA is transcribed into messenger RNA, the messenger RNA is translated into a protein, and the protein does a job. The relationship appeared essentially linear.

The trouble started when researchers turned to eukaryotes — organisms whose cells have a nucleus — and discovered something unexpected. The DNA sequences encoding proteins were not continuous. They were interrupted by long stretches of apparently non-coding sequence. In 1977, Richard Roberts and Phillip Sharp independently demonstrated that these interruptions were real, not artefacts, and that the cell had machinery to cut them out. The coding segments, called **exons**, were spliced together after transcription; the interrupting sequences, called **introns**, were removed. Roberts and Sharp shared the Nobel Prize in Physiology or Medicine in 1993 for this discovery.

At first, introns looked like junk — evolutionary debris the cell had to edit out before it could use a gene. The splicing machinery looked like a correction mechanism. That interpretation was too narrow.

## How the spliceosome works

The molecule that carries out splicing is not a protein but a large ribonucleoprotein complex called the **spliceosome**. It is one of the most elaborate molecular machines in the cell, assembled from five small nuclear RNAs and over 150 associated proteins. It recognises short consensus sequences at the boundaries of each intron, cleaves the RNA strand, joins the flanking exons, and releases the intron as a lariat-shaped loop that is then degraded.

What makes the spliceosome remarkable is not its complexity but its flexibility. The same pre-mRNA molecule — the raw transcript copied from DNA — can be processed in different ways in different cell types or at different developmental stages. Some exons are included in one context and skipped in another. Some splice sites are used only under particular cellular conditions. This is **alternative splicing**, and it is the rule rather than the exception in humans.

Large-scale surveys using RNA sequencing have found that roughly 95 percent of human genes that contain multiple exons undergo alternative splicing. The human genome encodes approximately 20,000 protein-coding genes, yet cells produce an estimated 100,000 or more distinct protein isoforms. The arithmetic only works because splicing multiplies the output of each gene.

## What alternative splicing does to the concept of a gene

The classical gene concept — one gene encodes one polypeptide — was already strained by the discovery that some proteins are assembled from the products of separate genes. Alternative splicing strains it further.

Take the **DSCAM** gene in the fruit fly *Drosophila melanogaster*. It contains 95 alternatively spliced exons organised into four clusters. By selecting one exon from each cluster, the cell can in principle generate 38,016 distinct protein isoforms from a single gene. The fly nervous system appears to use this combinatorial diversity so that individual neurons can acquire unique surface identities, allowing axons to avoid making synaptic connections with themselves — a problem known as self-avoidance. The gene is not a single instruction; it is closer to a toolkit.

In humans, the **neurexin** genes show similar logic. Three neurexin genes, each with multiple alternative splice sites, can produce thousands of isoforms. Neurexins are synaptic proteins involved in specifying which neurons connect to which. Mutations affecting their splicing have been linked to autism spectrum disorders and schizophrenia. The implication is that part of what makes each human brain individual — the precise wiring of its connections — may be partly specified not by differences in which genes are present, but by differences in how genes are spliced.

This matters for how we interpret genetic information. When a genome-wide association study identifies a variant linked to a disease, that variant often lies not in the protein-coding sequence of a gene but in the regulatory sequences that control splicing. A nucleotide change that shifts the ratio of two isoforms can be as consequential as one that alters the protein directly.

## The regulatory layer above the sequence

Splicing decisions are not made by the spliceosome alone. The spliceosome reads the pre-mRNA, but its choices are influenced by a dense layer of regulatory proteins called **splicing factors**, which bind to short sequences in the RNA and either promote or repress the use of nearby splice sites. These sequences — **exonic splicing enhancers**, **exonic splicing silencers**, and their intronic equivalents — are embedded throughout the transcript.

The balance of splicing factors in a cell changes with cell type, developmental stage, and environmental signals. A neuron expresses a different portfolio of splicing factors than a liver cell. During embryonic development, splicing patterns shift systematically. Some of this regulation is itself subject to feedback: splicing factors regulate each other's splicing, creating networks with switch-like and graded properties.

This introduces a meaningful distinction between the genome as a static sequence and the **transcriptome** as the dynamic set of RNA molecules a cell actually produces. Two cells with identical DNA can generate quite different transcriptomes, and therefore quite different protein repertoires, purely through differences in splicing regulation. The genome is not a blueprint in any simple sense. It is more like a library from which cells check out different books depending on circumstances.

## Where splicing goes wrong

Errors in splicing are implicated in a significant fraction of human genetic disease. Estimates suggest that 15 to 50 percent of disease-causing mutations affect splicing rather than directly altering protein sequence. Some of these are dramatic: mutations at the consensus sequences flanking an intron can cause the spliceosome to fail entirely, leaving the intron in the final mRNA and scrambling the protein. Others are subtle: a variant that weakens an exonic splicing enhancer shifts the ratio of isoforms without eliminating either.

**Spinal muscular atrophy** illustrates the point. The disease results from loss of the *SMN1* gene, which encodes a protein essential for motor neuron survival. Humans have a nearly identical backup copy, *SMN2*, but it differs from *SMN1* by a single nucleotide in exon 7 — a change that disrupts an exonic splicing enhancer. The spliceosome skips exon 7 in most *SMN2* transcripts, producing a truncated, unstable protein. Patients retain two copies of *SMN2* but cannot compensate for the loss of *SMN1* because splicing makes the backup unreliable.

This specific mechanism has become a therapeutic target. The drug **nusinersen**, approved in 2016, is an antisense oligonucleotide — a short synthetic molecule that binds to the *SMN2* pre-mRNA and blocks a splicing silencer near exon 7. By interfering with the repressive signal, it shifts splicing toward inclusion of exon 7, increasing production of functional SMN protein. The treatment does not correct the underlying mutation; it manipulates the splicing decision that the mutation disrupts. It is, in essence, a molecular argument about which exon the spliceosome should include.

## What this means for how we read claims about DNA

Popular accounts of genetics often treat the DNA sequence as the complete specification of an organism — the "code of life," the "blueprint," the "book of instructions." These metaphors are not wrong in the way that false statements are wrong; they capture something real about the causal role of the genome. But they omit the layer at which most of the interesting regulatory work occurs.

A sequence-level account of a gene leaves open, among other things: which exons will be included in which tissues, how splicing patterns will shift during development, how environmental signals will alter splicing factor activity, and how mutations outside the coding sequence will affect the final protein. None of these questions can be answered by reading the DNA sequence alone.

This is not a counsel of despair about genetics. Research into splicing has produced genuine therapeutic advances, and the regulatory logic of splicing is increasingly tractable. RNA sequencing has made it possible to measure the complete transcriptome of a cell — every RNA molecule, in every splice variant, at a given moment. Single-cell transcriptomics can reveal how splicing patterns differ not just between tissues but between individual cells within a tissue.

The corrective the science offers is epistemic rather than deflationary. It asks for a more accurate picture of what genetic information is: not a fixed text with a single reading, but a resource that cells interpret differently depending on context, history, and need. The same sequence can mean different things, and the mechanisms that determine which meaning is expressed are as biologically important as the sequence itself. That is a stranger and more interesting situation than the original story allowed.
