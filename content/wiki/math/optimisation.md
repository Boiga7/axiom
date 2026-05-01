---
type: concept
category: math
tags: [optimisation, gradient-descent, adam, adamw, learning-rate, loss, backprop]
sources: []
updated: 2026-04-29
para: resource
tldr: Gradient descent, Adam/AdamW mechanics, cosine LR schedules, gradient clipping, and a diagnostic table for the six most common training instability symptoms.
---

# Optimisation for Deep Learning

> **TL;DR** Gradient descent, Adam/AdamW mechanics, cosine LR schedules, gradient clipping, and a diagnostic table for the six most common training instability symptoms.

How neural networks learn: gradient descent, the optimisers that make it practical, and the schedules that stabilise training. You need this to understand fine-tuning, debug training instability, and interpret training curves.

---

## Gradient Descent

The core idea: compute how much each parameter contributed to the loss, then nudge parameters in the direction that reduces it.

```
θ ← θ - η · ∇L(θ)
```

- `θ` — model parameters (weights)
- `η` — learning rate (step size)
- `∇L(θ)` — gradient of the loss with respect to parameters

**Stochastic Gradient Descent (SGD):** compute gradient on a single example (noisy but fast).
**Mini-batch SGD:** compute gradient on B examples at once. Standard in practice (B = 32-512).
**Batch GD:** compute gradient on the full dataset. Exact but impractical for LLMs.

### The Problem with Plain SGD

- Same learning rate for all parameters
- Gets stuck in saddle points
- Slow convergence on ill-conditioned loss landscapes (elongated valleys)

---

## Momentum

Accumulate a velocity vector across steps. Smooth out oscillations:

```
v_t = β v_{t-1} + (1-β) ∇L(θ_t)
θ_{t+1} = θ_t - η v_t
```

`β = 0.9` is the standard (90% memory of previous updates). Momentum accelerates through narrow valleys and dampens oscillations across them.

---

## Adam (Adaptive Moment Estimation)

The default optimiser for LLM training and fine-tuning.

```
m_t = β₁ m_{t-1} + (1-β₁) g_t          # 1st moment (mean of gradients)
v_t = β₂ v_{t-1} + (1-β₂) g_t²         # 2nd moment (variance of gradients)

m̂_t = m_t / (1 - β₁ᵗ)                  # bias correction
v̂_t = v_t / (1 - β₂ᵗ)                  # bias correction

θ_{t+1} = θ_t - η · m̂_t / (√v̂_t + ε)
```

Standard hyperparameters:
- `β₁ = 0.9` — gradient momentum
- `β₂ = 0.999` — gradient variance momentum
- `ε = 1e-8` — numerical stability
- `η = 1e-4` to `3e-4` — typical LLM fine-tuning range

**Intuition:** each parameter gets its own adaptive learning rate. Parameters with consistently large gradients (common features) get smaller updates. Rare parameters get larger updates. This is why Adam works well on sparse gradients (embeddings, attention).

```python
import torch.optim as optim

optimizer = optim.Adam(model.parameters(), lr=3e-4, betas=(0.9, 0.999), eps=1e-8)
```

---

## AdamW (Adam + Weight Decay)

The standard for transformer fine-tuning. Decouples weight decay from the gradient update:

**Adam with L2:** weight decay is absorbed into the gradient, scaled by the adaptive learning rate — unintended effect.
**AdamW:** weight decay applied directly to weights, independent of gradient scale — correct regularisation.

```python
optimizer = optim.AdamW(
    model.parameters(),
    lr=2e-4,
    betas=(0.9, 0.999),
    weight_decay=0.01,    # typical: 0.01-0.1
)
```

AdamW is what Hugging Face `Trainer` uses by default. Always use AdamW over Adam for transformer fine-tuning.

---

## Lion Optimiser

