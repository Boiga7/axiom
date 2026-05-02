---
type: concept
category: rag
tags: [hybrid-retrieval, bm25, dense-retrieval, rrf, rag, sparse, vector-search]
sources: []
updated: 2026-04-29
para: resource
tldr: BM25+dense hybrid with RRF (k=60) is the production standard — BM25 catches exact-match keywords dense misses; dense catches semantic matches BM25 misses; Qdrant and Weaviate have native hybrid support.
---

# Hybrid Retrieval

> **TL;DR** BM25+dense hybrid with RRF (k=60) is the production standard — BM25 catches exact-match keywords dense misses; dense catches semantic matches BM25 misses; Qdrant and Weaviate have native hybrid support.

Combining sparse (BM25) and dense (vector) retrieval. Neither alone is best. Hybrid consistently outperforms either approach across benchmarks. The standard recipe: BM25 + dense embedding search, merged with Reciprocal Rank Fusion (RRF).

---

## Why Neither Alone is Sufficient

**BM25 (sparse):**
- Excellent at exact keyword matches: product names, error codes, proper nouns, version numbers
- Fails on synonyms and paraphrase: "car" vs "automobile", "How do I fix X" vs "X troubleshooting"
- No semantic understanding

**Dense (vector):**
- Excellent at semantic similarity and paraphrase
- Weak on exact matches: `TypeError: 'NoneType' object is not subscriptable` retrieves poorly if the exact string isn't in training
- All common terms treated similarly (no TF-IDF weighting)

**Hybrid:** BM25 catches the keyword matches dense misses; dense catches the semantic matches BM25 misses.

---

## BM25 Explained

BM25 scores documents by term frequency (TF), inverse document frequency (IDF), and document length normalisation:

```
score(D, Q) = Σ IDF(qi) × (f(qi,D) × (k1+1)) / (f(qi,D) + k1 × (1-b+b×|D|/avgdl))
```

- `f(qi, D)` — frequency of query term qi in document D
- `|D|` — document length; `avgdl` — average document length
- `k1 ∈ [1.2, 2.0]` — term saturation parameter
- `b ∈ [0, 1]` — length normalisation (0.75 typical)

You never need to tune these; the defaults work.

---

## Reciprocal Rank Fusion (RRF)

RRF merges ranked lists without needing to normalise scores across systems (BM25 scores and cosine similarities are on different scales).

```
RRF(d) = Σ 1 / (k + rank_i(d))
```

`k = 60` is the standard constant. For each document, sum its reciprocal ranks across all retrieval systems.

```python
def reciprocal_rank_fusion(result_lists: list[list[str]], k: int = 60) -> list[tuple[str, float]]:
    scores: dict[str, float] = {}
    for results in result_lists:
        for rank, doc_id in enumerate(results, start=1):
            scores[doc_id] = scores.get(doc_id, 0) + 1 / (k + rank)
    return sorted(scores.items(), key=lambda x: x[1], reverse=True)

# Usage
bm25_results = ["doc_3", "doc_1", "doc_7", ...]   # ranked list of IDs
dense_results = ["doc_1", "doc_5", "doc_3", ...]

fused = reciprocal_rank_fusion([bm25_results, dense_results])
```

RRF is robust: a document appearing in position 1 in one list and position 100 in another scores well, not just documents that rank highly in both.

---

## Implementation with Elasticsearch

Elasticsearch's `knn` + `match` hybrid:

```python
from elasticsearch import Elasticsearch

es = Elasticsearch("http://localhost:9200")

response = es.search(
    index="documents",
    body={
        "query": {
            "match": {
                "text": {
                    "query": query_text,
                    "boost": 0.5,   # BM25 weight
                }
            }
        },
        "knn": {
            "field": "embedding",
            "query_vector": query_embedding,
            "k": 50,
            "num_candidates": 200,
            "boost": 0.5,           # Dense weight
        },
        "size": 10,
    }
)
```

Elasticsearch handles the merging internally. The `boost` values weight the two scores.

---

## Implementation with Qdrant

Qdrant supports native sparse vectors alongside dense since v1.7:

```python
from qdrant_client import QdrantClient
from qdrant_client.models import (
    SparseVector, NamedSparseVector, NamedVector, SearchRequest, Prefetch
)

client = QdrantClient("localhost", port=6333)

# Hybrid query using Qdrant's built-in RRF
results = client.query_points(
    collection_name="documents",
    prefetch=[
        Prefetch(
            query=SparseVector(indices=sparse_indices, values=sparse_values),
            using="sparse",
            limit=50,
        ),
        Prefetch(
            query=dense_embedding,
            using="dense",
            limit=50,
        ),
    ],
    query=models.FusionQuery(fusion=models.Fusion.RRF),
    limit=10,
)
```

Sparse vectors come from a sparse encoder like SPLADE or BM25Vectorizer.

---

## Implementation with pgvector + Python BM25

For teams already on PostgreSQL, combine pgvector (dense) with BM25 in Python:

