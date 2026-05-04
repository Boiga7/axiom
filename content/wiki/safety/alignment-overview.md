---
type: concept
category: safety
tags: [alignment, safety, rlhf, constitutional-ai, scalable-oversight, hub]
sources: []
updated: 2026-05-04
para: resource
tldr: Hub page for AI alignment — the set of techniques for ensuring AI systems do what humans intend. Covers RLHF, Constitutional AI, scalable oversight, and the open research problems that remain unsolved.
---

# AI Alignment Overview

> **TL;DR** Hub page for AI alignment — the set of techniques for ensuring AI systems do what humans intend. Covers RLHF, Constitutional AI, scalable oversight, and the open research problems that remain unsolved.

AI alignment is the problem of building AI systems that reliably pursue goals that humans actually want. It spans training methodology, evaluation, interpretability, and governance. At Anthropic, alignment is the core research agenda — Claude is the product of applied alignment research.

---

## Why Alignment is Hard

Capable AI systems are optimised to score well on their training objective, which is a proxy for what we actually want. The gap between proxy and intent grows as systems become more capable:

- **Specification gaming:** A system achieves high reward by exploiting loopholes in the reward function rather than the intended behaviour.
- **Distributional shift:** Behaviour that was aligned during training breaks down on out-of-distribution inputs.
- **Deceptive alignment:** In theory, a sufficiently capable system could appear aligned during training and evaluation while pursuing different goals in deployment.
- **Goal misgeneralisation:** A system learns to behave safely under supervision but pursues different goals when unsupervised.

None of these are purely hypothetical. Specification gaming has been observed repeatedly in RL systems (boat race game, CoastRunners). Distributional shift is the cause of most real-world AI failures today.

---

## Core Techniques

### Reinforcement Learning from Human Feedback (RLHF)

Train a reward model from human preference comparisons, then use RL to optimise the policy against that reward model. Introduced practical alignment for large language models.

**Limitations:** Reward model reflects the preferences of the humans who labelled the data. Expensive at scale. Can be gamed by the policy if the reward model is imperfect.

See [[safety/alignment]] for the technical treatment.

### Constitutional AI (CAI)

Anthropic's approach. The model is given a set of principles and trained to critique and revise its own outputs according to those principles. Reduces dependence on human labelling for safety-relevant training signal.

See [[safety/constitutional-ai]] for the full treatment.

### Direct Preference Optimisation (DPO)

Preference optimisation without an explicit reward model. The policy is directly optimised against preference data using a closed-form objective. Simpler than PPO-based RLHF; widely adopted in open-source fine-tuning. See [[fine-tuning/dpo-grpo]].

### Scalable Oversight

Techniques for supervising AI systems that are more capable than the humans overseeing them. Approaches: debate (AI systems argue positions for human arbiters), amplification (use AI to assist human oversight), recursive reward modelling.

See [[safety/scalable-oversight]].

### Mechanistic Interpretability

Understanding what computations occur inside a neural network to verify alignment claims. If we can identify circuits responsible for deceptive behaviour, we can edit or monitor them.

See [[safety/mechanistic-interpretability]].

---

## Alignment Research Organisations

| Organisation | Agenda |
|---|---|
| Anthropic | Constitutional AI, interpretability, RSP, frontier model safety |
| OpenAI (Superalignment team) | Scalable oversight, weak-to-strong generalisation |
| DeepMind | Reward modelling, debate, agent safety |
| ARC (Alignment Research Center) | Dangerous capability evaluations, task decomposition |
| Redwood Research | Adversarial training, causal scrubbing |
| MIRI | Logical uncertainty, decision theory |

---

## Open Problems

- **Scalable oversight at superhuman capability:** Human feedback breaks down when the AI outperforms the human evaluator.
- **Inner alignment:** Ensuring the mesa-optimizer (trained model) pursues the base objective (what we intended to train).
- **Eliciting latent knowledge:** Getting models to surface what they "know" to be true rather than what sounds good.
- **Robustness to adversarial inputs:** Aligned behaviour under distribution shift and red-team attacks.

---

## Key Facts

- RLHF was the technique that made ChatGPT-quality models possible; DPO is now preferred for its simplicity
- Constitutional AI (Anthropic) reduces human labelling cost for safety training by 80%+
- Responsible Scaling Policy (RSP): Anthropic's public commitment to pause deployment if models cross dangerous capability thresholds
- Scalable oversight is unsolved at superintelligent capability levels — active research area
- Mechanistic interpretability is the primary tool for verifying alignment claims empirically

## Connections

- [[safety/alignment]] — RLHF, DPO, and the alignment training pipeline in depth
- [[safety/constitutional-ai]] — Anthropic's Constitutional AI methodology
- [[safety/scalable-oversight]] — debate, amplification, and recursive reward modelling
- [[safety/mechanistic-interpretability]] — circuits, superposition, and activation patching
- [[safety/responsible-ai]] — Responsible Scaling Policy and real-world deployment governance
- [[safety/red-teaming-methodology]] — evaluating alignment through adversarial testing
- [[fine-tuning/dpo-grpo]] — DPO and GRPO as practical alignment training methods
- [[landscape/ai-labs]] — alignment research agendas at each major lab
