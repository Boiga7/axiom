---
type: concept
category: llms
tags: [attention, mla, deepseek, kv-cache, inference, transformer]
sources: []
updated: 2026-05-03
para: resource
tldr: MLA compresses K and V into a single low-rank latent vector that is cached instead of full K/V tensors, cutting KV cache size by 93% vs standard MHA while preserving model quality — enabling 128K-context inference at scale.
---

# Multi-head Latent Attention (MLA)

> **TL;DR** MLA compresses K and V into a single low-rank latent vector that is cached instead of full K/V tensors, cutting KV cache size by 93% vs standard MHA while preserving model quality — enabling 128K-context inference at scale.

> [Source: WebSearch / arXiv:2405.04434 DeepSeek-V2, 2026-05-03]

---

## The KV Cache Problem

Standard autoregressive inference caches the Key and Value tensors for every prior token so each new decode step does not recompute them. This is the KV cache. The problem: KV cache size scales as:

```
KV cache bytes = 2 × num_layers × num_heads × head_dim × seq_len × dtype_bytes
```

At 128K context with a large model (e.g., 60+ transformer layers, 128 heads, head_dim=128, bf16), the KV cache alone can exceed the model weight footprint. For long-context serving, this becomes the primary memory bottleneck — not the weights.

**Existing mitigations before MLA:**

- **GQA (Grouped Query Attention)** — groups heads into G groups; caches one KV pair per group instead of per head. Reduces cache by factor H/G. Used in Llama 3, Mistral.
- **MQA (Multi-Query Attention)** — a single KV pair shared across all heads. Maximum compression, but model quality degrades at scale.

Both GQA and MQA trade model quality for memory. MLA takes a different approach.

---

## Attention Variants Comparison

| Variant | What is cached | KV cache relative size | Quality trade-off |
|---|---|---|---|
| **MHA** (Multi-Head Attention) | H full KV pairs (one per head) | 1× (baseline) | Full quality |
| **MQA** (Multi-Query) | 1 KV pair shared by all heads | 1/H | Degrades at large H |
| **GQA** (Grouped Query) | 1 KV pair per group of G heads | G/H | Modest degradation |
| **MLA** (Multi-head Latent) | 1 low-rank latent vector `c_KV` | ~1/32 (DeepSeek-V3) | Near-MHA quality |

MLA achieves similar or better memory reduction than MQA — without the quality penalty — because the low-rank latent is a joint representation of K and V that is richer than a single shared head.

---

## How MLA Works

MLA replaces the standard KV projection matrices with a two-stage compression scheme:

```
Standard MHA:
  K = X · W_K     (shape: seq_len × (H × d_h))
  V = X · W_V     (shape: seq_len × (H × d_h))
  Cache: K, V     → large

MLA:
  c_KV = X · W_DKV              # Down-projection: seq_len × d_c  (d_c << H × d_h)
  Cache: c_KV                   → small (the latent vector)

  At decode time:
  K = c_KV · W_UK               # Up-projection back to full K
  V = c_KV · W_UV               # Up-projection back to full V
```

The projection matrices `W_DKV` (down), `W_UK` and `W_UV` (up) are all learned during training. `d_c` is the latent dimension — far smaller than `H × d_h`.

For DeepSeek-V3: `H=128`, `d_h=128`, `d_c=512`. The compression ratio is `(128 × 128) / 512 = 32×`. Only `c_KV` is cached; K and V are reconstructed on-the-fly at each decode step.

**Decoupled RoPE:** Standard RoPE is applied to Q and K before the attention dot product. When K is reconstructed from the latent, naively re-applying RoPE after up-projection would require caching the full uncompressed K anyway (since RoPE is position-dependent). MLA decouples RoPE: a separate small RoPE-encoded key `k_R` is computed and cached alongside `c_KV`, keeping the cache small while preserving positional information. [unverified — exact decoupled RoPE implementation details; see arXiv:2405.04434 §2 for full treatment]

---

## The Absorption Trick

Reconstructing K and V from the latent at every decode step appears to add compute — you'd need to run two up-projection matrix multiplies per layer per step. The absorption trick eliminates this overhead.

The observation: the up-projection matrices `W_UK` and `W_UV` can be algebraically absorbed into the Query and output projection matrices respectively. After absorption:

- The Q projection is replaced with a modified matrix that already accounts for `W_UK`
- The output projection absorbs `W_UV`
- At decode time, the attention score computation and value aggregation happen directly in the compressed latent space `c_KV` — no decompression step needed

The result is that MLA's decode-time compute is similar to standard MHA, while the cached representation stays at size `d_c` rather than `H × d_h`. The up-projection matrices become part of the weight tensors loaded once at model startup, not a per-step cost.

> [Source: WebSearch / liorsinai.github.io/machine-learning/2025/02/22/mla.html, 2026-05-03]

---

## Memory Savings

Measured from the DeepSeek-V2 paper (comparison against DeepSeek 67B with standard MHA):

