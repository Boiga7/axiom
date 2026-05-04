---
type: concept
category: rag
tags: [embeddings, embedding-models, cohere, openai, bge, mteb, semantic-search]
sources: []
updated: 2026-05-04
para: resource
tldr: MTEB leaderboard comparison — Cohere embed-v4 (65.2, best managed), BGE-M3 (63.0, best open), Matryoshka truncation for 12x storage reduction, and Cohere input_type for 5% retrieval gain.
---

# Embedding Models

> **TL;DR** MTEB leaderboard comparison — Cohere embed-v4 (65.2, best managed), BGE-M3 (63.0, best open), Matryoshka truncation for 12x storage reduction, and Cohere input_type for 5% retrieval gain.

Convert text (or images) into dense vectors that capture semantic meaning. The foundation of any RAG retrieval system.

---

## How Embeddings Work

A trained neural network reads a text sequence and outputs a fixed-size vector (e.g. 1,536 floats). Similar texts produce vectors that point in similar directions in this high-dimensional space. "The dog ran fast" and "The puppy sprinted quickly" will produce vectors separated by a small cosine angle; "The dog ran fast" and "The stock market crashed" will be far apart.

**The training objective** is contrastive: push similar pairs together, push dissimilar pairs apart. The model learns what "similar" means from millions of text pairs.

---

## Leaderboard (MTEB, April 2026)

MTEB (Massive Text Embedding Benchmark) is the standard. It evaluates embedding models across 56 datasets and 8 task types.

| Model | MTEB score | Dimensions | Context | Notes |
|---|---|---|---|---|
| **Cohere embed-v4** | 65.2 | 1,024 | 512 tokens | Best managed; multilingual; binary quant |
| **OpenAI text-embedding-3-large** | 64.6 | 3,072 | 8,192 tokens | Very widely used; good multilingual |
| **OpenAI text-embedding-3-small** | 62.3 | 1,536 | 8,192 tokens | Cheap and good enough for many tasks |
| **BGE-M3** | 63.0 | 1,024 | 8,192 tokens | Best open-source; multilingual; hybrid |
| **GTE-Qwen2-7B-instruct** | 65.0+ | 3,584 | 32K tokens | Best open model as of late 2025 |
| **fastembed (BAAI/bge-small-en-v1.5)** | ~62 | 384 | 512 tokens | Local, zero cost, fast; good for dev |

