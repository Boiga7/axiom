---
type: concept
category: infra
para: resource
tags: [model-routing, cost-optimisation, routellm, inference, frugalgpt, llm-cascade]
sources: []
updated: 2026-05-04
tldr: "Model routing dynamically directs each LLM request to the cheapest model capable of answering it — trained classifiers or cascade strategies cut frontier-model call volume by 45-98% with under 5% quality loss."
---

# Model Routing

> **TL;DR** Model routing dynamically directs each LLM request to the cheapest model capable of answering it — trained classifiers or cascade strategies cut frontier-model call volume by 45-98% with under 5% quality loss.

---

## The Core Idea

Not every user query requires Claude Opus or GPT-4. A straightforward factual lookup or short summarisation task can be answered well by a cheap, fast model (Haiku, GPT-4o mini, Gemini Flash). Hard tasks — multi-step reasoning, code generation, ambiguous instructions — warrant frontier spend.

Model routing sits between your application and the LLM provider. It inspects each incoming query, estimates its difficulty, and sends it to the cheapest model that can handle it at acceptable quality. The frontier model becomes the fallback for hard cases, not the default for every case.

**Economics:** At 10,000 calls/day, if only 20% truly need frontier quality, routing alone cuts your bill by 80% before any other optimisation. See [[synthesis/cost-optimisation]] for the full cost-reduction stack.

---

## RouteLLM (ICLR 2025)

RouteLLM is the most rigorous open-source routing framework to date. Published at ICLR 2025 by researchers from UC Berkeley, Anyscale, and Canva (the LMSYS team behind Chatbot Arena), it frames routing as a learned classification problem.

**Paper:** "RouteLLM: Learning to Route LLMs with Preference Data" (arXiv 2406.18665)  
**Code:** `lm-sys/RouteLLM` on GitHub, MIT licence.

### Training Signal

The routers are trained on human preference data from Chatbot Arena — pairs of (prompt, model-A-response, model-B-response, human preference) annotations. The classifier learns to predict which model a human would prefer, then the cost threshold is set at inference time to control the strong/weak split.

Data augmentation with LLM-judge labels (GPT-4-as-judge on unlabelled prompts) significantly boosts router accuracy, especially in low-data regimes.

### Four Router Architectures

| Router | Mechanism | Notes |
|---|---|---|
| **Matrix Factorisation (mf)** | Learns a scoring function per prompt via low-rank factorisation of the preference matrix | Best overall; uses `text-embedding-3-small` to embed prompts |
| **BERT Classifier** | Full-parameter fine-tuned BERT predicting strong vs weak model preference | Higher training cost than mf, similar accuracy |
| **Causal LLM Classifier** | A small LLM fine-tuned on preference labels to predict routing | Best on MMLU (54% GPT-4 calls for 95% GPT-4 quality) |
| **SW-Ranking (Similarity-Weighted)** | Retrieves similar prompts from the arena dataset, weights Elo scores by similarity | Training-free; works without any fine-tuning |

Matrix factorisation is the recommended default.

### Reported Savings

All figures are "calls to frontier model needed to achieve 95% of always-using-frontier performance":

- **MT Bench:** 14% of GPT-4 calls — 86% cost reduction
- **MMLU:** 54% of GPT-4 calls — 46% cost reduction  
- **GSM8K:** ~65% of GPT-4 calls — 35% cost reduction

Routers generalise across model pairs not seen during training (e.g., trained on GPT-4 vs GPT-3.5, applied to Claude Opus vs Haiku).

### Installation and Usage

```python
pip install routellm

from routellm.controller import Controller

client = Controller(
    routers=["mf"],            # matrix factorisation
    strong_model="gpt-4o",
    weak_model="gpt-4o-mini",
)

response = client.chat.completions.create(
    model="router-mf-0.11593",  # threshold encoded in model name
    messages=[{"role": "user", "content": "Explain KV cache."}]
)
```

The `0.11593` in the model name is the cost threshold — the fraction of strong-model calls expected in the long run. Tune it on your eval set.

---

## Other Routing Approaches

### FrugalGPT (Stanford, 2023 / TMLR 2024)

FrugalGPT (arXiv 2305.05176) introduced the LLM cascade as a principled strategy:

