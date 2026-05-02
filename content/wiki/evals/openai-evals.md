---
type: entity
category: evals
para: resource
tags: [openai-evals, evaluation, benchmarks, llm-testing, open-source]
sources: []
updated: 2026-05-01
tldr: Open-source framework for evaluating LLMs and LLM-powered systems, plus a registry of community benchmarks.
---

# OpenAI Evals

Open-source framework for evaluating LLMs and LLM-powered systems, plus a registry of community benchmarks. Despite the name, works with any Chat Completions-compatible endpoint — Anthropic, local models, Azure, custom APIs.

GitHub: `openai/evals` (17,600+ stars). Also available as a hosted service via the OpenAI Dashboard.

---

## Two Modes

### 1. Open-source CLI (`openai/evals`)

Run evaluations locally against any model. Define evals as YAML + data files. Supports custom grading logic.

```bash
pip install evals
oaieval gpt-4o my-eval-name
oaieval claude-sonnet-4-6 my-eval-name   # works with any Chat Completions endpoint
```

### 2. OpenAI Dashboard (hosted)

Configure and run evals in the OpenAI web UI without code. Outputs results and comparisons between model versions. Useful for non-engineers monitoring production prompt quality.

---

## Eval Types

| Type | Description | Use when |
|------|-------------|----------|
| `match` | Exact string match | Fixed-answer Q&A |
| `includes` | Response contains substring | Format/keyword checks |
| `fuzzy_match` | Normalised string match | Case/whitespace variations |
| `model_graded_closedqa` | LLM judges correctness vs reference | Open-ended factual Q&A |
| `model_graded_fact` | LLM checks factual accuracy | Summaries, RAG outputs |
| `battle` | Pairwise A vs B comparison | Model upgrade decisions |
| Custom | Python function | Any logic |

---

## Writing an Eval

### YAML spec

```yaml
# evals/registry/evals/my-rag-eval.yaml
my-rag-eval:
  id: my-rag-eval
  metrics: [accuracy]
---
my-rag-eval:
  class: evals.elsuite.basic.match:Match
  args:
    samples_jsonl: my-rag-eval/samples.jsonl
```

### Data file (`samples.jsonl`)

```jsonl
{"input": [{"role": "user", "content": "What is RAG?"}], "ideal": "Retrieval-Augmented Generation"}
{"input": [{"role": "user", "content": "What does BM25 stand for?"}], "ideal": "Best Match 25"}
```

### Custom grader

```python
from evals.api import CompletionFn
from evals.eval import Eval
from evals.record import RecorderBase

class MyEval(Eval):
    def eval_sample(self, sample, rng):
        prompt = sample["input"]
        response = self.completion_fn(prompt=prompt)
        correct = self.grade(response.get_completions()[0], sample["ideal"])
        self.recorder.record_match(correct, expected=sample["ideal"])

    def grade(self, response: str, ideal: str) -> bool:
        return ideal.lower() in response.lower()

    def run(self, recorder: RecorderBase):
        samples = self.get_samples()
        self.eval_all_samples(recorder, samples)
        return {"accuracy": recorder.get_metrics()["accuracy"]}
```

---

## Model-Graded Evals

For open-ended outputs where there's no exact answer:

```yaml
my-summary-eval:
  class: evals.elsuite.modelgraded.classify:ModelBasedClassify
  args:
    samples_jsonl: summaries/samples.jsonl
    eval_type: cot_classify
    modelgraded_spec: closedqa
```

The grader prompt asks: *"Does this response correctly answer the question based on the reference? Answer 'Yes' or 'No'."*

See [[evals/llm-as-judge]] for calibration and bias considerations when using LLMs as graders.

---

## Running Against Non-OpenAI Models

```python
# custom_completion.py
from evals.api import CompletionFn, CompletionResult
import anthropic

class ClaudeCompletionFn(CompletionFn):
    def __call__(self, prompt, **kwargs):
        client = anthropic.Anthropic()
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=prompt if isinstance(prompt, list) else [{"role": "user", "content": prompt}],
        )
        return ClaudeResult(response.content[0].text)
```

```bash
oaieval --completion_fn my_module:ClaudeCompletionFn my-eval-name
```

---

## vs Other Eval Frameworks

| | OpenAI Evals | inspect-ai (Anthropic) | promptfoo | Braintrust |
|--|-------------|----------------------|-----------|-----------|
| Maintained by | OpenAI | Anthropic | Community | Braintrust |
| Hosted UI | Yes (Dashboard) | No | No | Yes |
| Open-source | Yes | Yes | Yes | Partial |
| Custom graders | Yes | Yes | Yes | Yes |
| Built-in benchmark registry | Yes (large) | Growing | No | No |
| Best for | Benchmark reuse, OpenAI stack | Anthropic-focused, rigorous | CI integration, multi-provider | Team eval management |

See [[evals/methodology]] for how these frameworks fit into a full eval strategy.

---

## Connections

- [[evals/methodology]] — how OpenAI Evals fits into a broader eval strategy alongside inspect-ai, Braintrust, promptfoo
- [[evals/llm-as-judge]] — model-graded evals use LLM-as-judge; calibration and bias apply
- [[evals/benchmarks]] — OpenAI Evals hosts the community benchmark registry
- [[test-automation/pytest-patterns]] — for CI eval integration, combine OpenAI Evals with pytest markers
