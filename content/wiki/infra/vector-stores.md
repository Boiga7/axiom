---
type: concept
category: infra
tags: [vector-store, embeddings, pgvector, chroma, qdrant, pinecone, similarity-search]
sources: []
updated: 2026-04-29
para: resource
tldr: Vector stores are the storage layer of RAG systems — pgvector for existing Postgres stacks, Chroma for local dev, Qdrant for production self-hosted, Pinecone for zero-ops managed, Weaviate for built-in hybrid search.
---

# Vector Stores

> **TL;DR** Vector stores are the storage layer of RAG systems — pgvector for existing Postgres stacks, Chroma for local dev, Qdrant for production self-hosted, Pinecone for zero-ops managed, Weaviate for built-in hybrid search.

Databases optimised for storing and searching high-dimensional embedding vectors. The storage layer of any RAG system.

---

## How Vector Search Works

Each document chunk is embedded into a vector (e.g. 1,536 dimensions for OpenAI's embeddings). At query time:
1. Embed the query using the same model
2. Find the k most similar vectors in the store using approximate nearest neighbour (ANN) search
3. Return the corresponding documents

**Similarity metrics:**
- **Cosine similarity** — measures angle between vectors; standard for text embeddings
- **Dot product** — equivalent to cosine if vectors are normalised; faster
- **Euclidean distance** — measures absolute distance; less common for text

**ANN algorithms:** HNSW (Hierarchical Navigable Small World) is the current standard — O(log n) search with high recall. IVF (Inverted File Index) for GPU-accelerated search.

---

## Options

### pgvector (Postgres-native)

**Best for:** Existing Postgres stack, transactional workloads alongside vector search.

Extension to PostgreSQL. Adds a `vector` type and `<->` (L2), `<#>` (inner product), `<=>` (cosine) operators. HNSW and IVF_FLAT index support.

```sql
CREATE EXTENSION vector;
CREATE TABLE documents (id bigserial PRIMARY KEY, content text, embedding vector(1536));
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Insert
INSERT INTO documents (content, embedding) VALUES ('...', '[0.1, 0.2, ...]'::vector);

-- Search
SELECT content FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

Managed options: Supabase (pgvector built-in), Neon, AWS RDS. **Start here** if you already have Postgres — no new infrastructure needed.

**Limitations:** Not optimised for billion-vector scale; query latency increases significantly above ~10M vectors.

---

### Chroma

**Best for:** Local development, prototyping, Python-native projects.

In-memory or local persistent store. Zero config. Ships as a Python package.

```python
import chromadb

client = chromadb.Client()  # in-memory, or chromadb.PersistentClient("./chroma_db")
collection = client.create_collection("documents")

collection.add(
    documents=["First document", "Second document"],
    ids=["doc1", "doc2"]
)

results = collection.query(query_texts=["query text"], n_results=2)
```

Does not require a separate server for development. Has a server mode for production (but use Qdrant or Weaviate there instead).

---

### Qdrant

**Best for:** Production self-hosted, high performance, rich filtering.

Open-source, written in Rust, extremely fast. Full-featured: HNSW, scalar/binary quantisation, payload filtering (filter by metadata alongside vector similarity), sparse vectors (for hybrid search without a separate BM25 index).

```python
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient("localhost", port=6333)
client.create_collection("docs", vectors_config=VectorParams(size=1536, distance=Distance.COSINE))

client.upsert("docs", points=[
    PointStruct(id=1, vector=[0.1, ...], payload={"source": "manual.pdf", "page": 3})
])

results = client.search("docs", query_vector=[0.1, ...], limit=5,
                         query_filter=Filter(must=[FieldCondition(key="source", match=MatchValue(value="manual.pdf"))]))
```

**Managed:** Qdrant Cloud. **Self-hosted:** Docker single node or Kubernetes cluster.

---

### Weaviate

**Best for:** Hybrid search (BM25 + vector) in one database, GraphQL API.

Built-in BM25 + dense hybrid search without needing a separate keyword search layer. Module system for automatic vectorisation (call embedding model on ingest).

Good choice when you want hybrid retrieval without managing two separate systems (Elasticsearch + vector DB). See [[infra/weaviate]] for full setup and query examples.

---

### Pinecone

**Best for:** Fully managed, zero ops, scale on demand.

Serverless mode: no cluster management, pay per query. Fast and reliable. The most popular managed option.

**Limitations:** Proprietary, no self-hosting, egress costs. Vendor lock-in risk.

---

### Redis

**Best for:** Low-latency cache + vector search in one; session memory for agents.

Redis Stack includes RediSearch with vector similarity search. Good for agent working memory (< 1M vectors, fast retrieval, collocated with session data).

---

## Choosing

| Situation | Recommendation |
|---|---|
| Existing Postgres stack | pgvector |
| Local dev / prototyping | Chroma |
| Production, self-hosted | Qdrant |
| Production, no ops | Pinecone |
| Hybrid search, no extra infra | Weaviate |
| Agent session memory | Redis |
| Billion-vector scale | Pinecone or Weaviate Cloud |

---

## Hybrid Search Architecture

Production RAG typically runs BM25 (keyword) and dense (vector) in parallel and merges with reciprocal rank fusion (RRF):

```
BM25 results (ranked list) ──┐
                              ├─ RRF merge → top-k → reranker → answer
Dense vector results (ranked) ┘
```

Options:
- **Weaviate or Qdrant** — native hybrid, no extra components
- **pgvector + pg_trgm** — Postgres-native, less sophisticated
- **Elasticsearch/OpenSearch + pgvector** — separate systems, complex ops

For most production RAG: Qdrant or Weaviate with their native hybrid search. Then add a reranker (Cohere Rerank) on top. See [[rag/pipeline]].

---

## Key Facts

- HNSW (Hierarchical Navigable Small World): O(log n) ANN search — current standard algorithm
- Cosine similarity is standard for text embeddings; dot product is equivalent if vectors are normalised
- pgvector limitations: query latency increases significantly above ~10M vectors
- Qdrant: written in Rust; includes sparse vectors for hybrid search without a separate BM25 layer
- Production RAG hybrid search: BM25 + dense in parallel, merged with reciprocal rank fusion (RRF)
- Weaviate: built-in BM25 + dense hybrid without needing separate Elasticsearch layer
- Pinecone serverless: no cluster management, pay-per-query; vendor lock-in risk

## Connections

- [[rag/pipeline]] — how vector stores fit into the full RAG pipeline end-to-end
- [[rag/embeddings]] — which embedding model to use when populating the store
- [[rag/hybrid-retrieval]] — BM25 + dense hybrid search implementation patterns
- [[rag/reranking]] — reranking results from the vector store before passing to the LLM
- [[infra/caching]] — Redis also used for semantic cache backed by vector similarity
- [[infra/huggingface]] — BGE-M3 and other embedding models for populating the store

## Open Questions

- At what vector count does pgvector performance degrade enough to warrant migrating to Qdrant?
- How does Qdrant's native sparse vector support compare to Weaviate's BM25 for pure keyword retrieval?
- What is the replication and backup story for self-hosted Qdrant in production?
