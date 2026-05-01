---
type: concept
category: infra
para: resource
tags: [deepspeed, zero, distributed-training, multi-gpu, memory-efficiency, microsoft]
sources: []
updated: 2026-05-01
---

# DeepSpeed ZeRO

Zero Redundancy Optimizer — Microsoft's distributed training system that partitions model training state across GPUs to eliminate memory redundancy. Enables training models with billions of parameters on commodity hardware.

Part of the DeepSpeed library. Integrates directly with HuggingFace `Trainer`, Axolotl, and PyTorch Lightning.

---

## The Problem

In standard data-parallel training, every GPU holds a complete copy of:
- Model parameters (weights)
- Optimizer states (for Adam: momentum, variance, master weights — 3× the parameter count in fp32)
- Gradients

For a 7B model with Adam in mixed precision: ~112GB of memory is duplicated across every GPU. A single H100 has 80GB — the model doesn't fit, let alone the optimizer states.

---

## ZeRO Stages

ZeRO eliminates redundancy by partitioning these components across GPUs. Each stage adds more partitioning:

### Stage 1 — Optimizer State Partitioning

Each GPU holds all parameters and gradients, but only its **shard of the optimizer states**.

```
GPU 0: params[all], grads[all], opt_states[0:N/4]
GPU 1: params[all], grads[all], opt_states[N/4:N/2]
...
```

- Memory reduction: **4×** vs baseline (optimizer states are the largest component)
- Communication overhead: minimal (all-gather optimizer states at update step)

### Stage 2 — Gradient Partitioning

Each GPU holds all parameters but only its **shard of gradients and optimizer states**.

```
GPU 0: params[all], grads[0:N/4], opt_states[0:N/4]
GPU 1: params[all], grads[N/4:N/2], opt_states[N/4:N/2]
...
```

- Memory reduction: **8×** vs baseline
- Communication: reduce-scatter gradients during backward pass

### Stage 3 — Parameter Partitioning

All three components are partitioned. Each GPU only owns a shard of the model.

```
GPU 0: params[0:N/4], grads[0:N/4], opt_states[0:N/4]
GPU 1: params[N/4:N/2], grads[N/4:N/2], opt_states[N/4:N/2]
...
```

- Memory reduction: linear with GPU count (8 GPUs = 8× reduction)
- Communication: all-gather parameters during forward and backward passes
- Can train 200B+ parameter models with model parallelism

### ZeRO-Infinity (offloading)

Extends Stage 3 by offloading parameters, gradients, and optimizer states to CPU RAM or NVMe storage. Enables training on GPU memory alone is insufficient.

---

## Memory Comparison (7B Model, 8 GPUs)

| Approach | Memory per GPU |
|----------|---------------|
| Baseline data parallel | ~112GB (doesn't fit on H100) |
| ZeRO Stage 1 | ~28GB |
| ZeRO Stage 2 | ~14GB |
| ZeRO Stage 3 | ~7GB |

---

## Usage with HuggingFace

```python
# ds_config.json
{
  "zero_optimization": {
    "stage": 2,
    "allgather_partitions": true,
    "allgather_bucket_size": 2e8,
    "reduce_scatter": true,
    "reduce_bucket_size": 2e8,
    "overlap_comm": true
  },
  "bf16": {"enabled": true},
  "train_batch_size": 32,
  "train_micro_batch_size_per_gpu": 4
}
```

```python
from transformers import TrainingArguments

training_args = TrainingArguments(
    output_dir="./output",
    deepspeed="ds_config.json",
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
)
```

With Axolotl:

```yaml
deepspeed: deepspeed_configs/zero2.json
```

---

## ZeRO vs FSDP (PyTorch)

PyTorch's Fully Sharded Data Parallel (FSDP) is the native alternative to ZeRO Stage 3.

| | DeepSpeed ZeRO | PyTorch FSDP |
|--|----------------|--------------|
| Ecosystem | DeepSpeed library | PyTorch native |
| Stages | 1, 2, 3, Infinity | Equivalent to ZeRO 3 |
| CPU/NVMe offload | ZeRO-Infinity | Limited |
| HuggingFace support | Full | Full |
| Ease of config | JSON config | Python API |
| Communication efficiency | Slightly better at large scale | Simpler to debug |

**Rule of thumb:** FSDP for standard multi-GPU fine-tuning; DeepSpeed ZeRO-3 or ZeRO-Infinity for very large models or when CPU offload is needed.

---

## When to Use Each Stage

| Scenario | Recommended Stage |
|----------|------------------|
| 7B model, 8× A100 80GB | Stage 1 or 2 — model fits with just opt state partitioning |
| 13B model, 4× A100 80GB | Stage 2 or 3 |
| 70B model, 8× H100 80GB | Stage 3 |
| 70B+ model, limited GPU RAM | Stage 3 + ZeRO-Infinity |

Start with Stage 2. Go to Stage 3 only if Stage 2 OOMs — Stage 3's all-gather communication adds overhead.

---

## Connections

- [[fine-tuning/frameworks]] — Axolotl and TRL both integrate DeepSpeed ZeRO via HuggingFace Trainer
- [[infra/gpu-hardware]] — ZeRO stage selection depends on GPU VRAM (H100 80GB vs A100 40GB)
- [[fine-tuning/lora-qlora]] — QLoRA + ZeRO Stage 2 is the standard setup for multi-GPU LoRA training
- [[infra/experiment-tracking]] — W&B/MLflow log memory usage per GPU during ZeRO training runs
- [[infra/inference-serving]] — ZeRO is training-only; vLLM handles inference distribution separately
