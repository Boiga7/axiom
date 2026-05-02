---
type: concept
category: infra
tags: [gpu, hardware, vram, h100, a100, rtx, inference, training, cloud]
sources: []
updated: 2026-04-29
para: resource
tldr: GPU selection guide for LLM inference and training — VRAM is the binding constraint (2 bytes per parameter in BF16), with H100 at ~3x A100 throughput for inference and RTX 4090 as the consumer sweet spot for fine-tuning.
---

# GPU Hardware for LLMs

> **TL;DR** GPU selection guide for LLM inference and training — VRAM is the binding constraint (2 bytes per parameter in BF16), with H100 at ~3x A100 throughput for inference and RTX 4090 as the consumer sweet spot for fine-tuning.

The practical guide to GPU selection for inference and training. VRAM is the binding constraint. A model that doesn't fit in VRAM can't run.

---

## VRAM Requirements by Model Size

Rule of thumb: **2 bytes per parameter for FP16/BF16**.

| Model size | BF16 VRAM | INT8 VRAM | INT4 VRAM |
|---|---|---|---|
| 7B | 14 GB | 7 GB | 4 GB |
| 13B | 26 GB | 13 GB | 7 GB |
| 33B | 66 GB | 33 GB | 17 GB |
| 70B | 140 GB | 70 GB | 35 GB |
| 405B | 810 GB | 405 GB | 203 GB |

Add ~20% overhead for KV cache + activations during inference.

For training with AdamW: optimizer states take 3x the model size in FP32 Adam moments → a 7B model needs ~84GB for full fine-tuning. LoRA reduces this dramatically. Only the adapter parameters need optimizer states.

---

## GPU Comparison

### NVIDIA Data Centre (Cloud/Server)

| GPU | VRAM | Memory BW | TDP | Best for |
|---|---|---|---|---|
| **H200 SXM** | 141 GB HBM3e | 4.8 TB/s | 700W | Frontier training + inference |
| **H100 SXM** | 80 GB HBM3 | 3.35 TB/s | 700W | Large model training |
| **H100 PCIe** | 80 GB HBM2e | 2 TB/s | 350W | Inference |
| **A100 80GB** | 80 GB HBM2e | 2 TB/s | 400W | Training, widely available |
| **A100 40GB** | 40 GB HBM2e | 1.6 TB/s | 400W | Common in cloud |
| **L40S** | 48 GB GDDR6 | 864 GB/s | 350W | Inference, 30% cheaper than A100 |

H100 delivers ~3x the throughput of A100 for transformer inference due to FP8 support and faster NVLink interconnect.

### Consumer / Prosumer

| GPU | VRAM | Memory BW | Cost | Best for |
|---|---|---|---|---|
| **RTX 4090** | 24 GB GDDR6X | 1008 GB/s | ~$1,600 | QLoRA fine-tuning 7-13B, fast inference |
| **RTX 4080** | 16 GB GDDR6X | 717 GB/s | ~$800 | Inference 7B, QLoRA 7B |
| **RTX 3090** | 24 GB GDDR6X | 936 GB/s | ~$700 used | Good value for 7B-13B inference |
| **RTX 4060 Ti 16GB** | 16 GB GDDR6 | 288 GB/s | ~$450 | Inference 7B INT4 |

**Apple Silicon:**

| Chip | Unified Memory | Memory BW | Best for |
|---|---|---|---|
| **M3 Max 128GB** | 128 GB | 400 GB/s | Full 70B INT4 inference locally |
| **M3 Pro 36GB** | 36 GB | 150 GB/s | 13-30B inference |
| **M3 36GB** | 36 GB | 100 GB/s | 7-13B |
| **M4 Max 128GB** | 128 GB | 546 GB/s | Best local inference hardware (2025) |

Apple Silicon is compelling for inference: unified memory means 128GB available to GPU at reasonable bandwidth. No PCIe bottleneck.

---

## Cloud GPU Pricing (April 2026)

| Provider | GPU | $/hr (on-demand) | Notes |
|---|---|---|---|
| **Lambda Labs** | A100 80GB | ~$1.99 | Best value for training |
| **Lambda Labs** | H100 SXM | ~$3.29 | |
| **RunPod** | A100 80GB | ~$2.29 | Spot can be 50% cheaper |
| **RunPod** | H100 SXM | ~$3.99 | |
| **Vast.ai** | RTX 4090 | ~$0.40-0.80 | Cheap, less reliable |
| **Modal** | A100 | ~$3.50 | Serverless, scales to zero |
| **AWS p4d.24xlarge** | 8× A100 40GB | ~$32 | Expensive but reliable |
| **GCP A3 Mega** | 8× H100 80GB | ~$43 | Frontier training |

Spot/interruptible pricing is typically 50-70% cheaper. Use for training (with checkpointing) or batch inference.

---

## Fitting Models in Memory

### Multi-GPU with tensor parallelism

```python
# vLLM: auto-shard across available GPUs
from vllm import LLM

llm = LLM(
    model="meta-llama/Meta-Llama-3-70B-Instruct",
    tensor_parallel_size=4,  # shard across 4 GPUs (4× A100 40GB = 160GB)
)
```

### Quantisation to fit on smaller GPU

```python
from transformers import AutoModelForCausalLM, BitsAndBytesConfig
import torch

# INT4 quantisation — 70B fits in ~35GB (2× RTX 4090)
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_quant_type="nf4",
)
model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-70B-Instruct",
    quantization_config=bnb_config,
    device_map="auto",
)
```

### llama.cpp on CPU with GPU offload

