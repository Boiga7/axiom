---
type: concept
category: observability
para: resource
tags: [llmops, prompt-versioning, prompt-registry, a-b-testing, langfuse, production, eval-gates]
sources: []
updated: 2026-05-03
tldr: "LLMOps treats prompts as versioned production artifacts — a registry replaces hardcoded strings, eval gates block regressions, and A/B testing on real traffic replaces intuition-driven prompt changes."
---

# LLMOps

LLMOps is the discipline of operating LLM-based systems in production. It is a specialisation of [[observability/platforms|MLOps]] adapted to a fundamentally different artifact: instead of model weights, the primary thing being versioned, tested, and deployed is the **prompt**.

---

## Why LLMOps is Distinct from MLOps

MLOps was designed around a clear loop: train a model on labelled data, evaluate against a held-out set with a loss function, deploy, monitor for data drift. The artifact is a binary (model weights). Quality is a number. Failure is measurable.

LLMOps breaks every assumption in that loop.

| Dimension | MLOps | LLMOps |
|---|---|---|
| Primary artifact | Model weights | Prompts + parameters + model |
| Quality signal | Loss / accuracy (scalar) | Distribution of LLM-judge scores |
| Deployment trigger | New training run | Prompt text change |
| Failure mode | Statistical drift vs training distribution | Silent degradation, no exception raised |
| Versioning target | Checkpoint file | Text string + model ID + temperature |
| "Code change" that deploys | `git push` | Updating a label in a prompt registry |
| Loss function | Cross-entropy, BLEU, F1 | None — quality is subjective and fuzzy |
| Regression detection | Metric comparison | Eval suite + LLM-as-judge |
| Model update risk | Triggered by retraining | Can happen without any team action (provider update) |

The deepest difference: **a model provider can update the model behind an API endpoint without any action from your team, silently changing system behaviour**. In MLOps you own the model. In LLMOps you rent it.

---

## Prompt as a Versioned Artifact

The key mental model shift: **a prompt is not a string inside your codebase. It is a configuration artifact with a version.**

A prompt version is the tuple:

```
(prompt_text, model_id, temperature, max_tokens, [other parameters])
```

Changing any element creates a new version. The same text at `temperature=0.0` and `temperature=0.7` are different versions — they produce different output distributions.

Treating prompts like config files (not code) has the following implications:

- They should be stored outside the application binary.
- They should be fetchable at runtime without a redeploy.
- They should carry a version identifier that appears in every trace.
- Changing them should trigger an eval run, not just a code review.
- Rolling back should be a label reassignment, not a `git revert`.

> [Source: Perplexity research, 2026-05-03]

---

## Prompt Registry Pattern

A **prompt registry** is a centralised service that stores prompt versions and serves them to applications by name and label at runtime.

### How It Works

```python
# At application startup or request time — NOT hardcoded
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch the "production" label of the "extraction-system-prompt" prompt
prompt = langfuse.get_prompt("extraction-system-prompt", label="production")

# prompt.prompt is the text; prompt.version is the version number
response = anthropic.messages.create(
    model="claude-sonnet-4-6",
    system=prompt.compile(),   # renders any {{variable}} placeholders
    messages=[{"role": "user", "content": user_input}],
)

# Link the prompt version to the trace for debugging
langfuse.trace(name="extraction", metadata={"prompt_version": prompt.version})
```

### Deploying a Prompt

Deploying a prompt change is a **label move**, not a code push:

1. Write a new prompt version in the registry UI.
2. Run evals against the new version on your golden set.
3. If evals pass, move the `production` label to the new version.
4. All instances fetch the new version on their next call (within TTL / cache).
5. No application redeploy required.

### Rollback

Rollback is equally trivial: move the `production` label back to the previous version. Every instance reverts on their next fetch. This makes rollback as fast as deployment — typically seconds.

### Labels vs Versions

| Concept | What it is |
|---|---|
| **Version** | Immutable, auto-incremented integer. Never changes. `v1`, `v2`, `v3`. |
| **Label** | Mutable pointer. `production`, `staging`, `experiment-a`. One label per version slot. |

The `production` label is the live pointer. You manage deployments by moving this label, not by changing version numbers.

---

## A/B Testing Prompts in Production

A/B testing prompts means running two (or more) prompt variants on real traffic simultaneously and measuring which produces better outputs.

### Why A/B Testing, Not Just Offline Evals

Offline evals use a golden set curated by your team. They catch regressions but cannot tell you how real users respond to a change in tone, verbosity, or framing. A/B tests capture this.

### Implementation Pattern

```python
import hashlib
from langfuse import Langfuse

langfuse = Langfuse()

def get_prompt_variant(user_id: str, experiment: str) -> str:
    """Deterministic assignment: same user always gets same variant."""
    bucket = int(hashlib.md5(f"{user_id}:{experiment}".encode()).hexdigest(), 16) % 100
    label = "experiment-b" if bucket < 50 else "experiment-a"
    return langfuse.get_prompt(experiment, label=label)
```

Split by `user_id` (not session) so users see a consistent experience. Use consistent hashing so the assignment is reproducible without a database.

### Measuring Quality

LLM output quality is a **distribution**, not a binary. Your primary metric is the distribution of LLM-as-judge scores across all responses for each variant.

Recommended metrics per variant:
- Mean and p10/p90 of LLM-judge quality score (e.g., 1–5 rubric)
- Hallucination rate (LLM-judge faithfulness check)
- Task completion rate (did the model do what was asked?)
- User feedback signal if available (thumbs up/down)

**Do not use success/failure rate** — this misses the quality distribution. A response that technically completes the task but scores 2/5 on quality looks identical to a 5/5 response in a binary metric.

### Statistical Significance

Because LLM outputs are high-variance, sample sizes must be larger than traditional A/B tests. Recommendations:

