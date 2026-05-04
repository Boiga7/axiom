---
type: concept
category: evals
tags: [evals, llm-as-judge, swe-bench, braintrust, inspect-ai, evaluation, benchmarks]
sources: []
updated: 2026-05-01
para: resource
tldr: LLM evaluation methodology — only 52% of AI orgs have evals in place, making this the most common gap; covers offline/online/agent/RAG eval types, framework selection, golden set construction, and CI integration.
---

# LLM Evaluation

> **TL;DR** LLM evaluation methodology — only 52% of AI orgs have evals in place, making this the most common gap; covers offline/online/agent/RAG eval types, framework selection, golden set construction, and CI integration.

The discipline of systematically measuring model and system performance. Only 52% of organisations building AI products have evaluations in place. Making this the single most common gap between teams shipping confidently and teams shipping on hope.

> [Source: Perplexity research, 2026-04-29]

---

## Why Evals Are the Bottleneck

Without evals you cannot:
- Know if a prompt change made things better or worse
- Catch regressions when you upgrade models
- Compare RAG strategies against each other
- Trust that your agent handles edge cases
- Justify a production rollout to stakeholders

The problem is not that people don't know evals matter. It's that building an eval suite feels slower than shipping. It isn't. Debugging production failures without evals takes 10x longer.

---

## Types of Evaluation

| Type | When | What you measure |
|---|---|---|
| **Offline / unit evals** | Before any deployment | Does the system produce correct outputs on a golden set? |
| **Integration evals** | Before deployment | Does the system work end-to-end in the real environment? |
| **Online evals** | Post-deployment | Are real users getting good answers? |
| **Red-team evals** | Before high-stakes deployment | Can the system be broken by adversarial inputs? |
| **Capability evals** | For safety-critical models | Does the model have dangerous capabilities? |

Build offline evals first. Add online evals once you have production traffic.

---

## LLM-as-Judge

Using a more capable model (or the same model) to evaluate outputs. The most practical approach for open-ended tasks where ground truth is hard to define.

**Basic pattern:**
```python
judge_prompt = """
Rate this answer on a scale of 1-5 for correctness and helpfulness.

Question: {question}
Expected answer: {expected}
Model answer: {model_answer}

Respond with JSON: {"score": N, "reasoning": "..."}
"""
```

