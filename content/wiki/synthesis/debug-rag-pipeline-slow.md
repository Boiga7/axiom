---
type: synthesis
category: synthesis
para: resource
tags: [debugging, rag, performance, retrieval, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing RAG pipelines where retrieval is slow, adding seconds of latency before the LLM even starts.
---

# Debug: RAG Pipeline Slow

**Symptom:** End-to-end response time is high. Traces show retrieval taking 2-5 seconds before the LLM call even starts. Was faster before.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Slow on first query, fast after | Cold start — embedding model or vector store connection not warmed |
| Consistently slow regardless of query | Vector store query too expensive — missing index or full scan |
| Slow only on complex queries | Reranker adding latency — running on too many candidates |
| Slow after adding more documents | Index not optimised for current collection size |
| Slow only under concurrent load | Vector store connection pool exhausted |

---

## Likely Causes (ranked by frequency)

1. Embedding the query at runtime with no caching — embedding call adds 100-500ms per query
2. Vector store doing a full scan — HNSW or IVF index not built or configured correctly
3. Reranker running on 50+ candidates — reranking is expensive; reduce candidate set first
4. `top_k` set too high — fetching 100 chunks when 5-10 are needed
5. No connection pooling to the vector store — new connection established on every query

---

## First Checks (fastest signal first)

- [ ] Add timing spans to each retrieval stage — embed, retrieve, rerank separately; find where the time is spent
- [ ] Check vector store query plan — most vector stores expose query explain or profiling; confirm an index is being used
- [ ] Check `top_k` value — how many candidates are being retrieved before reranking?
- [ ] Check whether the embedding call is being made synchronously on every query — can it be cached or batched?
- [ ] Check connection reuse — is the vector store client created once or on every request?

**Signal example:** Retrieval taking 3.2s per query — timing spans show 2.8s in the reranker; `top_k` is set to 100 candidates being passed to the reranker; reducing to 20 candidates drops reranker time to 400ms.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Vector store indexing and query performance | [[infra/vector-stores]] |
| Embedding model latency | [[rag/embeddings]] |
| Reranking configuration | [[rag/pipeline]] |
| Tracing retrieval latency per stage | [[observability/langfuse]] |
| Caching embedding results | [[synthesis/debug-cache-inconsistency]] |

---

## Fix Patterns

- Reduce `top_k` to 10-20 before reranking — retrieve more than you need but not 10x more
- Cache query embeddings for repeated queries — identical queries should not re-embed
- Use async retrieval — start the vector search while the query is still being embedded
- Build the correct index type for your collection size — HNSW for <1M vectors, IVF for larger; flat index does not scale
- Reuse vector store client connections — create the client once at startup, not per request

---

## When This Is Not the Issue

If retrieval is fast but end-to-end latency is still high:

- The bottleneck has shifted to the LLM call — retrieval is not the constraint
- Check whether the full retrieved context is larger than necessary — passing 10,000 tokens to the LLM adds processing time

Pivot to [[synthesis/debug-llm-high-latency]] to diagnose latency in the generation stage after retrieval completes.

---

## Connections

[[rag/pipeline]] · [[rag/embeddings]] · [[infra/vector-stores]] · [[observability/langfuse]] · [[synthesis/debug-llm-high-latency]]