Memory-efficient alternative. Uses only the sign of the gradient (1 bit per parameter vs Adam's 2 moments).

```python
from lion_pytorch import Lion

optimizer = Lion(model.parameters(), lr=1e-4, weight_decay=0.01)
```

Lion uses 50% less optimizer memory than Adam (only 1 moment vs 2). Google Brain (2023) paper showed Lion matches or exceeds AdamW on vision transformers. Less validated for LLM fine-tuning — use AdamW unless VRAM is the bottleneck.

---

## Learning Rate Schedules

Constant learning rate rarely works. You need warmup + decay.

### Linear Warmup + Cosine Decay

The most common schedule for LLM fine-tuning:

```python
from transformers import get_cosine_schedule_with_warmup

scheduler = get_cosine_schedule_with_warmup(
    optimizer,
    num_warmup_steps=100,            # warmup over first 100 steps
    num_training_steps=total_steps,
)
```

Warmup prevents early large gradient steps from damaging random initialisation. Cosine decay smoothly reduces LR to near-zero at training end.

```
LR during warmup: η × (step / warmup_steps)
LR after warmup:  η × (1 + cos(π × progress)) / 2   where progress = (step - warmup) / (total - warmup)
```

### Linear Schedule

Simpler, often sufficient for short fine-tuning runs:

```python
from transformers import get_linear_schedule_with_warmup

scheduler = get_linear_schedule_with_warmup(
    optimizer,
    num_warmup_steps=50,
    num_training_steps=total_steps,
)
```

### Constant with Warmup

No decay — useful when you're not sure when to stop and want to evaluate at any checkpoint:

```python
from transformers import get_constant_schedule_with_warmup
```

---

## Gradient Accumulation

Simulate a larger batch size when VRAM is limited:

```python
accumulation_steps = 8
optimizer.zero_grad()

for i, batch in enumerate(dataloader):
    loss = model(**batch).loss / accumulation_steps
    loss.backward()
    
    if (i + 1) % accumulation_steps == 0:
        torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
        optimizer.step()
        scheduler.step()
        optimizer.zero_grad()
```

Effective batch size = `per_device_batch_size × num_gpus × accumulation_steps`.
With batch=4, 4 GPUs, 8 accumulation steps: effective batch = 128.

---

## Gradient Clipping

Prevents gradient explosion (training loss suddenly goes to NaN):

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```

Apply before `optimizer.step()`. Standard value: 1.0 for transformers.

---

## Training Instability Signals

| Symptom | Likely cause | Fix |
|---|---|---|
| Loss NaN immediately | LR too high | Reduce η by 10x |
| Loss oscillates wildly | LR too high or no warmup | Add warmup, reduce η |
| Loss plateaus early | LR too low | Increase η or reduce warmup |
| Loss spikes then recovers | Batch with outlier | Clip gradients |
| Loss never drops | Wrong task setup | Check data format, loss fn |
| Train loss low, val loss high | Overfitting | Add dropout, weight decay, reduce epochs |

---

## Practical Fine-Tuning Defaults

```python
# LoRA fine-tune of a 7B model
training_args = TrainingArguments(
    learning_rate=2e-4,             # typical LoRA LR
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,  # effective batch = 16
    warmup_ratio=0.03,              # 3% of steps for warmup
    lr_scheduler_type="cosine",
    weight_decay=0.01,
    max_grad_norm=1.0,
    fp16=True,                      # or bf16=True on Ampere+
)
```

---

## Key Facts

- Adam β defaults: β₁=0.9 (gradient momentum), β₂=0.999 (gradient variance), ε=1e-8
- Typical LoRA learning rate: 2e-4 with cosine schedule and 3% warmup ratio
- AdamW vs Adam: weight decay must be decoupled from gradient update — always use AdamW for transformers
- Lion optimiser: 50% less memory than Adam (1 moment vs 2); less validated for LLM fine-tuning
- Gradient clipping: max_norm=1.0 is standard; apply before optimizer.step()
- Gradient accumulation: effective batch = per_device_batch × num_gpus × accumulation_steps
- Loss NaN immediately → LR too high; reduce by 10x

## Connections

- [[math/linear-algebra]] — the matrix operations gradients flow through
- [[math/transformer-math]] — loss functions and Adam in transformer context
- [[fine-tuning/lora-qlora]] — LoRA changes which parameters are optimised
- [[fine-tuning/frameworks]] — TrainingArguments in Axolotl/TRL/Unsloth

## Open Questions

- Does Lion optimiser's lower memory footprint make it viable for QLoRA runs on consumer hardware?
- How sensitive are fine-tuned models to learning rate choice when using GRPO vs DPO training objectives?
- Is warmup ratio (3%) or fixed warmup steps (100) the better practice across different dataset sizes?
