---
type: paper
category: papers
tags: [transformer, attention, paper, vaswani, 2017, foundational]
sources: []
updated: 2026-04-29
para: resource
tldr: The 2017 paper that replaced RNNs with parallel self-attention — enabling BERT, GPT, and every LLM since; key changes from 2017 to 2026 (RoPE, Pre-LN, SwiGLU, GQA).
---

# Attention Is All You Need (Vaswani et al., 2017)

> **TL;DR** The 2017 paper that replaced RNNs with parallel self-attention — enabling BERT, GPT, and every LLM since; key changes from 2017 to 2026 (RoPE, Pre-LN, SwiGLU, GQA).

The paper that introduced the Transformer architecture. Published June 2017. Every large language model in existence descends from this work.

**Citation:** Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. Advances in neural information processing systems, 30.

---

## What It Proposed

Before this paper, sequence-to-sequence models (machine translation, text generation) used RNNs (LSTMs, GRUs). RNNs process sequences token by token — fundamentally sequential, cannot parallelise.

The Transformer dispenses with recurrence entirely. It processes entire sequences in parallel using attention mechanisms. This unlocked massive parallelisation on GPUs.

---

## Key Contributions

### 1. Self-Attention

For every token in a sequence, compute attention scores against every other token. The token attends to relevant context regardless of distance.

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

Compared to RNNs:
- RNN: information about token at position 1 must travel through all subsequent hidden states to reach position 512. Distance = signal degradation.
- Transformer: position 1 can directly attend to position 512. No distance penalty.

### 2. Multi-Head Attention

Run H attention operations in parallel, each learning different relationships (syntactic, semantic, co-reference). Concatenate outputs.

"The cat sat on the mat" — one head attends to subject-verb relationships, another to noun-pronoun co-reference, another to positional proximity.

### 3. Positional Encoding

Since attention has no sequential ordering, inject position information via sinusoidal encoding:

```
PE(pos, 2i) = sin(pos / 10000^(2i/d_model))
PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
```

Added to token embeddings. Modern models use RoPE instead (learned, extrapolates better). The paper's sinusoidal encoding is now a historical artefact.

### 4. Encoder-Decoder Architecture

The original Transformer was designed for translation (encoder encodes source, decoder generates target). For language modelling (GPT family), only the decoder is used. For understanding tasks (BERT), only the encoder.

Modern LLMs are **decoder-only Transformers** with causal (masked) attention — each token only attends to prior tokens.

### 5. Feed-Forward Sublayers

After attention, each token passes through a position-wise FFN independently. This is where factual knowledge is stored (see [[llms/transformer-architecture]]).

---

## Impact

- Replaced RNNs and CNNs as the default architecture for NLP tasks
- Enabled BERT (2018), GPT (2018), GPT-2 (2019), GPT-3 (2020), and every subsequent LLM
- Extended to vision (ViT, 2020), audio, protein structure prediction (AlphaFold 2)
- ~120,000 citations as of 2026 — among the most cited papers in computer science history

---

## What's Changed Since 2017

The core architecture survives intact. The engineering details have evolved:

| Component | 2017 paper | Modern LLMs |
|---|---|---|
| Positional encoding | Sinusoidal (fixed) | RoPE (learned, extrapolates) |
| Normalisation | Post-LayerNorm | Pre-LayerNorm (stable training) |
| Activation | ReLU | SwiGLU |
| FFN width | 4× model dim | 4× (unchanged) |
| Attention | Multi-head | Multi-head + GQA (efficiency) |
| Architecture | Encoder-decoder | Decoder-only (generative models) |

---

## Key Facts

- Published: June 2017, NeurIPS 2017
- Authors: 8 Google Brain / Research authors; Noam Shazeer was co-author
- Citations: ~120,000 as of 2026 — among the most cited papers in computer science
- Core formula: Attention(Q,K,V) = softmax(QK^T / √d_k) · V
- Modern LLMs are decoder-only transformers with causal attention — only the decoder half of the original design
- What changed: sinusoidal PE → RoPE; Post-LN → Pre-LN; ReLU → SwiGLU; MHA → MHA+GQA
- Extended to: ViT (vision, 2020), AlphaFold 2 (protein, 2021), audio models

## Connections

- [[llms/transformer-architecture]] — modern transformer in full detail
- [[math/transformer-math]] — the complete mathematical treatment
- [[papers/key-papers]] — what to read next
- [[llms/claude]] — modern model that descends from this architecture

## Open Questions

- Will the decoder-only architecture remain dominant through the next generation of frontier models, or will encoder-decoder hybrids return for specific tasks?
- The original sinusoidal encoding is now replaced by RoPE — are there properties of sinusoidal encoding that are actually lost?
- How does the transition from ReLU to SwiGLU activation affect the interpretability of FFN layers?
