---
type: synthesis
category: synthesis
tags: [decision-guide, model-selection, architecture, which-model, when-to-use]
sources: []
updated: 2026-04-29
para: resource
tldr: Opinionated decision tables for every major AI engineering choice — model (Sonnet 4.6 default), embedding (Cohere 65.2 MTEB), vector store (pgvector if on Postgres), agent framework (LangGraph for stateful Python), observability (Langfuse self-hosted), fine-tuning (Axolotl), and the prompting → RAG → fine-tune → agents escalation order.
---

# LLM Decision Guide

> **TL;DR** Opinionated decision tables for every major AI engineering choice — model (Sonnet 4.6 default), embedding (Cohere 65.2 MTEB), vector store (pgvector if on Postgres), agent framework (LangGraph for stateful Python), observability (Langfuse self-hosted), fine-tuning (Axolotl), and the prompting → RAG → fine-tune → agents escalation order.

Which model, which approach, which architecture, for every major decision an AI engineer faces. The answers here are opinionated defaults. Adjust based on your constraints.

---

## Which Model Should I Use?

### Proprietary Models

**Default choice for most production work:** Claude Sonnet 4.6
- 79.6% SWE-bench, $3/$15 per M tokens
- 1M context, extended thinking available
- Best instruction following as of April 2026

**When you need maximum quality:** Claude Opus 4.7
- Hardest coding problems, complex multi-step reasoning, research synthesis
- 5x more expensive than Sonnet — justify the cost with the task complexity

**High-volume, cost-sensitive:** Claude Haiku 4.5 or GPT-4o-mini
- Classification, routing, extraction, summarisation
- 3-10x cheaper than Sonnet-tier

**Hard reasoning (math, logic, proofs):** Claude Opus 4.7 or o3
- o3 for pure reasoning (math/logic); Claude Opus for reasoning + coding

**OpenAI ecosystem locked in:** GPT-4o as the workhorse, o3 for hard problems

### Open Source / Self-Hosted

**Best quality, self-hosted:** Llama 3.1 70B or DeepSeek V3
**Best reasoning, self-hosted:** DeepSeek R1 Distill 32B or QwQ-32B
**Smallest capable model:** Phi-4 14B
**Best code generation:** Qwen 2.5-Coder 32B

---

## Prompting vs RAG vs Fine-Tuning vs Agents?

```
Does it work with a good prompt and few-shot examples?
  YES → Ship it. Prompting is free.
  NO  ↓

Is the problem about missing recent/external knowledge?
  YES → Add RAG. Build retrieval pipeline first.
  NO  ↓

Is the problem about inconsistent behaviour / wrong format / wrong tone?
  YES → Fine-tune. LoRA on 500-2K examples.
  NO  ↓

Is the problem about multi-step task execution requiring decisions + tool use?
  YES → Build an agent (ReAct + tools).
  NO  ↓

Escalate: harder problem, better model, or rethink the task decomposition.
```

---

## Which Embedding Model?

| Need | Model | Dim | MTEB |
|---|---|---|---|
| Best quality (managed) | Cohere embed-v4 | 1024 | 65.2 |
| OpenAI ecosystem | text-embedding-3-large | 3072 | 64.6 |
| Best open-source | BGE-M3 | 1024 | 63.0 |
| Cheap + fast | text-embedding-3-small | 1536 | 62.3 |
| On-prem multilingual | BGE-M3 | 1024 | 63.0 |

Add Cohere Rerank on top of any of these for +10-25% retrieval quality.

---

## Which Vector Store?

| Situation | Choice |
|---|---|
| Already on Postgres | pgvector |
| Need hybrid (BM25 + dense) natively | Weaviate or Qdrant |
| Managed, no ops team | Pinecone Serverless |
| Production Rust performance | Qdrant |
| Agent session memory (small) | Redis (simple) |
| Everything in one store | Qdrant (sparse + dense + payload filtering) |

---

## Which Agent Framework?

| Need | Framework |
|---|---|
| Complex stateful workflows, production Python | LangGraph |
| Simple ReAct loop, quick prototype | LangChain LCEL or bare API loop |
| Java Spring Boot | Spring AI or LangChain4j |
| Java standalone | LangChain4j |
| OpenAI-first, lightweight | OpenAI Assistants API |
| No framework, full control | Bare API calls in a while loop |

For agentic RAG: LangGraph with a retrieval node. For simple Q&A RAG: LlamaIndex or LangChain.

---

## Which Observability Platform?

| Situation | Choice |
|---|---|
| Open source, self-host | Langfuse (MIT, Docker Compose) |
| LangChain-heavy | LangSmith |
| OpenAI-heavy | LangSmith or Langfuse |
| Unified ML + LLM | Arize Phoenix |
| Enterprise, existing Datadog/Grafana | OTel → existing stack |