1. **LLM Cascade:** Query the cheapest model first. Use a confidence scorer to decide whether to accept the answer or escalate to the next more expensive model. Repeat until confidence is sufficient or the frontier is reached.
2. **Prompt Adaptation:** Compress the prompt before each call.
3. **LLM Approximation:** Cache or distil responses for near-duplicate queries.

Claimed: match GPT-4 performance with up to 98% cost reduction, or beat GPT-4 accuracy by 4% at equal cost. A 2024 extension combining both routing and cascading achieved 14% better cost-quality tradeoff than either approach alone.

### LLM-Blender (2023)

An ensembling framework rather than a router: it queries multiple models simultaneously, then uses a pairwise ranker (PairRanker) to select the best response, optionally fusing top-K with a generative fusion step (GenFuse). Better for quality maximisation than cost minimisation — running all models is expensive, so it suits latency-tolerant offline pipelines where quality is the only constraint.

### Semantic / Intent-Based Routing

Route by topic or task type rather than difficulty. Embed the query and compare to centroids (or use an intent classifier) representing task categories:

- **Simple factual** → fast/cheap model
- **Code generation** → code-specialist model (e.g., DeepSeek Coder, Claude Sonnet)
- **Document analysis** → model with long context + strong document understanding
- **Safety-sensitive** → conservative model or guardrail layer first

The vLLM project maintains a Semantic Router (v0.2 "Athena", March 2026) that plugs into vLLM inference servers. Red Hat published integration docs in May 2025. This approach does not require labelled preference data — rule-based category definitions are enough to start.

### Confidence-Based Routing

