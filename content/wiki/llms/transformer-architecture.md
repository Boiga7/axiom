---
type: concept
category: llms
tags: [transformer, attention, architecture, kv-cache, positional-encoding, llm]
sources: []
updated: 2026-04-29
para: resource
tldr: The transformer's core operations — scaled dot-product attention (O(n²)), KV cache, RoPE positional encoding, MoE routing, and Chinchilla scaling laws — and why each matters operationally.
---

# Transformer Architecture

> **TL;DR** The transformer's core operations — scaled dot-product attention (O(n²)), KV cache, RoPE positional encoding, MoE routing, and Chinchilla scaling laws — and why each matters operationally.

The dominant neural network architecture for language models since 2017. Understanding it makes you a better AI engineer. You'll know why prompt length matters, why certain tasks are hard, and what the practical limits are.

---

## The High-Level Picture

A transformer takes a sequence of tokens, processes them through stacked attention + feedforward layers, and produces a probability distribution over the next token. That's it. Everything else is engineering.

```
Input tokens → Token Embeddings + Positional Encoding
                        ↓
              [Transformer Block] × N
                  - Multi-Head Attention
                  - Add & LayerNorm
                  - Feed-Forward Network
                  - Add & LayerNorm
                        ↓
                   LM Head → Softmax → Next token probabilities
```

---

## Attention Mechanism

The core operation. For every token, attention asks: "which other tokens should I pay attention to, and how much?"

**Scaled dot-product attention:**

```
Attention(Q, K, V) = softmax(QK^T / √d_k) · V
```

- **Q (Query)** — "What am I looking for?"
- **K (Key)** — "What do I offer?"
- **V (Value)** — "What information do I actually contain?"

The dot product `QK^T` computes a similarity score between every query and every key. Dividing by `√d_k` prevents the softmax from saturating when dimensions are large. The softmax turns scores into weights that sum to 1. The final multiply by V produces a weighted sum of values.

**Why O(n²) matters:** Attention is quadratic in sequence length. A 128k context is 64x more expensive to attend over than a 16k context. This is why context window scaling is hard.

**Multi-head attention:** Run H attention heads in parallel with different learned Q/K/V projections. Each head can attend to different aspects of the input. Outputs are concatenated and projected.

**Attention variants for inference efficiency:** MHA caches H full KV pairs per layer. MQA (Multi-Query) shares a single KV pair across all heads. GQA (Grouped Query, used in Llama 3 and Mistral) shares one KV pair per group of heads, reducing cache by H/G. MLA ([[llms/multi-head-latent-attention]]) takes a different approach: it projects K and V jointly into a low-rank latent vector and caches only that, achieving ~32× compression while preserving near-MHA quality.

---

## KV Cache

In autoregressive generation (one token at a time), re-computing K and V for every previous token would be O(n²) per step. The KV cache stores K and V for all prior tokens so each new token only needs to compute its own K/V once.

**Practical implications:**
- KV cache grows linearly with sequence length
- At 32k context with a 70B model, KV cache is ~100GB — bigger than model weights
- Prompt caching (Anthropic) = persisting KV cache across calls; see [[apis/anthropic-api]]
- Paged attention (vLLM) = dynamic KV cache allocation; see [[infra/inference-serving]]

---

## Positional Encodings

Attention has no inherent notion of order. `[A, B, C]` and `[C, B, A]` look identical without positional information. Positional encodings inject order.

| Method | How | Length limit | Used by |
|---|---|---|---|
| **Sinusoidal** (original) | Fixed sin/cos patterns | Fixed | Original Transformer |
| **Learned absolute** | Trainable embedding per position | Fixed | GPT-2, BERT |
| **RoPE** (Rotary) | Rotate Q/K vectors by position angle | Extrapolates to longer | Llama, Claude, Gemini |
| **ALiBi** | Add linear position bias to attention scores | Extrapolates well | MPT, BLOOM |

RoPE is now standard. Its rotational property means relative position is encoded in the dot product, enabling good length generalisation.

---

## Feedforward Network

After attention, each token passes through a 2-layer MLP independently:

```
FFN(x) = max(0, xW₁ + b₁)W₂ + b₂   # ReLU
FFN(x) = SwiGLU(xW₁) · (xW₃)W₂     # SwiGLU (modern)
```

FFN width is typically 4x model dimension. It stores factual knowledge. This is where "The Eiffel Tower is in" → "Paris" happens. Attention handles routing; FFN handles lookup.

---

## Layer Norm and Residual Connections

**Residual connections:** `output = LayerNorm(x + sublayer(x))`. The `+x` skip connection is why transformers can be deep — gradients flow directly back through the residual stream.

**Why residuals matter for engineers:** The "residual stream" interpretation of transformers (from mechanistic interpretability) suggests information accumulates in a shared residual space. Each attention head and MLP "writes" to this space. See [[safety/mechanistic-interpretability]].

**Pre-norm vs Post-norm:** Modern models use Pre-LayerNorm (norm before sublayer), not original Post-LayerNorm, for training stability.

---

## Mixture of Experts (MoE)

Instead of all tokens passing through the same FFN, MoE routes each token to one of N "expert" FFNs via a router. Only 2 experts active per token typically.

