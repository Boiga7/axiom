---
type: entity
category: rag
para: resource
tags: [ragas, rag-evaluation, faithfulness, answer-relevancy, context-precision, evals]
sources: []
updated: 2026-05-01
---

# RAGAS — RAG Evaluation Framework

Reference-free evaluation framework for RAG pipelines. Computes four metrics from (question, answer, retrieved_contexts) triplets using LLM-as-judge — no ground-truth answers required for most metrics.

**Install:** `pip install ragas`

---

## The Four Core Metrics

### 1. Faithfulness

Does the answer contain only claims that can be inferred from the retrieved contexts? Measures hallucination — is the model making things up or grounding its answer in the retrieved evidence?

```
Faithfulness = (# claims in answer that are supported by context) / (# total claims in answer)
```

LLM breaks the answer into atomic claims, then checks each against the context. Score 0–1; higher = more grounded.

### 2. Answer Relevancy

Is the answer relevant to the question? Generates N synthetic questions from the answer and measures cosine similarity between those questions and the original:

```
Answer Relevancy = mean cosine_similarity(synthesised_qᵢ, original_question)
```

A non-committal answer ("The answer may vary") gets low relevancy — it doesn't actually address the question.

### 3. Context Precision

Are the retrieved contexts ranked correctly — with the most useful ones at the top?

```
Context Precision = mean precision@k over retrieved items
```

If the useful chunk is at position 5 of 5 retrieved chunks, precision is low. Penalises noisy retrieval that buries relevant context.

### 4. Context Recall

Does the retrieved context cover all the ground-truth answer's key claims? (Requires ground-truth answers.)

```
Context Recall = (# ground-truth claims supported by context) / (# total ground-truth claims)
```

Only metric requiring human-labelled ground truth.

---

## Quick Evaluation

```python
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall
from datasets import Dataset

# Prepare your data
data = {
    "question": [
        "What is RLHF?",
        "How does RAG work?",
    ],
    "answer": [
        "RLHF stands for Reinforcement Learning from Human Feedback...",
        "RAG retrieves relevant documents and passes them as context...",
    ],
    "contexts": [
        ["RLHF is a technique where a reward model is trained on human preferences..."],
        ["Retrieval-Augmented Generation combines dense retrieval with LLM generation..."],
    ],
    # Optional — only needed for context_recall
    "ground_truth": [
        "Reinforcement Learning from Human Feedback (RLHF) uses human preference labels...",
        "RAG augments an LLM with retrieved documents...",
    ],
}

dataset = Dataset.from_dict(data)

results = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(results)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88, 'context_precision': 0.75, 'context_recall': 0.81}
```

---

## Choosing a Judge LLM

RAGAS uses an LLM to evaluate — the judge model matters.

```python
from ragas import evaluate
from ragas.llms import LangchainLLMWrapper
from langchain_anthropic import ChatAnthropic

# Use Claude as the evaluator
evaluator_llm = LangchainLLMWrapper(ChatAnthropic(model="claude-sonnet-4-6"))

results = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy],
    llm=evaluator_llm,
)
```

Best judges: Claude Sonnet/Opus or GPT-4o. Avoid evaluating with the same model that generated the answers — self-evaluation is biased.

---

## Interpreting Results and Setting Thresholds

| Metric | Target (production) | Investigate if |
|---|---|---|
| Faithfulness | > 0.90 | < 0.80 — model is hallucinating |
| Answer Relevancy | > 0.85 | < 0.75 — answers are vague or off-topic |
| Context Precision | > 0.75 | < 0.60 — retrieval is noisy |
| Context Recall | > 0.80 | < 0.70 — retrieval misses relevant content |

Faithfulness < 0.80: fix by adding sources to the system prompt ("cite the provided context only"), reducing max_tokens, or using a less creative model.

Context Precision < 0.60: rerank retrieved chunks (Cohere Rerank / Jina Reranker) before passing to the LLM.

Context Recall < 0.70: retrieval is missing relevant content — check chunk size, embedding model, and whether the query-document distribution is aligned.

---

## CI Integration — Regression Testing

```python
# tests/test_rag_quality.py
import pytest
from ragas import evaluate
from ragas.metrics import faithfulness, answer_relevancy
from datasets import Dataset

THRESHOLDS = {
    "faithfulness": 0.85,
    "answer_relevancy": 0.80,
}

@pytest.fixture(scope="session")
def eval_dataset():
    # Load golden test cases
    return Dataset.from_json("tests/golden/rag_test_cases.json")

def test_rag_quality(eval_dataset, rag_pipeline):
    # Run pipeline on test set
    data = eval_dataset.map(lambda x: {"answer": rag_pipeline(x["question"]), **x})
    results = evaluate(data, metrics=[faithfulness, answer_relevancy])

    for metric, threshold in THRESHOLDS.items():
        assert results[metric] >= threshold, (
            f"{metric} dropped below threshold: {results[metric]:.3f} < {threshold}"
        )
```

Run in CI after any change to the retrieval pipeline, embedding model, prompt, or judge model.

---

## Key Facts

- `pip install ragas`; GitHub: explodinggradients/ragas
- Four metrics: Faithfulness, Answer Relevancy, Context Precision, Context Recall
- Reference-free (except Context Recall): no human-labelled ground truth needed for 3 of 4 metrics
- LLM-as-judge: use Claude Sonnet or GPT-4o as the evaluator model
- Faithfulness: most important metric; measures hallucination (answer grounded in context?)
- Context Precision: measures retrieval quality (relevant chunks ranked at top?)
- Production targets: Faithfulness > 0.90, Answer Relevancy > 0.85, Context Precision > 0.75

---

## Connections

[[rag/pipeline]] · [[rag/reranking]] · [[evals/methodology]] · [[evals/llm-as-judge]] · [[observability/langfuse]] · [[observability/arize]]
