---
type: concept
category: infra
para: resource
tags: [flash-attention, attention, training, inference, memory-efficiency, gpu]
sources: []
updated: 2026-05-01
---

# Flash Attention

IO-aware exact attention algorithm that reduces GPU memory usage from O(N²) to O(N) and achieves 2–10× speedup over standard attention. Standard in all modern LLM training and inference stacks.

Papers: FlashAttention (Dao et al., 2022), FlashAttention-2 (Dao, 2023).

---

## The Problem with Standard Attention

Standard attention materialises the full N×N attention matrix in GPU HBM (high-bandwidth memory — the slow, large GPU RAM). For a sequence of length N:
- Memory: O(N²) — quadruples when sequence length doubles
- Runtime: dominated by reading/writing to HBM, not by actual computation

At sequence length 8192, the attention matrix alone requires ~2GB of HBM per layer on a 7B model. This is why naive transformers couldn't scale to long contexts.

---

## The Flash Attention Solution

Flash Attention exploits GPU memory hierarchy: SRAM (fast, tiny — ~20MB on A100) vs HBM (slow, large — 40–80GB on A100).

**Key insight:** Recompute attention in tiles that fit in SRAM rather than materialising the full N×N matrix in HBM.

```
Standard attention:        Flash Attention:
Q, K, V → HBM             Q, K, V → tile in SRAM
          ↓                           ↓
    N×N matrix in HBM        Softmax computed in SRAM tiles
          ↓                           ↓
      Output → HBM              Output accumulated, written once
```

By never writing the full attention matrix to HBM, reads/writes drop from O(N²) to O(N). The computation itself is identical — Flash Attention is *exact*, not approximate.

---

## FlashAttention-2 Improvements (2023)

FA2 added three improvements over FA1:

1. **Fewer non-matmul FLOPs** — restructured the softmax to reduce rescaling operations
2. **Better parallelism** — parallelises across sequence length for a single head (FA1 only parallelised across batch/heads)
3. **Better warp partitioning** — reduces shared memory communication within a thread block

**Results:**
- 2× faster than FlashAttention-1
- 3–10× faster than standard attention
- 50–73% of theoretical peak FLOPs/s on A100
- Training speed: up to 225 TFLOPs/s per A100 (72% MFU)

---

## Why It Matters for LLM Engineering

| Benefit | Practical impact |
|---------|-----------------|
| O(N) memory | Long-context models (128K+ tokens) become trainable |
| 2–10× speedup | Cuts training cost proportionally |
| Exact attention | No quality degradation — drop-in replacement |
| Standard inclusion | Ships in vLLM, HuggingFace, Axolotl, TRL by default |

Context lengths that required model parallelism before FA (e.g., 32K) now fit on a single GPU.

---

## Usage

Flash Attention ships in HuggingFace `transformers` from v4.34+. Enable with:

```python
from transformers import AutoModelForCausalLM

model = AutoModelForCausalLM.from_pretrained(
    "mistralai/Mistral-7B-v0.1",
    attn_implementation="flash_attention_2",
    torch_dtype=torch.bfloat16,   # FA2 requires bf16 or fp16
)
```

In Axolotl config:

```yaml
flash_attention: true
```

In vLLM (enabled by default for supported models).

---

## FlashAttention-3 (2024)

FA3 targets Hopper-architecture GPUs (H100). Adds:
- Asynchronous computation between GEMM and softmax
- FP8 quantisation support
- 1.5–2× speedup over FA2 on H100

Not yet universally integrated — FA2 remains the production standard as of 2026.

---

## Connections

- [[infra/inference-serving]] — vLLM uses FA2 by default for paged attention
- [[infra/gpu-hardware]] — H100 vs A100 performance characteristics with FA2
- [[fine-tuning/frameworks]] — Axolotl and Unsloth both enable FA2 by default
- [[llms/transformer-architecture]] — the standard attention mechanism FA2 replaces
- [[math/transformer-math]] — attention formula: softmax(QKᵀ/√d)V that FA2 computes
