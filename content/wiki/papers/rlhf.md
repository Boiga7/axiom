---
type: paper
category: papers
para: resource
tags: [rlhf, instructgpt, alignment, ppo, reward-model, ouyang, stiennon, 2020, 2022]
sources: []
updated: 2026-05-01
tldr: "Two papers that define RLHF as an alignment technique: Stiennon et al. (2020) demonstrated it at scale for summarisation; Ouyang et al."
---

# RLHF: Reinforcement Learning from Human Feedback

Two papers that define RLHF as an alignment technique: Stiennon et al. (2020) demonstrated it at scale for summarisation; Ouyang et al. (2022, InstructGPT) applied it to make GPT-3 follow instructions.

---

## Stiennon et al. (2020) — Learning to Summarise with Human Feedback

**Citation:** Stiennon, N., Ouyang, L., Wu, J., Ziegler, D., Lowe, R., Voss, C., ... & Christiano, P. F. (2020). Learning to summarise with human feedback. NeurIPS 2020.

**One sentence:** Collect human preferences between pairs of model summaries, train a reward model on those preferences, then use PPO to fine-tune the language model to maximise the reward.

### The Three-Stage RLHF Pipeline

This paper formalised RLHF for language models. The pipeline is the foundation of all subsequent alignment work:

**Stage 1 — Supervised Fine-Tuning (SFT)**
Fine-tune the base model on high-quality demonstrations of the target behaviour. Gives the model a starting point in the right distribution.

**Stage 2 — Reward Model Training**
Collect human preference data: show a labeller two model outputs, ask which is better. Train a reward model (RM) to predict human preferences:
```
RM(x, y) → scalar reward score
```
where x is the input and y is the model output. The RM learns to assign higher scores to outputs humans prefer.

**Stage 3 — RL Fine-Tuning with PPO**
Use Proximal Policy Optimisation to fine-tune the SFT model to maximise expected reward:
```
objective = E[RM(x, y)] - β · KL(π_RL || π_SFT)
```
The KL penalty prevents the model from drifting too far from the SFT policy. Stops reward hacking.

---

## InstructGPT (Ouyang et al., 2022) — RLHF at Scale for Instruction Following

**Citation:** Ouyang, L., Wu, J., Jiang, X., Almeida, D., Wainwright, C., Mishkin, P., ... & Lowe, R. (2022). Training language models to follow instructions with human feedback. NeurIPS 2022.

**One sentence:** Applying the RLHF pipeline to GPT-3 with 40 contractors labelling instruction-following quality produced InstructGPT — a 1.3B model that humans preferred to the 175B raw GPT-3.

### Key Findings

**A 1.3B model outperformed 175B GPT-3.** Human raters preferred InstructGPT-1.3B outputs to raw GPT-3-175B outputs 85% of the time. Alignment matters more than raw scale for practical usefulness.

**The labelling task:** Contractors were given prompts and asked to rank pairs of outputs by helpfulness, harmlessness, and honesty. ~13,000 labelled comparisons were used for the reward model.

**Alignment tax is small.** RLHF slightly degraded performance on some NLP benchmarks (the model was optimised for human preferences, not benchmark metrics). But the absolute drop was small — <5% on most tasks.

### Instruction Categories Tested

- Question answering
- Summarisation
- Open-ended generation
- Classification
- Brainstorming
- Code generation

InstructGPT improved substantially across all categories over raw GPT-3.

---

## Why RLHF Works (And Its Problems)

**Why it works:**
- The base model has capability but no alignment to human intent
- SFT teaches the format; reward model teaches the values; PPO optimises for both
- Human preferences encode nuance that is difficult to specify as a rule

**Problems:**

| Problem | Description |
|---|---|
| Reward hacking | Model exploits the RM: long verbose answers score well even if unhelpful |
| RM collapse | RM preferences diverge from true human values after many updates |
| Labeller variance | Different labellers have different standards; preferences are noisy |
| Scalability | Human labelling is expensive; doesn't scale to all tasks |
| RLHF instability | PPO is notoriously sensitive to hyperparameters |

DPO (2023) removed the explicit reward model and PPO, replacing them with a direct loss on preference pairs. Constitutional AI (2022) replaced human harm labels with AI-generated labels.

---

## Key Facts

- Stiennon et al. (2020): first large-scale RLHF for language models; demonstrated on TL;DR summarisation
- InstructGPT (2022): ChatGPT's direct predecessor; 40 labellers, ~13K preference comparisons
- Three stages: SFT → Reward Model → PPO fine-tuning
- KL penalty: β · KL(π_RL || π_SFT) prevents reward hacking
- 1.3B InstructGPT > 175B GPT-3 by human preference — alignment > scale for practical use
- Replaced by DPO (simpler, more stable); supplemented by Constitutional AI (scalable labels)

---

## Connections

[[papers/key-papers]] · [[papers/constitutional-ai]] · [[papers/dpo]] · [[fine-tuning/rlhf-dpo]] · [[fine-tuning/frameworks]] · [[safety/constitutional-ai]]
