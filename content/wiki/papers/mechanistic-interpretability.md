---
type: paper
category: papers
para: resource
tags: [mechanistic-interpretability, circuits, superposition, monosemanticity, olah, anthropic, safety]
sources: []
updated: 2026-05-01
tldr: The research programme of understanding what computations neural networks actually implement.
---

# Mechanistic Interpretability — Core Papers

The research programme of understanding what computations neural networks actually implement. Four foundational Anthropic papers, building from early vision circuits through to sparse autoencoders at frontier scale.

---

## Paper 1 — Zoom In: An Introduction to Circuits (Olah et al., 2020)

**One sentence:** Individual neurons in vision models detect meaningful features, and small groups of connected neurons (circuits) implement identifiable algorithms — interpretability is possible at the circuit level.

**Key findings:**
- Feature visualisation shows neurons detect specific concepts: curve detectors, high-low frequency detectors, multimodal neurons
- Circuits = subgraphs of neurons that implement a discrete computation (e.g., curve detection → curve assembly → head detection)
- Three claims: Features are natural units; circuits connect features; universality — similar circuits appear across different model architectures

**Why it matters:** Established the programme. Showed interpretability is tractable — not "the network is a black box" but "we can read specific computations from the weights".

---

## Paper 2 — Toy Models of Superposition (Elhage et al., Anthropic, 2022)

**Citation:** Elhage, N., Hume, T., Olsson, C., Schiefer, N., Henighan, T., Kravec, S., ... (2022). Toy Models of Superposition.

**One sentence:** When the number of features in the world exceeds the number of neurons, a network represents multiple features per neuron by superposition — making individual neurons uninterpretable but the network more efficient.

### The Superposition Hypothesis

Neurons in real networks are **polysemantic**. They activate for multiple unrelated concepts. This is not noise; it's a computational strategy.

Imagine representing 5 features in a 2D space. If features are sparse (most are zero in any given input), you can encode 5 features in 2 dimensions by placing them as nearly-orthogonal directions. Each neuron activates for multiple features, but rarely simultaneously, so interference is low.

```
Feature utilisation: if features are sparse with frequency p each
Capacity: ~(-p log p)^-1 features per neuron

For p=0.01 (1% active): ~14 features per neuron possible
For p=0.1 (10% active): ~3 features per neuron
```

### Why This Matters for Interpretability

If superposition is real, then:
- Single-neuron analysis is insufficient — features are distributed
- Linear probes can extract features even from polysemantic neurons
- Sparse representations (sparse autoencoders) can decompose superposed features into monosemantic components

---

## Paper 3 — Towards Monosemanticity: Decomposing Language Models with Dictionary Learning (Bricken et al., Anthropic, 2023)

**Citation:** Bricken, T., Templeton, A., Batson, J., Chen, B., Jermyn, A., Conerly, T., ... (2023). Towards Monosemanticity.

**One sentence:** Training a sparse autoencoder (SAE) on the residual stream of a 1-layer transformer produces thousands of interpretable, monosemantic features — each activating for a coherent concept.

### Sparse Autoencoders (SAEs)

An SAE learns to decompose a superposed activation vector into a sparse combination of monosemantic features:

```
h = encoder(x) = ReLU(W_enc · x + b_enc)   # sparse feature activations
x̂ = decoder(h) = W_dec · h + b_dec         # reconstruct original activation

Loss = ||x - x̂||² + λ||h||₁               # reconstruction + sparsity penalty
```

The L1 penalty forces most feature activations to zero. Recovering sparse, interpretable features from the superposed representation.

### Results

Applied to a 1-layer transformer (MLP neuron activations):
- 512 neurons → 4,096 features with high interpretability
- Example features discovered: "DNA/genetics", "The Bible", "base64 encoding", "code comments"
- Each feature activates for semantically coherent token groups — monosemantic

---

## Paper 4 — Scaling Monosemanticity: Extracting Interpretable Features from Claude 3 Sonnet (Templeton et al., Anthropic, 2024)

**One sentence:** Sparse autoencoders applied to Claude 3 Sonnet's residual stream produce ~34 million interpretable features — including features for concepts like "the inner workings of the model itself" and safety-relevant concepts like "dangerous information requests".

### Scale

- SAE trained on Claude 3 Sonnet (production frontier model)
- ~34 million features learned; most are interpretable
- Features span: code, languages, people, places, abstract concepts, safety-relevant content

### Safety-Relevant Findings

Features for safety-relevant concepts were found and are causally active. Not just correlated:

- Feature for "Assistant" token activates concepts related to helpfulness and subservience
- Features activating on bioweapons-related requests cluster near dangerous-information features
- **Causal manipulation:** clamping feature activations can predictably change model behaviour (concept → thought insertion)

This is the first interpretability work that directly touches production frontier model internals with safety implications.

---

## The Research Programme — Where It's Going

| Stage | What it enables |
|---|---|
| Feature identification | Understanding what concepts the model represents |
| Circuit analysis | Understanding how the model computes with those features |
| Causal intervention | Editing model behaviour by manipulating features |
| Model evaluation | Detecting dangerous capabilities or misaligned goals |
| Mechanistic safety | Verifying alignment at the level of computations, not just behaviour |

The long-term goal: verify that a model is safe by reading its "thoughts". Not just testing its outputs.

---

## Key Facts

- Circuits (2020): Olah et al., published in Distill; vision model circuits are interpretable
- Superposition (2022): polysemantic neurons are a feature, not a bug — efficient representation strategy
- Monosemanticity (2023): SAEs decompose 512 neurons into 4,096 interpretable features on a 1-layer model
- Scaling Monosemanticity (2024): 34M features on Claude 3 Sonnet; safety-relevant features causally active
- Key technique: Sparse Autoencoder (SAE) with L1 sparsity penalty on activations
- Why it matters for alignment: mechanistic verification of model goals, not just behavioural testing

---

## Connections

[[papers/key-papers]] · [[safety/mechanistic-interpretability]] · [[safety/constitutional-ai]] · [[llms/transformer-architecture]] · [[math/linear-algebra]]
