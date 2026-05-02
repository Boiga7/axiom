---
type: concept
category: infra
para: resource
tags: [flash-attention, attention, training, inference, memory-efficiency, gpu]
sources: []
updated: 2026-05-01
tldr: IO-aware exact attention algorithm that reduces GPU memory usage from O(N²) to O(N) and achieves 2–10× speedup over standard attention. Standard in all modern LLM training and inference stacks.
---

# Flash Attention

IO-aware exact attention algorithm that reduces GPU memory usage from O(N²) to O(N) and achieves 2–10× speedup over standard attention. Standard in all modern LLM training and inference stacks.

Papers: FlashAttention (Dao et al., 2022), FlashAttention-2 (Dao, 2023).

---

## The Problem with Standard Attention

Standard attention materialises the full N×N attention matrix in GPU HBM (high-bandwidth memory, the slow, large GPU RAM). For a sequence of length N:
- Memory: O(N²) — quadruples when sequence length doubles
- Runtime: dominated by reading/writing to HBM, not by actual computation

At sequence length 8192, the attention matrix alone requires ~2GB of HBM per layer on a 7B model. This is why naive transformers couldn't scale to long contexts.

---

## The Flash Attention Solution

Flash Attention exploits GPU memory hierarchy: SRAM (fast, tiny, ~20MB on A100) vs HBM (slow, large, 40–80GB on A100).

**Key insight:** Recompute attention in tiles that fit in SRAM rather than materialising the full N×N matrix in HBM.

```
Standard attention:        Flash Attention:
Q, K, V → HBM             Q, K, V → tile in SRAM
          ↓                           ↓
    N×N matrix in HBM        Softmax computed in SRAM tiles
          ↓                           ↓
      Output → HBM              Output accumulated, written once
```

By never writing the full attention matrix to HBM, reads/writes drop from O(N²) to O(N). The computation itself is identical. Flash Attention is *exact*, not approximate.

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

Not yet universally integrated. FA2 remains the production standard as of 2026.

---

## Common Failure Cases

**`flash_attention_2` fails with `AttributeError` on transformers < 4.34**  
Why: the `attn_implementation` parameter was added in transformers v4.34; older versions don't recognise it.  
Detect: `TypeError: ... unexpected keyword argument 'attn_implementation'`.  
Fix: upgrade transformers to >=4.34 (`pip install --upgrade transformers`); or remove the parameter and let transformers select attention automatically.

**FA2 raises `ValueError: Flash Attention is only available for fp16 and bf16`**  
Why: Flash Attention requires half-precision inputs; loading the model in `torch.float32` disables it.  
Detect: `ValueError: Flash Attention 2.0 only supports torch.float16 and torch.bfloat16` at model load time.  
Fix: pass `torch_dtype=torch.bfloat16` to `from_pretrained`; BF16 is preferred over FP16 for training stability.

**FA2 not available on older CUDA compute capabilities (< 8.0, e.g., RTX 20xx)**  
Why: Flash Attention requires CUDA compute capability 8.0+ (A100, RTX 3090+, H100); Turing-generation GPUs (RTX 2080) are not supported.  
Detect: `ImportError: FlashAttention is only supported on CUDA devices with compute capability >= 8.0`; or FA2 silently falls back to standard attention without warning.  
Fix: check compute capability with `torch.cuda.get_device_capability()`; use `sdpa` (scaled dot product attention) as an intermediate for Turing GPUs.

**FA3 enabled on H100 but model weights are in FP32, causing no speedup**  
Why: FA3's FP8 path requires FP8 weight loading; loading in FP32 bypasses the fast path and uses FA2 speed with FA3 overhead.  
Detect: H100 training throughput with FA3 is not higher than FA2; check `torch.cuda.memory_allocated()` for expected FP8 vs FP32 footprint.  
Fix: load model in `torch.float8_e4m3fn` format; FA3's FP8 benefit only applies when the model weights are also in FP8.

## Connections

- [[infra/inference-serving]] — vLLM uses FA2 by default for paged attention
- [[infra/gpu-hardware]] — H100 vs A100 performance characteristics with FA2
- [[fine-tuning/frameworks]] — Axolotl and Unsloth both enable FA2 by default
- [[llms/transformer-architecture]] — the standard attention mechanism FA2 replaces
- [[math/transformer-math]] — attention formula: softmax(QKᵀ/√d)V that FA2 computes
