---
type: paper
category: papers
para: resource
tags: [chain-of-thought, cot, reasoning, wei, 2022, prompting, emergence]
sources: []
updated: 2026-05-01
tldr: Adding intermediate reasoning steps to few-shot examples — "chain-of-thought" — dramatically improves LLM performance on multi-step reasoning tasks, but only emerges at large model scale (~100B parameters).
---

# Chain-of-Thought Prompting Elicits Reasoning in Large Language Models (Wei et al., 2022)

**Citation:** Wei, J., Wang, X., Schuurmans, D., Bosma, M., Xia, F., Chi, E., ... & Zhou, D. (2022). Chain-of-thought prompting elicits reasoning in large language models. NeurIPS 2022.

**One sentence:** Adding intermediate reasoning steps to few-shot examples — "chain-of-thought" — dramatically improves LLM performance on multi-step reasoning tasks, but only emerges at large model scale (~100B parameters).

---

## What Problem It Solved

Standard few-shot prompting (input → output, no intermediate steps) fails on tasks requiring multi-step reasoning: maths word problems, symbolic reasoning, commonsense inference. The model jumps to the answer without the steps and gets them wrong.

Chain-of-thought provides a mechanism for the model to "show its work". Decomposing complex problems into intermediate steps that are individually simpler.

---

## Core Idea — Show the Reasoning Steps

**Standard few-shot (fails on hard problems):**
```
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 balls. How many tennis balls does he have?
A: 11
```

**Chain-of-thought few-shot (succeeds):**
```
Q: Roger has 5 tennis balls. He buys 2 more cans of tennis balls. Each can has 3 balls. How many tennis balls does he have?
A: Roger started with 5 balls. 2 cans × 3 balls = 6 balls. 5 + 6 = 11. The answer is 11.

Q: The cafeteria had 23 apples. If they used 20 to make lunch and bought 6 more, how many apples do they have?
A: [model generates reasoning chain] The cafeteria started with 23 apples. They used 20, so 23 - 20 = 3. They bought 6 more, so 3 + 6 = 9. The answer is 9.
```

The reasoning chain is part of the prompt context. The model learns the *format* of reasoning from the examples and applies it to the new question.

---

## Key Findings

### 1. Scale Dependency — Emergence at ~100B

Chain-of-thought produced almost no improvement on models below ~50B parameters. At ~100B parameters (PaLM 540B, GPT-3 175B), performance on GSM8K (grade school math) jumped dramatically.

This was one of the early demonstrations of **emergent abilities**. Capabilities that appear suddenly at scale.

### 2. Outperforms Fine-Tuning at Scale

PaLM 540B with CoT few-shot (8 examples) outperformed a fine-tuned GPT-3 on many benchmarks, with no gradient updates. Scale + prompting > smaller model + training.

### 3. Works on Diverse Reasoning Tasks

Tested on:
- Arithmetic reasoning (GSM8K, SVAMP, ASDiv)
- Commonsense reasoning (StrategyQA, ARC)
- Symbolic reasoning (letter concatenation, coin flip)

Gains were consistent across reasoning types when models were large enough.

### 4. Zero-Shot CoT — "Let's think step by step"

A follow-on result (Kojima et al., 2022): appending "Let's think step by step" to any question elicits chain-of-thought from large models without any few-shot examples. The model generates its own reasoning chain, then answers.

```
Q: [question] Let's think step by step.
→ [model generates reasoning]
→ [model gives answer]
```

This zero-shot variant works because large models have seen enough reasoning demonstrations in pretraining to generalise the format.

---

## Impact

- CoT is now the default for any task requiring multi-step reasoning — baked into standard practice
- Informed the development of reasoning models (o1, Claude Extended Thinking) — which use extended internal CoT
- "Let's think step by step" became a standard prompt suffix
- Established that prompting strategies can unlock capabilities that appear absent without them
- Tree-of-Thought (2023) and Self-Consistency (Wang et al., 2022) extend this work

---

## Limitations

- **Scale requirement:** CoT doesn't help smaller models — it can even hurt by producing confident incorrect reasoning chains
- **Hallucinated reasoning:** the model can generate plausible-sounding but incorrect intermediate steps, then arrive at a wrong answer confidently
- **Not true reasoning:** the model has learned the *format* of step-by-step reasoning, not necessarily logical inference rules
- **Prompt engineering burden:** designing good CoT examples for a specific task domain requires expertise

---

## Key Facts

- Published January 2022 (arXiv); NeurIPS 2022; 11 authors from Google Brain
- Threshold: CoT benefits appear at ~100B parameters; no gain below ~50B
- Zero-shot CoT: "Let's think step by step" suffix (Kojima et al., 2022) — no examples needed
- GSM8K: PaLM 540B + CoT achieved 58% (vs 17% standard prompting)
- Extended to: Self-Consistency (Wang et al., 2022), Tree-of-Thought (Yao et al., 2023)
- Reasoning models (o1/Claude ET): trained to use long internal CoT, not just prompted

---

## Connections

[[papers/key-papers]] · [[papers/react]] · [[prompting/techniques]] · [[prompting/chain-of-thought]] · [[llms/claude]] · [[agents/practical-agent-design]]
## Open Questions

- What claims in this paper have since been challenged or superseded by follow-up work?
- What did later research reveal about the limitations of this approach?
