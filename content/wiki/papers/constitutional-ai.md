---
type: paper
category: papers
para: resource
tags: [constitutional-ai, anthropic, rlhf, alignment, harmlessness, 2022]
sources: []
updated: 2026-05-01
tldr: Instead of collecting human labels for harmful outputs, train a model to critique and revise its own responses using a written set of principles (a "constitution"), then use those AI-generated preference labels to train the final model.
---

# Constitutional AI: Harmlessness from AI Feedback (Bai et al., Anthropic, 2022)

**Citation:** Bai, Y., Jones, A., Ndousse, K., Askell, A., Chen, A., DasSarma, N., ... & Kaplan, J. (2022). Constitutional AI: Harmlessness from AI Feedback. arXiv:2212.08073.

**One sentence:** Instead of collecting human labels for harmful outputs, train a model to critique and revise its own responses using a written set of principles (a "constitution"), then use those AI-generated preference labels to train the final model.

---

## What Problem It Solved

Standard RLHF (see [[papers/rlhf]]) for harmlessness requires humans to label which of two model outputs is less harmful. This is:
- **Expensive** — labellers must evaluate potentially harmful content at scale
- **Inconsistent** — human judgement on harm varies across labellers and cultures
- **Opaque** — the resulting model's values are implicit in the labelling decisions

Constitutional AI makes the values explicit (written in natural language) and uses AI feedback to replace human harm labels. Reducing human exposure to harmful content and making the value system auditable.

---

## Key Contributions

### The Constitution

A written list of principles used to judge outputs. Example principles from the paper:

- "Choose the response that is least likely to contain harmful or unethical content"
- "Choose the response that is most supportive of human autonomy and individual freedoms"
- "Prefer the response that is more honest and doesn't contain deceptive or manipulative content"

The constitution is not a rigid rule-set. It's a prompt given to a language model to elicit principled judgement.

### Two-Stage Training Pipeline

**Stage 1 — Supervised Learning from AI Revision (SL-CAI):**
1. Sample a potentially harmful prompt from a red-team dataset
2. Sample an initial response from the model (often harmful if prompted adversarially)
3. Ask the model to critique the response using a principle from the constitution
4. Ask the model to revise the response to address the critique
5. Fine-tune the original model on (prompt → revised response) pairs

Repeat critique-revision N times per prompt. The final revision is the training target.

**Stage 2 — RL from AI Feedback (RLAIF):**
1. Sample pairs of responses from the SL-CAI model
2. Ask a feedback model (a separate LLM) to pick the better response using constitution principles
3. Use those AI preferences to train a preference model (PM)
4. Apply RL (PPO) against the PM — same as standard RLHF but with AI labels instead of human labels

```
Human red-team prompt
  → Initial harmful response
  → Critique (using constitution principle)
  → Revised response
  → (RL phase) AI preference labels from constitution
  → Preference model
  → PPO fine-tuning
```

### RLAIF — AI Replaces Human Labellers

The critical insight: a sufficiently capable LLM can evaluate responses against written principles consistently enough to generate useful preference labels. This **scales**. No bottleneck on human labeller availability.

---

## Impact

- Claude (all versions) is trained using Constitutional AI — this is the direct lineage
- Made alignment methodology auditable: the constitution is a document, not implicit human votes
- Introduced RLAIF as a training approach, later widely adopted
- Showed that harmlessness and helpfulness are not fully in tension — CAI models remained capable
- Influenced the "model spec" and "character" documentation that Anthropic publishes publicly

---

## Limitations

- The constitution itself encodes value choices — who writes it and how is a governance question
- AI feedback models can have systematic biases that are amplified through the training loop
- Critique-revision cycles can reduce model capability if over-applied to benign prompts
- RLAIF is not a replacement for human feedback on capability tasks — only on harm classification

---

## Key Facts

- Published December 2022 by Anthropic; 15 authors
- Directly informs how Claude is trained; "Constitutional AI" is Anthropic's public alignment methodology
- Two-stage: SL-CAI (supervised critique-revise) → RLAIF (AI-labelled preference training)
- Constitution = explicit written principles, not implicit labeller preferences
- Reduced human labeller exposure to harmful outputs without sacrificing harmlessness performance

---

## Connections

[[papers/key-papers]] · [[papers/rlhf]] · [[papers/dpo]] · [[safety/constitutional-ai]] · [[llms/claude]] · [[safety/red-teaming-methodology]]
## Open Questions

- What claims in this paper have since been challenged or superseded by follow-up work?
- What did later research reveal about the limitations of this approach?
