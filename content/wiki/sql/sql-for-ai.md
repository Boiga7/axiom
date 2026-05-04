---
type: concept
category: sql
para: resource
tags: [sql, ai, pgvector, vector-search, feature-store, dbt, embeddings, postgresql]
tldr: SQL patterns for AI engineering — vector similarity queries with pgvector, feature extraction for ML, logging LLM calls, and building lightweight feature stores.
sources: []
updated: 2026-05-04
---

# SQL for AI Engineering

> **TL;DR** SQL patterns for AI engineering — vector similarity queries with pgvector, feature extraction for ML, logging LLM calls, and building lightweight feature stores.

## pgvector: Vector Similarity in Postgres

[[infra/pgvector]] adds a `vector` type and similarity operators directly into PostgreSQL — no separate vector database required for most use cases.

```sql
-- Install extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Embeddings table
CREATE TABLE document_embeddings (
  id        BIGSERIAL PRIMARY KEY,
  doc_id    BIGINT REFERENCES documents(id),
  chunk_idx INTEGER,
  content   TEXT,
  embedding vector(1536)  -- OpenAI ada-002 dimension
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX ON document_embeddings
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

### Similarity queries

```sql
-- Cosine similarity (1 - cosine_distance): higher = more similar
SELECT doc_id, content,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) AS similarity
FROM document_embeddings
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;

-- Operators:
-- <=>  cosine distance
-- <->  L2 (Euclidean) distance
-- <#>  negative inner product

-- Hybrid: combine vector search with metadata filter
SELECT d.title, de.content, de.embedding <=> $1::vector AS dist
FROM document_embeddings de
JOIN documents d ON d.id = de.doc_id
WHERE d.category = 'engineering'
  AND d.created_at > NOW() - INTERVAL '90 days'
ORDER BY dist
LIMIT 10;
```

## LLM Call Logging

Logging every LLM call to Postgres enables cost tracking, latency monitoring, and regression testing without an external observability platform.

```sql
CREATE TABLE llm_calls (
  id              BIGSERIAL PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  model           TEXT NOT NULL,
  input_tokens    INTEGER,
  output_tokens   INTEGER,
  latency_ms      INTEGER,
  cost_usd        NUMERIC(10, 6),
  prompt_hash     TEXT,       -- hash of system + user prompt for dedup
  cache_hit       BOOLEAN,
  error           TEXT,
  metadata        JSONB
);

-- Daily cost report
SELECT
  DATE(created_at)  AS day,
  model,
  COUNT(*)          AS calls,
  SUM(input_tokens + output_tokens) AS total_tokens,
  SUM(cost_usd)     AS total_cost,
  AVG(latency_ms)   AS avg_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) AS p95_latency
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '30 days'
  AND error IS NULL
GROUP BY DATE(created_at), model
ORDER BY day DESC, total_cost DESC;

-- Cache hit rate
SELECT
  model,
  COUNT(*) FILTER (WHERE cache_hit) * 100.0 / COUNT(*) AS cache_hit_pct,
  SUM(cost_usd) FILTER (WHERE NOT cache_hit) AS actual_cost
FROM llm_calls
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY model;
```

## Feature Store Pattern

A feature store provides pre-computed, point-in-time correct ML features. A simple SQL implementation using PostgreSQL.

```sql
-- Feature definitions
CREATE TABLE feature_definitions (
  feature_name  TEXT PRIMARY KEY,
  entity_type   TEXT,          -- 'user', 'product', etc.
  sql_query     TEXT,          -- query that computes it
  ttl_hours     INTEGER,
  updated_at    TIMESTAMPTZ
);

-- Feature values store
CREATE TABLE feature_values (
  entity_id     TEXT,
  feature_name  TEXT REFERENCES feature_definitions(feature_name),
  value         JSONB,
  computed_at   TIMESTAMPTZ,
  PRIMARY KEY (entity_id, feature_name)
);

-- Retrieve feature vector for inference
SELECT feature_name, value
FROM feature_values
WHERE entity_id = 'user_123'
  AND computed_at > NOW() - INTERVAL '1 hour'  -- TTL check
ORDER BY feature_name;
```

## Eval Results Store

Storing evaluation results in SQL enables systematic comparison and regression detection.

```sql
CREATE TABLE eval_runs (
  id          BIGSERIAL PRIMARY KEY,
  run_id      TEXT UNIQUE,          -- git SHA or run name
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  model       TEXT,
  dataset     TEXT,
  config      JSONB
);

CREATE TABLE eval_results (
  id          BIGSERIAL PRIMARY KEY,
  run_id      TEXT REFERENCES eval_runs(run_id),
  question_id TEXT,
  prompt      TEXT,
  response    TEXT,
  score       NUMERIC(4, 3),        -- 0.0 to 1.0
  passed      BOOLEAN,
  metadata    JSONB
);

-- Compare two runs
SELECT
  a.question_id,
  a.score AS score_v1,
  b.score AS score_v2,
  b.score - a.score AS delta
FROM eval_results a
JOIN eval_results b USING (question_id)
WHERE a.run_id = 'v1.0' AND b.run_id = 'v1.1'
ORDER BY delta ASC;  -- worst regressions first
```

## JSONB for Flexible AI Metadata

```sql
-- Query nested JSONB fields
SELECT id, metadata -> 'usage' ->> 'total_tokens' AS tokens
FROM llm_calls
WHERE metadata @> '{"stop_reason": "max_tokens"}'::jsonb;

-- Aggregate JSONB values
SELECT
  metadata ->> 'model' AS model,
  AVG((metadata -> 'usage' ->> 'total_tokens')::int) AS avg_tokens
FROM llm_calls
GROUP BY metadata ->> 'model';

-- GIN index for JSONB containment queries
CREATE INDEX idx_llm_calls_metadata ON llm_calls USING GIN (metadata);
```

## Connections

- [[infra/pgvector]] — vector index types and configuration in depth
- [[rag/chunking]] — chunking strategies that feed the embeddings table
- [[evals/methodology]] — eval frameworks that write results to stores like this
- [[observability/datadog]] — alternative for LLM call monitoring
- [[sql/query-optimization]] — keeping these queries fast under load
- [[sql/window-functions]] — analytical patterns for cost/latency reporting
