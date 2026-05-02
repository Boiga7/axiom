---
type: concept
category: safety
tags: [interpretability, mechanistic-interpretability, features, circuits, superposition, anthropic]
sources: []
updated: 2026-04-29
para: resource
tldr: Sparse autoencoders decompose polysemantic neurons into millions of monosemantic features — Scaling Monosemanticity (2024) applied SAEs to Claude 3 Sonnet; activation steering enables direct behavioural intervention.
---

# Mechanistic Interpretability

> **TL;DR** Sparse autoencoders decompose polysemantic neurons into millions of monosemantic features — Scaling Monosemanticity (2024) applied SAEs to Claude 3 Sonnet; activation steering enables direct behavioural intervention.

Understanding what's actually happening inside neural networks at the circuit level. Anthropic's interpretability team is the world's most active. Goal: replace "black box" with legible computational mechanisms.

---

## The Core Challenge: Superposition

Neural networks have more "concepts" (features) than neurons. A 4,096-dimensional model needs to represent millions of concepts. The model stores multiple features per neuron. They overlap in "superposition."

This is why simple approaches (find the neuron for "cat") don't work. Neurons are polysemantic: they activate for multiple unrelated concepts. "Feature" and "neuron" are not synonymous.

**Example from Anthropic:** In a small language model, a single neuron activates for both "DNA" and "basketball" (apparently unrelated). This is not a bug — it's efficient compression.

---

## Sparse Autoencoders (SAEs): The Breakthrough Tool

If neurons are polysemantic, find the actual features by decomposing neuron activations into a larger sparse set of monosemantic features.

**How it works:**
1. Train an autoencoder with a sparsity penalty on the hidden layer
2. The hidden layer has more dimensions than the model layer (e.g. 16,384 features from 4,096 neurons)
3. Each hidden unit activates infrequently but when it does, it corresponds to a specific, interpretable concept

Anthropic trained SAEs on Claude Sonnet 3 and found millions of interpretable features including:
- "The Golden Gate Bridge" (a feature that, when artificially amplified, makes Claude identify as the bridge)
- Concepts in languages the model wasn't explicitly trained on
- Features for specific people, places, emotions, programming concepts

The Golden Gate Claude demo (May 2024) showed: steer this feature → dramatic change in model behaviour.

---

## Circuits: How Features Interact

A **circuit** is a subgraph of the neural network that implements a specific algorithm. Identifying circuits explains *how* the model computes something, not just *what* it knows.

**Example: Indirect Object Identification (Wang et al., 2022)**
In "John gave Mary a gift; Mary thanked ___", the model must identify "John". The circuit that does this was fully reverse-engineered: which attention heads copy subject/object tokens, which compare positions, which inhibit duplicates.

**Other known circuits:**
- Curve detectors in early vision models (Olah et al., 2020 — foundational work)
- Docstring completion in code models
- In-context learning circuits
- Refusal circuits in instruction-tuned models

---

## Activation Steering

Instead of finding what a feature represents, directly modify it. Intervention at activation time:

```python
# Pseudo-code: add a steering vector to residual stream at layer L
def steer(model, prompt, direction_vector, multiplier=10):
    with model.hooks([(layer_L, lambda act: act + multiplier * direction_vector)]):
        return model.generate(prompt)
```

Applications:
- **Concept suppression** — reduce the activation of "deception" features to make models more truthful
- **Concept injection** — add "creative writing" features to steer outputs
- **Safety applications** — activation steering as a runtime safety layer

---

## Dictionary Learning at Scale

Anthropic's "Scaling Monosemanticity" (2024) scaled SAEs to Claude 3 Sonnet. Key findings:
- Features cluster into "neighborhoods" with related concepts
- Multimodal features exist (same feature activates for the same concept across different languages)
- Dark / concerning features also exist (self-harm, manipulation, deception — studying them is necessary for safety)
- Feature geometry may encode concept relationships

This scale of interpretability was previously impossible. SAEs made it tractable.

---

## Connection to Safety

If we can read model internals:
- **Lie detection** — can we detect when a model is being deceptive by looking at its activations?
- **Value alignment verification** — do the model's internal representations match its stated values?
- **Capability detection** — does the model have dangerous capabilities it's hiding?
- **Circuit-level safety** — modify specific circuits to remove dangerous behaviours

Current status: interpretability can find features and circuits, but translating this into reliable safety tools is still research. We cannot yet reliably detect deception at scale.

---

## Key Papers

1. **"Zoom In: An Introduction to Circuits" (Olah et al., 2020)** — circuits in vision models; foundational
2. **"A Mathematical Framework for Transformer Circuits" (Elhage et al., 2021)** — formal theory for transformer interpretability
3. **"Toy Models of Superposition" (Elhage et al., 2022)** — proves superposition exists; theoretical analysis
4. **"Towards Monosemanticity" (Bricken et al., 2023)** — SAEs work; first large-scale feature decomposition
5. **"Scaling Monosemanticity" (Templeton et al., 2024)** — SAEs at Claude 3 Sonnet scale; millions of interpretable features
6. **"Circuits in Large Language Models" (ongoing)** — Anthropic's ongoing circuits work

---

## Key Facts

- Superposition: neurons are polysemantic (multiple unrelated concepts per neuron) — single neuron activates for "DNA" and "basketball"
- SAE architecture: sparsity penalty produces hidden layer with more dimensions than input (e.g., 16,384 features from 4,096 neurons)
- Golden Gate Claude (May 2024): amplifying "Golden Gate Bridge" feature makes Claude identify as the bridge
- Scaling Monosemanticity (2024): millions of interpretable features in Claude 3 Sonnet; features cluster into concept neighborhoods
- Activation steering: add direction vector to residual stream at layer L; enables concept suppression and injection
- Current limitation: interpretability can find features and circuits, but reliable deception detection at scale is still research

## Connections

- [[safety/alignment]] — how interpretability fits into the safety research agenda
- [[safety/constitutional-ai]] — the alignment training that produces the circuits being studied
- [[llms/transformer-architecture]] — the architectural substrate (residual stream, attention heads, FFN)
- [[papers/key-papers]] — links to Towards Monosemanticity and Scaling Monosemanticity
- [[papers/mechanistic-interpretability]] — four paper summaries: Zoom In (2020), Toy Models (2022), Towards Monosemanticity (2023), Scaling Monosemanticity (2024)

## Open Questions

- Can activation steering provide reliable runtime safety guarantees, or can a model route around steering?
- Do SAE features transfer across Claude model versions, or do they need to be retrained for each?
- Is the feature geometry discovered in SAEs (clusters, neighborhoods) a property of the architecture or the training data?