**Calibration requirements:**
- The judge must be calibrated against human labels — otherwise it's measuring the judge's preferences, not quality
- Run inter-annotator agreement tests between the judge and 3+ humans
- Watch for position bias (judge prefers option A over option B when they're equivalent)
- Use structured output (JSON) to reduce parse errors

**Best practice:** Use a rubric, not just "rate this 1-5." A rubric with 4–6 specific criteria produces much more reliable scores.

---

## Frameworks

| Framework | Stars | Strength | When to use |
|---|---|---|---|
| **OpenAI Evals** | 17,600 | Mature, many built-in eval types | General LLM evals |
| **inspect-ai** | ~3,000 | Anthropic's framework; safety + capability focus | Safety evals, agent evals |
| **Braintrust** | ~2,000 | Cloud platform; datasets + scoring + CI integration | Production eval CI/CD |
| **promptfoo** | ~8,000 | YAML config, fast, red-teaming support | Prompt regression testing |
| **DeepEval** | ~5,000 | RAG-specific metrics, Ragas-compatible | RAG pipelines |
| **evalcheck** | ~200 | pytest plugin, GitHub App, regression CI | Inline test-suite evals |

For a new project: start with promptfoo for prompt iteration, add Braintrust once you have a CI pipeline.

---

## Benchmarks

### Coding: SWE-bench Verified

The gold standard for real-world coding ability. 2,294 real GitHub issues from 12 popular Python repos. The model must generate a patch that passes the repo's test suite.

Why it matters: previous coding benchmarks (HumanEval, MBPP) are solved by memorisation. SWE-bench Verified requires actual program synthesis. Claude 3.7 Sonnet reached 70.3%. The current frontier.

Use SWE-bench to compare models for coding tasks. Don't benchmark on HumanEval alone. It's saturated.

### General Knowledge: MMLU

57 subjects, 14,000+ questions. Useful as a broad capability signal. Less meaningful for task-specific deployment decisions. Most frontier models score > 85%.

### Reasoning: GPQA Diamond

Graduate-level questions in physics, chemistry, biology. Hard enough that domain experts score ~65%. Tests genuine reasoning, not lookup. Claude Opus 4.6 scores 91.3% on GPQA Diamond.

### General: BIG-bench and HELM

BIG-bench (BIG-Bench Hard): 204 challenging tasks, many requiring multi-step reasoning. HELM: a holistic benchmark covering 42 scenarios with 7 metrics. Both useful for comparing model families.

### Chatbot: LMSYS Chatbot Arena

Human preference ratings via head-to-head battles. The most realistic signal for "which model do users prefer." ELO-ranked. Claude Opus typically ranks top-3.

---

## Building a Golden Set

The foundation of any eval suite. A golden set is a curated collection of (input, expected output) pairs that cover:
- Happy path (80% of queries)
- Edge cases (boundary conditions, unusual inputs)
- Known failure modes (things that broke before)
- Adversarial inputs (prompt injections, malformed data)

**Size:** 50 examples is enough to start. 200+ for statistical confidence. 1,000+ for fine-grained regression detection.

**Collection:**
1. Sample production logs (if available)
2. Write edge cases manually based on spec
3. Use LLM to generate variation of existing examples
4. Keep a "regression" set — every bug that reaches production, add a test

---

## Eval for RAG Pipelines

RAGAS is the standard. Four metrics: Faithfulness, Answer Relevancy, Context Precision, Context Recall. See [[rag/pipeline]] for details.

Run RAGAS on every chunking, embedding, or reranking change before deploying.

---

## Eval for Agents

Agent evaluation is harder. The output is a trajectory (sequence of tool calls), not a single answer.

**Metrics:**
- **Task completion rate** — did the agent accomplish the goal?
- **Step efficiency** — how many tool calls vs the optimal minimum?
- **Tool accuracy** — did the agent call the right tools with correct arguments?
- **Safety** — did the agent take any unsafe actions?

inspect-ai has built-in support for agent trajectories. For LangGraph agents, log all node transitions and evaluate the trace.

---

## Eval in CI

The goal: every PR that changes a prompt, model, or retrieval strategy automatically runs your eval suite and blocks merge if scores drop.

```yaml
# GitHub Actions example
- name: Run eval suite
  run: |
    python -m pytest evals/ --eval-model=claude-sonnet-4-6
    braintrust run evals/scoring.py --fail-on-regression 0.05
```

evalcheck wraps pytest with LLM-specific assertions and posts a comment to the PR with a score diff.

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Eval set drawn from training data | Keep eval set strictly held-out |
| Judge model same as tested model | Use a stronger or different judge |
| Scores without confidence intervals | Report mean ± std; use ≥ 50 examples |
| Only measuring accuracy | Add latency, cost, safety, robustness |
| Running evals once at launch | Run on every meaningful change |

---

## Key Facts

- Comprehensive eval practices remain underdeveloped: only 27% of organisations review all AI-generated content before use, and fewer than 20% have mature AI governance frameworks (McKinsey State of AI 2025)
- Golden set minimum: 50 examples; 200+ for statistical confidence; 1,000+ for fine-grained regression detection
- promptfoo: 8K stars, YAML config, red-teaming support — best for prompt iteration
- Braintrust: best for production CI/CD with datasets, scoring, and PR integration
- inspect-ai: Anthropic's framework; best for safety and agent trajectory evals
- RAGAS: four RAG metrics — faithfulness, answer relevancy, context precision, context recall
- Agent eval metrics: task completion rate, step efficiency, tool accuracy, safety

## Common Failure Cases

**LLM judge scores correlate with length, not quality**  
Why: the judge was not calibrated against humans; it rewards verbose answers because verbosity superficially looks thorough.  
Detect: Spearman correlation between answer length and judge score > 0.5; human raters disagree with judge rankings for short-but-correct answers.  
Fix: add rubric criteria that explicitly penalise padding; run inter-annotator agreement between judge and 3 humans on a calibration set.

**Eval set contaminated by training data**  
Why: golden set was assembled from the same source documents used to build the system prompt or fine-tune; the model effectively memorised these inputs.  
Detect: eval scores are suspiciously high (>0.95) but production user satisfaction is much lower; performance drops on novel phrasing.  
Fix: keep the eval set strictly held-out; prefer production log samples as eval inputs, not synthetic queries derived from training data.

**CI eval blocks deploys on noise, not regressions**  
Why: the regression threshold is too tight; natural LLM variance at temperature > 0 causes false failures on every other PR.  
Detect: PRs fail evals when no prompt or code changed; re-running the same eval produces different pass/fail outcomes.  
Fix: use temperature=0 for eval runs; set the regression threshold at 2–3x the observed variance on a fixed model.

**Agent eval measures final answer only, misses tool misuse**  
Why: the eval checks output correctness but ignores whether the agent called the right tools with correct arguments.  
Detect: agent scores well on output quality but takes 3x more tool calls than necessary; intermediate step errors go undetected.  
Fix: log and evaluate the full tool call trajectory; add step efficiency and tool accuracy as explicit eval metrics.

**Golden set goes stale as the product evolves**  
Why: expected outputs were written for an older product version; the model is now penalised for producing better-than-expected answers.  
Detect: manual review of eval failures shows the model's answer is actually correct; human raters prefer the model output over the expected output.  
Fix: version the golden set alongside the product; schedule a quarterly review; treat "model is right, expected is wrong" as a golden set bug.

## Connections

- [[evals/llm-as-judge]] — the scoring mechanism for open-ended evals
- [[evals/benchmarks]] — standard benchmarks for comparing models
- [[rag/pipeline]] — RAGAS eval for RAG-specific quality metrics
- [[prompting/dspy]] — DSPy uses evals to automatically optimise prompts
- [[apis/anthropic-api]] — Batch API for running large eval suites at 50% cost
- [[observability/platforms]] — online evals in production; annotation queues; feedback loops
- [[data/pipelines]] — eval suites reuse the same Airflow/Prefect orchestration as training data flows

## Open Questions

- What is the minimum eval suite that blocks regressions without slowing CI below 5 minutes?
- How do you handle golden set drift when your expected outputs change as the product evolves?
- Is inspect-ai appropriate for production eval CI or is it designed primarily for research/safety settings?
