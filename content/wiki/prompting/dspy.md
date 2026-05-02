---
type: concept
category: prompting
tags: [dspy, prompt-optimisation, few-shot, mipro, bootstrap, signatures]
sources: []
updated: 2026-04-29
para: resource
tldr: DSPy replaces hand-written prompts with optimised programs — Signatures declare I/O, MIPROv2 optimises instructions and few-shot demos, yielding 10-40% improvement on structured tasks.
---

# DSPy

> **TL;DR** DSPy replaces hand-written prompts with optimised programs — Signatures declare I/O, MIPROv2 optimises instructions and few-shot demos, yielding 10-40% improvement on structured tasks.

A framework that replaces hand-written prompts with learnable programs. Instead of tweaking prompt wording manually, you define the input/output signature and let DSPy optimise the prompts and examples automatically. Typical improvement: 10-40% over hand-written prompts on structured tasks.

---

## The Core Problem It Solves

Manual prompt engineering is:
- Brittle — changing the model often breaks the prompt
- Unscalable — can't optimise over hundreds of examples by hand
- Opaque — no principled way to know if a prompt is good

DSPy treats prompts as learnable parameters and uses a training set + metric to optimise them automatically.

---

## Install

```bash
pip install dspy
```

---

## Signatures

A signature is a declarative description of what the LLM should do. DSPy compiles this into a prompt.

```python
import dspy

# Simple signature
class SentimentClassifier(dspy.Signature):
    """Classify the sentiment of a customer review."""
    review: str = dspy.InputField()
    sentiment: Literal["positive", "negative", "neutral"] = dspy.OutputField()

# Multi-field signature
class RAGAnswer(dspy.Signature):
    """Answer the question using only the provided context."""
    context: str = dspy.InputField(desc="Retrieved passages")
    question: str = dspy.InputField()
    answer: str = dspy.OutputField(desc="Concise answer based on context")
    confidence: float = dspy.OutputField(desc="Confidence 0-1")
```

---

## Modules

DSPy modules wrap signatures with different prompting strategies:

```python
# Predict — direct input → output
classifier = dspy.Predict(SentimentClassifier)
result = classifier(review="The product broke after one day.")
print(result.sentiment)  # "negative"

# ChainOfThought — adds reasoning step before answer
cot = dspy.ChainOfThought(SentimentClassifier)
result = cot(review="Mixed feelings — great design but poor battery.")
# result.reasoning is exposed as intermediate step
# result.sentiment is the final answer

# ReAct — tool-augmented reasoning loop
react = dspy.ReAct(RAGAnswer, tools=[search_tool])
```

---

## Composing Modules (Programs)

```python
class MultiHopRAG(dspy.Module):
    def __init__(self, num_hops: int = 2):
        self.generate_query = [dspy.ChainOfThought("context, question -> search_query")
                                for _ in range(num_hops)]
        self.generate_answer = dspy.ChainOfThought(RAGAnswer)

    def forward(self, question: str) -> dspy.Prediction:
        context = []
        for hop in range(len(self.generate_query)):
            query = self.generate_query[hop](
                context="\n".join(context),
                question=question,
            ).search_query
            context += retrieve(query)  # your retrieval function
        
        return self.generate_answer(
            context="\n".join(context),
            question=question,
        )

program = MultiHopRAG(num_hops=2)
result = program(question="What country borders both France and Germany?")
```

---

## Configuring the LM

```python
import dspy

# Anthropic
lm = dspy.LM("anthropic/claude-sonnet-4-6", api_key="...")
dspy.configure(lm=lm)

# OpenAI
lm = dspy.LM("openai/gpt-4o", api_key="...")
dspy.configure(lm=lm)

# Local (Ollama)
lm = dspy.LM("ollama_chat/llama3", api_base="http://localhost:11434")
dspy.configure(lm=lm)
```

---

## Optimisers (Teleprompters)

Optimisers tune the prompts and few-shot examples using a training set and a metric.

### BootstrapFewShot

Generates few-shot examples from a training set automatically:

```python
from dspy.teleprompt import BootstrapFewShot

def accuracy_metric(example, prediction, trace=None) -> bool:
    return example.sentiment == prediction.sentiment

optimizer = BootstrapFewShot(metric=accuracy_metric, max_bootstrapped_demos=4)

train_set = [
    dspy.Example(review="Excellent product!", sentiment="positive").with_inputs("review"),
    dspy.Example(review="Terrible quality.", sentiment="negative").with_inputs("review"),
    # 20-50 examples recommended
]

optimized_program = optimizer.compile(
    student=dspy.Predict(SentimentClassifier),
    trainset=train_set,
)
```

### MIPROv2 (Recommended for production)

Optimises instructions AND demonstrations simultaneously. Best performance, higher cost:

```python
from dspy.teleprompt import MIPROv2

optimizer = MIPROv2(
    metric=accuracy_metric,
    auto="medium",  # "light", "medium", "heavy" — controls number of trials
)

optimized = optimizer.compile(
    program,
    trainset=train_set,
    num_batches=10,
    max_bootstrapped_demos=3,
    requires_permission_to_run=False,
)
```

MIPROv2 uses Bayesian optimisation to search over instruction phrasings and few-shot selections. On complex tasks, 20-40% improvement over `BootstrapFewShot`.

