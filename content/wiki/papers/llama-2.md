---
type: paper
category: papers
para: resource
tags: [llama-2, meta, microsoft, touvron, 2023, rlhf, chat, gqa, ghost-attention, commercial-licence, 70b]
sources: []
updated: 2026-05-03
tldr: Llama 2 (Touvron et al., Meta + Microsoft, July 2023) adds RLHF-tuned chat models (7B–70B), doubles the pretraining budget to 2T tokens, extends context to 4096 tokens, and introduces Ghost Attention for multi-turn consistency — with a commercial licence covering up to 700M monthly users.
---

# Llama 2: Open Foundation and Fine-Tuned Chat Models (Touvron et al., 2023)

**Citation:** Touvron, H., Martin, L., Stone, K., Albert, P., Almahairi, A., Babaei, Y., ... & Scialom, T. (2023). Llama 2: Open Foundation and Fine-Tuned Chat Models. arXiv:2307.09288. Meta AI + Microsoft.

**Published:** July 18, 2023.

**One sentence:** LLaMA's successor — 2T token pretraining, 4096 context, RLHF chat variants (Llama 2-Chat), Ghost Attention for dialogue consistency, and a commercial licence — transforming LLaMA from a research artefact into a production-deployable open model family.

---

## What Changed from LLaMA 1

| Dimension | LLaMA 1 | Llama 2 |
|---|---|---|
| Pretraining tokens | 1–1.4T | 2T |
| Context window | 2048 | 4096 |
| Model sizes | 7B, 13B, 33B, 65B | 7B, 13B, 34B, 70B |
| Chat variants | None | Llama 2-Chat (SFT + RLHF) |
| Licence | Research only | Commercial (≤700M MAU) |
| GQA | No | Yes (70B only) |
| Ghost Attention | No | Yes (Chat only) |
| Safety investment | Minimal | Red-teaming, dual reward models |

---

## Pretraining

- 2 trillion tokens from public sources; exact data mix not fully disclosed.
- 40% more tokens than LLaMA 1; cleaner data filtering pipeline.
- Context length doubled to 4096 via RoPE scaling.
- Architecture otherwise identical to LLaMA 1: RMSNorm, SwiGLU, RoPE.
- Grouped Query Attention (GQA) added for the 70B model only — reduces KV cache memory at inference without meaningfully degrading quality.

> [Source: Perplexity research, 2026-05-03] [unverified]

---

## Fine-Tuning Pipeline — Llama 2-Chat

Three stages to produce the chat variants:

### Stage 1: Supervised Fine-Tuning (SFT)
- ~27,540 high-quality instruction/response pairs collected from human annotators.
- The paper notes this "tens of thousands" scale was sufficient for a strong SFT baseline — more data was not necessarily better past this point.

### Stage 2: Reward Model Training
Two separate reward models trained in parallel:
- **Helpfulness reward model** — trained on human preference comparisons favouring more helpful responses.
- **Safety reward model** — trained on comparisons specifically targeting harm avoidance.

Dual reward models rather than a single scalar is a key design choice; it keeps helpfulness and safety as separate optimisation targets.

### Stage 3: RLHF (PPO)
Proximal Policy Optimisation with the dual reward models. Combined reward = helpfulness reward + safety reward (weighted). Iterative: the reward models are retrained on fresh human preferences collected from the evolving policy.

The paper also used **rejection sampling** as an alternative to PPO — generating K samples and taking the one with the highest reward — finding it competitive with PPO for some tasks.

> [Source: Perplexity research, 2026-05-03] [unverified]

---

## Ghost Attention (GAtt)

A technique to preserve system-prompt instructions across long multi-turn conversations.

**Problem:** After several dialogue turns, the chat model tends to "forget" or violate the system prompt (e.g., "act as a Shakespearean poet"). Standard RLHF does not have a mechanism to enforce long-horizon adherence.

**Solution:** During SFT, the system instruction is synthetically injected into every human turn of the training data — the model therefore trains to behave as if the instruction is present at every step. At inference, the instruction only appears once (as normal), but the model has learned the multi-turn conditioning pattern.

GAtt improved multi-turn instruction consistency significantly. It enabled role-playing, persona adherence, and constrained conversation scenarios to work reliably across long dialogues.

---

## Grouped Query Attention (GQA)

Applied to the 70B model only.

Standard multi-head attention (MHA) uses one K and V head per Q head. In GQA, multiple Q heads share a single K/V head:

