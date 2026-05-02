---
type: synthesis
category: synthesis
para: resource
tldr: Living overview of the AI engineering field — current state of models, tooling, infrastructure, and key trends across 310+ wiki pages.
updated: 2026-05-02
---

# AI Engineering — Living Overview

*Updated whenever an ingest meaningfully shifts the overall picture. The starting point for anyone who wants the current state of the field.*

---

## State of the Wiki

**Pages:** 302
**Categories:** 27 across 5 layers (added CS Fundamentals, Cloud Brain, QA Brain, Technical QA Brain)
**Last ingest:** Sprint 2026-05-02 — added aws-bedrock (Converse API/Knowledge Bases/Guardrails), mcp-server-development (FastMCP/transports/security), nosql-databases, cicd-pipelines, annotation-tooling; indexed 5 previously unindexed pages (multimodal/document-processing, image-generation, video; safety/red-teaming-methodology; data/datasets)

---

## The Field in One Paragraph (April 2026)

The shift is from model-building to system-building. Most engineers don't train models. They compose them. The stack is: a frontier model (Claude, GPT, Gemini) accessed via API, enhanced with RAG for knowledge, wrapped in an agent loop for autonomy, evaluated with LLM-as-judge, monitored with a tracing platform, and secured against prompt injection and tool misuse. MCP is the standard protocol for agent tool connectivity. LangGraph hit v1.0 and is the default runtime for multi-agent systems. Fine-tuning is increasingly displaced by better prompting and RAG. 57% of orgs don't fine-tune at all. Evals are the discipline most teams are behind on (only 52% have them). Observability has become essential infrastructure. AI security is a real and growing attack surface with 30+ MCP CVEs filed in April 2026 alone.

---

## The 10 Most Important Things to Know Right Now

1. **Agents are the product.** Claude Code, Devin, LangGraph pipelines — agentic loops with tool use are where all the value is being built. Understanding agent architecture is no longer optional.
2. **MCP is the new HTTP for agents.** Every major AI framework adopted it. Knowing the spec, transports, and security surface is table stakes.
3. **RAG beats fine-tuning for most use cases.** Hybrid retrieval (BM25 + dense) + reranker is the production-proven stack. GraphRAG for complex reasoning.
4. **Evals are the bottleneck.** Most teams ship models without proper evals. LLM-as-judge with SWE-bench for coding tasks is the current gold standard.
5. **Prompt engineering is a real skill.** XML tags for Claude, skip CoT for reasoning models, DSPy for production prompt optimisation.
6. **Security is not safety.** OWASP LLM Top 10 and the new Agentic Top 10 are the threat models. Prompt injection is #1. MCP servers are a large attack surface.
7. **Observability is infrastructure.** Langfuse (MIT, self-hostable) or LangSmith. Trace everything. Cost gates before they become surprises.
8. **Fine-tuning when it matters.** LoRA + QLoRA + DPO/GRPO via TRL or Axolotl. But confirm prompting + RAG can't solve it first.
9. **Multimodal is default.** Claude, GPT-4V, Gemini all handle vision natively. Document processing (PDFs, charts) is a key use case.
10. **The math matters.** Understanding attention, KV cache, quantisation precision trade-offs, and why LoRA works (low-rank update hypothesis) makes you a better engineer, not just a better user.

---

## Recommended Seeding Order

Ingest these topics to build a solid foundation quickly:

1. `research: LangGraph v1.0 multi-agent orchestration A2A protocol 2026`
2. `research: MCP Model Context Protocol spec transports security 2026`
3. `research: Anthropic API prompt caching tool use batch API streaming 2026`
4. `research: RAG chunking embeddings reranking GraphRAG RAGAS 2026`
5. `research: Claude prompt engineering XML chain-of-thought DSPy 2026`
6. `research: LLM evaluation LLM-as-judge SWE-bench inspect-ai braintrust 2026`
7. `research: OWASP LLM Top 10 OWASP Agentic Top 10 MCP CVEs prompt injection 2026`
8. `research: Langfuse LangSmith Arize LLM observability tracing OpenTelemetry 2026`
9. `research: Claude model family architecture capabilities benchmarks 2026`
10. `research: Anthropic Constitutional AI Responsible Scaling Policy safety 2026`
