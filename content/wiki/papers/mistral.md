---
type: paper
category: papers
tags: [mistral, mixtral, moe, sliding-window-attention, gqa, dense, sparse]
sources: []
updated: 2026-05-03
para: resource
tldr: Mistral 7B (Oct 2023) introduced SWA and GQA to beat Llama 2 13B at 7B parameters; Mixtral 8x7B (Dec 2023) applied sparse MoE — 8 experts, 2 active per token — to match GPT-3.5 Turbo with 12.9B active from 46.7B total parameters.
---

# Mistral 7B and Mixtral 8x7B

> **TL;DR** Mistral 7B (Oct 2023) introduced SWA and GQA to beat Llama 2 13B at 7B parameters; Mixtral 8x7B (Dec 2023) applied sparse MoE — 8 experts, 2 active per token — to match GPT-3.5 Turbo with 12.9B active from 46.7B total parameters.

> [Source: WebSearch / arXiv 2310.06825 and 2401.04088, 2026-05-03]

Two papers from Mistral AI in late 2023 re-drew what was thought possible at a given parameter count. Mistral 7B showed that architecture choices (SWA, GQA) matter as much as scale. Mixtral 8x7B showed that sparse MoE routing can deliver frontier-class quality at a fraction of the inference compute.

---

## Mistral 7B (October 2023)

**Paper:** "Mistral 7B" — Jiang et al., arXiv:2310.06825, October 10 2023  
**Authors:** Albert Q. Jiang, Alexandre Sablayrolles, Arthur Mensch, et al.  
**Lab:** Mistral AI (Paris)

A 7-billion-parameter dense decoder-only model. The headline result: Mistral 7B outperforms Llama 2 13B across all evaluated benchmarks, and outperforms Llama 1 34B on reasoning, mathematics, and code generation. The model achieves this through two architectural innovations that reduce inference cost relative to context quality: Sliding Window Attention and Grouped Query Attention.

### Sliding Window Attention

Standard full attention attends every token to every prior token — O(n²) complexity. As sequence length grows, memory and compute scale quadratically. Mistral 7B replaces this with **Sliding Window Attention (SWA)**.

In SWA, each token attends only to the W most recent tokens (W = 4,096 for Mistral 7B) rather than all prior tokens. The key insight is that stacked transformer layers multiply the effective receptive field: at layer k with window size W, a token can effectively access information from up to W × k tokens back through the residual connections of intermediate layers. With 32 layers and W = 4,096, the effective context reach at the final layer is over 130,000 tokens — far beyond what vanilla SWA suggests.

**Practical implications:**
- Attention compute is O(n × W) rather than O(n²) — linear in sequence length for a fixed window
- A rolling buffer KV cache holds only the last W key-value pairs per layer, capping memory regardless of sequence length
- At generation time, the KV cache does not grow unboundedly — a fixed W × layers memory budget covers any length

The paper reports a 2x speed improvement over vanilla attention at the last layer using FlashAttention-2 and xFormers optimised kernels.

### Grouped Query Attention

Multi-Head Attention (MHA) creates one KV pair per head. At large batch sizes and long sequences, the KV cache becomes the memory bottleneck, not the model weights. **Grouped Query Attention (GQA)** addresses this by sharing a single set of Key and Value projections across a group of Query heads.

Mistral 7B uses 8 KV heads for 32 query heads — a 4:1 grouping. This reduces the KV cache memory by 4x compared to full MHA while preserving most of the representation quality. GQA was introduced in the "GQA: Training Generalized Multi-Query Transformer Models" paper (Ainslie et al. 2023) [unverified for original attribution]; Mistral 7B was an early high-profile deployment.

**Memory impact:** At 32K context, a 7B model with MHA requires ~8GB of KV cache. GQA with 4:1 grouping reduces this to ~2GB — a meaningful saving at inference batch sizes of 32+.

---

## Mixtral 8x7B (December 2023)

**Paper:** "Mixtral of Experts" — Jiang et al., arXiv:2401.04088, January 2024 (model released December 2023)  
**Lab:** Mistral AI

Mixtral 8x7B extends the Mistral 7B architecture with a Sparse Mixture-of-Experts (SMoE) feedforward layer. The base transformer structure is identical to Mistral 7B — same RoPE, same SWA, same GQA — but the single FFN block at each layer is replaced by 8 expert FFNs with a learned router that selects 2 per token.

### MoE Architecture

At each transformer layer, every token passes through the following routing mechanism:

1. A small **router network** (a single linear projection) scores the token's hidden state against 8 expert keys.
2. The top-2 experts by score are selected for that token.
3. The token is processed by both selected experts in parallel.
4. Outputs are summed, weighted by the router's softmax scores for those two experts.

The 8 experts in Mixtral are each a full FFN equivalent in size to a 7B model's FFN. Total unique parameters across all 8 experts per layer account for most of the 46.7B parameter total. However, on any given forward pass, only 2 experts activate — giving 12.9B active parameters regardless of batch size.

**Parameter math:**
- 8 experts × 7B-class FFN each ≈ majority of 46.7B total
- 2 of 8 active per token → ~12.9B active parameters at inference [unverified for exact split between expert and non-expert parameters]
- Memory at load time: full 46.7B must be available (typically across GPU shards)
- Inference compute: equivalent to running a ~13B dense model

**Context window:** Mixtral 8x7B was trained with a 32K context window — 8x larger than Llama 2's 4K default.

**Load balancing:** To prevent routing collapse (all tokens routing to the same 2 experts), the router is trained with an auxiliary load-balancing loss. This encourages near-uniform expert utilisation across tokens. See [[llms/transformer-architecture]] for the failure mode when this is absent.