```
MHA:  n_q heads, n_q K/V heads     (n_kv = n_q)
GQA:  n_q heads, n_g K/V groups   (n_g << n_q)
MQA:  n_q heads, 1 shared K/V head (extreme case)
```

Llama 2-70B uses 8 query groups. This reduces the KV cache size at inference by ~8× compared to MHA, which is critical for serving 70B models — the KV cache is often the memory bottleneck at long contexts.

Quality degradation vs MHA is minimal and recoverable with slightly more training steps.

---

## Benchmark Results

Llama 2-Chat outperforms open-source chat models of the time on most evaluations. The 70B variant is competitive with GPT-3.5 on several tasks.

| Benchmark | Llama 2-70B | Llama 2-Chat-70B | GPT-3.5 | Falcon-40B |
|---|---|---|---|---|
| MMLU (5-shot) | 68.9 | — | 70.0 | 55.4 |
| TruthfulQA | — | 64.1 | 57.4 | — |
| Toxigen | — | lower is better | — | — |

Human evaluations rated Llama 2-Chat-70B as preferable to ChatGPT (GPT-3.5) for helpfulness at a similar rate, and significantly safer on adversarial prompts.

> [Source: Perplexity research, 2026-05-03] [unverified — verify exact benchmark numbers from arXiv:2307.09288]

---

## Safety Investment

The most thorough safety work in an open-source LLM at the time of release:

- **Dual reward models** — separate helpfulness and safety reward signals prevent single-objective goodhart gaming.
- **Red teaming** — professional red-teamers ran structured adversarial sessions covering jailbreaks, persona attacks, multi-turn manipulation.
- **Red-team data in SFT** — responses to red-team prompts were used as training examples.
- **Meta Responsible AI team involvement** — safety evaluation conducted by a dedicated team, not just researchers.

The paper's safety section is 25+ pages; unusually detailed for an open-source release.

---

## Licence

The Llama 2 Community Licence:
- Free for research and commercial use.
- **Exception:** Restricted for products with 700 million or more monthly active users (effectively only Meta's FAANG-scale competitors).
- Model weights redistributable.
- Fine-tuned derivatives permitted.

This was a significant departure from LLaMA 1's research-only restriction and directly drove adoption: companies could now build commercial products on top of Llama 2 without legal ambiguity.

---

## What It Enabled

- **CodeLlama (August 2023):** Meta fine-tuned Llama 2 on code with a 100K context extension. Became the dominant open-source code model until DeepSeek Coder.
- **Mistral 7B (September 2023):** Used Llama 2's architecture with sliding window attention; outperformed Llama 2-13B at 7B scale.
- **Llama 2 fine-tuning ecosystem:** Axolotl, TRL, Unsloth all have Llama 2 as a primary target. Thousands of task-specific derivatives on HuggingFace Hub.
- **Llama 3 (April 2024):** Meta's successor; 8B/70B/405B; 128K context; substantially stronger across the board.
- **Commercial viability normalised:** Llama 2 made "deploy open weights in production" a standard option; every subsequent open-source model release included a commercial licence.

---

## Limitations

- 70B requires at minimum 2× 40GB GPUs (or 4-bit quantisation for single-GPU inference).
- 34B model was not released with GQA; this was an inconsistency in the release lineup.
- Safety fine-tuning made the model over-cautious on some benign prompts — excessive refusal was a documented complaint.
- The 700M MAU threshold, while permissive, created legal uncertainty for rapidly growing products.
- Context window (4096) already below Anthropic Claude 2 (100K) at the time of release.

---

## Connections

- [[papers/llama]] — LLaMA 1: the predecessor; architecture, training data, original benchmark results
- [[fine-tuning/lora-qlora]] — Llama 2 became the canonical base model for the LoRA/QLoRA fine-tuning ecosystem
- [[fine-tuning/dpo]] — DPO emerged partly as a simpler alternative to Llama 2's PPO-based RLHF pipeline
- [[papers/rlhf]] — Llama 2-Chat is the most fully documented public RLHF pipeline until GPT-4; detailed comparison point
- [[papers/constitutional-ai]] — Anthropic's RLAIF approach vs Meta's human-preference RLHF: different training philosophies for alignment

## Open Questions

- Did the dual reward model architecture (helpfulness + safety separate) produce better safety/helpfulness balance than single-reward approaches like InstructGPT?
- How much of Llama 2-Chat's safety improvement was from red-team data in SFT vs the RLHF safety reward signal specifically?
