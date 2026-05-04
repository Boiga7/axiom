---
type: concept
category: fine-tuning
tags: [rlhf, dpo, ppo, preference-optimisation, fine-tuning, alignment, grpo, orpo]
sources: []
updated: 2026-05-01
para: resource
tldr: RLHF trains a reward model from human preferences then uses PPO to optimise against it — powerful but complex. DPO skips the reward model entirely and optimises directly on preference pairs, making it 3-5x simpler with comparable results on most tasks.
---

# RLHF and DPO

Two approaches to aligning a language model to human preferences after SFT (supervised fine-tuning). Both use preference data. Pairs of responses where humans (or another model) judged one better than the other. They differ in how that preference signal is applied.

---

## The Problem They Solve

A model fine-tuned on demonstrations knows how to produce responses, but not necessarily which of two responses a human would prefer. Preference optimisation closes that gap: given the same prompt, teach the model to prefer the higher-quality response.

The training signal is preference pairs: `(prompt, chosen_response, rejected_response)`.

---

## RLHF — Reinforcement Learning from Human Feedback

The original alignment technique, used to train InstructGPT (2022) and early Claude models.

**Three-stage pipeline:**

**Stage 1 — SFT** — fine-tune on demonstrations to get a capable base.

**Stage 2 — Reward model training** — train a separate model to predict human preferences:
```python
# Reward model: takes (prompt, response), outputs scalar reward
# Trained on preference pairs: reward(chosen) > reward(rejected)
from trl import RewardTrainer, RewardConfig

reward_config = RewardConfig(
    output_dir="reward-model",
    per_device_train_batch_size=4,
    num_train_epochs=1,
)
trainer = RewardTrainer(
    model=reward_model,
    args=reward_config,
    train_dataset=preference_dataset,  # has "chosen" and "rejected" columns
    tokenizer=tokenizer,
)
trainer.train()
```

**Stage 3 — PPO** — use Proximal Policy Optimisation to fine-tune the policy model against the reward model, with a KL penalty to prevent it drifting too far from the SFT baseline:
```python
from trl import PPOTrainer, PPOConfig

ppo_config = PPOConfig(
    model_name="sft-model",
    learning_rate=1.41e-5,
    batch_size=128,
    kl_penalty="kl",           # penalise divergence from SFT model
    target_kl=0.1,
)
ppo_trainer = PPOTrainer(
    config=ppo_config,
    model=policy_model,
    ref_model=ref_model,       # frozen SFT model for KL reference
    tokenizer=tokenizer,
    reward_model=reward_model,
)
```

**Why RLHF is powerful:** the reward model generalises beyond training examples — it can score novel responses the human never rated. PPO explores the response space and finds high-reward outputs humans might not have demonstrated.

**Why RLHF is painful:**
- Three separate training runs
- PPO is notoriously unstable — sensitive to learning rate, batch size, KL coefficient
- Reward hacking: the policy learns to exploit reward model errors ("reward model is not the same as human preferences")
- Memory intensive: need policy + reference + reward model in memory simultaneously

---

## DPO — Direct Preference Optimisation

Published 2023 (Rafailov et al.). Mathematically shows that the RLHF objective can be optimised directly on the policy without a separate reward model. The reward is implicit in the policy itself.

**One-stage (after SFT):**
```python
from trl import DPOTrainer, DPOConfig

dpo_config = DPOConfig(
    output_dir="dpo-model",
    beta=0.1,                  # KL regularisation strength — higher = stay closer to SFT
    learning_rate=5e-7,
    per_device_train_batch_size=2,
    num_train_epochs=1,
)
dpo_trainer = DPOTrainer(
    model=sft_model,
    ref_model=ref_model,       # frozen SFT model
    args=dpo_config,
    train_dataset=preference_dataset,  # "prompt", "chosen", "rejected"
    tokenizer=tokenizer,
)
dpo_trainer.train()
```

**The loss function** — DPO maximises the log-probability ratio of chosen vs rejected, regularised by KL from the reference:

```
L_DPO = -E[log σ(β log(π(chosen)/π_ref(chosen)) - β log(π(rejected)/π_ref(rejected)))]
```

In practice: the model is rewarded for increasing the likelihood of chosen responses relative to what the SFT model would predict, and penalised for increasing rejected likelihood.

**Why DPO won for most teams:**
- No reward model to train
- No PPO instability
- Standard cross-entropy training loop — same tools as SFT
- Comparable or better results on most alignment tasks

---

## Newer Variants

| Method | Key idea | When to use |
|---|---|---|
| **DPO** | Direct optimisation, needs ref model | Default choice post-SFT |
| **IPO** | Identity preference optimisation — fixes overfitting in DPO | DPO is overfit on small datasets |
| **KTO** | Kahneman-Tversky Optimisation — uses scalar "good/bad" labels, not pairs | Easier to collect labels |
| **ORPO** | Odds Ratio Preference Optimisation — no ref model needed | Fastest, fewest resources |
| **GRPO** | Group Relative Policy Optimisation (DeepSeek) — uses group of outputs as baseline | Reasoning tasks, math |

**GRPO** is notable for being used to train DeepSeek-R1. It scores a group of sampled outputs relative to each other rather than using a fixed reward model:
```python
# GRPO: sample G outputs per prompt, compute reward for each,
# normalise within the group, use as advantage signal
from trl import GRPOTrainer, GRPOConfig

grpo_config = GRPOConfig(
    output_dir="grpo-model",
    num_generations=8,         # G = group size
    reward_funcs=["accuracy", "format"],
)
```