```python
from rank_bm25 import BM25Okapi
import numpy as np

# BM25 setup (build once, cache)
tokenized_corpus = [doc.split() for doc in all_texts]
bm25 = BM25Okapi(tokenized_corpus)

def hybrid_search(query: str, query_embedding: list[float], top_k: int = 10):
    # BM25 scores
    bm25_scores = bm25.get_scores(query.split())
    bm25_ranked = np.argsort(bm25_scores)[::-1][:50]

    # Dense search via pgvector
    dense_results = pg_vector_search(query_embedding, limit=50)  # returns [(id, score), ...]
    dense_ranked = [r[0] for r in dense_results]

    # RRF fusion
    fused = reciprocal_rank_fusion([
        [str(i) for i in bm25_ranked],
        dense_ranked,
    ])
    return fused[:top_k]
```

---

## SPLADE: Learned Sparse Retrieval

SPLADE learns a sparse representation that's more powerful than term frequency. Each token activates a weighted set of vocabulary terms, including synonyms.

```python
from transformers import AutoTokenizer, AutoModelForMaskedLM
import torch

model_id = "naver/splade-cocondenser-ensembled"
tokenizer = AutoTokenizer.from_pretrained(model_id)
model = AutoModelForMaskedLM.from_pretrained(model_id)

def encode_splade(text: str) -> dict:
    tokens = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        output = model(**tokens)
    
    # ReLU + log weighting
    weights = torch.log1p(torch.relu(output.logits)).max(dim=1).values.squeeze()
    
    nonzero = weights.nonzero().squeeze()
    indices = nonzero.tolist()
    values = weights[nonzero].tolist()
    return {"indices": indices, "values": values}
```

SPLADE bridges the gap between BM25 and dense. It's a learned sparse model that generalises across synonyms.

---

## Choosing a Hybrid Architecture

| Stack | When to use |
|---|---|
| Qdrant (dense + sparse native) | Greenfield, want everything in one store |
| Elasticsearch | Already have ES; large-scale ops team |
| pgvector + Python BM25 | Already on Postgres; small-medium scale |
| Weaviate (BM25 + vector native) | Need BM25 + vector without extra infra |
| OpenSearch | AWS shop |

---

## Key Facts

- RRF formula: score(d) = Σ 1/(k + rank_i(d)); k=60 is the standard constant
- RRF advantage: merges ranked lists without normalising across incompatible score scales (BM25 vs cosine)
- Qdrant: native sparse + dense hybrid with built-in RRF via `FusionQuery` since v1.7
- SPLADE: learned sparse model that maps terms to synonyms; bridges BM25 and dense approaches
- pgvector + rank_bm25: viable for teams already on PostgreSQL at small-medium scale
- BM25 parameters k1 ∈ [1.2, 2.0], b=0.75 — defaults work; no tuning needed

## Common Failure Cases

**BM25 scores and cosine similarities on different scales cause naive weighted sum to favour one channel**  
Why: BM25 returns scores in range 0-20+; cosine similarity is 0-1; a simple weighted sum is dominated by whichever has larger absolute values.  
Detect: fusion results are nearly identical to the BM25-only or dense-only results; one channel is effectively ignored.  
Fix: use RRF instead of weighted sum; RRF is rank-based and immune to scale differences.

**SPLADE sparse vectors not generated for queries, only for documents**  
Why: SPLADE requires encoding both query and document with the same model; using BM25 tokenisation for queries while SPLADE encodes documents creates a mismatch.  
Detect: sparse scores are all zero for queries when you switch to SPLADE indexing.  
Fix: encode queries with the SPLADE model too; don't mix SPLADE document vectors with BM25 query vectors.

**Qdrant FusionQuery returns fewer results than expected**  
Why: the Prefetch `limit` on each channel caps candidates before fusion; if both channels return few results, the fused list is thin.  
Detect: `client.query_points(... limit=10)` returns 3 results despite thousands of documents in the collection.  
Fix: increase Prefetch `limit` to 50-100 per channel before applying FusionQuery; the final `limit` trims to the desired count.

**pgvector + Python BM25 hybrid doesn't scale past ~100K chunks**  
Why: `BM25Okapi` from `rank_bm25` loads the full corpus into RAM and recomputes on every query; no indexing.  
Detect: query latency grows linearly with corpus size; >500ms at 100K chunks.  
Fix: use Elasticsearch or OpenSearch for BM25 at scale; both have ANN vector search and native hybrid support.

**RRF k=60 flattens ranking when only 10-20 candidates are in each list**  
Why: with a 10-item list, rank 1 scores `1/61` and rank 10 scores `1/70` — nearly identical; the fusion result is effectively random.  
Detect: RRF output order doesn't match intuition for small result sets; top result switches randomly between runs.  
Fix: use a smaller k (10-20) or use a cross-encoder reranker instead of RRF when candidate lists are small.

## Connections

- [[rag/pipeline]] — where hybrid retrieval fits in the full pipeline
- [[rag/reranking]] — second-pass scoring over hybrid results
- [[rag/embeddings]] — dense embeddings used in hybrid search
- [[infra/vector-stores]] — Qdrant, Weaviate, pgvector storage options

## Open Questions

- Does SPLADE's synonym generalisation actually outperform BM25 + dense hybrid for most RAG corpora?
- What is the right first-pass k value for hybrid retrieval before reranking — 20, 50, or 100?
- When does Elasticsearch's internal hybrid merging outperform manual RRF in Python?