### BootstrapFewShotWithRandomSearch

Good middle ground. Faster than MIPROv2, better than plain Bootstrap:

```python
from dspy.teleprompt import BootstrapFewShotWithRandomSearch

optimizer = BootstrapFewShotWithRandomSearch(
    metric=accuracy_metric,
    num_candidate_programs=8,
    num_threads=4,
)
```

---

## Saving and Loading Optimised Programs

```python
# Save
optimized_program.save("optimized_sentiment.json")

# Load
loaded = dspy.Predict(SentimentClassifier)
loaded.load("optimized_sentiment.json")
```

---

## When DSPy Beats Manual Prompting

| Task type | Manual prompt | DSPy |
|---|---|---|
| Simple Q&A | Fine | Marginal gain |
| Multi-step reasoning | Brittle | +20-40% |
| Structured extraction | Error-prone | +15-30% |
| RAG (multi-hop) | Very brittle | Significant gain |
| Classification with many labels | Hard to maintain | Strong gain |

DSPy shines when: the task has a clear metric, you have 20+ labelled examples, and the prompt needs to be robust to model changes or input variation.

---

## DSPy vs Manual Prompting vs Fine-Tuning

| | Manual prompting | DSPy | Fine-tuning |
|---|---|---|---|
| Labelled data needed | 0-5 | 20-100 | 500+ |
| Time to set up | Minutes | Hours | Days |
| Model change cost | Redo prompt | Re-run optimizer | Retrain |
| Best for | Quick prototypes | Production pipelines | Domain adaptation |

---

## Key Facts

- DSPy improvement: 10-40% over hand-written prompts on multi-step reasoning and structured extraction
- Minimum training set: 20 labelled examples for BootstrapFewShot; 50-100 for MIPROv2
- MIPROv2 vs BootstrapFewShot: MIPROv2 uses Bayesian optimisation for instruction + demo selection; 20-40% better on complex tasks but higher cost
- Supported LMs: Anthropic, OpenAI, Ollama (local), Google via `dspy.LM("provider/model")`
- Optimised programs saved as JSON; load with `.load()` for production serving
- When DSPy beats manual: repeatable task + clear metric + 1,000+ daily calls

## Common Failure Cases

**MIPROv2 optimisation runs but produces a worse program than the unoptimised baseline**
Why: MIPROv2 requires enough labelled examples to signal the metric reliably; with fewer than ~30 examples, the Bayesian search overfits to the small training set and the optimised prompt performs worse on held-out data.
Detect: the optimised program's score on a validation set is lower than the unoptimised `dspy.Predict` baseline; the training score looks good but the val score does not.
Fix: hold out at least 20% of examples as a validation set and pass it to the optimizer; use `BootstrapFewShot` when you have fewer than 30 training examples and reserve MIPROv2 for 50+ examples.

**Optimised program saved with `.save()` but fails to load correctly because the Signature class definition is not importable at load time**
Why: DSPy serialises the optimised few-shot examples and instructions to JSON, but the Signature class itself must be defined in the calling module when `.load()` is called; if the Signature is defined inline or in a module that is not imported, loading fails with an `AttributeError` or produces a default (unoptimised) program silently.
Detect: the loaded program has no few-shot demonstrations and produces results identical to an unoptimised baseline; checking `program.demos` shows an empty list after loading.
Fix: define all Signature classes at module level in a shared file and import them before calling `.load()`; add an assertion after loading that `len(program.demos) > 0` to catch silent load failures.

**`dspy.ChainOfThought` is used with a reasoning model (o1, Claude Extended Thinking) and the reasoning step conflicts with the model's internal chain-of-thought**
Why: reasoning models perform internal chain-of-thought before producing output; DSPy's `ChainOfThought` module adds an explicit reasoning field to the prompt, which causes the model to produce a second reasoning trace that may contradict the internal one, reducing quality.
Detect: reasoning model outputs contain redundant or contradictory reasoning traces; quality on structured tasks is lower than with `dspy.Predict` alone.
Fix: use `dspy.Predict` instead of `dspy.ChainOfThought` when the underlying LM is a reasoning model; reserve `ChainOfThought` for non-reasoning models.

**Metric function is not deterministic, causing MIPROv2 to optimise toward noise**
Why: if the metric calls an LLM-as-judge to score examples and that judge produces variable outputs across runs, the optimizer receives inconsistent feedback and converges on prompts that maximise judge noise rather than true task quality.
Detect: re-running the optimizer with the same training set produces very different optimised programs; the metric score for the same example varies significantly across two calls.
Fix: set temperature=0 on the judge model in the metric function; run each training example through the judge twice and use the majority vote to reduce variance; or use a deterministic metric (exact match, F1) where the task allows.

## Connections

- [[prompting/techniques]] — manual prompting techniques DSPy builds on
- [[evals/methodology]] — the metric function DSPy optimises against
- [[fine-tuning/decision-framework]] — when to go beyond DSPy to fine-tuning

## Open Questions

- At what task complexity does MIPROv2's Bayesian search cost become prohibitive vs the performance gain?
- How does DSPy's optimised prompt transfer when you upgrade the underlying model (e.g., Sonnet 4.5 → 4.6)?
- Can DSPy's optimiser meaningfully improve prompts for open-ended creative tasks that lack clear metrics?
