---
type: concept
category: fine-tuning
tags: [dpo, grpo, orpo, ppo, rlhf, preference-optimisation, alignment]
sources: []
updated: 2026-04-29
para: resource
tldr: DPO is now the standard preference optimisation method (no reward model needed, 2-3x cheaper than PPO); GRPO from DeepSeek-R1 is the frontier method for verifiable reasoning tasks like math and code.
---

# DPO, GRPO, and Preference Optimisation

> **TL;DR** DPO is now the standard preference optimisation method (no reward model needed, 2-3x cheaper than PPO); GRPO from DeepSeek-R1 is the frontier method for verifiable reasoning tasks like math and code.

The training objectives that align models to human preferences. RLHF (PPO) was the original; DPO is now the standard; GRPO (from DeepSeek) is the frontier method for reasoning.

**Scope**: This page covers training objectives, TRL code patterns, and the decision framework for choosing between methods. For the conceptual RLHF pipeline, preference data generation, and PPO deep-dive, see [[fine-tuning/rlhf-dpo]].

---

## The Preference Learning Problem

Given a prompt, humans prefer some responses over others. The goal is to train a model that generates preferred responses. The training signal is pairwise preference data: (prompt, chosen_response, rejected_response).

---

## RLHF with PPO (the original)

**Pipeline:**
1. SFT: fine-tune base model on instruction-following examples
2. Reward model: train a classifier to predict human preference from comparison data
3. RL: use PPO to update the policy (language model) to maximise reward model score, with a KL penalty to stay close to the SFT model

**Problems with PPO:**
- Reward model is a separate model — adds training complexity and cost
- PPO is notoriously unstable — hyperparameter sensitive
- Reward hacking: policy learns to exploit reward model weaknesses
- Requires 3–4x the GPU memory of SFT

Still used for the most demanding alignment tasks (frontier model post-training), but overkill for most fine-tuning scenarios.

---

## DPO: Direct Preference Optimisation

**The idea (Rafailov et al., 2023):** Derive the optimal policy directly from preference data, without training a separate reward model.

DPO shows that the RLHF objective can be rearranged into a loss over (chosen, rejected) pairs that directly updates the policy:

```
L_DPO = -log σ(β · log(π_θ(y_w|x)/π_ref(y_w|x)) - β · log(π_θ(y_l|x)/π_ref(y_l|x)))
```

Where:
- y_w = winning (chosen) response
- y_l = losing (rejected) response  
- π_θ = the policy being trained
- π_ref = the reference SFT model (frozen)
- β = temperature parameter (controls how far from reference)

**In practice:** Load the SFT model as a reference (frozen), train a copy of it as the policy. The loss increases the probability of y_w and decreases the probability of y_l, relative to the reference.

```python
from trl import DPOTrainer, DPOConfig

training_args = DPOConfig(
    beta=0.1,
    learning_rate=5e-5,
    num_train_epochs=3,
)

trainer = DPOTrainer(
    model=policy_model,
    ref_model=reference_model,  # the frozen SFT model
    args=training_args,
    train_dataset=preference_dataset,  # {prompt, chosen, rejected}
    tokenizer=tokenizer,
)
trainer.train()
```

**Advantages over PPO:** No separate reward model, no RL instability, 2–3x less GPU memory. Results are competitive with PPO on most alignment benchmarks.

**β parameter:** Lower β = more divergence from reference allowed. Higher β = stay closer to reference. Typical range: 0.05–0.5. Default 0.1 is a good start.

---

## GRPO: Group Relative Policy Optimisation

Used to train DeepSeek-R1. Replaces the critic/value network in PPO with group-relative rewards. Dramatically simpler and cheaper.

**How it works:**
1. For each prompt, sample a **group** of G responses (G=8 is typical)
2. Score each response with a reward function (rule-based or LLM judge)
3. Normalise rewards within the group to get relative advantages
4. Update the policy to increase probability of high-reward responses, decrease low-reward ones

```
advantage_i = (reward_i - mean(rewards)) / std(rewards)
```

No value/critic network needed. No reward model. The reward signal can be:
- **Verifiable**: mathematical correctness, code tests passing, format compliance
- **Comparative**: LLM judge ranking the group

**Strengths:** 
- Excellent for tasks with verifiable rewards (math, code)
- DeepSeek-R1 achieves o1-level performance on reasoning benchmarks using only GRPO
- Much simpler to implement than PPO

**Weaknesses:**
- Requires sampling multiple responses per prompt (G× the inference compute)
- Less well-understood for subjective alignment tasks

---

## ORPO: Odds Ratio Preference Optimisation

Combines SFT and DPO into a single training objective. No separate SFT warmup needed.

Standard fine-tuning pipeline:
1. SFT pass → model learns to follow instructions
2. DPO pass → model learns preferences

ORPO pipeline:
1. ORPO pass → both simultaneously

The ORPO loss adds an odds ratio penalty (discouraging rejected responses) to the standard SFT loss:

