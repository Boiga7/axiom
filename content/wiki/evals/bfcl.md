---
type: concept
category: evals
para: resource
tags: [bfcl, function-calling, tool-use, benchmarks, evals, agents]
sources: []
updated: 2026-05-04
tldr: "Berkeley Function Calling Leaderboard — the de facto standard benchmark for LLM tool-use capability; v4 adds agentic evaluation (web search, memory, format sensitivity) on top of the classic single-turn categories."
---

# BFCL — Berkeley Function Calling Leaderboard

> **TL;DR** The de facto standard benchmark for LLM tool-use capability; v4 adds agentic evaluation (web search, memory, format sensitivity) on top of the classic single-turn categories.

Maintained by UC Berkeley's Sky Computing Lab (Shishir Patil et al.), BFCL is the benchmark the field uses to measure how accurately a model invokes functions (tools) given a schema and a user request. It was presented at ICML 2025 as a conference paper. If your application relies heavily on tool use, BFCL score predicts real-world performance better than [[evals/benchmarks|MMLU or Chatbot Arena]], which measure knowledge retrieval and general preference respectively.

---

## Version History

| Version | Key addition |
|---|---|
| v1 | Single-turn AST evaluation, multi-language schemas |
| v2 | Executable (live API call) evaluation |
| v3 | Multi-turn and multi-step function calling |
| v4 | Holistic agentic evaluation: web search, memory, format sensitivity |

### What changed in v4

v3 introduced multi-turn interaction but kept its evaluation mechanics close to v1/v2 (AST-based response matching). v4 shifts the focus to agentic settings:

- **Web search** — multi-hop questions answered using provided search tools, requiring reasoning across retrieved results and error recovery when a search fails.
- **Memory management** — the model must maintain and update state across a long agentic session without losing track of prior tool outputs.
- **Format sensitivity** — measures reliability when the prompt phrasing or API schema varies (a model that breaks when a parameter is renamed is not production-safe).

In multi-turn and agentic categories the evaluation no longer does pure AST comparison. Instead it verifies the actual state of a simulated API system (file system, booking system) after the model runs its functions — closer to what matters in production.

---

## Overall Score Formula (v4)

```
Overall = (Agentic × 40%) + (Multi-Turn × 30%) + (Live × 10%) + (Non-Live × 10%) + (Hallucination × 10%)
```

Subcategories within each band are averaged equally regardless of test case count. Agentic combines Web Search and Memory at equal weight.

---

## Evaluation Categories

### Non-Live (10% of overall)
Expert-curated, deterministic function schemas. Evaluated with Abstract Syntax Tree (AST) comparison — the model's function call is parsed and matched structurally against all valid ground-truth calls. Covers:

- **Simple** — one function, unambiguous request
- **Parallel** — multiple functions that can be called simultaneously
- **Multiple** — model must choose from a set of functions, some irrelevant
- **Nested** — output of one call feeds into another

### Live (10% of overall)
Community-contributed, real-world APIs. Evaluated by actually executing the call and checking the return value. Keeps the benchmark honest as APIs evolve.

### Hallucination / Relevance Detection (10% of overall)
The model is given a request and a function set where no function is actually relevant. A correct answer is to decline to call any function. This tests whether the model knows when *not* to use a tool — a common failure mode in production agents.

### Multi-Turn (30% of overall)
Stateful dialogues where the model must call functions across turns, refine earlier calls given new information, and handle clarification loops. Evaluation checks end-state correctness, not intermediate call syntax.

### Agentic (40% of overall)
Real-world agentic settings requiring multi-hop reasoning, memory, and format robustness. Introduced in v4. Even frontier models that excel at single-turn calls struggle with memory management and long-horizon dynamic decision-making here.

---

## Top Performers (as of early 2026)

Scores are for the BFCL v4 overall metric. The leaderboard is live and updates frequently — treat these as approximate.

| Model | Overall (approx.) | Notes |
|---|---|---|
| Claude Opus 4.x | ~70.4% | [unverified] |
| Claude Sonnet 4.x | ~70.3% | [unverified] |
| GPT-5 | ~59.2% | [unverified] |
| Claude 3.5 Sonnet | ~92.4% | Non-live only score, earlier data; not v4 overall [unverified] |

> [Source: llm-stats.com BFCL leaderboard, 2026; youngju.dev BFCL guide, 2026-03] [unverified]

The live leaderboard is at `gorilla.cs.berkeley.edu/leaderboard.html`. The "overall score" column aggregates all five weighted bands; inspect per-category columns to understand where a model actually falls short.

Key finding from the ICML paper: frontier LLMs now handle single-turn calls well, but memory, dynamic decision-making, and long-horizon reasoning remain open problems even for the best models.

---

## Why BFCL Over Other Benchmarks for Tool-Use Selection

If you are choosing a model for an application that calls external APIs, reads databases, or routes tasks to specialised tools, BFCL is the most predictive public signal. MMLU measures knowledge. Chatbot Arena measures subjective preference. Neither exercises the JSON-schema-to-call pipeline that tool-using apps depend on.

