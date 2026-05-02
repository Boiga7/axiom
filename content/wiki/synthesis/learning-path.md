---
type: synthesis
category: synthesis
tags: [learning-path, curriculum, roadmap, beginners, progression, software-engineer]
sources: []
updated: 2026-05-01
para: resource
tldr: Four-stage curriculum for software engineers entering AI engineering — Foundations (1-2 weeks), Building (2-3 weeks), Production (2-3 weeks), Advanced (ongoing) — each stage has a concrete project to build.
---

# AI Engineering Learning Path

> **TL;DR** Four-stage curriculum for software engineers entering AI engineering — Foundations (1-2 weeks), Building (2-3 weeks), Production (2-3 weeks), Advanced (ongoing) — each stage has a concrete project to build.

A structured progression for software engineers moving into AI engineering. Assumes Python proficiency and general backend/frontend experience. Organised into four stages. Complete each stage before moving to the next.

**Time estimates assume active building, not just reading.** Reading alone won't close the gap. Each stage has a project to build.

---

## Prerequisites — Computer Science Fundamentals

If you are not yet a working software engineer, start with [[cs-fundamentals/python-basics]] and work through the layer below. These are the underlying concepts every stage assumes you know. If you're already a working SE, skim the pages that cover areas you haven't touched recently.

| Page | What it covers | Priority if you're a working SE |
|---|---|---|
| [[cs-fundamentals/data-structures]] | Arrays, hash tables, linked lists, trees, heaps, graphs, Big O | Skim — just make sure you know Big O |
| [[cs-fundamentals/algorithms]] | Sorting, binary search, recursion, DP, two pointers, backtracking | Skim — refresh DP if rusty |
| [[cs-fundamentals/system-design]] | Load balancing, caching, databases, CAP theorem, microservices vs monolith | **Read** — directly maps to AI infra decisions |
| [[cs-fundamentals/sql]] | SELECT/JOIN/GROUP BY, indexes, ACID, transactions, SQLAlchemy ORM | **Read** — pgvector is PostgreSQL; you'll use this |
| [[cs-fundamentals/git]] | Staging, branching, merge vs rebase, PR workflow, conventional commits | Skim — refresh interactive rebase if unfamiliar |
| [[cs-fundamentals/networking]] | HTTP/HTTPS, DNS, TCP/IP, status codes, headers, SSE, WebSockets | **Read** — LLM streaming uses SSE; you'll hit 429s |
| [[cs-fundamentals/oop-patterns]] | Classes, inheritance, composition, SOLID, Factory/Observer/Strategy/Repository | **Read** — these patterns appear in every framework |

**Time to complete (from zero):** 3–4 weeks of evening reading + exercises. Working SEs: 2–3 days of targeted gaps.

---

## Stage 1 — Foundations (1–2 weeks)

Goal: understand what LLMs are, how to call them, and what you can build with a single API call.

### Read (in this order)

1. [[synthesis/getting-started]] — make your first API call before reading anything else
2. [[llms/claude]] — understand the model family you'll use most; which model for which task
3. [[apis/anthropic-api]] — the full API surface: system prompts, tool use, caching, batch, streaming
4. [[llms/transformer-architecture]] — how the model actually works; you don't need the math yet, read for intuition
5. [[prompting/techniques]] — XML structuring, few-shot examples, chain-of-thought; this changes output quality immediately
6. [[llms/hallucination]] — what can go wrong and why; shapes how you design every system

### Build

A CLI tool that takes a question and answers it using Claude. Add a system prompt. Add multi-turn history. Add streaming output. Roughly 100–150 lines of Python.

### Done when

You can explain what tokens are, why `max_tokens` matters for cost, and the difference between a system prompt and a user message.

---

## Stage 2 — Building (2–3 weeks)

Goal: build the two most common AI application patterns. RAG and agents. These cover ~80% of production AI systems.

### Read (in this order)

