---
type: paper
category: papers
para: resource
tags: [scaling-laws, kaplan, chinchilla, compute, parameters, data, 2020, 2022]
sources: []
updated: 2026-05-01
tldr: Two papers that define how LLM performance scales with compute, parameters, and data. Chinchilla corrected a key mistake in Kaplan and changed how all subsequent models are trained.
---

# Scaling Laws for Neural Language Models (Kaplan et al., 2020) + Chinchilla (Hoffmann et al., 2022)

Two papers that define how LLM performance scales with compute, parameters, and data. Chinchilla corrected a key mistake in Kaplan and changed how all subsequent models are trained.

---

## Kaplan et al. (2020) — The Original Scaling Laws

**Citation:** Kaplan, J., McCandlish, S., Henighan, T., Brown, T. B., Chess, B., Child, R., ... & Amodei, D. (2020). Scaling Laws for Neural Language Models. arXiv:2001.08361.

**One sentence:** Language model performance improves as a smooth power law with model size, dataset size, and compute — and model size matters more than dataset size when compute is fixed.

### Key Findings

**Power law relationship:**
```
L(N) ∝ N^(-0.076)    — loss as function of parameters
L(D) ∝ D^(-0.095)    — loss as function of dataset tokens
L(C) ∝ C^(-0.050)    — loss as function of compute (FLOPs)
```

Loss decreases smoothly and predictably. No plateau — more compute always helps, though with diminishing returns.

**Compute allocation (Kaplan's conclusion):**
Given a fixed compute budget C, allocate most of it to model size. Kaplan found that the optimal token count grows much more slowly than model size:

```
N_optimal ∝ C^0.73   — scale parameters with compute
D_optimal ∝ C^0.27   — token count grows much more slowly
```

This led OpenAI to train GPT-3 on 300B tokens — far fewer than what would later be considered optimal.

### Why Kaplan Was Wrong (Or Incomplete)

Kaplan's experiments used models trained for a single epoch. In practice, training for longer (more token passes) is efficient. The "train on as much data as compute allows" conclusion was underspecified.

---

## Chinchilla (Hoffmann et al., 2022) — The Correction

**Citation:** Hoffmann, J., Borgeaud, S., Mensch, A., Buchatskaya, E., Cai, T., Rutherford, E., ... & Sifre, L. (2022). Training Compute-Optimal Large Language Models. arXiv:2203.15556. NeurIPS 2022.

**One sentence:** For a given compute budget, the optimal model is much smaller and trained on much more data than Kaplan predicted — roughly 20 training tokens per parameter.

### The Chinchilla Rule

Chinchilla trained 400+ models of varying sizes and token counts to derive:

```
N_optimal ≈ C^0.5    — scale parameters with √compute
D_optimal ≈ C^0.5    — scale tokens with √compute
```

Both should scale equally. The practical implication:

**20 tokens per parameter** — for a compute-optimal model.

| Model | Parameters | Optimal tokens (Chinchilla) | Actual tokens trained |
|---|---|---|---|
| GPT-3 | 175B | 3.5T | 300B (undertrained) |
| Gopher | 280B | 5.6T | 300B (undertrained) |
| Chinchilla | 70B | 1.4T | 1.4T (optimal) |

Chinchilla (70B, 1.4T tokens) outperformed Gopher (280B, 300B tokens) — a 4× smaller model trained on more data beat the larger model.

### Practical Impact of the 20-Token Rule

Every post-2022 model applies Chinchilla scaling:
- Llama 2 (7B): trained on 2T tokens (285 tokens/param — heavily overtrained for inference efficiency)
- Mistral 7B: ~1T tokens overtrained intentionally — smaller, cheaper inference at same quality
- Phi-2 (2.7B): 1.4T tokens of synthetic data — extreme overtraining for quality at small size

**Overtraining is now intentional:** for deployed models, training longer on more data reduces inference cost (smaller model, same quality). Chinchilla is compute-optimal at training time, not inference time.

---

## Key Concepts

### Loss Predicts Downstream Performance

Both papers show that cross-entropy loss on next-token prediction correlates with downstream task performance — validated the use of perplexity as a proxy metric during training.

### Emergent Capabilities Are Not Predicted by Scaling Laws

Scaling laws predict smooth loss improvements. The emergence of capabilities (CoT reasoning, in-context learning) appears at discrete thresholds — this is not captured by the power law. The relationship between loss and capability is non-linear at specific scales.

---

## Key Facts

- Kaplan (2020): model size matters more than data when compute is fixed — WRONG for inference-optimal training
- Chinchilla (2022): 20 tokens per parameter for compute-optimal training — the current standard
- Chinchilla 70B outperformed Gopher 280B on most benchmarks despite 4× fewer parameters
- Post-2022 practice: intentional "overtraining" (more tokens than Chinchilla-optimal) to reduce inference cost
- Llama 2 7B: 2T tokens = 285 tokens/param — heavily overtrained vs Chinchilla's 140 tokens/param target

---

## Connections

[[papers/key-papers]] · [[papers/gpt-3]] · [[llms/transformer-architecture]] · [[fine-tuning/frameworks]] · [[math/optimisation]]
