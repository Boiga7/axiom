---
type: synthesis
category: synthesis
para: resource
tags: [debugging, rag, retrieval, embeddings, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing RAG pipelines returning irrelevant, incomplete, or hallucinated answers.
---

# Debug: RAG Returning Wrong Context

**Symptom:** LLM answers are wrong, hallucinated, or too generic despite relevant documents existing in the knowledge base. Retrieved chunks do not match the question.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Answer is hallucinated despite docs existing | Retrieval is not finding the right chunks |
| Answer is partially right but incomplete | Chunks are too small or split across a boundary |
| Answer degrades over time | Index is stale — new documents not ingested |
| Answer correct for simple queries, wrong for complex | Embedding model cannot handle multi-concept queries |
| Answer ignores retrieved context entirely | Context window too full — retrieved chunks are lost in the middle |

---

## Likely Causes (ranked by frequency)

1. Retrieval returning irrelevant chunks — embedding similarity is not matching intent
2. Chunk boundaries splitting key information across two chunks
3. Index stale — documents updated but embeddings not regenerated
4. Retrieved context too long — model ignores middle chunks
5. Wrong retrieval strategy — dense-only when hybrid (BM25 + dense) would work better

---

## First Checks (fastest signal first)

- [ ] Log the retrieved chunks — are the right documents actually being returned before the LLM sees them?
- [ ] Check retrieval score thresholds — are low-similarity chunks being passed through?
- [ ] Confirm index freshness — when was the last embed and index run?
- [ ] Check chunk size — are answers split across chunk boundaries?
- [ ] Check context window usage — are retrieved chunks being truncated before reaching the model?

**Signal example:** LLM says "I don't have information on X" but the document exists — retrieved chunks logged show top 3 results are all unrelated; similarity scores are below 0.5 on all.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Retrieval not finding the right documents | [[rag/embeddings]] |
| Chunk boundaries breaking coherent answers | [[rag/chunking]] |
| Scores too low across all queries | [[rag/pipeline]] |
| Want to add reranking to improve precision | [[rag/pipeline]] |
| Evaluating whether retrieval is actually working | [[evals/methodology]] |

---

## Fix Patterns

- Add reranking after retrieval — single biggest precision gain; use Cohere Rerank or Jina Reranker v3
- Switch to hybrid retrieval (BM25 + dense) — keyword matching catches what semantic search misses
- Increase chunk overlap — prevents key information from being split at boundaries
- Lower similarity threshold cautiously — too low returns noise; too high returns nothing
- Log retrieved chunks on every query in production — invisible retrieval failures are the most common RAG bug

---

## When This Is Not the Issue

If retrieved chunks are correct and relevant but the answer is still wrong:

- The problem is in generation, not retrieval
- Check whether the prompt instructs the model to use only the provided context
- Check for lost-in-the-middle failure — relevant chunk may be retrieved but buried in a long context window

Pivot to [[prompting/techniques]] to tighten the prompt's instruction to ground answers in retrieved context only.

---

## Connections

[[rag/pipeline]] · [[rag/chunking]] · [[rag/embeddings]] · [[evals/methodology]] · [[prompting/techniques]] · [[llms/hallucination]]
