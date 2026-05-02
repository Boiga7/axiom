---
type: concept
category: infra
para: resource
tags: [deepspeed, zero, distributed-training, multi-gpu, memory-efficiency, microsoft]
sources: []
updated: 2026-05-01
tldr: Zero Redundancy Optimizer — Microsoft's distributed training system that partitions model training state across GPUs to eliminate memory redundancy.
---

# DeepSpeed ZeRO

Zero Redundancy Optimizer. Microsoft's distributed training system that partitions model training state across GPUs to eliminate memory redundancy. Enables training models with billions of parameters on commodity hardware.

Part of the DeepSpeed library. Integrates directly with HuggingFace `Trainer`, Axolotl, and PyTorch Lightning.

---

## The Problem

In standard data-parallel training, every GPU holds a complete copy of:
- Model parameters (weights)
- Optimizer states (for Adam: momentum, variance, master weights — 3× the parameter count in fp32)
- Gradients

For a 7B model with Adam in mixed precision: ~112GB of memory is duplicated across every GPU. A single H100 has 80GB. The model doesn't fit, let alone the optimizer states.

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

Start with Stage 2. Go to Stage 3 only if Stage 2 OOMs. Stage 3's all-gather communication adds overhead.

---

## Common Failure Cases

**Stage 3 training is slower than Stage 2 despite lower memory usage**  
Why: Stage 3 all-gathers parameters during both forward and backward passes; on nodes with low NVLink bandwidth (e.g., PCIe-connected multi-GPU), the communication overhead exceeds the memory savings benefit.  
Detect: tokens/second drops >20% when moving from Stage 2 to Stage 3; `nvidia-smi` shows GPUs waiting on communication.  
Fix: start with Stage 2; only move to Stage 3 when Stage 2 genuinely OOMs; use NVLink-connected nodes for Stage 3.

**`ds_config.json` `train_batch_size` doesn't match `per_device * accumulation * gpus`**  
Why: DeepSpeed requires `train_batch_size = per_device_train_batch_size * gradient_accumulation_steps * num_gpus`; a mismatch raises a validation error at startup.  
Detect: `AssertionError: ... train_batch_size` on training job start.  
Fix: calculate and set `train_batch_size` explicitly in `ds_config.json` to match the product of the three values.

**ZeRO-Infinity NVMe offloading requires nvme_path to exist on all nodes**  
Why: NVMe offload writes optimizer states to a local path; if the path doesn't exist or has insufficient space, training crashes.  
Detect: `FileNotFoundError` or `IOError: No space left on device` in training logs; only fails on some nodes.  
Fix: create the offload directory on all nodes before training; check free space with `df -h`; ensure the path is consistent across the cluster.

**Gradient clipping disabled in `ds_config.json` causes loss explosion**  
Why: the default DeepSpeed config doesn't enable gradient clipping; without it, large gradients destabilise training.  
Detect: training loss spikes then diverges (NaN/Inf); `grad_norm` metric exceeds 100 in W&B.  
Fix: add `"gradient_clipping": 1.0` to the DeepSpeed config; this is standard practice and rarely omitted intentionally.

**FSDP migration from ZeRO requires rewriting the training script structure**  
Why: ZeRO is configured externally via JSON; FSDP requires explicit wrapping policies in the training code; they're not interchangeable via a config swap.  
Detect: switching from `deepspeed` to `fsdp` in `TrainingArguments` raises `NotImplementedError` or unexpected behavior.  
Fix: treat them as separate code paths; use ZeRO for DeepSpeed-only stacks and FSDP for pure PyTorch; don't expect a drop-in switch.

## Connections

- [[fine-tuning/frameworks]] — Axolotl and TRL both integrate DeepSpeed ZeRO via HuggingFace Trainer
- [[infra/gpu-hardware]] — ZeRO stage selection depends on GPU VRAM (H100 80GB vs A100 40GB)
- [[fine-tuning/lora-qlora]] — QLoRA + ZeRO Stage 2 is the standard setup for multi-GPU LoRA training
- [[infra/experiment-tracking]] — W&B/MLflow log memory usage per GPU during ZeRO training runs
- [[infra/inference-serving]] — ZeRO is training-only; vLLM handles inference distribution separately
