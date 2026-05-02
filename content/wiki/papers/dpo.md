---
type: paper
category: papers
para: resource
tags: [dpo, direct-preference-optimization, alignment, rafailov, 2023, rlhf-replacement]
sources: []
updated: 2026-05-01
tldr: DPO shows that the RLHF reward model and PPO optimisation loop can be eliminated — the LLM itself encodes an implicit reward function, allowing direct optimisation on preference pairs with a simple classification-style loss.
---

# Direct Preference Optimization (Rafailov et al., 2023)

**Citation:** Rafailov, R., Sharma, A., Mitchell, E., Manning, C. D., Ermon, S., & Finn, C. (2023). Direct Preference Optimization: Your Language Model is Secretly a Reward Model. NeurIPS 2023.

**One sentence:** DPO shows that the RLHF reward model and PPO optimisation loop can be eliminated — the LLM itself encodes an implicit reward function, allowing direct optimisation on preference pairs with a simple classification-style loss.

---

## What Problem It Solved

Standard RLHF requires three separate stages: SFT → reward model training → PPO fine-tuning. PPO is notoriously unstable and computationally expensive. The reward model is a separate model that can diverge from true human preferences.

DPO collapses the reward model + PPO into a single supervised loss applied directly to the language model, using only (prompt, chosen, rejected) triplets.

---

## Core Insight — The LM Is the Reward Model

RLHF optimises the policy π to maximise expected reward under a KL constraint:
```
max_π E[r(x,y)] - β · KL(π || π_ref)
```

The paper shows this optimisation has an analytic solution:
```
r*(x,y) = β · log(π*(y|x) / π_ref(y|x)) + β · log Z(x)
```

The optimal reward function is implicit in the ratio of policy probabilities. Plugging this back into the Bradley-Terry preference model (humans prefer y₁ over y₂ with probability σ(r*(y₁) - r*(y₂))), the partition function Z cancels:

**The DPO loss:**
```
L_DPO(π_θ; π_ref) = -E[(x, y_w, y_l)] [
    log σ(
        β · log(π_θ(y_w|x) / π_ref(y_w|x))
        - β · log(π_θ(y_l|x) / π_ref(y_l|x))
    )
]
```

Where:
- y_w = the preferred (winning) response
- y_l = the rejected (losing) response
- π_ref = reference (SFT) model — frozen
- β = temperature controlling KL constraint

The loss increases the likelihood of preferred responses and decreases the likelihood of rejected responses, relative to the reference model.

---

## Training Procedure

1. Start with an SFT model (same as RLHF Stage 1)
2. Collect preference data: (prompt, chosen_response, rejected_response) triplets
3. Compute the DPO loss with the SFT model as the reference
4. Optimise with Adam — standard supervised training

No reward model. No PPO. No KL penalty as a separate term. It's implicit in the loss.

---

## Comparison to RLHF

| | RLHF | DPO |
|---|---|---|
| Stages | SFT → RM training → PPO | SFT → DPO loss |
| Reward model | Explicit (separate model) | Implicit (in π ratio) |
| Optimiser | PPO (complex, unstable) | Adam (standard) |
| Memory | 2-4 models in memory | 2 models (policy + frozen ref) |
| Stability | Low (PPO sensitive to lr) | High (supervised loss) |
| Data requirement | Preference pairs for RM, then PPO rollouts | Preference pairs only |
| Compute | High | ~2× SFT training |

---

## Impact

- Became the dominant alignment method for open-source fine-tuning within 12 months of publication
- Implemented in TRL (`DPOTrainer`), Axolotl (`dpo` training type), and all major fine-tuning frameworks
- Led to variants: IPO (Identity Preference Optimisation), KTO (Kahneman-Tversky Optimisation), ORPO (Odds Ratio Preference Optimisation), SimPO
- Used to train Llama 2 Chat, Mistral-Instruct, Zephyr, and most open instruction-following models
- GRPO (DeepSeek-R1, 2025): group relative policy optimisation, a further evolution for reasoning

---

## Limitations

- **Requires high-quality preference data** — poor labels produce poor alignment
- **No online learning** — uses fixed offline preference dataset; can't improve with live human feedback
- **Reference model dependency** — the KL constraint relative to π_ref can limit how far the policy can move
- **Doesn't handle multi-turn** as naturally as RL approaches

---

## Key Facts

- Published May 2023 (arXiv); NeurIPS 2023; Stanford + UC Berkeley authors
- Loss function: binary cross-entropy on log-ratio of policy vs reference probabilities
- β (temperature): typically 0.1–0.5; higher β → stronger KL constraint → stays closer to reference
- TRL implementation: `DPOTrainer(model, ref_model, args, train_dataset, tokenizer)`
- Dataset format: `{"prompt": "...", "chosen": "...", "rejected": "..."}`
- GRPO (2025): removes the reference model entirely; uses group rewards relative to other responses

---

## Connections

[[papers/key-papers]] · [[papers/rlhf]] · [[papers/constitutional-ai]] · [[fine-tuning/lora-qlora]] · [[fine-tuning/frameworks]] · [[math/optimisation]]
