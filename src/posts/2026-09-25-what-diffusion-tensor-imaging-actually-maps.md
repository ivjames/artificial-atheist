---
image: /images/posts/what-diffusion-tensor-imaging-actually-maps.png
imageAlt: "Abstract geometric illustration: {'title':'What Diffusion Tensor Imaging Actually Maps','excerpt':'DTI is widely used to visualise brain connectivity, but what it measures and what it cannot te"
title: "What Diffusion Tensor Imaging Actually Maps"
date: 2026-09-25
topic: science
excerpt: "DTI is widely used to visualise brain connectivity, but what it measures and what it cannot tell us are routinely conflated in both research and popular coverage."
buffered: true
---

Diffusion tensor imaging is one of the most cited tools in modern neuroscience, yet its outputs are routinely described in ways that outrun the physics. Understanding what it genuinely measures — and where the method's commitments end — matters for evaluating a large body of claims about the human brain.

## What the technique actually detects

DTI is an extension of standard MRI. Ordinary MRI measures the density and relaxation times of water protons in tissue. DTI goes further by applying magnetic field gradients in multiple directions and measuring how far water molecules diffuse along each direction during a short time window, typically a few tens of milliseconds.

In free solution, water diffuses equally in all directions — a pattern called **isotropic diffusion**. Inside a myelinated axon, or in a tightly packed bundle of axons, diffusion is much easier along the axon's length than perpendicular to it. The tensor in DTI is a 3×3 mathematical object that captures this directional bias. By fitting a tensor to measurements taken in at least six non-collinear gradient directions, the software can estimate the orientation of greatest diffusivity at each voxel and how pronounced the directional preference is.

Two summary statistics are reported constantly. **Fractional anisotropy (FA)** runs from 0 (perfectly isotropic) to 1 (perfectly directional) and is treated as an index of white-matter integrity. **Mean diffusivity (MD)** captures the average displacement regardless of direction. These numbers are not images of axons; they are weighted averages over a voxel that typically contains tens of thousands of axons, glial cells, blood vessels, and extracellular fluid.

## The tractography leap

From the tensor field, software can integrate the directions of greatest diffusivity through space and draw streamlines — the visualisations that appear in popular articles as elegant, coloured threads arcing across the brain. This process is called **tractography**, and it is where inference moves furthest from the raw measurement.

Deterministic tractography follows the principal diffusion direction at each step, stopping when FA drops below a threshold or when curvature exceeds a set limit. Probabilistic tractography instead samples from the uncertainty in each tensor estimate and generates a distribution of possible paths. Both approaches face the same fundamental problem: a voxel 2–3 mm on a side is enormous relative to individual axons. When fibres from different tracts cross, merge, or fan within a single voxel — which happens throughout most of the white matter — the tensor model produces an average that represents no actual tract faithfully.

The crossing-fibre problem is not a minor caveat. Studies using histological reconstruction have shown that more than 90 percent of white-matter voxels in the human brain contain fibres running in more than one direction. Standard single-tensor DTI assigns a single principal direction to each such voxel. The downstream streamlines are, in those regions, a reasonable-looking fiction. More sophisticated models — constrained spherical deconvolution, ball-and-stick models, multi-shell acquisitions — reduce the problem but do not eliminate it.

## What FA actually reflects

Even within a single, well-separated tract, fractional anisotropy is not a clean readout of axonal health. FA depends on myelin thickness, axon diameter, axon packing density, membrane permeability, and the presence of glial processes — all confounded with each other. It also depends on scan parameters: field strength, gradient directions, voxel size, and signal-to-noise ratio.

This matters because a large literature reports group differences in FA between clinical populations and controls — in depression, schizophrenia, autism, dyslexia, and many other conditions. The standard interpretive move is to say that reduced FA indicates "disrupted white-matter integrity." That framing is not wrong, but it is underspecified. Reduced FA could reflect fewer axons, thinner myelin, more crossing fibres in that region, greater inter-subject variability in tract location, or partial-volume effects from cerebrospinal fluid contamination near ventricles. These possibilities have different biological meanings and different therapeutic implications, and DTI alone cannot distinguish them.

