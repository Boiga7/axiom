---
type: concept
category: math
tags: [linear-algebra, attention, softmax, optimisation, loss, transformer]
sources: []
updated: 2026-04-29
para: resource
tldr: Full attention formula (O(n²d) time, O(n²) memory), LoRA's 256x parameter reduction via low-rank updates, KV cache memory calculation, and quantisation quality tradeoffs by format.
---

# Transformer Mathematics

> **TL;DR** Full attention formula (O(n²d) time, O(n²) memory), LoRA's 256x parameter reduction via low-rank updates, KV cache memory calculation, and quantisation quality tradeoffs by format.

The essential maths behind how transformers work. Knowing this makes practical engineering decisions legible: why quantisation degrades quality, why LoRA works, why long contexts are expensive.

---

## Attention in Full

For a sequence of n tokens, each represented as a d-dimensional vector, packed into matrix X (shape n × d):

```
Q = X W_Q        (n × d_k)
K = X W_K        (n × d_k)
V = X W_V        (n × d_v)

Attention(Q, K, V) = softmax( Q K^T / √d_k ) · V
```

- `Q K^T` produces an n × n matrix of raw similarity scores
- Dividing by `√d_k` prevents the dot products from growing too large (softmax saturation)
- Softmax normalises each row to sum to 1 (attention weights)
- Final multiply by V produces a weighted sum of value vectors

**Complexity:** O(n²d) in time, O(n²) in memory for the n×n attention matrix. This is why long contexts are expensive.

### Multi-Head Attention

Run H heads in parallel, each with its own W_Q, W_K, W_V of dimension d/H:

```
MultiHead(Q,K,V) = Concat(head_1, ..., head_H) W_O
head_i = Attention(Q W_Qi, K W_Ki, V W_Vi)
```

W_O projects the concatenated heads back to d dimensions. Total parameter cost is 4d² (Q, K, V, O projections) regardless of H.

---

## Softmax and Temperature

```
softmax(z_i) = exp(z_i) / Σ exp(z_j)
```

Softmax converts a vector of real numbers into a probability distribution. Key properties:
- Sum to 1 by construction
- Differentiable everywhere
- Sensitive to scale: multiply z by T (temperature) before softmax

**Temperature in generation:**
- T < 1: sharpens the distribution (more confident, less diverse)
- T > 1: flattens the distribution (more creative, less coherent)
- T → 0: argmax (always pick the top token)
- T = 1: standard sampling

---

## Cross-Entropy Loss

Training objective for language models:

```
L = -Σ y_i log(p_i)
```

where y_i = 1 for the correct next token, 0 otherwise; p_i is the model's predicted probability.

This reduces to `-log(p_correct)`: push up the probability of the correct token. The model's objective is to minimise average loss over all training examples.

**Perplexity = exp(average loss).** A perplexity of 5 means the model is as uncertain as if it were choosing uniformly among 5 options at each step. Lower is better.

---

## Why LoRA Works (Low-Rank Update Hypothesis)

During fine-tuning, weight update matrices have low intrinsic rank. Instead of updating W ∈ ℝ^(d×k) directly, LoRA parameterises the update as:

```
ΔW = B · A        where B ∈ ℝ^(d×r), A ∈ ℝ^(r×k), r << d
```

Only A and B are trained. The original W is frozen. At inference, W + BA is equivalent to the full fine-tuned weight.

With rank r=8 and d=4096, k=4096: the update has 8×4096×2 = 65,536 parameters instead of 4096² = 16,777,216. **256x fewer parameters to train.** See [[fine-tuning/lora-qlora]].

---

## Quantisation

Reducing numerical precision to save memory and accelerate inference.

| Format | Bits | Range | Use |
|---|---|---|---|
| fp32 | 32 | ±3.4×10^38 | Training (gradients) |
| fp16 | 16 | ±65,504 | Mixed-precision training |
| bf16 | 16 | ±3.4×10^38 (same range as fp32) | Modern training, inference |
| int8 | 8 | -128 to 127 | Inference (LLM.int8) |
| fp8 | 8 | various | Frontier training (H100) |
| int4 | 4 | -8 to 7 | GGUF quantised inference |

**bf16 vs fp16:** Both use 16 bits but allocate them differently. bf16 keeps the 8-bit exponent of fp32, matching its dynamic range. fp16 has a 5-bit exponent — fine for inference, unstable for training when gradients are very small (underflow).

**Quality degradation:** int4 perplexity is ~5–10% higher than fp16 for 7B models. At 70B+, int4 quality is near-indistinguishable — larger models are more quantisation-robust.

---

## Gradient Descent and Adam

**SGD update:**
```
θ ← θ - η · ∇L(θ)
```

**Adam (Kingma & Ba, 2014):**
```
m_t = β₁ m_{t-1} + (1 - β₁) g_t           # first moment (momentum)
v_t = β₂ v_{t-1} + (1 - β₂) g_t²          # second moment (RMS)
θ_t = θ_{t-1} - η · m̂_t / (√v̂_t + ε)
```

Adam adapts learning rate per parameter. Parameters that rarely update get larger effective learning rates; frequently-updated parameters get smaller. Defaults: β₁=0.9, β₂=0.999, ε=1e-8.

**AdamW:** Adam + weight decay decoupled from the gradient update. Standard for LLM training and fine-tuning.

---

## KV Cache Memory Calculation

For a single forward pass, KV cache memory per token:

```
bytes = 2 (K + V) × num_layers × num_heads × head_dim × bytes_per_element
```

For Llama 3 70B (80 layers, 8 KV heads, 128 head_dim, bf16):
```
= 2 × 80 × 8 × 128 × 2 bytes = 327,680 bytes ≈ 320KB per token
```

At 128k context: 128,000 × 320KB = 40GB just for the KV cache. This is why serving long-context models is expensive.

---

## Key Facts

- Attention complexity: O(n²d) time, O(n²) memory — 128K context is 64x more expensive than 16K
- LoRA rank r=8 at d=k=4096: 65,536 trainable params vs 16,777,216 full — 256x reduction
- KV cache for Llama 3 70B at 128K context: ~40GB (320KB per token × 128K)
- bf16 keeps fp32's dynamic range (8-bit exponent) — safe for training; fp16 underflows on small gradients
- int4 quality penalty: ~5-10% perplexity increase for 7B models; near-indistinguishable at 70B+
- Perplexity = exp(average cross-entropy loss); lower is better; 5 = equivalent uncertainty to choosing among 5 options
- Temperature T→0 → argmax; T=1 → standard sampling; T>1 → flatter distribution, more creativity

## Connections

- [[llms/transformer-architecture]] — how these maths fit into the full architecture
- [[fine-tuning/lora-qlora]] — LoRA in practice
- [[math/linear-algebra]] — the underlying linear algebra
- [[math/optimisation]] — learning rate schedules and gradient flow
- [[infra/inference-serving]] — KV cache management and paged attention

## Open Questions

- At what context length does FlashAttention's IO-aware tiling make the effective constant factor negligible vs naive O(n²)?
- Does the low intrinsic rank hypothesis for LoRA hold as strongly for GRPO-trained models as for SFT?
- How does bf16 vs fp8 training stability compare on frontier architectures like H100-trained Claude Opus?
