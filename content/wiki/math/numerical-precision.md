---
type: concept
category: math
para: resource
tags: [numerical-precision, fp16, bf16, int8, fp8, quantisation, inference, training, mixed-precision]
sources: []
updated: 2026-05-01
tldr: "Every LLM inference and training decision involves a precision trade-off: lower precision = smaller memory footprint + faster compute, but risks numerical instability and accuracy loss."
---

# Numerical Precision — fp32, fp16, bf16, int8, fp8

Every LLM inference and training decision involves a precision trade-off: lower precision = smaller memory footprint + faster compute, but risks numerical instability and accuracy loss. Knowing which format to use where is an essential AI engineering skill.

---

## Floating Point Formats — Structure

IEEE 754 floating point: sign bit + exponent bits + mantissa (fraction) bits.

| Format | Sign | Exponent | Mantissa | Total bits | Range | Precision |
|---|---|---|---|---|---|---|
| fp32 | 1 | 8 | 23 | 32 | ±3.4×10³⁸ | ~7 decimal digits |
| fp16 | 1 | 5 | 10 | 16 | ±65,504 | ~3 decimal digits |
| bf16 | 1 | 8 | 7 | 16 | ±3.4×10³⁸ | ~2 decimal digits |
| fp8 (E4M3) | 1 | 4 | 3 | 8 | ±448 | ~1 decimal digit |
| fp8 (E5M2) | 1 | 5 | 2 | 8 | ±57,344 | ~0.5 decimal digit |
| int8 | — | — | — | 8 | -128 to 127 | integers only |
| int4 | — | — | — | 4 | -8 to 7 | integers only |

**Exponent bits = range. Mantissa bits = precision.**

---

## fp32 — Full Precision

