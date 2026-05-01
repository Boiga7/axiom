---
type: concept
category: evals
tags: [llm-as-judge, evaluation, scoring, rubric, calibration, bias]
sources: []
updated: 2026-04-29
para: resource
tldr: Using an LLM to evaluate another LLM's outputs is the standard approach for open-ended tasks — calibrate against human labels (target Spearman > 0.8), use explicit rubrics, and account for position/verbosity/self-enhancement biases.
---

# LLM-as-Judge

> **TL;DR** Using an LLM to evaluate another LLM's outputs is the standard approach for open-ended tasks — calibrate against human labels (target Spearman > 0.8), use explicit rubrics, and account for position/verbosity/self-enhancement biases.

Using a language model to evaluate another language model's outputs. The standard approach for open-ended tasks where ground-truth is hard to define.

---

## Why LLM-as-Judge Works

For narrow tasks (code execution, SQL correctness, classification), programmatic evaluation is better — run the code, check the output. But for:
- Response quality ("Is this a good explanation?")
- Helpfulness ("Did this answer the user's intent?")
- Writing quality, tone, safety

...you need human judgment. Human labelling is slow and expensive. LLMs are 1,000x cheaper and available 24/7. If you calibrate them against human labels, they can be surprisingly accurate.

---

## Basic Pattern

```python
import anthropic
import json

client = anthropic.Anthropic()

def judge_response(question: str, model_answer: str, expected_answer: str) -> dict:
    prompt = f"""Evaluate this AI response.

Question: {question}
Expected answer: {expected_answer}
Model answer: {model_answer}

Score the model answer on:
1. Accuracy (1-5): Does it match the expected answer?
2. Completeness (1-5): Does it cover all key points?
3. Clarity (1-5): Is it clear and well-explained?

Return JSON: {{"accuracy": N, "completeness": N, "clarity": N, "reasoning": "brief explanation"}}"""

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )
    return json.loads(response.content[0].text)
```

---

## The Rubric: The Most Important Part

A rubric converts a subjective "how good is this?" into explicit criteria the judge can apply consistently. Without a rubric, scores vary with prompt wording and model state.

**Bad rubric:** "Rate this response from 1-5."  
**Good rubric:**

```
Accuracy (1-5):
1 = Factually wrong or doesn't address the question
2 = Partially correct but contains errors
3 = Mostly correct with minor inaccuracies
4 = Correct and complete
5 = Correct, complete, and includes relevant nuance

Completeness (1-5):
1 = Misses most key points from the expected answer
2 = Covers < 50% of key points
3 = Covers 50-75% of key points
4 = Covers > 75% of key points
5 = Covers all key points
```

A good rubric reduces variance. Different prompts to the judge model should produce the same score for the same answer.

---

## Calibration Against Human Labels

The judge is only as useful as its correlation with human judgment. **Always calibrate.**

1. Collect a calibration set: 50–200 examples where you have both human labels and judge scores
2. Compute Spearman or Pearson correlation
3. Target: correlation > 0.8 before trusting the judge
4. If correlation is low: revise the rubric, switch models, or add more examples to the judge prompt

```python
from scipy.stats import spearmanr
import numpy as np

human_scores = [4, 3, 5, 2, 4, 5, 1, 3]
judge_scores = [4, 2, 5, 2, 4, 4, 1, 3]

correlation, p_value = spearmanr(human_scores, judge_scores)
print(f"Spearman correlation: {correlation:.3f} (p={p_value:.4f})")
# Target: > 0.8
```

---

## Known Biases

| Bias | Description | Mitigation |
|---|---|---|
| **Position bias** | Judge prefers option A over B even when they're equivalent, just due to order | Swap order, average both scores |
| **Verbosity bias** | Judges tend to prefer longer responses | Explicit "length does not affect score" in rubric |
| **Self-enhancement bias** | Claude prefers Claude-style outputs; GPT prefers GPT-style | Use a different model from the one being evaluated |
| **Sycophancy** | Judge rewards confident/assertive answers regardless of accuracy | Include calibration examples with confident-wrong answers |
| **Recency bias** | Judge puts more weight on the last few sentences | Tell the judge to evaluate the full response, not just the conclusion |

---

## Pairwise vs Absolute Scoring

**Absolute:** "Rate this response 1–5" → easier to interpret, noisier, harder to compare.

**Pairwise:** "Which response is better, A or B?" → more reliable signal, can't compare across batches, requires more calls.

For ranking models against each other: pairwise. For detecting regression in a single model: absolute. For production monitoring: absolute (you need a consistent score per call).

---

## Reference-Free Evaluation

When you don't have an expected answer — common in production monitoring:

```python
def check_faithfulness(question: str, context: str, answer: str) -> dict:
    prompt = f"""Does the answer contain only information found in the provided context?

Context:
{context}

Answer:
{answer}

Return JSON: {{"faithful": true/false, "hallucinated_claims": ["list of claims not in context"]}}"""
    # ...
```

RAGAS provides faithfulness, answer relevancy, context precision, and recall metrics for RAG systems — no reference answer needed for most. See [[evals/methodology]].

---

## Prompt Design for Judges

**System prompt for the judge:**
```xml
<role>
You are a precise evaluator of AI responses. Your job is to score responses against a rubric.
</role>

<instructions>
- Apply the rubric criteria literally, not based on your personal preferences
- Score each criterion independently — don't let one criterion influence another
- Always return valid JSON with the exact keys specified
- If uncertain, score in the middle (3) rather than high or low
</instructions>
```

**Force structured output with a JSON schema** if your framework supports it (Instructor, structured outputs in newer API versions). Reduces parse errors.

---

## Judge Model Selection

- **Same model as tested model:** Acceptable but has self-enhancement bias.
- **Stronger model as judge:** Better calibration; costs more. Claude Opus judging Claude Haiku outputs is legitimate.
- **Ensemble of judges:** Reduces variance. 3 judges, take the mode (for discrete scores) or mean (for continuous).
- **Smaller, fine-tuned judge:** For specific task types, a fine-tuned judge is cheaper and equally calibrated.

---

## Key Facts

- Calibration set size: 50-200 examples; target Spearman correlation > 0.8 with human labels
- Five known biases: position, verbosity, self-enhancement, sycophancy, recency
- Mitigation for position bias: swap order, average both scores
- Mitigation for verbosity bias: add "length does not affect score" to the rubric explicitly
- Pairwise scoring is more reliable signal than absolute; absolute is needed for production monitoring
- Ensemble of 3 judges reduces variance significantly
- RAGAS provides reference-free faithfulness, answer relevancy, context precision, context recall

## Connections

- [[evals/methodology]] — how LLM-as-judge fits into a full eval strategy and CI pipeline
- [[evals/benchmarks]] — when benchmarks with ground truth are more appropriate
- [[rag/pipeline]] — RAGAS uses LLM-as-judge internally for all four RAG metrics
- [[prompting/techniques]] — rubric design is fundamentally a prompting problem
- [[python/instructor]] — use instructor to enforce structured JSON output from judge calls; eliminates parse errors and adds automatic retry

## Open Questions

- How much does judge model capability affect calibration quality — does Haiku as judge suffice for simple tasks?
- Is there a standardised format for sharing rubrics across teams to enable eval reproducibility?
- How do biases shift when using fine-tuned judge models vs general-purpose models?
