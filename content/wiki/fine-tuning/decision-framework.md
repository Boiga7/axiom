---
type: concept
category: fine-tuning
tags: [fine-tuning, lora, qlora, dpo, grpo, sft, peft, trl, axolotl]
sources: []
updated: 2026-04-29
para: resource
tldr: Fine-tuning decision framework — 57% of AI organisations never fine-tune; the decision tree runs prompting, then RAG, then SFT, then DPO/GRPO, escalating only when the prior approach genuinely fails.
---

# Fine-Tuning

> **TL;DR** Fine-tuning decision framework — 57% of AI organisations never fine-tune; the decision tree runs prompting, then RAG, then SFT, then DPO/GRPO, escalating only when the prior approach genuinely fails.

Updating a pretrained model's weights on a domain-specific dataset to change its behaviour, style, or capabilities. The last resort after prompting and RAG have been exhausted — but the right tool when they genuinely can't solve the problem.

---

## The Decision Framework

```
1. Can better prompting solve it?  →  Try XML structuring, few-shot, CoT (see [[prompting/techniques]])
2. Can RAG solve it?               →  Add a knowledge store (see [[rag/pipeline]])
3. Is it a format/style problem?   →  SFT fine-tuning (collect 500–5,000 examples)
4. Is it a values/preference problem? → DPO/GRPO (collect preference pairs)
5. Is it a capability gap?         →  Full fine-tuning or pretraining on domain data
```