---

## Benchmark Comparisons

### Mistral 7B vs Llama 2 7B and 13B

| Benchmark | Mistral 7B | Llama 2 7B | Llama 2 13B | Notes |
|---|---|---|---|---|
| MMLU | 63.47% | 46.87% | 55.77% | 5-shot |
| HellaSwag | 84.88% | 80.58% | 83.89% | 10-shot |
| WinoGrande | 79.43% | 72.53% | 76.64% | 5-shot |
| ARC-Challenge | 58.11% | 47.87% | 55.38% | 25-shot |
| MATH | 56.6% | — | — | [unverified for exact Llama 2 scores] |

Mistral 7B also outperforms Code Llama 7B on coding benchmarks while retaining general capability.

> [Source: WebSearch / Mistral AI paper arXiv:2310.06825, 2026-05-03]

### Mixtral 8x7B vs Llama 2 70B and GPT-3.5

| Benchmark | Mixtral 8x7B | Llama 2 70B | GPT-3.5 |
|---|---|---|---|
| MMLU | 70.6% | 68.9% | 70.0% |
| HellaSwag | 86.25% | 87.19% | 85.5% |
| Active params | 12.9B | 70B | unknown |
| Context window | 32K | 4K | 16K |

Mixtral 8x7B Instruct surpasses GPT-3.5 Turbo, Claude-2.1, and Gemini Pro on human evaluation benchmarks (LMSYS Chatbot Arena, MT-bench). [unverified for final positions on those leaderboards as of Dec 2023]

> [Source: WebSearch / arXiv:2401.04088 / Mistral AI blog, 2026-05-03]

Mixtral largely outperforms Llama 2 70B on mathematics, code generation, and multilingual benchmarks while using 5x fewer active parameters.

---

## Licensing

| Model | License | Commercial use |
|---|---|---|
| Mistral 7B v0.1 | Apache 2.0 | Yes, full commercial |
| Mixtral 8x7B | Apache 2.0 | Yes, full commercial |
| Mistral Small / Large | Proprietary | Mistral AI API terms |
| Codestral | Custom research license | Limited |

The Apache 2.0 licensing of the base models was a deliberate positioning decision: make the open-weight models maximally deployable to build developer mindshare, reserve the commercial licence for larger closed models (Mistral Large, Le Chat).

---

## Impact

**Mistral 7B** redefined the 7B tier. Prior to it, the assumption was that 13B was the minimum for competitive general capability. Mistral 7B's combination of SWA and GQA achieved 13B-class performance at 7B scale and lower inference cost. It set the template for the "efficient dense 7B" that every subsequent lab released.

**Mixtral 8x7B** revived MoE as a practical architecture for open-source deployment. Earlier MoE models (Switch Transformer, GLaM) were research artefacts. Mixtral demonstrated that MoE could be packaged as a standard model weight, deployed on commodity hardware (four A100 40GB cards or equivalent), and deliver quality exceeding Llama 2 70B at a fraction of the per-token compute. It also made a credible claim of matching GPT-3.5 Turbo — raising the ceiling for what open-source inference could achieve.

Together, the two papers established Mistral AI as the most technically credible European AI lab and arguably the most efficient per-parameter model family from any lab as of 2023.

The architectural patterns they popularised — SWA, GQA, sparse MoE routing — are now standard in most subsequent open-weight model releases.

---

## Key Facts

- Mistral 7B: 7B dense, SWA (W=4,096), 8 KV heads / 32 query heads (GQA 4:1), beats Llama 2 13B on all benchmarks
- Mixtral 8x7B: 46.7B total parameters, 12.9B active per token, 8 experts / 2 active per layer, 32K context
- SWA: O(n × W) attention vs O(n²) full attention; rolling buffer KV cache caps memory at fixed W × layers
- GQA 4:1: 4x KV cache memory reduction vs MHA; near-identical quality
- Mixtral MMLU: 70.6% — matches GPT-3.5 (70.0%) and beats Llama 2 70B (68.9%)
- Apache 2.0 license for both base models; fully commercial-deployable
- Mixtral Instruct beats GPT-3.5 Turbo, Claude-2.1, Gemini Pro on human eval benchmarks [unverified for final Dec 2023 leaderboard positions]
- Both models trained with RoPE positional encoding, same as Llama; SwiGLU activation

---

## Connections

- [[landscape/ai-labs]] — Mistral AI company profile
- [[llms/model-families]] — Mistral/Mixtral in the broader model landscape
- [[llms/transformer-architecture]] — MoE routing, KV cache, attention complexity; SWA as alternative to full attention
- [[fine-tuning/frameworks]] — Mistral 7B and Mixtral 8x7B are heavily used as fine-tuning base models via Axolotl and TRL
- [[infra/inference-serving]] — vLLM supports Mixtral MoE; loading 46.7B across GPU shards
- [[landscape/open-source-models]] — Mistral/Mixtral in the open-weight tier

---

## Open Questions

- Does SWA's effective context (W × layers) truly match full attention quality at long-range retrieval tasks, or does the ring structure degrade on tasks requiring cross-document reasoning?
- Why did Mistral AI move to proprietary licensing for larger models (Large, Small) after establishing Apache 2.0 for base models — competitive pressure or commercial necessity?
- How does Mixtral 8x22B (April 2024, 39B active from 141B total) compare on the performance/compute curve, and does it displace 8x7B for production use?
- Does load-balancing loss fully prevent routing collapse, or do specific token types still over-route to dominant experts?