The default. Used for:
- Optimizer states (Adam's m and v moments)
- Loss computation
- Master weights in mixed-precision training

Memory: 4 bytes per parameter. A 7B model in fp32 = 28 GB. Doesn't fit on a single A100 (80 GB) with activations and gradients.

---

## fp16 — Half Precision

16-bit with a small exponent range (max ~65,504). Problems:
- **Overflow:** gradients or activations > 65,504 → NaN → training crashes
- **Underflow:** very small values → round to zero → gradient vanishes

Fix: **loss scaling**. Multiply the loss by a large constant before backward pass (keep gradients in fp16 range), then divide the gradients before the optimizer step.

Used in: CUDA matrix operations (tensor cores), activations during forward pass.

---

## bf16 — Brain Float 16

Google's format. Same range as fp32 (8 exponent bits) but less precision (7 mantissa bits vs 23).

**Why bf16 won over fp16 for training:**
- No overflow risk — same exponent range as fp32
- No loss scaling needed — dramatically simpler training code
- Sufficient precision for gradient accumulation (minor precision loss rarely matters)
- Supported on: A100, H100, TPU; NOT on older V100s (use fp16 there)

**Modern training stack:** weights + activations in bf16; optimizer states in fp32.

---

## Mixed Precision Training (AMP)

```python
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()  # only needed for fp16, not bf16

for batch in dataloader:
    with autocast(dtype=torch.bfloat16):  # fp16 or bf16 for forward pass
        loss = model(batch)

    # fp16 only: scale loss to prevent underflow
    scaler.scale(loss).backward()
    scaler.step(optimizer)  # unscales gradients, clips, updates
    scaler.update()
    # bf16: just loss.backward(); optimizer.step()
```

Memory with AMP (bf16):
- Model weights: 2 bytes/param (bf16)
- Optimizer states (Adam): 8 bytes/param (fp32 m + v)
- Gradients: 2 bytes/param (bf16)
- Total: ~12 bytes/param at minimum
- 7B model: ~84 GB — one A100 80 GB is tight; use two or gradient checkpointing

---

## int8 — Post-Training Quantisation (PTQ)

Quantise weights to 8-bit integers after training. The model was trained in fp32/bf16. Int8 is applied at inference only.

```
x_int8 = round(x_fp32 / scale)    # quantise: map float → int
x_fp32 ≈ x_int8 × scale           # dequantise: recover float
```

Scale is computed per-tensor or per-channel. Quality depends heavily on calibration data.

**Tools:** `bitsandbytes` (LLM.int8(), most common), GPTQ, AWQ, HuggingFace Transformers `load_in_8bit=True`.

Memory: 1 byte/param (weights); activations remain fp16 during compute. A 70B model: ~70 GB in int8 vs 140 GB in fp16.

**Quality impact:** int8 quantisation of LLMs is typically lossless for most tasks — few-tenths-of-a-point MMLU drop.

---

## int4 — Aggressive Quantisation

4-bit quantisation. The frontier of inference efficiency.

**GPTQ:** layer-by-layer quantisation with error correction. Calibrate on a small dataset; compute optimal int4 values to minimise output error for each layer.

**AWQ (Activation-Aware Weight Quantisation):** protect the 1% of weights with the highest activation magnitude — those are the most important for output quality. The rest can be quantised more aggressively.

**QLoRA:** fine-tune in int4 base weights (NF4 format) with fp16 LoRA adapters. Made fine-tuning 65B models on 48 GB GPU possible.

Memory: 0.5 bytes/param. A 70B model: ~35 GB in int4. Fits on one A100 80 GB with room for activations.

**Quality impact:** int4 causes 1-3% quality drop on standard benchmarks depending on task.

---

## fp8 — Training at 8-bit

The H100's native format. Two variants:
- **E4M3** (4 exponent, 3 mantissa): higher precision, lower range — used for weights and activations
- **E5M2** (5 exponent, 2 mantissa): higher range, lower precision — used for gradients

**Training with fp8 (H100):** up to 2× memory reduction vs bf16 training; fp8 tensor cores are ~2× faster.

DeepSpeed and Transformer Engine (NVIDIA) support fp8 training. Requires calibration of per-tensor scaling factors throughout training.

---

## Decision Guide

| Scenario | Format |
|---|---|
| Training (A100/H100) | bf16 weights + activations, fp32 optimizer states |
| Training (V100) | fp16 with loss scaling, fp32 optimizer states |
| Inference — max quality | fp16 or bf16 |
| Inference — 7B on 8 GB GPU | int4 (GPTQ or AWQ) |
| Inference — 70B on 2×A100 | int8 (bitsandbytes) |
| Fine-tuning 65B on 48 GB | QLoRA (NF4 base + fp16 LoRA) |
| Training at scale (H100) | fp8 with Transformer Engine |

---

## Key Facts

- bf16 vs fp16: same 16 bits but bf16 has same range as fp32 (8 exponent bits) — no overflow, no loss scaling needed
- Mixed precision: forward/backward in bf16, optimizer in fp32 — ~12 bytes/param total
- int8: effectively lossless for most LLM tasks; halves inference memory
- int4 (GPTQ/AWQ/NF4): 1-3% quality drop; enables 70B on one A100
- QLoRA: int4 base model + fp16 LoRA adapters; training only updates LoRA
- fp8: H100 native; ~2× memory and speed vs bf16 for training at scale

---

## Common Failure Cases

**Training in fp16 produces NaN losses after several thousand steps because of gradient overflow**
Why: fp16 has a maximum representable value of ~65,504; large gradient values (common in attention layers with long sequences or high learning rates) overflow to `inf`, which then propagates through the computation graph and becomes `NaN` in the loss.
Detect: `loss.item()` returns `nan` after previously healthy training; the NaN appears suddenly rather than gradually; disabling fp16 and running in fp32 eliminates the NaN.
Fix: switch to bf16 (same range as fp32, no overflow risk); if you must use fp16, add `GradScaler` and set a lower initial loss scale; alternatively, reduce the learning rate and add gradient clipping.

**Quantised model (int4/int8) gives significantly worse quality than expected because calibration data was mismatched**
Why: post-training quantisation requires calibration data to compute the per-tensor or per-channel scale factors; if the calibration dataset is too small, too narrow in domain, or structurally different from production inputs, the scale factors are mis-calibrated and quantisation error is disproportionately large.
Detect: the quantised model scores 5-10%+ below the fp16 baseline on your task, far above the expected 1-3% drop; testing with fp16 restores quality; re-running quantisation with a larger calibration set reduces the gap.
Fix: use 512-1024 diverse calibration samples representative of your actual inference distribution; for domain-specific models, include domain-specific calibration data; use AWQ instead of GPTQ for weights with highly non-uniform activation distributions.

**Mixed precision training on V100 (no bf16 support) silently falls back to fp32, doubling memory usage**
Why: V100 GPUs do not support bf16 in hardware; `torch.autocast(dtype=torch.bfloat16)` on V100 silently casts to fp32 instead, which doubles memory usage compared to expected fp16 and may cause OOM errors that would not occur on A100.
Detect: memory profiling shows fp32 activations despite `autocast(dtype=torch.bfloat16)` in the code; the training run OOMs at a batch size that should fit in fp16.
Fix: use `torch.float16` for V100 training with a `GradScaler`; explicitly check `torch.cuda.get_device_capability()` and select the appropriate dtype at runtime rather than hardcoding bf16.

**fp8 training produces divergence because per-tensor scaling factors are not updated frequently enough**
Why: fp8 formats (E4M3/E5M2) have very limited dynamic range; accurate training requires per-tensor or per-channel scaling factors that must be updated every forward pass; if the Transformer Engine's scaling factor update schedule is too infrequent, tensors fall outside the representable range and training diverges.
Detect: loss diverges within a few hundred steps of enabling fp8; reverting to bf16 stabilises training; the divergence correlates with large gradient norm spikes.
Fix: use NVIDIA Transformer Engine's `FP8GlobalStateManager` with `fp8_autocast` to handle automatic scaling factor management; do not implement fp8 scaling manually; keep bf16 as the fallback for layers with high gradient variance.

## Connections

[[math/backpropagation]] · [[math/optimisation]] · [[infra/gpu-hardware]] · [[infra/inference-serving]] · [[fine-tuning/lora-qlora]] · [[papers/lora]]