Practical rule: for any app where tool use is on the critical path, run model selection using BFCL category scores that match your use case — e.g., if your app chains multiple API calls, weight the Parallel and Multi-Turn columns, not the headline overall.

---

## Running Your Own Eval

The eval harness lives in the gorilla monorepo: `github.com/ShishirPatil/gorilla/tree/main/berkeley-function-call-leaderboard`.

```bash
# Install the PyPI package (pinned to a specific checkpoint for reproducibility)
pip install bfcl-eval==2025.12.17

# Set where results and config files are written
export BFCL_PROJECT_ROOT=/path/to/your/project

# Or install from source for development
git clone https://github.com/ShishirPatil/gorilla
cd gorilla/berkeley-function-call-leaderboard
pip install -e .
```

The harness generates model responses against the benchmark dataset, then runs the evaluator (AST comparison for non-live, live execution for the live category, system-state checking for multi-turn and agentic). Submissions to the public leaderboard go through the same harness.

The dataset is also published on HuggingFace: `gorilla-llm/Berkeley-Function-Calling-Leaderboard`.

---

## Limitations

- **English only.** The benchmark has no multilingual evaluation. A model that struggles with non-English function descriptions or user requests will not reveal that here.
- **Synthetic schemas.** Even the "live" category uses curated APIs. The diversity of real-world enterprise API schemas (unusual types, nested optionals, conflicting parameter names) exceeds what BFCL covers.
- **No latency or cost signal.** A model that takes 8 seconds per tool call and one that takes 400ms score identically. For production selection, combine BFCL with your own latency benchmarks (see [[experiments/model-latency-comparison]]).
- **Single-provider schemas.** Tools are defined in OpenAI/Anthropic-style JSON Schema. Differences in how providers handle edge cases (required vs optional fields, enum handling) may not surface.
- **Saturating single-turn categories.** Non-live simple function calling scores are high across frontier models; the category no longer differentiates them well. v4's agentic band is where differentiation now lives.

---

## Comparison to Other Tool-Use Benchmarks

| Benchmark | Evaluation method | Scale | Strength | Weakness |
|---|---|---|---|---|
| **BFCL** | AST comparison + live execution + system-state | ~2,000+ pairs, 5 categories | Reproducible; best coverage of call mechanics | English only; no latency |
| **ToolBench / ToolEval** | LLM-as-judge (ChatGPT), DFS decision tree | Thousands of RapidAPI endpoints | Max real-world API diversity | Live APIs change; hard to reproduce; judge variance |
| **API-Bank** | Rule-based result matching | ~50 APIs, ~300 instructions | Clean taxonomy of tool-use scenarios | Small scale; less maintained |
| **ToolSandbox** | Stateful conversational simulation | Mid-scale | Multi-turn conversation realism | Less adoption; fewer model coverage |

Key methodological distinction: BFCL uses structural AST matching (deterministic, scalable, no judge bias). ToolEval uses LLM-as-judge (more holistic but introduces inter-run variance). Neither captures what the other does — for a thorough model evaluation, run both.

See [[evals/llm-as-judge]] for the judge-based approach ToolEval uses, and [[agents/react-pattern]] for the decision-tree reasoning pattern underpinning ToolBench's annotation method.

---

## Related Pages

- [[evals/benchmarks]] — SWE-bench, MMLU, GPQA and other benchmarks; where BFCL fits in the evaluation landscape
- [[evals/methodology]] — when to use public benchmarks vs custom evals; how to interpret scores
- [[apis/anthropic-api]] — Anthropic tool use API: `tool_choice`, parallel tools, how Claude processes tool schemas
- [[apis/openai-api]] — OpenAI function calling: `functions` vs `tools` parameter evolution
- [[agents/practical-agent-design]] — production agent design; where tool-calling reliability matters most
- [[prompting/techniques]] — prompt patterns that improve tool-calling reliability (few-shot examples of well-formed calls)
- [[protocols/tool-design]] — how to write tool schemas that models call accurately

---

## Connections

- [[evals/benchmarks]] — where BFCL sits in the broader benchmark landscape alongside SWE-bench and MMLU
- [[evals/methodology]] — how to interpret BFCL scores and combine public benchmarks with custom evals
- [[agents/practical-agent-design]] — production agents are the primary consumers of BFCL signal; multi-turn and agentic categories are the most predictive
- [[protocols/tool-design]] — well-designed tool schemas improve BFCL scores; the two pages are tightly coupled
- [[apis/anthropic-api]] — Anthropic's tool_choice and parallel tools directly affect agentic category performance
- [[evals/llm-as-judge]] — ToolEval uses LLM-as-judge where BFCL uses AST comparison; understanding the tradeoff matters for benchmark selection

## Open Questions

- Will BFCL v5 address the English-only limitation, or will the field produce a separate multilingual tool-use benchmark?
- The agentic category's memory management sub-task is where frontier models struggle most — is this a prompting failure or a fundamental architectural gap, and does chain-of-thought help?
- How should BFCL scores be combined with latency benchmarks when selecting a model for a latency-sensitive production agent, and is there a published Pareto-front analysis for quality vs speed across frontier models?
