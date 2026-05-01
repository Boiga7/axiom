---
type: concept
category: rag
tags: [reranking, cohere, cross-encoder, retrieval, rag, jina]
sources: []
updated: 2026-04-29
para: resource
tldr: Cross-encoder reranking is the single biggest precision lever in RAG — 10-25% NDCG improvement; Cohere Rerank v3.5 (API), Jina v2 (137M self-hosted), BGE v2-m3 (568M highest quality open).
---

# Reranking

> **TL;DR** Cross-encoder reranking is the single biggest precision lever in RAG — 10-25% NDCG improvement; Cohere Rerank v3.5 (API), Jina v2 (137M self-hosted), BGE v2-m3 (568M highest quality open).

A second-pass scoring step applied after initial retrieval. The retriever finds the top-k candidates fast; the reranker scores them accurately. This two-stage pattern consistently delivers 10-25% NDCG improvement over retrieval alone.

---

## Why Reranking Exists

Vector search is approximate. Embedding models compress a chunk into 768 or 1536 numbers — semantic meaning survives, but fine-grained relevance detail doesn't. A bi-encoder embeds query and document independently, which is fast but lossy.

A cross-encoder sees the query and document together, computing full attention across both. It can catch:
- Exact keyword matches the embedding missed
- Negations ("does NOT support X")
- Query-specific relevance that looks irrelevant in isolation

The cost: cross-encoders are ~100x slower than bi-encoders. So you never use them for first-pass retrieval over millions of chunks — only to rerank 20-100 candidates.

---

## Cohere Rerank

The default production choice. API-hosted, no GPU required.

```python
import cohere

co = cohere.Client("COHERE_API_KEY")

query = "What is the capital gains tax rate for 2025?"
documents = [chunk["text"] for chunk in top_100_chunks]

response = co.rerank(
    model="rerank-v3.5",
    query=query,
    documents=documents,
    top_n=5,
    return_documents=True,
)

for result in response.results:
    print(f"Score: {result.relevance_score:.4f}")
    print(f"Text:  {result.document.text[:200]}")
```

**rerank-v3.5** (released 2024) supports multilingual reranking and semi-structured data (JSON, tables, code). Pass raw JSON objects as documents — it handles structure natively.

**Pricing:** ~$2 per 1,000 searches (each search = query + N documents scored).

---

## Jina Reranker

Open-weights alternative. Run locally or via API.

```python
from transformers import AutoModelForSequenceClassification
import torch

model = AutoModelForSequenceClassification.from_pretrained(
    "jinaai/jina-reranker-v2-base-multilingual",
    torch_dtype=torch.float16,
    trust_remote_code=True,
)
model.eval()

pairs = [[query, doc] for doc in documents]
scores = model.compute_score(pairs, max_length=1024)
ranked = sorted(zip(scores, documents), reverse=True)
```

`jina-reranker-v2-base-multilingual` (137M params) runs on a single RTX 3080 at ~200 pairs/second. Suitable for on-prem deployments where Cohere API is not an option.

---

## BGE Reranker (BAAI)

Strong open-weights option, especially for Chinese + English:

```python
from FlagEmbedding import FlagReranker

reranker = FlagReranker("BAAI/bge-reranker-v2-m3", use_fp16=True)
scores = reranker.compute_score([[query, doc] for doc in documents])
```

`bge-reranker-v2-m3` has SOTA performance on BEIR at 568M params. Slower than Jina but higher quality.

---

## LangChain Integration

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

compressor = CohereRerank(model="rerank-v3.5", top_n=5)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vectorstore.as_retriever(search_kwargs={"k": 50})
)

docs = compression_retriever.invoke("What is the capital gains tax rate?")
```

The base retriever fetches 50 chunks; Cohere reranks and returns the top 5.

---

## LlamaIndex Integration

```python
from llama_index.postprocessor.cohere_rerank import CohereRerank

reranker = CohereRerank(api_key="...", top_n=5)
query_engine = index.as_query_engine(
    similarity_top_k=50,
    node_postprocessors=[reranker],
)
```

---

## Retrieval Numbers

Typical improvement from adding a reranker on top of dense retrieval:

| Stage | NDCG@10 |
|---|---|
| BM25 only | ~0.45 |
| Dense only (text-embedding-3-large) | ~0.55 |
| Dense + Cohere rerank-v3.5 | ~0.65–0.70 |
| Hybrid (BM25+dense) + rerank | ~0.70–0.75 |

Source: BEIR benchmark; exact numbers vary by domain.

---

## When to Skip Reranking

- Latency budget is <200ms end-to-end (reranking adds 100-500ms)
- Corpus is small (<1,000 chunks) — the bi-encoder is accurate enough
- Queries are keyword-heavy and exact-match retrieval works fine

For everything else — especially financial docs, legal, medical, code search — add a reranker.

---

## Reranker vs. Larger Retrieval k

A common alternative: just retrieve top 20 instead of top 5. This does not replicate reranking. The 20th bi-encoder result is often irrelevant; a reranker on 50 results and returning 5 gives you better 5 results than just taking the top-5 bi-encoder results with k=5.

---

## Key Facts

- Cross-encoder vs bi-encoder: cross-encoder sees query+document together (full attention); bi-encoder embeds independently (~100x faster but lossy)
- Cohere rerank-v3.5: ~$2 per 1,000 searches; multilingual; handles JSON/tables/code natively
- Jina reranker-v2-base-multilingual: 137M params; ~200 pairs/second on RTX 3080
- BGE reranker-v2-m3: 568M params; SOTA on BEIR; best open quality
- NDCG@10 progression: BM25 ~0.45 → dense ~0.55 → dense+rerank ~0.65-0.70 → hybrid+rerank ~0.70-0.75
- Latency: reranking adds 100-500ms; skip if latency budget is <200ms
- More k ≠ reranking: top-20 bi-encoder results are not equivalent to top-5 after reranking 50 candidates

## Connections

- [[rag/pipeline]] — where reranking fits in the full pipeline
- [[rag/hybrid-retrieval]] — hybrid retrieval provides the best first-pass candidates to rerank
- [[rag/embeddings]] — the bi-encoder stage that precedes reranking

## Open Questions

- Does Cohere rerank-v3.5's native JSON/table handling actually improve reranking quality vs text-only for structured document corpora?
- Is 50 the right first-pass k value, or does the optimal first-pass size vary by domain?
- Can self-hosted rerankers (Jina, BGE) match Cohere's multilingual quality for European languages?
