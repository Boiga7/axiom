---
type: paper
category: papers
para: resource
tags: [lora, fine-tuning, low-rank, adaptation, hu, 2021, peft]
sources: []
updated: 2026-05-01
tldr: Instead of fine-tuning all model weights, freeze the original weights and inject trainable low-rank decomposition matrices into each attention layer — achieving 10,000× fewer trainable parameters with no inference overhead.
---

# LoRA: Low-Rank Adaptation of Large Language Models (Hu et al., 2021)

**Citation:** Hu, E. J., Shen, Y., Wallis, P., Allen-Zhu, Z., Li, Y., Wang, S., ... & Chen, W. (2021). LoRA: Low-Rank Adaptation of Large Language Models. ICLR 2022.

**One sentence:** Instead of fine-tuning all model weights, freeze the original weights and inject trainable low-rank decomposition matrices into each attention layer — achieving 10,000× fewer trainable parameters with no inference overhead.

---

## What Problem It Solved

Full fine-tuning a 175B model requires 175B parameter gradients in memory — impractical for most organisations. Previous approaches (adapters, prefix tuning) added latency at inference or reduced quality.

LoRA fine-tunes by injecting small trainable matrices that are mathematically equivalent to a low-rank update to the frozen weight matrices. At inference, the LoRA weights can be merged back into the original weights — **zero inference overhead**.

---

## Core Idea — Low-Rank Decomposition

A weight matrix W ∈ ℝ^(d×k) is updated as:

```
W' = W + ΔW = W + BA

where:
  B ∈ ℝ^(d×r)
  A ∈ ℝ^(r×k)
  r << min(d, k)  — the rank, typically 4–64
```

During forward pass: `h = W₀x + BAx`

- W₀ is frozen (no gradient computed)
- A is initialised with random Gaussian
- B is initialised to zero (so ΔW = 0 at training start — stable initialisation)
- Only A and B are trained

**Why this works:** The hypothesis is that weight updates during fine-tuning have low intrinsic rank — the model only needs to change a low-dimensional subspace to adapt to a new task. The paper validates this empirically.

---

## Key Contributions

### Parameter Efficiency

For GPT-3 (175B parameters):

| Method | Trainable params | Storage |
|---|---|---|
| Full fine-tuning | 175B | 350 GB (fp16) |
| LoRA (r=4) | 4.7M | 37.7 MB |
| Adapter | ~17M | ~136 MB |

LoRA trains ~0.003% of model parameters versus full fine-tuning.

### No Inference Latency

At inference, merge the LoRA update into the base weights:
```
W_merged = W₀ + BA
```
The merged model is identical in structure to the base model. No adapter layers, no branching — same inference speed.

### Applied to Attention Matrices

LoRA is applied to the query (Wq), value (Wv), and occasionally key (Wk) and output (Wo) projection matrices in each attention layer. The FFN layers are typically kept frozen.

### Rank Selection

- r=4: sufficient for most task adaptation
- r=8: common default; better for complex tasks
- r=64+: used for domain adaptation requiring larger weight changes
- Higher rank = more parameters = better quality up to a point, then diminishing returns

---

## Impact

- Became the dominant fine-tuning method for LLMs; integrated into HuggingFace PEFT library
- Enabled fine-tuning 7B–70B models on consumer GPUs (RTX 4090: 24 GB)
- QLoRA extended it to 4-bit quantised base weights (33% memory saving vs LoRA)
- Now standard in Axolotl, TRL, Unsloth — every major fine-tuning framework
- Enabled the open-source fine-tuning ecosystem: thousands of task-specific LoRA adapters

---

## Limitations

- Does not improve base model knowledge — only adapts style and task behaviour
- Rank is a hyperparameter; wrong rank choice can underfit or waste compute
- Applied to attention matrices only by default; some tasks benefit from FFN adaptation (DoRA, etc.)
- Not equivalent to full fine-tuning on complex domain adaptation tasks

---

## Key Facts

- Published 2021; ICLR 2022 acceptance; 6 authors from Microsoft Research
- r (rank) typically 4–64; default r=8 in most frameworks
- Reduction: GPT-3 fine-tuning from 175B → 4.7M trainable params (10,000× fewer)
- Zero inference latency: LoRA weights merge into base weights at deployment
- QLoRA (2023): 4-bit quantised base + LoRA adapters in fp16 — fine-tune 65B on 48 GB GPU
- PEFT library: pip install peft; LoraConfig(r=8, lora_alpha=32, target_modules=["q_proj","v_proj"])

---

## Connections

[[papers/key-papers]] · [[fine-tuning/lora-qlora]] · [[fine-tuning/frameworks]] · [[infra/huggingface]] · [[math/linear-algebra]]
