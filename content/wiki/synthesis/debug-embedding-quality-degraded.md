---
type: synthesis
category: synthesis
para: resource
tags: [debugging, embeddings, rag, retrieval, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing RAG accuracy drops caused by embedding model changes, stale indexes, or distribution shift.
---

# Debug: Embedding Quality Degraded

**Symptom:** RAG retrieval accuracy has dropped. Searches that used to return the right documents now return irrelevant ones. No code changes were made.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Accuracy dropped after embedding model update | New model produces different vector space — old index incompatible |
| Accuracy dropped after adding more documents | Index quality diluted by noisy or redundant documents |
| Accuracy fine for common queries, poor for rare ones | Embedding model underrepresents niche domain vocabulary |
| Scores all look similar (no clear top result) | Dimension collapse or normalisation issue |
| Was working, stopped after infrastructure change | Embedding model version changed silently on hosted provider |

---

## Likely Causes (ranked by frequency)

1. Embedding model changed — new model version incompatible with existing index vectors
2. Index rebuilt with different normalisation — dot product vs cosine similarity mismatch
3. Documents added without cleaning — noisy or duplicate content diluting retrieval signal
4. Domain vocabulary not covered by general embedding model
5. Similarity threshold too high — filtering out relevant results

---

## First Checks (fastest signal first)

- [ ] Confirm the embedding model version used to build the index matches what is used at query time
- [ ] Run a known-good query and inspect the top 5 similarity scores — are they meaningfully separated or all clustered?
- [ ] Check whether the index was rebuilt after any embedding model update
- [ ] Inspect recently added documents — are they clean, or do they contain noise, duplicates, or formatting issues?
- [ ] Check whether similarity threshold has changed — a tighter threshold may be filtering out borderline-relevant results

**Signal example:** Retrieval accuracy drops after provider updates the `text-embedding-3-small` endpoint — old index vectors were built with the previous model weights; new queries produce vectors in a different space, so cosine similarity returns near-random results.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Embedding model selection and versioning | [[rag/embeddings]] |
| Index rebuild and chunking strategy | [[rag/chunking]] |
| Evaluating retrieval quality | [[rag/ragas]] |
| Reranking to recover precision | [[rag/pipeline]] |

---

## Fix Patterns

- Pin the embedding model version explicitly — never use a floating `latest` alias for a model used to build a production index
- Rebuild the entire index when changing embedding models — partial rebuilds produce a mixed vector space that degrades retrieval
- Evaluate retrieval with RAGAS before and after any index change — track recall@k and precision@k as regression metrics
- Add a document quality filter before indexing — remove duplicates, low-content pages, and boilerplate
- Use a domain-adapted embedding model for specialised content — general models perform poorly on medical, legal, or technical jargon

---

## When This Is Not the Issue

If embedding model version is pinned and the index is fresh but quality is still poor:

- The problem may be in chunking — chunks too small or split across key information boundaries
- Check whether the query phrasing matches how the information is written in the documents

Pivot to [[synthesis/debug-rag-wrong-context]] for a broader diagnostic of the full RAG pipeline beyond the embedding layer.

---

## Connections

[[rag/embeddings]] · [[rag/chunking]] · [[rag/pipeline]] · [[rag/ragas]] · [[synthesis/debug-rag-wrong-context]]