> [Source: MTEB leaderboard v1; Cohere's latest model scores 66.3 on MTEB v1. Note: MTEB v2 launched in 2026 with a different scale — scores above are not directly comparable to MTEB v2 rankings. Check huggingface.co/spaces/mteb/leaderboard for current state.]

---

## Choosing an Embedding Model

**Managed, best quality:** Cohere embed-v4  
**Managed, cheap:** OpenAI text-embedding-3-small  
**Open, self-hosted:** BGE-M3 (BAAI/BGE-M3 on HuggingFace)  
**Local dev, zero cost:** fastembed (BAAI/bge-small-en-v1.5 or similar)  
**Long documents:** Models with > 4K context (GTE-Qwen, OpenAI text-embedding-3-*) 

The performance gap between top managed and best open models is small (~1–2 MTEB points). If budget allows: Cohere. If you need self-hosted: BGE-M3.

---

## Dimensions and Matryoshka

**More dimensions = more expressiveness, more storage, slower search.**

OpenAI's text-embedding-3 models support **Matryoshka representation learning**. You can truncate to fewer dimensions (e.g. 256 instead of 3,072) with graceful quality degradation. A 256-dim truncation costs 12x less storage and is 12x faster to search, with ~5% quality drop.

```python
from openai import OpenAI
client = OpenAI()

response = client.embeddings.create(
    input="Your text here",
    model="text-embedding-3-large",
    dimensions=256  # Matryoshka truncation
)
```

Cohere embed-v4 also supports binary quantisation: convert float32 vectors to binary (0/1 per dimension) using a threshold. Reduces storage by 32x with ~1–3% quality drop.

---

## Using Embedding Models

**Python with HuggingFace:**
```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer("BAAI/bge-m3")
embeddings = model.encode(["First text", "Second text"])  # numpy array (2, 1024)
```

**Python with Cohere:**
```python
import cohere
co = cohere.Client("YOUR_COHERE_API_KEY")
response = co.embed(
    texts=["First text", "Second text"],
    model="embed-v4.0",
    input_type="search_document"  # vs "search_query" for queries
)
embeddings = response.embeddings  # list of 1024-dim vectors
```

**Key detail:** Cohere requires specifying `input_type`: `search_document` for indexing, `search_query` for queries. This separate training improves retrieval by ~5%.

---

## Batch Embedding for Indexing

For large document sets, batch the embedding calls to avoid rate limits and reduce latency:

```python
import asyncio
from anthropic import AsyncAnthropic  # not anthropic — just showing async pattern

async def embed_batch(texts: list[str], batch_size: int = 96) -> list[list[float]]:
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = co.embed(texts=batch, model="embed-v4.0", input_type="search_document")
        all_embeddings.extend(response.embeddings)
    return all_embeddings
```

---

## When Embeddings Fail

- **Exact keyword matching** — embeddings are semantic; BM25 handles keywords better. This is why hybrid search is the default. See [[rag/hybrid-retrieval]].
- **Out-of-vocabulary terms** — proprietary acronyms, product codes, version numbers. Use BM25 for these.
- **Cross-lingual retrieval** — multilingual models (Cohere embed-v4, BGE-M3) handle this; monolingual models don't.
- **Very long documents** — embeddings represent a fixed context window; late chunking or ColPali for document pages.

---

## Key Facts

- MTEB: 56 datasets, 8 task types; standard benchmark for embedding model comparison
- Cohere embed-v4: 65.2 MTEB, 1,024 dims, requires `input_type` (search_document vs search_query) — ~5% retrieval gain
- OpenAI text-embedding-3-large: 64.6 MTEB, 3,072 dims, 8,192 context; supports Matryoshka truncation to 256 dims (12x storage reduction, ~5% quality drop)
- BGE-M3: 63.0 MTEB, 1,024 dims, best open-source; supports dense + sparse + ColBERT simultaneously
- fastembed: ~62 MTEB, 384 dims, zero-cost local; for dev and CI
- Gap between top managed and best open model: ~1-2 MTEB points
- Cohere binary quantisation: 32x storage reduction, ~1-3% quality drop

## Common Failure Cases

**Embedding model switched mid-pipeline, cosine scores collapse**  
Why: existing chunks were embedded with model A; new queries use model B with a different vector space.  
Detect: retrieval suddenly returns near-random results; cosine scores cluster around 0.5 regardless of query.  
Fix: re-embed all chunks whenever the embedding model changes; version your index alongside the model name.

**Cohere input_type not set, retrieval quality lower than benchmarks suggest**  
Why: using `search_document` type for both indexing and querying, or omitting `input_type` entirely, bypasses Cohere's asymmetric embedding training.  
Detect: MTEB-expected retrieval quality doesn't match production; swap input types and compare RAGAS context precision.  
Fix: always use `input_type="search_document"` for chunks being indexed and `input_type="search_query"` for user queries.

**Binary quantisation reduces quality below tolerance**  
Why: Cohere binary quantisation converts float32 to 0/1 per dimension; the ~1-3% average MTEB drop is larger on niche domain corpora.  
Detect: run domain-specific retrieval eval before and after quantisation; if precision drops >5%, the corpus may not suit binary quantisation.  
Fix: use scalar quantisation (int8) instead of binary; or keep full float32 vectors for high-value corpora.

**Out-of-vocabulary terms retrieved poorly**  
Why: dense embeddings generalise poorly to proprietary acronyms, product codes, and version strings not in the training distribution.  
Detect: queries containing exact product names or codes return irrelevant results despite perfect BM25 hits.  
Fix: add BM25 as the sparse channel in hybrid retrieval; BM25 handles exact-match keywords that embeddings miss.

**Batch embedding hits rate limits mid-index**  
Why: sending all chunks at once exceeds the provider's tokens-per-minute limit; the pipeline crashes partway through.  
Detect: `RateLimitError` or HTTP 429 mid-ingestion; partial index with no indicator of which chunks were processed.  
Fix: batch in groups of 96 with exponential backoff on 429; checkpoint progress to a file so re-runs resume rather than restart.

## Connections

- [[rag/pipeline]] — embeddings in the full RAG pipeline
- [[rag/hybrid-retrieval]] — BM25 + embeddings together
- [[rag/chunking]] — how to split text before embedding
- [[infra/vector-stores]] — storing and searching embeddings
- [[data/feature-stores]] — feature stores are the production infrastructure for serving pre-computed embeddings at low latency

## Open Questions

- Does the MTEB benchmark translate accurately to domain-specific corpora (legal, medical, code)?
- At what scale does Cohere binary quantisation's 32x storage reduction justify the 1-3% quality drop?
- Will GTE-Qwen2-7B-instruct's 65.0+ MTEB and 32K context become the new production default in 2026?