1. [[rag/pipeline]] — the full RAG stack end to end; read this before the detail pages
2. [[rag/chunking]] — how you split documents; chunking is underrated as a quality lever
3. [[rag/embeddings]] — what embeddings are and which model to use
4. [[infra/vector-stores]] — where you store and search embeddings; start with pgvector or Chroma
5. [[rag/reranking]] — the single biggest quality improvement after basic RAG works
6. [[agents/react-pattern]] — the agent loop: think, act, observe, repeat
7. [[agents/langgraph]] — the framework for building agents that need state and checkpointing
8. [[protocols/tool-design]] — how to write tool definitions the model will use correctly
9. [[synthesis/architecture-patterns]] — the 7 blueprints; shows how RAG and agents combine

### Build

A RAG application over a document set you care about (your company's documentation, a technical spec, a book). Add a chat interface. Add citations. Then extend it with one tool (e.g. a web search or a calculator). Roughly 300–500 lines of Python.

### Done when

You can explain the difference between retrieval and generation, why reranking helps, what `stop_reason: "tool_use"` means, and how an agent loop terminates.

---

## Stage 3 — Production (2–3 weeks)

Goal: learn what separates a demo from a system you can ship and maintain.

### Read (in this order)

1. [[evals/methodology]] — evaluating LLM output quality; the most important thing most engineers skip
2. [[evals/llm-as-judge]] — how to use Claude to score Claude's outputs automatically
3. [[test-automation/testing-llm-apps]] — how to write pytest tests for LLM applications without real API calls
4. [[synthesis/cost-optimisation]] — how to reduce costs 60–90% before your bill surprises you
5. [[observability/platforms]] — tracing every LLM call in production; Langfuse is the default
6. [[observability/tracing]] — OpenTelemetry for LLMs; what to instrument
7. [[security/prompt-injection]] — the #1 attack surface; understand it before you ship
8. [[security/owasp-llm-top10]] — the full threat model for LLM applications
9. [[infra/deployment]] — Docker, CI/CD, Vercel/Fly.io, environment management

### Build

Take the RAG app from Stage 2 and make it production-grade: add prompt caching, add pytest tests with mocked API calls, add a Langfuse integration to trace every call, write 10 eval cases with LLM-as-judge scoring. Deploy it.

### Done when

You can explain what an eval golden set is, why you mock the API in tests, what prompt injection is, and how to estimate the monthly cost of your app before deploying it.

---

## Stage 4 — Advanced (ongoing)

Goal: the deeper topics that make you a stronger AI engineer over time. These don't need to be read in strict order. Follow what's relevant to what you're building.

### Model internals

- [[llms/transformer-architecture]] — revisit with the math this time; attention formula, KV cache
- [[math/transformer-math]] — shapes, memory calculations, why context length affects cost
- [[math/probability]] — softmax, temperature, sampling strategies — why temperature 0 for factual tasks
- [[llms/tokenisation]] — why "1 token ≠ 1 word" matters for cost and for prompt design

### Advanced RAG

- [[rag/hybrid-retrieval]] — BM25 + dense + RRF; better than pure vector search
- [[rag/graphrag]] — for complex multi-hop reasoning over large document sets
- [[prompting/dspy]] — automated prompt optimisation; replaces hand-tuning at scale
- [[prompting/context-engineering]] — managing large context windows without degrading quality

### Agents and protocols

- [[agents/multi-agent-patterns]] — Supervisor, Swarm, Parallel fan-out; when single agent isn't enough
- [[agents/memory]] — how agents remember things across sessions
- [[protocols/mcp]] — the standard protocol for agent tool connectivity; you'll see it everywhere
- [[agents/openai-agents-sdk]] — OpenAI's agent framework; you'll encounter it in production repos

### Fine-tuning (when prompting + RAG isn't enough)

- [[synthesis/rag-vs-finetuning]] — read this first; most teams fine-tune when they shouldn't
- [[fine-tuning/decision-framework]] — the decision tree for when fine-tuning actually makes sense
- [[fine-tuning/lora-qlora]] — LoRA and QLoRA; how to fine-tune without a datacenter
- [[fine-tuning/dpo-grpo]] — DPO and GRPO; training on preferences not just examples

### Cloud and infrastructure

- [[infra/cloud-platforms]] — AWS Bedrock, GCP Vertex AI, Azure OpenAI; when to use managed cloud vs self-hosted
- [[infra/inference-serving]] — vLLM and llama.cpp for self-hosted inference
- [[infra/gpu-hardware]] — GPU selection, VRAM requirements, cloud vs on-prem cost

### Safety and alignment

- [[safety/constitutional-ai]] — how Claude is trained; shapes how you prompt and evaluate it
- [[safety/alignment]] — Anthropic's RSP; the capability thresholds that govern deployment
- [[safety/mechanistic-interpretability]] — what's actually happening inside the model

---

## The Project Ladder

The fastest path to AI engineering competence is a series of real projects, each adding one new concept:

| Project | Concepts practiced |
|---|---|
| CLI question-answering tool | Basic API, system prompts, streaming |
| RAG over your own documents | Chunking, embeddings, vector search, retrieval |
| RAG + citations + reranker | Reranking, faithfulness, source attribution |
| Support ticket classifier | Classification, model routing, Haiku for cheap tasks |
| Agent with web search tool | Agent loop, tool use, stop_reason handling |
| Django endpoint streaming LLM responses | Async, SSE, FastAPI/Django integration |
| Eval pipeline for any of the above | LLM-as-judge, golden sets, pytest evals |
| Multi-agent research pipeline | LangGraph, state management, handoffs |

Build these roughly in order. Each one compounds the last.

---

## What Makes a Good AI Engineer

Technical skills matter, but these habits separate good from great:

- **Evals first.** Define how you'll measure quality before you write any LLM code.
- **Test the plumbing.** Mock the API in tests. Never call the real model in CI.
- **Cost awareness.** Know your cost per call before you scale. Prompt caching and model routing are decisions, not afterthoughts.
- **Scepticism about the model.** The model will hallucinate. Design for it.
- **Read the response object.** `stop_reason`, `usage`, cache hit counts — this data tells you what's actually happening.

---

## Key Facts

- Stage 1 (Foundations, 1-2 weeks): first API call, system prompts, transformer intuition, prompting techniques, hallucination awareness
- Stage 2 (Building, 2-3 weeks): RAG pipeline, chunking, embeddings, vector stores, reranking, ReAct agent loop, LangGraph, tool design
- Stage 3 (Production, 2-3 weeks): evals, LLM-as-judge, testing with mocked API calls, cost optimisation, observability, prompt injection, OWASP, deployment
- Stage 4 (Advanced, ongoing): model internals, hybrid retrieval, GraphRAG, DSPy, multi-agent, MCP, fine-tuning, cloud infra, safety
- Project ladder: CLI tool → RAG app → RAG+citations+reranker → classifier → agent → Django SSE → eval pipeline → multi-agent
- "Evals first" is the most important habit: define how you'll measure quality before writing any LLM code
- Mock the API in tests — never call the real model in CI
- Read `stop_reason`, `usage`, and cache hit counts from every response object

## Connections

- [[synthesis/getting-started]] — the first page to read; your first working API call
- [[synthesis/architecture-patterns]] — the 7 blueprints that cover 90% of AI applications
- [[synthesis/llm-decision-guide]] — which model, embedding, vector store, and framework for each decision
- [[overview]] — the current state of the field in one page
- [[evals/methodology]] — the Stage 3 cornerstone; most engineers skip it and regret it
- [[synthesis/rag-vs-finetuning]] — the Stage 4 fine-tuning decision read

## Open Questions

- Does the Stage 1 → Stage 2 → Stage 3 ordering hold for engineers whose primary interest is model internals rather than applications?
- Is LangGraph still the right Stage 2 agent framework recommendation, or has a simpler alternative emerged that reduces the learning curve?
- At what project complexity does the project ladder diverge for backend-focused vs frontend-focused engineers?