- Run power analysis before starting to determine minimum sample size.
- Do not stop early — early stopping causes false positives.
- Use a two-sample t-test on the score distribution (not a proportion test).
- Minimum 500 samples per variant before drawing conclusions; 1,000+ is safer.
- Control for query difficulty: compare across similar query types, not pooled.

> [Source: Perplexity research, 2026-05-03]

---

## Eval Gates

An **eval gate** is an automated evaluation suite that runs on every prompt change and blocks promotion to production if quality regresses. It is the LLMOps equivalent of a CI test suite.

### The Analogy

```
Code change  →  unit tests  →  merge gate
Prompt change  →  eval suite  →  production label gate
```

### What an Eval Gate Contains

A typical eval gate includes:

1. **Golden set regression test** — run the prompt against your curated golden set; require all scores to remain above threshold.
2. **LLM-as-judge scoring** — score outputs on a 1–5 rubric; require mean score >= prior version.
3. **Faithfulness check** — for RAG prompts: outputs must not contradict the retrieved context.
4. **Format validation** — if the prompt produces structured output, validate schema compliance rate >= 99%.
5. **Safety check** — run refusal/injection probes; the new prompt must not be more permissive.

### Triggering in CI

```yaml
# .github/workflows/prompt-eval.yml
name: Prompt Eval Gate
on:
  push:
    paths: ['prompts/**']

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - name: Run eval suite
        run: python evals/run_gate.py --prompt-version ${{ github.sha }}
      - name: Assert no regression
        run: python evals/assert_no_regression.py --threshold 0.05
```

The gate blocks promotion if any metric regresses beyond a configured tolerance (e.g., 5% drop in mean quality score).

---

## Langfuse as the LLMOps Platform

[[observability/langfuse|Langfuse]] is the de facto open-source LLMOps platform as of 2026. It provides all four LLMOps primitives in a single tool:

### 1. Prompt Management

- Create, version, and label prompts via UI or SDK.
- `langfuse.get_prompt(name, label="production")` — fetches live prompt with caching (default 60s TTL, configurable).
- Protected labels: only admins can move the `production` label, preventing accidental deploys.
- Compile-time variable injection: `prompt.compile(variable="value")`.
- Link prompt versions to traces automatically: every LLM call records which prompt version it used.

### 2. Dataset Management

- Curate golden test sets from production traces (annotate in the UI, save to a dataset).
- Datasets are versioned; new items can be added without invalidating prior eval runs.
- Run any prompt version against any dataset via SDK.

### 3. Evaluation Runs

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Run a prompt version against a golden dataset
dataset = langfuse.get_dataset("extraction-golden-set")

for item in dataset.items:
    response = run_pipeline(item.input, prompt_version="v7")
    langfuse.score(
        trace_id=response.trace_id,
        name="quality",
        value=llm_judge_score(response.output, item.expected_output),
    )
```

Results appear in Langfuse's experiment comparison UI, showing score distributions per prompt version.

### 4. Experiment Comparison UI

Side-by-side comparison of prompt versions: score distribution histograms, example outputs, latency and cost per version. This replaces spreadsheet-based prompt evaluation workflows.

---

## Braintrust

Commercial alternative to Langfuse. Strong eval framework with native prompt management. Best for teams that want a hosted managed service and do not need self-hosted data ownership.

Key differentiators:
- Stronger eval framework UI — built-in LLM-as-judge templates, score comparison charts.
- Playground with side-by-side prompt comparison built in.
- Prompt versioning with datasets tightly coupled in the same workflow.
- RBAC and audit logs for enterprise teams.

Use Langfuse when data residency matters or you are self-hosting. Use Braintrust when you want a polished managed service and are already paying for cloud tooling.

---

## Agenta and Maxim

**Agenta** — open-source LLMOps platform focused on prompt engineering workflows. Notable for its playground-first approach: compare prompt variants in the UI before pushing to the registry. Integrates with Langfuse for tracing.

**Maxim** — commercial platform targeting enterprise teams. Differentiates on evaluation depth: structured rubric builder, automated A/B test result interpretation, compliance-friendly audit trails. [unverified — limited independent sources]

---

## LLMOps Maturity Model

| Level | Name | Characteristics |
|---|---|---|
| **0** | Ad hoc | Prompts hardcoded in application source. No versioning. No evals. Changes require a redeploy. |
| **1** | Config-file prompts | Prompts in config files or environment variables. Some version control via git. No runtime switching. |
| **2** | Prompt registry | Prompts stored in a registry (Langfuse, Braintrust, MLflow). Fetched at runtime. Manual deploy via label. Golden set evals run manually before label move. |
| **3** | Automated gates + A/B | Eval gates run in CI on every prompt change. A/B testing with statistical significance checks. Automated promotion when gate passes. Full observability with per-version score tracking. |

Most teams operating in production are at Level 1 or 2. Level 3 is the target for any team with more than one prompt in production and a non-trivial user base.

---

## Related Pages

- [[observability/langfuse]] — Langfuse platform deep dive including tracing, prompt management SDK, and self-hosted setup
- [[observability/platforms]] — platform comparison: Langfuse vs LangSmith vs Arize Phoenix
- [[evals/methodology]] — eval framework selection, LLM-as-judge calibration, golden set construction
- [[evals/llm-as-judge]] — rubric design and bias mitigation for using LLMs to score LLM outputs
- [[prompting/techniques]] — prompt engineering patterns; the craft that produces the artifacts LLMOps manages
- [[prompting/dspy]] — DSPy as an alternative to manual prompt management: automated optimisation replaces the registry workflow for some use cases
- [[cs-fundamentals/feature-flags]] — consistent hashing and gradual rollout patterns applicable to prompt A/B testing