57% of organisations that build AI products don't fine-tune at all. For most knowledge retrieval and reasoning tasks, prompting + RAG is enough. Fine-tune when:
- You need a consistent output format that prompting can't lock in
- Proprietary domain knowledge must be in the weights (can't be in context at inference time)
- Inference cost reduction — fine-tuned small model can match large model on narrow tasks
- Style: the model must sound like your brand, not like a generic assistant

---

## Training Objectives

### Supervised Fine-Tuning (SFT)

Train on (input, output) pairs. The model learns to produce outputs that look like the training examples. Simplest approach.

**When to use:** Style alignment, format compliance, instruction following for specific tasks.

**Dataset size:** 500–5,000 examples for narrow tasks. 50,000+ for broad capability improvements.

### DPO (Direct Preference Optimisation)

Train on (prompt, preferred_response, rejected_response) triples. Optimises the policy directly to prefer one output over another — no reward model required.

**Why DPO over PPO:** No RL instability, no reward model to train separately, 2–3x cheaper to run. Near-equivalent results for most alignment tasks. See [[fine-tuning/dpo-grpo]].

### GRPO (Group Relative Policy Optimisation)

Used in DeepSeek-R1. Samples a group of responses for each prompt, ranks them, optimises toward better-ranked outputs. Strong for reasoning tasks (math, code). No value/critic model needed.

### ORPO (Odds Ratio Preference Optimisation)

Combines SFT and preference learning in a single loss. Simpler pipeline than DPO — no separate SFT warmup required.

### KTO (Kahneman-Tversky Optimisation)

Works with scalar labels (good/bad) rather than pairwise preferences. Useful when collecting preference pairs is hard.

---

## LoRA: The Default PEFT Method

See [[fine-tuning/lora-qlora]] for full treatment. Short version:

- Freeze base model weights
- Add low-rank adapter matrices A (r × k) and B (d × r) to attention layers
- Only train A and B (~0.1–1% of total parameters)
- At inference, merge: W_effective = W + α·BA

**Typical hyperparameters:**
- Rank `r`: 8–64 (higher = more capacity = more compute)
- Alpha `α`: typically 2× rank
- Target modules: `q_proj, v_proj` minimum; `q_proj, k_proj, v_proj, o_proj` for full attention fine-tuning

### QLoRA

LoRA on a 4-bit quantised base model. Enables fine-tuning 7B models on a single RTX 4070 Ti (12GB VRAM), 70B models on a single A100 80GB.

The base model is loaded in NF4 (4-bit NormalFloat quantisation). LoRA adapters are trained in bf16. During the backward pass, the base model is dequantised on-the-fly.

Quality penalty vs full LoRA: ~1–3% on most benchmarks. Almost always worth it for the hardware savings.

---

## Frameworks

| Framework | Strength | When to use |
|---|---|---|
| **Axolotl** (v0.29) | Widest objective coverage, config-file driven | Production fine-tuning; supports all objectives |
| **TRL** | Canonical RLHF/DPO/PPO; HuggingFace ecosystem | When you need deep customisation |
| **Unsloth** | 2–4x faster training, lower memory | When speed/cost matters; wraps TRL |
| **LLaMA-Factory** | GUI + code; many models supported | Quick experiments, non-expert users |
| **HuggingFace PEFT** | Foundation library for LoRA/QLoRA | Used under the hood by all others |

**Axolotl config example (minimal DPO):**
```yaml
base_model: meta-llama/Meta-Llama-3-8B-Instruct
model_type: LlamaForCausalLM
tokenizer_type: AutoTokenizer
load_in_4bit: true
adapter: qlora
lora_r: 16
lora_alpha: 32
lora_target_modules: [q_proj, k_proj, v_proj, o_proj]
datasets:
  - path: my_preference_dataset.jsonl
    type: chatml.intel
rl: dpo
learning_rate: 5e-5
num_epochs: 3
```

---

## Hardware Guide

| Model size | Method | Minimum VRAM |
|---|---|---|
| 7B–8B | QLoRA | 12GB (RTX 4070 Ti) |
| 7B–8B | LoRA (fp16) | 24GB (RTX 3090/4090) |
| 13B | QLoRA | 16GB (RTX 4080) |
| 70B | QLoRA | 48GB (2× A6000) |
| 70B | QLoRA | 80GB (A100 80GB) |
| 405B | QLoRA | 4× A100 80GB |

For most practical fine-tuning tasks: rent A100 40GB or H100 instances on Lambda Labs, RunPod, or Vast.ai. Single-run cost for 7B QLoRA: ~$5–15.

---

## Evaluation After Fine-Tuning

Never deploy a fine-tuned model without comparing it to the base model on your eval suite. Common failure modes:
- **Catastrophic forgetting** — model gets better at the fine-tuned task but worse at everything else
- **Sycophancy increase** — preference tuning with reward hacking teaches the model to flatter
- **Format overfitting** — model applies the fine-tuned format to every response

Run [[evals/methodology]] before and after. A 2% improvement on the target task plus 5% degradation on general tasks is often not worth it.

---

## Key Facts

- 57% of AI organisations do not fine-tune at all
- SFT dataset size: 500-5,000 examples for narrow tasks; 50,000+ for broad capability improvement
- QLoRA on 7B: 12GB VRAM (RTX 4070 Ti); 70B: 80GB (A100 80GB) or 2× A6000 48GB
- Single QLoRA run on a 7B model: ~$5-15 on rented A100
- Catastrophic forgetting is the most common post-fine-tuning failure — always run evals before and after
- Quality penalty for QLoRA vs full LoRA: ~1-3% on most benchmarks

## Connections

- [[fine-tuning/lora-qlora]] — LoRA and QLoRA parameter mechanics in depth
- [[fine-tuning/dpo-grpo]] — preference optimisation algorithms (DPO, GRPO, ORPO, KTO)
- [[fine-tuning/frameworks]] — Axolotl, TRL, Unsloth setup and config
- [[rag/pipeline]] — the alternative to fine-tuning for knowledge tasks
- [[data/synthetic-data]] — generating fine-tuning datasets with LLMs
- [[evals/methodology]] — evaluating before and after to catch catastrophic forgetting

## Open Questions

- At what point does prompting + RAG genuinely fail to match a fine-tuned model for format compliance?
- Is ORPO now the default over DPO for combined SFT+preference pipelines, or are results inconsistent?
- What is the minimum dataset size for QLoRA to measurably shift a 7B model's style without overfitting?