| Metric | DeepSeek 67B (MHA) | DeepSeek-V2 (MLA) | Change |
|---|---|---|---|
| KV cache size | baseline | 6.7% of baseline | **93.3% reduction** |
| Max generation throughput | 1× | 5.76× | 5.76× higher |
| Training cost (for comparable quality) | 1× | 57.5% of baseline | 42.5% savings |

For DeepSeek-V3 with `d_c=512` vs full `H × d_h = 16384`: the compression ratio is 32×. In practice, a small additional buffer for the decoupled RoPE keys means the total KV cache is slightly above 1/32, but still far below GQA at typical group sizes.

At 128K context, this difference is the gap between "can serve this request" and "OOM".

---

## DeepSeek Usage

**DeepSeek-V2 (May 2024):** MLA was introduced here. The paper (arXiv:2405.04434, published May 7, 2024) presents MLA as a replacement for MHA in a 236B MoE model (21B active per token). The 93.3% KV cache reduction was the headline efficiency result.

**DeepSeek-V3 (December 2024):** MLA carried forward with `H=128`, `d_h=128`, `d_c=512`. This is a 671B MoE model (37B active per token) with a 128K context window. MLA is what makes 128K context economically viable to serve at these parameters.

**DeepSeek-R1 (January 2025):** Built on V3-Base. Inherits MLA unchanged. The 128K reasoning context in R1 relies on MLA for memory feasibility. See [[llms/deepseek-r1]].

**Adoption elsewhere:** As of mid-2026, MLA has not been widely adopted outside DeepSeek. The TransMLA paper (arXiv:2502.07864, February 2025) proposes techniques for retrofitting GQA-based models with MLA post-training, suggesting the community is working on migration paths. Whether any major lab has deployed MLA in production models other than DeepSeek is [unverified].

---

## Key Facts

- Introduced in DeepSeek-V2 (arXiv:2405.04434, May 7, 2024); used in V3 and R1
- Caches a single low-rank latent vector `c_KV` per layer instead of H full KV pairs
- DeepSeek-V3 compression ratio: 32× (`d_c=512` vs `H × d_h = 16384`)
- Reported KV cache reduction vs standard MHA: **93.3%** on DeepSeek-V2
- Model quality matches or exceeds MHA; avoids the MQA quality penalty
- The absorption trick folds up-projection matrices into Q/output weights — no extra per-step compute
- Decoupled RoPE caches a small additional position-encoded key buffer alongside `c_KV`
- Enables 5.76× higher generation throughput vs the preceding DeepSeek 67B model

---

## Common Failure Cases

**Naively applying RoPE after up-projection from the latent reintroduces full K into the cache**
Why: RoPE must be applied to position-specific K tensors, which means if you up-project first and then apply RoPE, you need the full K tensors at each position — negating MLA's cache savings.
Fix: use decoupled RoPE as in the DeepSeek implementation: cache a small position-encoded key `k_R` separately; the absorbed-weight path handles position-independent K components.

**Reconstruction quality degrades if the latent dimension `d_c` is too small relative to `H × d_h`**
Why: the low-rank projection is lossy; if `d_c` is set too aggressively small, the reconstructed K and V diverge from what full MHA would produce, causing attention score errors.
When: most visible on tasks requiring precise cross-token attention over long distances (e.g., multi-hop reasoning, needle-in-haystack retrieval). [unverified — no systematic ablation published]
Fix: DeepSeek's chosen `d_c = 4 × d_h` appears to be a stable operating point; going below `2 × d_h` is likely to hurt quality on retrieval-heavy tasks.

**Absorption trick requires custom kernel support; off-the-shelf attention implementations (FlashAttention 2) may fall back to unabsorbed path**
Why: FlashAttention's tiling and IO-aware algorithm assumes standard QKV shapes; absorbed-weight MLA uses different tensor layouts that may not map cleanly to existing kernels.
Impact: fallback to unabsorbed path eliminates the compute benefit of absorption and may reintroduce memory pressure. [unverified — implementation-dependent]

---

## Connections

- [[llms/transformer-architecture]] — MHA, GQA, KV cache fundamentals; MLA sits in the attention variants section
- [[llms/deepseek-r1]] — DeepSeek R1/R2 uses MLA (inherited from V3-Base)
- [[infra/inference-serving]] — vLLM paged attention and KV cache management; MLA changes the cache shape
- [[infra/flash-attention]] — IO-aware attention kernels; absorption trick compatibility
- [[math/linear-algebra]] — low-rank decomposition underpins MLA (same principle as LoRA's ΔW=BA)
- [[fine-tuning/lora-qlora]] — LoRA uses the same low-rank projection insight for weight updates

---

## Open Questions

- Will a major lab outside DeepSeek ship a production model with MLA? TransMLA suggests interest but no production deployment is confirmed.
- Does MLA's low-rank approximation degrade on tasks with fine-grained positional sensitivity (e.g., long-document needle retrieval) relative to GQA at equivalent cache size?
- Can the absorption trick be implemented efficiently inside FlashAttention 3's kernel without a custom CUDA implementation?
- What is the minimum viable `d_c` relative to `H × d_h` before quality degrades meaningfully on standard benchmarks?