**Why it matters:** GPT-4, Gemini 1.5, and Mixtral 8x7B are MoE. At inference, MoE activates a fraction of parameters per token — lower effective compute than the total parameter count suggests. Mixtral 8x7B: 46.7B total / 12.9B active. A 141B parameter MoE model might only activate 22B parameters per forward pass. See [[papers/mistral]] for Mixtral's specific routing design and load-balancing approach.

---

## Scaling Laws

From Chinchilla (Hoffmann et al. 2022): optimal training requires equal scaling of model parameters and training tokens. Rule of thumb: **20 training tokens per parameter**.

A 7B model needs ~140B training tokens to be "compute-optimal." Most open models are trained to far more tokens for better inference efficiency (Llama 3 8B: 15T tokens).

---

## Alternative Architectures

| Architecture | Key idea | Models |
|---|---|---|
| **SSM (Mamba)** | State space model; linear-time inference | Mamba, Jamba |
| **RWKV** | RNN-transformer hybrid; fixed memory | RWKV-6 |
| **Linear attention** | Approximate attention in O(n) | RetNet, GLA |

None have displaced transformers for frontier models yet, but Mamba-based hybrids (Jamba: Mamba + Transformer) are competitive at 52B+ parameters.

---

## Key Facts

- Attention complexity: O(n²) in sequence length — 128K context is 64x more expensive than 16K
- KV cache size: at 32K context with a 70B model, ~100GB — larger than model weights
- RoPE: now standard positional encoding in Llama, Claude, Gemini; enables length extrapolation
- MoE activation: typically 2 of N experts active per token; GPT-4, Gemini 1.5, Mixtral are MoE
- Chinchilla scaling law: 20 training tokens per parameter for compute-optimal training
- Llama 3 8B: trained on 15T tokens — far above compute-optimal for better inference efficiency
- Pre-LayerNorm: standard in modern models for training stability (vs original Post-LayerNorm)
- FFN width: typically 4x model dimension; stores factual knowledge, not just routing

## Common Failure Cases

**KV cache memory exhaustion causes OOM errors at long context because allocation was not planned for**
Why: KV cache grows linearly with sequence length and number of layers; at 32K context with a 70B model the KV cache alone can exceed 100 GB, surpassing the model weight footprint; systems that allocate GPU memory for weights but not KV cache will crash under load.
Detect: GPU OOM errors occur not at model load time but when sequence length grows during inference; memory profiling shows KV cache as the dominant consumer.
Fix: use paged attention (vLLM) to allocate KV cache in blocks; set `max_model_len` to match available KV cache budget rather than the model's architectural maximum; or use sliding-window attention if long-range retrieval is not required.

**MoE routing collapse: all tokens route to the same 1-2 experts, degrading quality and wasting parameter capacity**
Why: without load-balancing losses during training, the router can converge on sending nearly all tokens to the highest-capacity experts, making the model behave like a dense model with most parameters inactive.
Detect: expert utilisation logs during inference show one or two experts at near-100% while others receive near-0%; output quality is below expectations for the model's total parameter count.
Fix: this is a training-time issue; at inference you cannot fix it — evaluate the model's expert utilisation statistics before deployment; for your own training, add an auxiliary load-balancing loss term to the routing objective.

**Attention scores saturate (all weight on one token) due to missing `√d_k` scaling in a custom implementation**
Why: when re-implementing attention from scratch, omitting the `/ √d_k` denominator causes dot products to have variance proportional to `d_k`; at typical hidden dims (512-2048), softmax input values become very large, driving outputs toward one-hot distributions and gradient vanishing.
Detect: attention weight distributions are near-one-hot even at early training steps; loss fails to decrease; attention entropy is near zero.
Fix: ensure the scaling factor `1 / √d_k` is applied before softmax in every attention head; verify with a unit test that attention entropy is reasonable on random inputs.

**Positional encoding length limit exceeded when inference context is longer than the training context, causing repetition or incoherence**
Why: learned absolute positional encodings (used in GPT-2, BERT) have a fixed maximum sequence length equal to the training maximum; exceeding it means the model receives out-of-distribution position IDs and produces garbage; RoPE and ALiBi extrapolate but still degrade beyond roughly 2-4x their training length.
Detect: output becomes repetitive, incoherent, or loops after the model's maximum trained sequence length; the degradation is sudden, not gradual.
Fix: use a model with RoPE positional encoding and a large enough training context for your use case; if extrapolating beyond the training length, apply YaRN or rope_scaling to extend the effective range rather than using raw extrapolation.

## Connections

- [[llms/claude]] — Claude family architecture specifics
- [[math/transformer-math]] — the full mathematical treatment
- [[infra/inference-serving]] — KV cache management in production (paged attention)
- [[fine-tuning/lora-qlora]] — why LoRA works (low-rank update of weight matrices)
- [[safety/mechanistic-interpretability]] — understanding what transformers actually learn
- [[papers/attention-is-all-you-need]] — the original transformer paper (2017)

## Open Questions

- Will SSM/Mamba hybrids (Jamba) eventually displace transformers for frontier models given linear-time inference?
- How does "lost in the middle" degradation relate to attention score distribution at long contexts?
- Does the Chinchilla scaling law hold as training data quality improves (synthetic data, deduplication)?