---

## Which Inference Serving?

| Need | Choice |
|---|---|
| Production API, max throughput | vLLM |
| Local dev, any OS | llama.cpp |
| Mac local | llama.cpp or Ollama |
| Managed, no ops | Together AI, Fireworks, Modal |
| OpenAI-compatible, serverless | Together / Fireworks |
| Self-hosted, enterprise | vLLM on Kubernetes |

---

## Which Fine-Tuning Framework?

| Need | Framework |
|---|---|
| Most objectives, easiest config | Axolotl (YAML-driven) |
| Fastest single-GPU | Unsloth (2-4x faster) |
| DPO/GRPO specifically | TRL |
| Maximum control, PyTorch native | PEFT + Trainer |

Start with Axolotl. Switch to Unsloth if speed is the bottleneck.

---

## How Much Context to Use?

```
Task needs specific information from a known source?
  → Retrieve it (RAG). Don't stuff the full corpus into context.

Task needs to reason over a full long document (e.g. contract review)?
  → Use long context (100K+). Claude/Gemini are good at this.

Task is ongoing chat with history?
  → Sliding window last 10 turns + summary of older turns.

Repeating the same large prefix (system prompt, docs) across many calls?
  → Use prompt caching. Saves 90% on cached tokens.
```

---

## What Does 1M Context Actually Cost?

At Claude Sonnet 4.6 ($3/M input):
- 1M tokens = $3 per call
- 100 calls/day at 1M context = $300/day = ~$9,000/month

Prompt caching changes this dramatically. If 800K of those tokens are static (same docs every call):
- First call: 800K × 1.25× + 200K × 1× = $1.225
- Subsequent calls (within 1 hour): 800K × 0.1× + 200K × 1× = $0.84
- vs uncached: $3.00 per call

Cache aggressively. It's the single highest-leverage cost optimisation.

---

## Security Checklist for LLM Features

Before shipping any LLM feature:

- [ ] Input validation — length limits, injection-suspicious pattern detection
- [ ] Output validation — structured outputs parsed/validated, not eval'd
- [ ] Tool permissions — principle of least privilege for every tool
- [ ] Context isolation — no user's data leaks into another user's context
- [ ] Rate limiting — per-user token budgets
- [ ] System prompt hardening — explicit "do not reveal system prompt" instruction
- [ ] Red team — run 50+ adversarial prompts before launch
- [ ] Logging — full input/output trace for every call (for incident response)

---

## Key Facts

- Default proprietary model: Claude Sonnet 4.6 (79.6% SWE-bench, $3/$15 per M, 1M context)
- Maximum quality: Claude Opus 4.7 — ~5x Sonnet cost; justify with task complexity
- High-volume cost-sensitive: Claude Haiku 4.5 or GPT-4o-mini — 3-10x cheaper than Sonnet-tier
- Best open-source quality: Llama 3.1 70B or DeepSeek V3; best open-source reasoning: DeepSeek R1 Distill 32B
- Escalation order: prompting → RAG → fine-tuning → agents; try each before moving to the next
- Embedding ranking: Cohere embed-v4 (65.2) > OpenAI 3-large (64.6) > BGE-M3 (63.0)
- Add Cohere Rerank on top of any embedding model for +10-25% retrieval quality
- Vector store default: pgvector if already on Postgres; Qdrant for production Rust performance
- Agent framework default: LangGraph for complex stateful Python workflows
- Fine-tuning framework default: Axolotl (YAML-driven, widest objective coverage); switch to Unsloth if speed bottlenecks
- 1M context at Sonnet uncached: $3/call; with 800K cached tokens (1-hour TTL): ~$0.84/call

## Connections

- [[llms/model-families]] — detailed model comparison with benchmarks and pricing
- [[synthesis/rag-vs-finetuning]] — RAG vs fine-tuning deep dive
- [[rag/embeddings]] — full embedding model comparison with MTEB scores
- [[rag/reranking]] — Cohere/Jina/BGE reranker comparison
- [[security/owasp-llm-top10]] — full security threat model behind the security checklist
- [[evals/methodology]] — how to know if your choice is working
- [[observability/platforms]] — Langfuse vs LangSmith vs Arize Phoenix comparison

## Open Questions

- Does the "Sonnet as default" recommendation hold as Opus and Haiku pricing evolve, or will the tiers shift?
- Is the LangGraph recommendation still appropriate for teams not already invested in the LangChain ecosystem?
- At what scale does "bare API calls in a while loop" stop being sufficient and framework adoption become necessary?
