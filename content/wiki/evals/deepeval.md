---
type: concept
category: evals
para: resource
tags: [evals, llm-testing, deepeval, g-eval, ci, rag-evaluation, confident-ai]
tldr: Open-source pytest-style LLM eval framework by Confident AI with 50+ research-backed metrics, G-Eval custom criteria scoring, and threshold-gated CI integration.
sources: []
updated: 2026-05-04
---

> **TL;DR** Open-source pytest-style LLM eval framework by Confident AI with 50+ research-backed metrics, G-Eval custom criteria scoring, and threshold-gated CI integration.

## Key Facts

- Made by Confident AI (YC W25); open-source on GitHub at `confident-ai/deepeval`
- Install: `pip install deepeval`
- 50+ built-in metrics covering RAG quality, safety, and custom criteria
- G-Eval: the flagship metric — LLM-as-judge with chain-of-thought criteria decomposition for arbitrary evaluation criteria
- Every metric outputs a score 0–1; a test case passes only if score >= the defined threshold
- Runs as standard pytest: `deepeval test run test_suite.py`; integrates into GitHub Actions via a single YAML step
- Confident AI is the hosted cloud layer: dataset management, collaboration dashboards, production tracing, and result history
- Supports text, image, and audio modalities (multi-modal test cases share the same API)
- Plugs into LangChain, CrewAI, OpenAI Agents, and most other LLM frameworks

## Detail

### What DeepEval Is

DeepEval is an LLM evaluation framework designed to work like a unit-test library. A developer writes `LLMTestCase` objects (input, actual output, optionally expected output and retrieval context), attaches one or more metric objects, and runs the suite with `deepeval test run`. Each metric scores the test case independently; a case fails if any attached metric scores below its threshold. This makes it easy to gate a CI pipeline on quality — the build fails the same way a failing pytest assertion does.

DeepEval sits at the intersection of the two common eval patterns: deterministic unit tests (for structured outputs with a known ground truth) and LLM-as-judge evals (for open-ended text where ground truth is hard to define). Most of its built-in metrics use the LLM-as-judge approach internally, including G-Eval.

### G-Eval: The Core Mechanism

G-Eval is a two-step LLM-as-judge algorithm:

1. **Criteria decomposition** — given a plain-English evaluation criterion (e.g., "Is the answer concise and free of unnecessary filler?"), G-Eval uses chain-of-thought prompting to decompose it into a list of specific, atomic evaluation sub-steps.
2. **Scoring** — the judge LLM applies those sub-steps to the actual output and returns a final score.

The forced decomposition is what makes G-Eval more reliable than a naive "rate this 1-5" prompt. Simpler sub-criteria reduce position bias, reduce randomness across runs, and produce more interpretable failure reasons. When you supply your own `evaluation_steps`, G-Eval skips step 1 and uses your steps directly, giving you deterministic criteria in exchange for slightly more upfront effort.

```python
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, LLMTestCaseParams

conciseness = GEval(
    name="Conciseness",
    criteria="The output answers the question without unnecessary padding or repetition.",
    evaluation_params=[LLMTestCaseParams.INPUT, LLMTestCaseParams.ACTUAL_OUTPUT],
    threshold=0.7,
)
```

### Built-in Metrics Taxonomy

**RAG quality metrics** (require `retrieval_context`):
- `FaithfulnessMetric` — does the output contain only claims supported by the retrieved context? Measures hallucination relative to context.
- `AnswerRelevancyMetric` — does the output address the input question?
- `ContextualPrecisionMetric` — are the most relevant context chunks ranked highest?
- `ContextualRecallMetric` — does the context cover the ground-truth answer's key claims? (requires `expected_output`)
- `ContextualRelevancyMetric` — are the retrieved chunks relevant to the input at all?

**Safety and content metrics**:
- `HallucinationMetric` — for non-RAG pipelines; detects fabricated facts against a provided context list
- `ToxicityMetric` — detects harmful, offensive, or inappropriate language in the output
- `BiasMetric` — detects demographic or ideological bias

**Conversational and agentic metrics**:
- `ConversationalGEval` — applies G-Eval across a full multi-turn conversation
- Task completion, tool correctness, and step efficiency metrics for agent trajectories [unverified — exact metric names may vary across versions]

### pytest Integration Pattern

