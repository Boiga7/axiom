---
type: concept
category: safety
tags: [constitutional-ai, rlhf, alignment, anthropic, rlaif, dpo]
sources: []
updated: 2026-04-29
para: resource
tldr: CAI replaces human harmlessness labellers with AI self-critique guided by a public 16-principle constitution — Phase 1 (SL-CAF) generates revised responses, Phase 2 (RLAIF) generates preference labels.
---

# Constitutional AI (CAI)

> **TL;DR** CAI replaces human harmlessness labellers with AI self-critique guided by a public 16-principle constitution — Phase 1 (SL-CAF) generates revised responses, Phase 2 (RLAIF) generates preference labels.

Anthropic's method for training harmless AI assistants. Replaces human feedback for harmlessness with AI-generated feedback guided by a written constitution. Introduced in the December 2022 paper "Constitutional AI: Harmlessness from AI Feedback."

---

## The Problem It Solves

RLHF for helpfulness works well: humans rate outputs, train a reward model, use RL to optimise. But labelling harmful outputs requires human reviewers to read disturbing content at scale. CAI avoids this.

---

## Two-Phase Training

### Phase 1: Supervised Learning from AI Feedback (SL-CAF)

1. Give the model a prompt designed to elicit harmful behaviour ("red-team prompt")
2. Model generates an initial response (possibly harmful)
3. Show the response to the model with a constitutional principle: *"Which response is less harmful? Revise your response to be more helpful and harmless."*
4. Model critiques its own response and generates a revised version
5. Fine-tune the model on (original prompt, revised response) pairs

The constitution is a list of natural-language principles: "Choose the response that is least likely to harm humans", "Prefer the response that respects human autonomy", etc. Anthropic's public constitution has ~16 principles covering harm, deception, and values.

### Phase 2: RL from AI Feedback (RLAIF)

1. Generate pairs of responses for red-team prompts
2. Ask a **preference model** (another Claude) which response is more harmful, guided by the constitution
3. This produces AI-generated preference labels — no human labelling required for harmlessness
4. Train a reward model from these preferences
5. RL fine-tuning (PPO) against the reward model

**Key insight:** The AI preference model can be much larger and more capable than the model being trained. The labels are thus higher quality than random human raters, while avoiding exposure to harmful content.

---

## The Constitution

A set of natural-language principles the model uses when evaluating responses. Example principles:

> "Choose the response that is least likely to contain information that could be used to harm other humans."

> "Choose the response that most supports and encourages democratic institutions and freedom of speech."

> "Prefer the response that is least likely to contain misinformation or false information."

The constitution is public and can be inspected. Anthropic updates it over model versions.

---

## CAI vs RLHF

| Aspect | RLHF | CAI |
|---|---|---|
| Harmlessness labels | Human raters (expensive, traumatic) | AI-generated (cheap, scalable) |
| Helpfulness | Human raters | Human raters (unchanged) |
| Transparency | Reward model internals opaque | Constitution is explicit and auditable |
| Scalable oversight | Limited | Better — AI can follow complex principles |

CAI doesn't replace RLHF for helpfulness. It augments it: human feedback for "is this useful?", AI feedback for "is this harmful?"

---

## Role in Claude's Training

All Claude models are trained with CAI as a core component of the post-training pipeline. The result is that Claude refuses harmful requests not by pattern-matching a blocklist, but because it has internalised a set of values.

CAI also contributes to the "Constitutional AI" name for Claude's character — the documented values that govern Claude's behaviour. See [[safety/alignment]] and Anthropic's model card for specifics.

---

## Relationship to DPO

Modern post-training pipelines often replace RL (PPO) with Direct Preference Optimisation (DPO). DPO still uses preference pairs (preferred response, rejected response) but optimises the policy directly without a separate reward model.

CAI can be combined with DPO: use the AI feedback mechanism to generate preference pairs, then train with DPO instead of PPO+RM. This is cheaper and more stable. See [[fine-tuning/dpo-grpo]].

---

## Limitations

- The constitution itself encodes value choices — who decides what principles to include?
- AI preference model can amplify its own biases
- Does not solve capability-level safety concerns (a powerful enough model could be harmful even when complying with the constitution)
- Scalable oversight is still an open research problem — whether AI feedback generalises to truly novel situations is unknown

---

## Key Facts

- Published: December 2022 Anthropic paper "Constitutional AI: Harmlessness from AI Feedback"
- Constitution: ~16 natural-language principles; public and auditable; updated across model versions
- SL-CAF: model critiques its own harmful response, generates revised version; supervised fine-tuned on revised pairs
- RLAIF: AI preference model generates harmlessness labels; no human reviewers required
- AI preference model advantage: can be larger/more capable than the model being trained → higher quality labels
- CAI + DPO: modern pipeline replaces PPO with DPO; uses AI-generated preference pairs from RLAIF
- Does not replace human feedback for helpfulness — only harmlessness labelling is AI-generated

## Connections

- [[safety/alignment]] — the broader AI safety landscape including RSP
- [[safety/mechanistic-interpretability]] — understanding what's actually learned from CAI training
- [[fine-tuning/dpo-grpo]] — DPO as an alternative to PPO for preference learning from AI feedback
- [[llms/claude]] — how CAI shapes Claude's character and behaviour

## Open Questions

- Does the AI preference model in RLAIF amplify subtle biases from its own training when generating labels?
- How does Anthropic's constitution evolve across Claude model versions — what principles have changed?
- Can CAI's self-critique mechanism generalise to truly novel harmful scenarios not covered by the existing principles?
