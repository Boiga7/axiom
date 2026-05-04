---
type: concept
category: infra
tags: [pgvector, postgresql, vector-search, embeddings, similarity-search, rag]
sources: []
updated: 2026-05-04
para: resource
tldr: pgvector adds vector similarity search to PostgreSQL — nearest-neighbour queries over embedding columns alongside ordinary SQL, no separate vector database required.
---

# pgvector

> **TL;DR** pgvector adds vector similarity search to PostgreSQL — nearest-neighbour queries over embedding columns alongside ordinary SQL, no separate vector database required.

A PostgreSQL extension that adds a `vector` data type and similarity search operators. Lets you store embeddings in a standard Postgres table and query them with cosine, L2, or inner-product distance — no separate vector database required.

---

## Why pgvector

The main argument against dedicated vector databases (Pinecone, Weaviate, Qdrant) for most teams: if you already run PostgreSQL, pgvector gives you vector search with ACID transactions, JOIN support, and familiar operational tooling. The performance gap only matters at very high scale (10M+ vectors, sub-millisecond latency SLAs).

---

## Installation and Setup

```sql
-- Enable the extension (run once per database)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a vector column to an existing table
ALTER TABLE documents ADD COLUMN embedding vector(1536);

-- Or create a new table
CREATE TABLE chunks (
    id     SERIAL PRIMARY KEY,
    content TEXT,
    embedding vector(1536),  -- dimension must match your model
    source  TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Inserting Embeddings

```python
import anthropic
import psycopg2

conn = psycopg2.connect("postgresql://user:pass@localhost/db")
cur = conn.cursor()

client = anthropic.Anthropic()

def embed(text: str) -> list[float]:
    # Use any embedding model; this example uses a third-party client
    from openai import OpenAI
    oa = OpenAI()
    return oa.embeddings.create(input=text, model="text-embedding-3-small").data[0].embedding

text = "pgvector enables vector similarity search in PostgreSQL"
embedding = embed(text)

cur.execute(
    "INSERT INTO chunks (content, embedding, source) VALUES (%s, %s, %s)",
    (text, embedding, "manual")
)
conn.commit()
```

---

## Querying

```sql
-- L2 distance (Euclidean) — use for normalised vectors
SELECT id, content, embedding <-> '[0.1, 0.2, ...]' AS distance
FROM chunks
ORDER BY embedding <-> '[0.1, 0.2, ...]'
LIMIT 5;

-- Cosine distance — most common for text embeddings
SELECT id, content, 1 - (embedding <=> '[0.1, 0.2, ...]') AS similarity
FROM chunks
ORDER BY embedding <=> '[0.1, 0.2, ...]'
LIMIT 5;

-- Inner product — for OpenAI's text-embedding-ada-002 (already normalised)
SELECT id, content, (embedding <#> '[0.1, 0.2, ...]') * -1 AS similarity
FROM chunks
ORDER BY embedding <#> '[0.1, 0.2, ...]'
LIMIT 5;
```

**Operator reference:**
- `<->` L2 distance
- `<=>` cosine distance
- `<#>` negative inner product

---

## Indexes

By default, pgvector does exact nearest-neighbour search (sequential scan). For tables >100K rows, add an approximate index:

```sql
-- IVFFlat index — good all-around choice
-- lists = sqrt(row_count) is the recommended starting point
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- HNSW index (pgvector 0.5+) — better recall, higher build cost
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Increase probes at query time for better recall (at cost of latency)
SET ivfflat.probes = 10;
```

**IVFFlat vs HNSW:**
- IVFFlat: lower build time, good for dynamic data (frequent inserts)
- HNSW: higher recall, better query performance, higher memory usage — preferred for read-heavy workloads

---

## Hybrid Search with BM25

Combine vector similarity with full-text search for best-of-both retrieval:

```sql
-- Using pg_trgm or tsvector for keyword matching
WITH keyword_results AS (
    SELECT id, ts_rank(to_tsvector(content), query) AS bm25_score
    FROM chunks, to_tsquery('neural & network') query
    WHERE to_tsvector(content) @@ query
),
vector_results AS (
    SELECT id, 1 - (embedding <=> '[...]') AS cosine_score
    FROM chunks
    ORDER BY embedding <=> '[...]'
    LIMIT 50
)
SELECT k.id, (0.5 * k.bm25_score + 0.5 * v.cosine_score) AS combined
FROM keyword_results k JOIN vector_results v USING (id)
ORDER BY combined DESC
LIMIT 10;
```

---

## SQLAlchemy Integration

```python
from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, Text, Integer
from sqlalchemy.orm import DeclarativeBase

class Base(DeclarativeBase):
    pass

class Chunk(Base):
    __tablename__ = "chunks"
    id        = Column(Integer, primary_key=True)
    content   = Column(Text)
    embedding = Column(Vector(1536))
    source    = Column(Text)

# Query
from sqlalchemy import select

stmt = (
    select(Chunk)
    .order_by(Chunk.embedding.cosine_distance(query_vector))
    .limit(5)
)
results = session.execute(stmt).scalars().all()
```

---

## Key Facts

- pgvector 0.5+ supports HNSW indexing with higher recall than IVFFlat
- Maximum vector dimension: 16,000 (0.7+); practical limit governed by embedding model (1536 for OpenAI ada-002, 3072 for text-embedding-3-large)
- Operators: `<->` L2, `<=>` cosine, `<#>` inner product (negative)
- IVFFlat `lists` parameter: set to `sqrt(row_count)` for balanced performance
- HNSW `m = 16, ef_construction = 64` are recommended defaults
- Requires Postgres 13+ (HNSW requires 15+)
- `pgvector` Python package provides SQLAlchemy and psycopg2 integration

## Connections

- [[infra/vector-stores]] — pgvector in context of dedicated vector databases (Pinecone, Qdrant, Weaviate)
- [[rag/embeddings]] — generating the embeddings stored in pgvector
- [[rag/hybrid-retrieval]] — combining pgvector cosine search with BM25 full-text for best retrieval precision
- [[sql/query-optimization]] — indexing strategy interacts with standard Postgres query planning
- [[sql/sql-for-ai]] — SQL patterns for AI engineering including vector queries
- [[python/sqlalchemy]] — SQLAlchemy ORM integration with pgvector