Longitudinal developmental work illustrates the ambiguity. FA rises steeply through childhood and adolescence as myelination proceeds, peaks in early adulthood, and declines gradually with age. Studies correlating adolescent FA with cognitive scores or educational attainment typically find positive associations in frontal and parietal tracts. The temptation to read these as showing that "better-connected brains perform better" runs ahead of the evidence. The correlation could be driven by head motion (children who hold still produce higher FA, and better cognitive performance correlates with compliance with instructions), by socioeconomic factors that affect both brain development and test performance, or by the mathematical coupling between FA and tract reconstruction.

## The connectivity inference problem

Tractography results are frequently described as maps of **structural connectivity** — showing which brain regions are connected to which. The concept is intuitive and maps visually onto the language of networks and circuits. But tractography cannot establish that two regions are connected in the relevant sense. It can show that a coherent diffusion direction exists along a path between them. Whether axons actually traverse that entire path, whether they are predominantly projecting in one direction or both, and whether their connections are excitatory or inhibitory are questions DTI cannot answer.

The distinction matters most when DTI results are used to make inferences about information flow. A high-FA tract between the amygdala and prefrontal cortex in a study of emotion regulation does not establish that prefrontal signals are carried swiftly to the amygdala to inhibit fear responses, as some popular accounts suggest. It establishes that water diffuses anisotropically along a path consistent with that anatomical route. Convergent evidence from tract-tracing in animal models, lesion studies, and functional connectivity is required before the flow-of-information claim earns much confidence.

Connectome studies compound this by building adjacency matrices where edge weights are tractography streamline counts between parcellated regions. Streamline counts are not axon counts. They depend on seeding density, step size, stopping criteria, and parcellation scheme. Two pipelines applied to the same data can produce markedly different connectomes, a finding reproduced across independent labs. This is not a reason to dismiss the method, but it is a reason to treat connectome "fingerprinting" studies — which claim to identify individuals from their structural connectomes — as requiring careful methodological scrutiny rather than celebration of a new biometric.

## Where the technique earns its keep

None of this invalidates DTI as a tool. The technique has genuine clinical utility in domains where the signal is large and the inference step is short. **Pre-surgical mapping** uses DTI tractography to identify the corticospinal tract and arcuate fasciculus before tumour resection, reducing the risk of motor or language deficits. The goal is not to count axons but to avoid a major fibre bundle during surgery, and even an approximate reconstruction is better than no spatial information. Outcomes data support its use in this context.

In **neonatal medicine**, DTI abnormalities following hypoxic-ischaemic injury predict motor outcomes with reasonable accuracy, because the pathological changes are large and spatially consistent across patients. In **multiple sclerosis**, where the disease mechanism directly attacks myelin, tracking FA changes over time provides biologically interpretable information that correlates with lesion load and disability progression better than T2 lesion volume alone.

The method is also productive when combined with other modalities. Comparing structural connectivity maps with functional MRI resting-state networks, or using DTI priors to constrain magnetoencephalographic source reconstruction, produces hypotheses that neither technique would generate alone. The key epistemic discipline is to present multi-modal convergence as increasing plausibility, not as mutual validation — if both methods share systematic biases, their agreement carries less weight than it appears to.

## Reading DTI claims critically

Several heuristics help when evaluating research that uses this technique. First, check whether the study's conclusions require the tractography step or only the tensor statistics. Claims about white-matter differences between groups can rest on voxelwise FA comparisons, which are less assumption-laden than full tractography. If streamlines are drawn, ask whether the tracts in question are known to contain substantial crossing fibres.

Second, consider whether the sample size justifies the spatial specificity claimed. DTI studies with small samples and whole-brain voxelwise analyses are susceptible to inflated effect sizes and spatially unstable findings — a version of the same problems that drove the replication crisis in functional neuroimaging. A claimed FA difference in a specific portion of the superior longitudinal fasciculus, derived from forty participants, should be read with caution.

Third, scrutinise the interpretive language. Words like "pathway," "circuit," "connection," and "white-matter integrity" are not neutral descriptors; they carry theoretical commitments that DTI data do not automatically discharge. A study can be technically sound and still overreach in its conclusions if the language imports assumptions the method cannot test.

DTI has opened a window on brain structure that was closed before it existed. That is a real achievement. The window is also smaller and more distorted than many published accounts suggest, and knowing the shape of the distortion is part of knowing what the science actually says.