```
L_ORPO = L_SFT + λ · L_OR
```

**When to use:** When you have preference data but no large SFT dataset to warm up on first. Simpler pipeline. Comparable quality to DPO in most evaluations.

---

## KTO: Kahneman-Tversky Optimisation

Uses scalar labels (good/bad) rather than pairwise comparisons. Based on prospect theory. Humans weigh losses more than equivalent gains.

**When to use:** When collecting pairwise preferences is impractical. A single human annotation per response (thumbs up/down) is enough.

---

## Dataset Format

All preference methods share the same fundamental data format:

```json
{
  "prompt": "Explain LoRA in one paragraph.",
  "chosen": "LoRA (Low-Rank Adaptation) fine-tunes language models by...",
  "rejected": "LoRA is a thing that makes models better by training them."
}
```

Dataset quality matters more than quantity. 500 high-quality preference pairs outperform 5,000 noisy ones.

---

## Choosing an Objective

```
Task has verifiable correct answers (math, code, format)?   → GRPO
Have preference pairs + trained SFT model already?          → DPO
Want one-pass training without SFT warmup?                  → ORPO
Have scalar labels only?                                    → KTO
Need maximum control / frontier model quality?              → PPO
```

---

## Key Facts

- DPO β parameter: 0.05-0.5 range; default 0.1; lower = more divergence from SFT reference allowed
- GRPO: sample G=8 responses per prompt; normalise rewards within group; no value/critic network
- ORPO: single-pass training combining SFT and preference — no SFT warmup pass needed
- KTO: uses scalar good/bad labels; no pairwise comparisons required
- 500 high-quality preference pairs outperform 5,000 noisy ones for DPO
- DeepSeek-R1 trained with GRPO achieves o1-level reasoning benchmark performance

## Common Failure Cases

**DPO loss goes to zero early in training, and generation quality does not improve**  
Why: if chosen and rejected responses in the dataset are too similar (both are reasonable but one is marginally better), the policy cannot learn a meaningful signal; the loss reaches zero without the model learning to consistently prefer the chosen response.  
Detect: DPO loss drops to near-zero within 100-200 steps; human evaluation shows no improvement in response quality vs the SFT baseline.  
Fix: audit your preference dataset for quality margin — chosen responses should be clearly better than rejected on a specific dimension; filter pairs where the quality difference is below a threshold.

**GRPO reward function is too sparse, causing most sampled responses to get the same score**  
Why: if the reward function returns binary 0/1 and almost all G=8 sampled responses score 0 (task is too hard), the advantage signal is near-zero for every sample and the policy does not update meaningfully.  
Detect: GRPO training loss stays flat; `reward/mean` metric in logs stays near 0 for many batches; generation quality does not improve.  
Fix: use a partial credit reward function where intermediate steps earn partial scores; alternatively, use curriculum learning — start with easier examples where the model can occasionally score 1/1.

**DPO `beta` set too low causes the policy to diverge and produce incoherent outputs**  
Why: a low beta (0.01 or lower) allows the policy to drift far from the SFT reference; on small datasets this causes the model to find degenerate solutions — very high reward on training examples but nonsensical generations.  
Detect: chosen response log probability increases but the model generates repetitive or incoherent text during evaluation; `eval/loss` diverges upward after initially decreasing.  
Fix: increase beta to 0.1 as a starting point; treat beta as the primary hyperparameter in DPO sweeps; use the SFT model's perplexity on held-out data as an early stopping signal.

**ORPO training improves preference alignment but hurts instruction-following because no SFT warmup was used**  
Why: ORPO's single-pass training on preference data assumes the model already has reasonable instruction-following behaviour; applied directly to a base model (not an SFT checkpoint), ORPO optimises for preferences without first establishing instruction-following.  
Detect: ORPO-trained model follows preferences from the training data but fails to follow basic instructions not in the training set.  
Fix: always start ORPO from an SFT checkpoint (not a base model), even if the SFT training was minimal; the "no warmup needed" claim applies to skipping a second SFT pass, not skipping SFT entirely.

## Connections

- [[fine-tuning/rlhf-dpo]] — sibling page; full RLHF pipeline, PPO mechanics, preference data generation, and RLHF vs DPO comparison
- [[fine-tuning/decision-framework]] — which objective to choose for a given alignment problem
- [[fine-tuning/lora-qlora]] — how LoRA adapters are trained using DPO/GRPO objectives
- [[fine-tuning/frameworks]] — TRL `DPOTrainer`, `GRPOTrainer`, `ORPOTrainer` implement all objectives
- [[safety/constitutional-ai]] — CAI uses RLHF with AI-generated preference labels
- [[data/rlhf-datasets]] — the preference datasets DPO training consumes

## Open Questions

- Under what conditions does GRPO outperform DPO for non-verifiable alignment tasks?
- How sensitive is DPO to the quality ratio of chosen vs rejected responses in the dataset?
- Is there a practical upper bound on β beyond which DPO stops improving over the reference?