```python
from llama_cpp import Llama

# Offload 35 layers to GPU, rest on CPU
llm = Llama(
    model_path="llama-3-70b.Q4_K_M.gguf",
    n_gpu_layers=35,
    n_ctx=4096,
)
```

Use when the model doesn't fully fit in VRAM. Slower than full GPU inference but faster than CPU-only.

---

## Choosing Hardware: Decision Guide

**Just want to run 7B locally for development:**
→ RTX 4060 Ti 16GB (cheapest) or M3 Mac (best dev experience)

**Fine-tune 7B with LoRA:**
→ RTX 4090 24GB or single A100 40GB

**Fine-tune 13-70B with QLoRA:**
→ A100 80GB (single) or 2-4× RTX 4090

**Run 70B inference locally:**
→ M3 Max 128GB or 2× A100 40GB

**Production inference API (<100ms):**
→ H100 or A100, use vLLM

**Training from scratch / large-scale fine-tuning:**
→ Multi-node H100 cluster; use Lambda or GCP

**Cheapest possible experiments:**
→ Google Colab Pro ($10/month, T4 16GB), Kaggle (free T4/P100 weekly quota)

---

## VRAM Monitoring

```python
import torch

# Check available VRAM
print(torch.cuda.memory_allocated() / 1e9, "GB allocated")
print(torch.cuda.memory_reserved() / 1e9, "GB reserved")
print(torch.cuda.get_device_properties(0).total_memory / 1e9, "GB total")

# nvidia-smi equivalent in Python
!nvidia-smi --query-gpu=name,memory.used,memory.free,memory.total --format=csv
```

---

## Key Facts

- VRAM rule of thumb: 2 bytes per parameter in BF16 (7B = 14GB, 70B = 140GB)
- Add 20% overhead for KV cache and activations during inference
- Full fine-tuning with AdamW: ~3x model size for optimizer states (7B = 84GB+)
- H100 delivers ~3x A100 throughput for transformer inference (FP8 support + faster NVLink)
- Lambda Labs A100 80GB: ~$1.99/hr; H100 SXM: ~$3.29/hr (best value for training)
- Apple M4 Max 128GB: 546 GB/s memory bandwidth; best local inference hardware (2025)
- Spot/interruptible pricing: 50-70% cheaper — use with checkpointing for training
- Google Colab Pro: $10/month, T4 16GB — cheapest option for experiments

## Common Failure Cases

**Model loads on VRAM paper spec but OOMs during inference due to KV cache**  
Why: VRAM estimates are for weights only; KV cache grows with sequence length and batch size, adding 20-40% overhead.  
Detect: CUDA OOM occurs after the model loads successfully but fails on first generation; `nvidia-smi` shows memory near capacity before inference starts.  
Fix: account for 20% KV cache overhead when sizing GPU memory; reduce `max_new_tokens` or use streaming with smaller batch sizes.

**Multi-GPU setup with `device_map="auto"` is slower than single GPU**  
Why: PCIe interconnect bandwidth (~16 GB/s) is far slower than NVLink (~600 GB/s); on PCIe-connected GPUs, inter-device tensor transfers dominate latency.  
Detect: tokens/second on 2× PCIe GPU is lower than 1× GPU of the same type; `nvidia-smi topo` shows `PHB` (PCIe Host Bridge) connections.  
Fix: use NVLink-connected GPUs (SXM form factor) for multi-GPU inference; or use quantisation to fit on a single GPU instead.

**`int4` quantisation causes severe quality degradation on instruction-following tasks**  
Why: aggressive INT4 quantisation loses precision on the attention layers that drive instruction following; 4-bit models with bad calibration data are noticeably worse.  
Detect: instruction-following accuracy drops >10% vs BF16 on your benchmark; the model ignores format requirements.  
Fix: use Q4_K_M (GGUF) or GPTQ with calibrated quantisation rather than naive INT4; or use 5-bit quantisation as a compromise.

**Cloud GPU spot instance preemption loses training progress**  
Why: spot/interruptible instances are reclaimed without warning when demand increases.  
Detect: training job terminates with `SpotInstanceInterruption` or equivalent; no checkpoint was saved recently.  
Fix: checkpoint every 10-30 minutes with `save_steps`; enable training job restart from the latest checkpoint; use `deepspeed` ZeRO with checkpoint support.

**Apple Silicon model loads but runs at 10% of expected speed due to CPU fallback**  
Why: certain custom ops (e.g., some GGUF quantisation types) fall back to CPU on Apple Silicon; the GPU runs but CPU is the bottleneck.  
Detect: GPU utilisation is 10-30% in Activity Monitor despite the model "running on GPU"; tokens/second is far below the expected rate.  
Fix: use `n_gpu_layers=-1` in llama.cpp to maximise GPU offload; check that the GGUF quantisation type (Q4_K_M, Q5_K_M) is supported natively by Metal.

## Connections

- [[infra/inference-serving]] — vLLM, llama.cpp for serving on these GPU configurations
- [[fine-tuning/lora-qlora]] — QLoRA enables fine-tuning 7B on RTX 4070 Ti (12GB)
- [[infra/huggingface]] — `device_map="auto"` auto-shards models across available GPUs
- [[fine-tuning/frameworks]] — Axolotl multi-GPU training with DeepSpeed ZeRO-3

## Open Questions

- When does H200 become widely available on cloud rental platforms vs H100?
- How does Apple Silicon M4 Max compare to a single A100 for vLLM-style continuous batching inference?
- What is the practical VRAM headroom needed above the minimum for stable long-context inference?
