---
type: concept
category: fine-tuning
tags: [lora, qlora, peft, adapters, fine-tuning, nf4, quantisation]
sources: []
updated: 2026-04-29
para: resource
tldr: LoRA fine-tunes 0.1-1% of model parameters by adding low-rank adapter matrices to frozen weights; QLoRA adds 4-bit quantisation of the base model, enabling 7B fine-tuning on a 12GB consumer GPU.
---

# LoRA and QLoRA

> **TL;DR** LoRA fine-tunes 0.1-1% of model parameters by adding low-rank adapter matrices to frozen weights; QLoRA adds 4-bit quantisation of the base model, enabling 7B fine-tuning on a 12GB consumer GPU.

The dominant fine-tuning methods for LLMs. LoRA (Low-Rank Adaptation) fine-tunes 0.1–1% of a model's parameters. QLoRA adds 4-bit quantisation, enabling 7B models on consumer GPUs.

---

## LoRA: The Concept

Every weight matrix W in a transformer can be approximated as:

```
W_new = W_pretrained + ΔW
```

During full fine-tuning, ΔW is the same shape as W — expensive for 7B+ parameter models.

LoRA's key insight: **weight updates have low intrinsic rank.** ΔW can be approximated as:

```
ΔW = B · A    where rank(BA) = r << min(d, k)
```

B ∈ ℝ^(d×r) is initialised to zeros. A ∈ ℝ^(r×k) is initialised with Gaussian noise. During training, only A and B are updated. W_pretrained is frozen.

**Parameter savings at rank 8 for a 4096×4096 attention projection:**
- Full fine-tuning: 4096 × 4096 = 16,777,216 parameters
- LoRA r=8: (4096×8) + (8×4096) = 65,536 parameters
- **256x fewer parameters**

At inference, merge A and B into the original weight: no latency overhead.

---

## Key Hyperparameters

### Rank (r)

Controls adapter expressivity. Higher rank = more capacity = more parameters = better fine-tuning = more compute.

| Rank | Parameters | When to use |
|---|---|---|
| 4 | Minimal | Very narrow tasks; severe GPU constraints |
| 8 | Standard | Most tasks; good default |
| 16 | Moderate | Complex tasks; more training data |
| 32–64 | High | Large datasets; capabilities learning |
| 128+ | Full-ish | Rarely needed; diminishing returns |

### Alpha (α)

Scaling factor applied to the LoRA output: `output += (α/r) · BA · x`

Standard rule of thumb: **α = 2 × r**. If r=8, α=16. Some practitioners set α=r (scaling factor = 1).

### Target Modules

Which weight matrices to adapt. Options:

| Modules | Notes |
|---|---|
| `q_proj, v_proj` | Minimum; fastest training |
| `q_proj, k_proj, v_proj, o_proj` | Full attention; standard choice |
| All linear layers (+ MLP) | Maximum; best quality |

Most fine-tuning tasks benefit from targeting all attention projections. Add MLP layers for style/knowledge tasks.

### Dropout

LoRA-specific dropout (lora_dropout) prevents overfitting. Typical: 0.05–0.1 for small datasets, 0 for large datasets.

---

## QLoRA: LoRA + 4-bit Quantisation

Enables fine-tuning 7B models on a 12GB GPU. Key innovations from the paper (Dettmers et al., 2023):

1. **NF4 (NormalFloat 4-bit):** A 4-bit data type optimised for normally distributed weights. Better quality than standard int4.
2. **Double quantisation:** Quantise the quantisation constants themselves — saves ~0.37 bits/parameter additional.
3. **Paged optimisers:** Use GPU memory as a virtual address space, pageable to CPU RAM when needed. Prevents OOM crashes during gradient computation.

```python
from transformers import BitsAndBytesConfig

quantisation_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-8B",
    quantization_config=quantisation_config,
    device_map="auto"
)
```

The forward pass uses 4-bit weights; the backward pass dequantises to bf16 for gradient computation. The adapters (A and B matrices) are always in bf16.

### QLoRA vs LoRA Quality

On most benchmarks: QLoRA is within 1–3% of LoRA in final quality. The quality gap is smaller for larger models — 70B QLoRA is near-indistinguishable from full LoRA on most tasks.

---

## Merging Adapters

After training, merge adapters into the base model for deployment (zero inference overhead):

```python
from peft import PeftModel

model = AutoModelForCausalLM.from_pretrained("base_model")
model = PeftModel.from_pretrained(model, "path/to/adapter")
merged_model = model.merge_and_unload()
merged_model.save_pretrained("merged_model")
```

For production serving, always merge. Only keep adapters separate if you need hot-swappable adapters (serving multiple fine-tunes from one base model).

---

## Practical Workflow

```python
from peft import LoraConfig, get_peft_model, TaskType
from transformers import AutoModelForCausalLM, AutoTokenizer

model = AutoModelForCausalLM.from_pretrained("meta-llama/Meta-Llama-3-8B")

lora_config = LoraConfig(
    r=8,
    lora_alpha=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# trainable params: 6,553,600 || all params: 8,036,352,000 || trainable%: 0.0816
```

---

## Key Facts

- LoRA at r=8 for a 4096×4096 matrix: 65,536 parameters vs 16.7M full — 256x fewer
- Standard alpha rule of thumb: α = 2 × r (e.g., r=8 → α=16)
- Minimum target modules: `q_proj, v_proj`; standard: `q_proj, k_proj, v_proj, o_proj`
- QLoRA uses NF4 (NormalFloat 4-bit) + double quantisation + paged optimisers
- QLoRA quality penalty vs full LoRA: ~1-3% on most benchmarks; gap narrows at 70B
- At inference: merge adapters (`merge_and_unload()`) for zero latency overhead
- Trainable parameters in a typical 8B LoRA run: ~0.08% of total parameters

## Connections

- [[fine-tuning/decision-framework]] — when LoRA/QLoRA is the right choice vs RAG
- [[fine-tuning/dpo-grpo]] — DPO and GRPO use LoRA adapters as their trainable component
- [[fine-tuning/frameworks]] — Axolotl, TRL, Unsloth all wrap PEFT's LoraConfig
- [[math/transformer-math]] — why weight updates have low intrinsic rank (the mathematical justification)
- [[infra/gpu-hardware]] — VRAM requirements for different LoRA/QLoRA configurations

## Open Questions

- Does targeting all linear layers (including MLP) consistently outperform attention-only LoRA for style tasks?
- Is NF4 still the optimal 4-bit quantisation type, or have newer formats (e.g., fp8 for training) surpassed it?
- What is the practical maximum rank where further increases produce diminishing returns across task types?