---

## RLHF vs DPO — When to Use Each

| | RLHF + PPO | DPO |
|---|---|---|
| Complexity | High — 3 stages, PPO tuning | Low — 1 stage after SFT |
| Stability | Low — PPO is finicky | High — standard training |
| Exploration | Yes — PPO searches response space | No — optimises given pairs only |
| Online/offline | Online (generates new responses) | Offline (fixed dataset) |
| Data requirement | Fewer pairs needed (reward model generalises) | More pairs for coverage |
| Best for | Frontier model alignment, complex behavioural goals | Task-specific alignment, most production use cases |

**Rule of thumb:** start with DPO. Only switch to RLHF if DPO plateaus and you have the infrastructure.

---

## Preference Data

Both methods need `(prompt, chosen, rejected)` triples. Sources:

- **Human annotation** — most expensive, highest signal. Used for frontier models.
- **AI feedback** (RLAIF / Constitutional AI) — use a stronger model as the judge. Anthropic's Constitutional AI generates preference data by having the model critique its own outputs.
- **Implicit feedback** — user thumbs up/down, click-through, session length as proxy.
- **Synthetic** — generate multiple responses, score with a reward model, use top vs bottom as pairs.

```python
# Generating synthetic preference pairs with an LLM judge
def create_preference_pair(prompt: str, response_a: str, response_b: str) -> dict:
    judgment = client.messages.create(
        model="claude-sonnet-4-6",
        system="You are an AI evaluator. Pick the better response and explain why.",
        messages=[{"role": "user", "content": f"Prompt: {prompt}\n\nA: {response_a}\n\nB: {response_b}\n\nWhich is better?"}]
    )
    chosen = response_a if "A" in judgment.content[0].text else response_b
    rejected = response_b if chosen == response_a else response_a
    return {"prompt": prompt, "chosen": chosen, "rejected": rejected}
```

---

## Key Facts

- RLHF (2022, InstructGPT) introduced training LLMs from human preference pairs via PPO
- DPO (2023) achieves similar alignment without a reward model — now the default for most teams
- `beta` in DPO controls how far the policy can drift from the SFT reference — higher = more conservative
- GRPO (DeepSeek, 2024) extends preference optimisation to reasoning via group-relative rewards
- KTO and ORPO remove the need for paired data (KTO) or the reference model (ORPO) respectively
- Preference data quality matters more than quantity — noisy labels hurt more than fewer clean ones

## Common Failure Cases

**PPO reward hacking — model learns to exploit reward model weaknesses rather than genuinely improving**  
Why: the PPO policy optimises for the reward model's scores, not actual human preferences; if the reward model has blind spots (e.g., rewards verbosity, or penalises brevity), the policy exploits these rather than learning better behaviour.  
Detect: reward model scores increase steadily but human preference ratings plateau or decline; the model starts producing unusually long or formulaic responses.  
Fix: add a KL penalty (`kl_penalty="kl"`) and monitor the KL divergence from the SFT reference — cap it with `target_kl`; periodically sample responses and run human evaluation rather than relying solely on reward model scores.

**DPO dataset chosen/rejected pairs are mislabelled, silently degrading the model**  
Why: if labellers are inconsistent or the preference signal is ambiguous, a significant fraction of pairs will have the wrong label; DPO treats all pairs equally, so mislabelled pairs actively hurt the model.  
Detect: DPO training loss decreases normally but human evaluation shows no improvement or slight degradation; auditing a random sample of 50 pairs reveals >10% mislabelling rate.  
Fix: use inter-annotator agreement checks during labelling; filter pairs below a confidence threshold; use Constitutional AI self-critique to generate synthetic labels before using them as training signal.

**Reference model not frozen during DPO, causing undefined training dynamics**  
Why: `ref_model` in `DPOTrainer` must remain frozen (not updated); if gradients flow through the reference model due to a misconfigured `requires_grad`, the loss function breaks — the model is optimising a moving target.  
Detect: DPO loss behaves erratically (spikes, then drops unexpectedly); training is much slower than expected (2× the expected memory usage for the model size).  
Fix: confirm the reference model has `requires_grad_(False)` on all parameters; in TRL's `DPOTrainer`, the reference model is frozen by default — only override this intentionally.

**GRPO group size G too small causes high variance in the advantage estimates**  
Why: with G=2 or G=4, the mean and std of rewards within the group are unstable; the normalised advantage signal is noisy and the policy updates oscillate rather than converging.  
Detect: GRPO training shows high variance in `reward/std` and `advantage/mean` metrics; loss fluctuates without a clear downward trend.  
Fix: use G=8 as the minimum group size; increase to G=16 for high-variance reward functions; this comes at the cost of G× inference compute per training step.

## Connections

- [[papers/rlhf]] — original InstructGPT RLHF paper (Ouyang et al., 2022)
- [[papers/dpo]] — DPO paper (Rafailov et al., 2023)
- [[safety/constitutional-ai]] — Anthropic's approach using AI feedback instead of human labellers
- [[fine-tuning/frameworks]] — TRL (canonical RLHF/DPO library), Axolotl, Unsloth
- [[fine-tuning/lora-qlora]] — LoRA is almost always used alongside DPO to reduce memory cost
- [[fine-tuning/dpo-grpo]] — sibling page; covers the DPO/GRPO training objectives with TRL code patterns
- [[data/rlhf-datasets]] — datasets of human preference pairs for training
## Open Questions

- What training data quality issues cause the most subtle fine-tuning failures?
- When does fine-tuning produce worse results than prompt engineering alone?