Have the cheap model generate a response and a self-assessed confidence score (either via token log-probabilities or by asking explicitly). If confidence is below a threshold, escalate. More compute than a pure classifier (you pay for the weak model's inference on every query) but works without training data.

### Not-Diamond

Commercial routing service (not open-source) that learns per-user, per-task routing policies over time using logged preference signals. Positioned similarly to RouteLLM but as a managed API.

---

## Provider-Level Routing

Several platforms offer routing without custom training:

| Provider | Routing type | Notes |
|---|---|---|
| **OpenRouter** | Provider load-balancing + model catalog | 300+ models; default routes for cost/uptime, not quality-difficulty |
| **Martian** | Prompt-aware quality/cost router | Designed as a decision engine, not just a proxy; picks model per prompt |
| **Unify** | Benchmarked endpoint routing | Benchmarks 100+ endpoints continuously; routes on quality + cost + latency constraints |
| **LiteLLM** | Retry, fallback, load-balancing | Not difficulty-based routing, but enables multi-model fallback logic; see [[infra/litellm]] |
| **Helicone** | Semantic caching + 100+ provider routing | Gateway layer; routing at provider level, not query-difficulty level; see [[observability/helicone]] |

OpenRouter's "auto" routing is primarily load-balancing for reliability, not difficulty-based quality routing. Martian and Unify are the closest managed alternatives to RouteLLM's quality-awareness.

---

## Decision Framework

### When Routing Pays Off

- **High volume with mixed query difficulty.** If >50% of queries are simple (short answers, lookups, format conversions), routing cuts cost significantly.
- **Wide price gap between strong and weak models.** Claude Opus is ~15x more expensive per token than Haiku. GPT-4o is ~20x more expensive than GPT-4o-mini. Larger price ratios amplify savings.
- **Quality tolerance exists.** If 95% of baseline performance is acceptable, routing is viable. If you need 99%+ parity, routing risk increases.
- **Labelled preference data available.** RouteLLM-style trained routers outperform heuristics significantly when arena-style data exists for your domain.

### When Routing Does Not Pay Off

- **All queries are genuinely hard.** If your workload is "write a multi-step legal analysis every time," a classifier will learn to always route to the frontier — no savings.
- **Latency budget is extremely tight.** Adding a classifier inference step adds a few hundred milliseconds. For sub-100ms SLAs, the routing step itself may be too expensive.
- **Volume is low.** At <1,000 calls/day, the engineering overhead outweighs the savings. Prompt caching and [[infra/caching]] are better first investments.
- **Domain shift is severe.** RouteLLM routers generalise across model pairs but can degrade when the query distribution is far from Chatbot Arena (e.g., specialist scientific queries, proprietary business formats).

---

## Practical Implementation

### Setting the Cost Threshold

The cost threshold controls the strong/weak split. In RouteLLM, it is the expected fraction of strong-model calls:

- Threshold 0.2 → route ~20% of queries to frontier (aggressive saving, higher quality risk)
- Threshold 0.5 → route ~50% (balanced)
- Threshold 0.8 → conservative; mostly frontier

Calibrate on a held-out eval set with a task-specific quality metric (not just MMLU — use your actual success criteria).

### Evaluation Methodology

A router eval needs three numbers for each threshold value:

1. **Cost ratio** — strong model calls / total calls
2. **Quality gap** — (router pipeline score − always-strong score) / always-strong score
3. **Pareto frontier** — plot quality gap vs cost ratio; pick the threshold on the knee

Use the same eval data your production queries resemble. Arena data works for general Q&A; domain-specific data is needed for specialised applications.

### A/B Testing Routers

Shadow mode first: run the router in parallel with your current setup, log both routing decisions and the actual strong-model answers, then evaluate offline which routing decisions were correct (using LLM-as-judge or human review). Only switch live traffic after the shadow eval confirms the savings.

For online A/B: split traffic 90/10 (router vs always-strong), measure downstream business metrics (task completion, user satisfaction, retry rate) not just benchmark scores. See [[evals/methodology]] for eval-in-production patterns.

### Integration with Observability

Log every routing decision: which model was selected, the router's confidence/threshold signal, the query embedding bucket, and the eventual response quality if measurable. This data feeds back into router retraining. [[observability/platforms]] covers Langfuse and Arize for production tracing.

---

## Routing vs Other Cost Levers

Model routing is one of seven cost levers — see [[synthesis/cost-optimisation]] for the full picture. The typical interaction:

- **Prompt caching** runs first (inputs are long, cached → cheaper regardless of model).
- **Model routing** selects the model.
- **Semantic caching** can short-circuit routing entirely for near-duplicate queries ([[infra/caching]]).
- **Batch API** handles async workloads at 50% cost reduction independent of routing.

Combined, these four levers applied together commonly achieve 80-95% cost reduction on mixed-difficulty workloads.

---

## Related Pages

- [[synthesis/cost-optimisation]] — full seven-lever cost framework
- [[infra/litellm]] — multi-provider proxy with fallback routing
- [[infra/caching]] — semantic caching as a routing complement
- [[infra/inference-serving]] — vLLM and serving infrastructure
- [[evals/methodology]] — eval-in-production and LLM-as-judge patterns
- [[observability/platforms]] — tracing routing decisions in production
- [[observability/helicone]] — AI gateway with provider routing
- [[llms/model-families]] — model capability and pricing comparison
- [[apis/anthropic-api]] — Anthropic Batch API and prompt caching
- [[fine-tuning/decision-framework]] — routing vs fine-tuning vs RAG decision tree

---

## Connections

- [[synthesis/cost-optimisation]] — routing is one of seven cost levers; this page provides the routing detail
- [[infra/caching]] — semantic caching can short-circuit routing entirely for near-duplicate queries
- [[infra/litellm]] — multi-provider proxy that enables the fallback and load-balancing patterns routing sits on top of
- [[infra/inference-serving]] — vLLM's Semantic Router integrates routing directly into the inference server
- [[evals/methodology]] — calibrating router thresholds requires the same eval-in-production patterns used for model evaluation
- [[observability/platforms]] — routing decisions must be logged and traced to support retraining and A/B analysis
- [[llms/model-families]] — the price gap between strong and weak models determines how much routing can save

## Open Questions

- RouteLLM is trained on Chatbot Arena data (general Q&A). Is there a published approach for building domain-specific routing training sets for specialist workloads (legal, medical, code), or does the field assume Arena generalises sufficiently?
- For latency-sensitive pipelines, what is the practical overhead of a matrix factorisation router inference call, and at what QPS does that overhead become significant relative to savings?
- As frontier model prices continue to drop, does the strong/weak price ratio narrow enough to make routing less economically justified — and at what ratio does prompt caching become the better first investment?