```python
# test_rag.py
import pytest
import deepeval
from deepeval import assert_test
from deepeval.metrics import FaithfulnessMetric, AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

@pytest.mark.parametrize("test_case", [
    LLMTestCase(
        input="What is RLHF?",
        actual_output="RLHF stands for Reinforcement Learning from Human Feedback...",
        retrieval_context=["RLHF is a technique where a reward model is trained..."],
    )
])
def test_rag_quality(test_case):
    faithfulness = FaithfulnessMetric(threshold=0.8)
    relevancy = AnswerRelevancyMetric(threshold=0.75)
    assert_test(test_case, [faithfulness, relevancy])
```

Run with: `deepeval test run test_rag.py`

### CI Gating with GitHub Actions

```yaml
# .github/workflows/eval.yml
- name: Run LLM eval suite
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
    CONFIDENT_API_KEY: ${{ secrets.CONFIDENT_API_KEY }}   # optional; sends results to cloud
  run: |
    pip install deepeval
    deepeval test run tests/test_rag.py
```

If any metric in any test case scores below its threshold, `deepeval test run` exits non-zero and blocks the merge. This is the same gate mechanism as a failing test in pytest.

### Confident AI Platform

Confident AI is the hosted product built on top of DeepEval. Adding a `CONFIDENT_API_KEY` environment variable causes every `deepeval test run` to upload results to the Confident AI dashboard. The platform provides:

- **Dataset management** — curate and version golden test sets in the UI
- **Eval history** — score trends across commits and branches
- **Production tracing** — instrument your LLM app to log live calls; run metrics on sampled production traffic
- **Collaboration** — product and QA teams can review eval results without running code

DeepEval is fully usable without Confident AI (local only). The platform is opt-in.

### When to Use DeepEval Over Alternatives

| Scenario | Recommended tool |
|---|---|
| RAG-specific quality metrics only | [[evals/ragas]] — narrower scope, battle-tested on RAG |
| Prompt iteration and red-teaming in YAML | promptfoo — faster config, no Python required |
| Safety and agent trajectory evals | inspect-ai — Anthropic's framework, stronger on agentic traces |
| Custom criteria + CI gating + built-in safety metrics in one framework | DeepEval |
| Already using DeepEval and need red-team attacks | DeepTeam (from the same Confident AI team) |

DeepEval's main differentiator is breadth: it covers RAG metrics, safety metrics, and fully custom G-Eval criteria in a single pytest-compatible runner. RAGAS is narrower (RAG only) but has a larger research community and more nuanced RAG-specific implementations. promptfoo requires no Python but is less expressive for complex metric logic.

## Connections

- [[evals/methodology]] — parent hub; DeepEval fits the LLM-as-judge section and the CI eval gating pattern
- [[evals/ragas]] — RAGAS covers RAG-specific metrics with a research-first focus; DeepEval is broader and more CI-oriented
- [[evals/openai-evals]] — alternative eval framework; OpenAI Evals is more research/benchmark-oriented, DeepEval is more production CI-oriented
- [[evals/llm-as-judge]] — G-Eval is an implementation of the LLM-as-judge pattern with criteria decomposition
- [[security/llm-red-teaming-tools]] — where DeepEval is first mentioned in the vault; DeepTeam is the red-teaming sibling

## Open Questions

- How does G-Eval score variance compare to human inter-annotator agreement on subjective criteria like tone or conciseness? Is temperature=0 sufficient to stabilise scores across CI runs?
- At what dataset size does Confident AI's hosted platform become worth the cost over self-hosted result logging?
- Does DeepEval's multi-modal support (image, audio) extend to its RAG and safety metrics, or is multi-modal limited to G-Eval only? [unverified]
- How does DeepEval's `HallucinationMetric` differ mechanically from `FaithfulnessMetric` — both check output against a context list, but the threshold guidance and use cases appear distinct.

## Sources

- DeepEval official site and docs: https://deepeval.com/docs/getting-started
- GitHub: https://github.com/confident-ai/deepeval
- G-Eval metric docs: https://deepeval.com/docs/metrics-llm-evals
- G-Eval explained: https://www.confident-ai.com/blog/g-eval-the-definitive-guide
- CI/CD integration guide: https://deepeval.com/docs/evaluation-unit-testing-in-ci-cd
- Confident AI platform: https://www.confident-ai.com/
