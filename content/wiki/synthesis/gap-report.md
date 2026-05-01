---
type: synthesis
category: synthesis
para: area
tags: [gaps, intelligence]
tldr: Ranked list of knowledge gaps relative to active projects and the 0→SE→AE learning path — what to research next.
updated: 2026-05-01
---

# Knowledge Gap Report — 2026-05-01 (v2)

> **TL;DR** Ranked list of knowledge gaps relative to active projects and the full 0→SE→AE learning path.

## Active Projects Detected

- **evalcheck**: pytest plugin + GitHub App for LLM eval regressions. v0.2.0 shipped to PyPI. Next gate: GitHub Marketplace listing. Kill criterion: 2026-07-28.
- **mcpindex**: CLI + public scorecard for MCP server security scanning. Weekend 2 — auth boundary tests, latency baselines, HTTP transport.

---

## Critical Gaps (blocks active project or the learning path)

### 1. `cs-fundamentals/python-basics` — MISSING

The vault's Layer 0 assumes the user can already write Python. No page covers Python fundamentals: variables, types, control flow, functions, list/dict comprehensions, decorators, context managers (`with`), exception handling, f-strings, `*args/**kwargs`. Without this, "0 → SE" is actually "working Python developer → SE".

- **Impact:** Blocks the true 0-start of the learning path.
- **Suggested:** `wiki/cs-fundamentals/python-basics.md`

### 2. `instructor` library — MISSING

The dominant pattern for structured LLM outputs in production Python. Wraps the Anthropic and OpenAI SDKs with Pydantic schema enforcement and automatic retry on validation failure. Used in a large proportion of real AI engineering codebases. Referenced nowhere in the vault.

- **Impact:** Major practical gap — anyone building with LLMs will encounter this.
- **Suggested:** `wiki/prompting/structured-outputs.md` or `wiki/python/instructor.md`

### 3. `infra/experiment-tracking` — MISSING

Fine-tuning section covers Axolotl, TRL, Unsloth, PEFT, but nothing on Weights & Biases or MLflow — the standard tools for logging training runs, tracking hyperparameters, comparing experiments, and catching overfitting. `observability/` covers production LLM monitoring, not ML training observability. These are different problems.

- **Impact:** Fine-tuning stack is incomplete without it.
- **Suggested:** `wiki/infra/experiment-tracking.md`

---

## Concept Gaps (mentioned elsewhere, no dedicated page)

### 4. `agents/langchain` — MISSING

LangGraph, LangSmith, and LangMem all have dedicated pages, but LangChain itself (document loaders, text splitters, LCEL — LangChain Expression Language, PromptTemplate, ConversationChain) has none. Referenced throughout `rag/` pages ("LangChain integration") without explanation.

- **Suggested:** `wiki/agents/langchain.md`

### 5. `security/guardrails` — MISSING

`security/` covers prompt injection, OWASP LLM Top 10, and red-teaming, but no page covers output validation and runtime guardrails libraries: Guardrails AI, NVIDIA NeMo Guardrails, the `instructor` retry pattern, or structured output enforcement at the application layer. Distinct from prompt injection defence — this is about enforcing output contracts.

- **Suggested:** `wiki/security/guardrails.md`

---

## Resolved Gaps (for record)

All gaps from v1 (2026-05-01) resolved in the same session:

| Gap | Page |
|-----|------|
| GitHub Apps auth | [[infra/github-apps]] |
| GitHub Marketplace billing | [[infra/github-marketplace]] |
| Auth boundary testing | [[security/oauth-boundary-testing]] |
| MCP HTTP transport | [[protocols/mcp-http-transport]] |
| PyPI distribution | [[python/pypi-distribution]] |
| Latency benchmarking | [[python/latency-benchmarking]] |
| Enterprise AI adoption | [[landscape/enterprise-ai-adoption]] |
| AI use case identification | [[landscape/ai-use-case-identification]] |
| Practical agent design | [[agents/practical-agent-design]] |
| CrewAI | [[agents/crewai]] |
| AutoGen / AG2 | [[agents/autogen]] |
| Query expansion | [[rag/query-expansion]] |
| LangGraph Cloud | [[agents/langgraph-cloud]] |
| LangMem | [[agents/langmem]] |
| distilabel | [[data/distilabel]] |
| CS fundamentals (7 pages) | [[cs-fundamentals/data-structures]], [[cs-fundamentals/algorithms]], [[cs-fundamentals/system-design]], [[cs-fundamentals/sql]], [[cs-fundamentals/git]], [[cs-fundamentals/networking]], [[cs-fundamentals/oop-patterns]] |
| Experiment pages (.qmd → .md + results) | [[experiments/prompt-caching-savings]], [[experiments/model-latency-comparison]], [[experiments/rag-chunking-benchmark]], [[experiments/embedding-mteb-local]] |

---

## Suggested Ingest Queue (ranked)

1. `cs-fundamentals/python-basics` — unblocks the 0 → SE entry point
2. `instructor` library — high practical value, used in most real AI codebases
3. `infra/experiment-tracking` — completes the fine-tuning stack (W&B, MLflow)
4. `agents/langchain` — fills the obvious gap in the LangChain ecosystem pages
5. `security/guardrails` — rounds out the production AI safety stack

---

## Connections

- [[para/projects]] — source of active project context
- [[synthesis/learning-path]] — 0→SE→AE curriculum this report feeds into
- [[index]] — coverage map
- [[security/mcp-cves]] — mcpindex's primary research domain
- [[evals/methodology]] — evalcheck's core domain

- [[synthesis/graph-health]] — link density audit of this vault; pre/post-fix scores
