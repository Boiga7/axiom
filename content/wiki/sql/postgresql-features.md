---
type: concept
category: sql
para: resource
tags: [postgresql, jsonb, full-text-search, partitioning, pg-stat-statements, cte, lateral, vacuum]
tldr: PostgreSQL-specific features beyond standard SQL — JSONB, full-text search, advanced index types, lateral joins, partitioning, and performance monitoring.
sources: []
updated: 2026-05-04
---

# PostgreSQL Features

> **TL;DR** PostgreSQL-specific features beyond standard SQL — JSONB, full-text search, advanced index types, lateral joins, partitioning, and performance monitoring.

## JSONB — Semi-Structured Data

`JSONB` stores JSON in a binary decomposed format — indexed, queryable, and modifiable without parsing strings.

```sql
CREATE TABLE events (
    id      SERIAL PRIMARY KEY,
    type    TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert JSONB
INSERT INTO events (type, payload)
VALUES ('llm_call', '{"model": "claude-sonnet-4-6", "tokens": 1420, "latency_ms": 340}');

-- Extract fields
SELECT payload->>'model' AS model              -- text output
FROM events WHERE type = 'llm_call';

SELECT payload->'tokens' AS tokens_int         -- JSONB output (preserves type)
FROM events;

-- Filter by JSONB field
SELECT * FROM events
WHERE payload->>'model' = 'claude-sonnet-4-6'
  AND (payload->>'tokens')::int > 1000;

-- GIN index for fast JSONB queries
CREATE INDEX idx_events_payload ON events USING GIN (payload);

-- Query with index — containment operator @>
SELECT * FROM events
WHERE payload @> '{"model": "claude-sonnet-4-6"}';
```

**When to use JSONB vs separate columns:**
- JSONB: variable/optional fields, event payloads, external API responses, feature flags
- Columns: fields you filter/join/sort on heavily (indexes on columns are more efficient than JSONB path indexes)

---

## Full-Text Search

```sql
-- Create a tsvector column for fast FTS
ALTER TABLE posts ADD COLUMN search_vector tsvector;

-- Populate
UPDATE posts
SET search_vector = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''));

-- GIN index
CREATE INDEX idx_posts_fts ON posts USING GIN (search_vector);

-- Query — match any of the words
SELECT title, ts_rank(search_vector, query) AS rank
FROM posts, to_tsquery('english', 'machine & learning') query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 10;

-- Auto-update with trigger
CREATE TRIGGER posts_search_update
BEFORE INSERT OR UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION
tsvector_update_trigger(search_vector, 'pg_catalog.english', title, body);
```

**Full-text search vs pgvector:**
- FTS: exact keyword matching, fast for known terms, zero setup cost
- pgvector: semantic similarity, finds synonyms/related concepts, requires embedding model
- Use both: FTS for known keywords, pgvector for "find me things like this"

---

## Advanced Index Types

| Index type | Use case |
|---|---|
| B-tree (default) | Equality, range queries, ORDER BY — covers 90% of cases |
| GIN | JSONB containment, full-text search, array membership (`@>`) |
| GiST | Geometric/geographic data, range types, pg_trgm fuzzy search |
| BRIN | Huge append-only tables (logs, time-series) where values correlate with insertion order |
| HNSW | pgvector approximate nearest-neighbour search |
| IVFFlat | pgvector — faster build, slower query than HNSW; use when index build time matters |

```sql
-- pg_trgm fuzzy search (typo-tolerant)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);

SELECT name FROM users
WHERE name % 'lewes'        -- similarity threshold
ORDER BY similarity(name, 'lewes') DESC;

-- BRIN index on a time-series table (1000x smaller than B-tree)
CREATE INDEX idx_logs_created_brin ON logs USING BRIN (created_at) WITH (pages_per_range = 128);
```

---

## LATERAL Joins

LATERAL allows a subquery to reference columns from the FROM clause — it's a correlated subquery that can be joined.

```sql
-- Get the 3 most recent orders for each user (without window functions)
SELECT u.name, recent.total, recent.created_at
FROM users u
JOIN LATERAL (
    SELECT total, created_at
    FROM orders
    WHERE orders.user_id = u.id
    ORDER BY created_at DESC
    LIMIT 3
) recent ON true;
```

```sql
-- Unnest JSONB arrays with LATERAL
SELECT e.id, item->>'name' AS item_name
FROM events e,
     LATERAL jsonb_array_elements(e.payload->'items') AS item;
```

---

## CTEs with Data Modification

```sql
-- CTE that writes (PostgreSQL extension to standard SQL)
WITH inserted_user AS (
    INSERT INTO users (name, email)
    VALUES ('Lewis', 'lewis@example.com')
    RETURNING id
)
INSERT INTO audit_log (user_id, action)
SELECT id, 'created' FROM inserted_user;

-- Upsert (INSERT or UPDATE on conflict)
INSERT INTO users (email, name)
VALUES ('lewis@example.com', 'Lewis Elliot')
ON CONFLICT (email) DO UPDATE
    SET name = EXCLUDED.name,
        updated_at = NOW();

-- Upsert and return the result
INSERT INTO users (email, name)
VALUES ('lewis@example.com', 'Lewis')
ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
RETURNING id, email, (xmax = 0) AS inserted;  -- xmax=0 means it was inserted, not updated
```

---

## Table Partitioning

Partitioning splits a large table into smaller physical pieces. The query planner uses partition pruning to scan only relevant partitions.

```sql
-- Range partitioning by month (time-series logs)
CREATE TABLE events (
    id         BIGSERIAL,
    created_at TIMESTAMP NOT NULL,
    payload    JSONB
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE events_2026_01 PARTITION OF events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE events_2026_02 PARTITION OF events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Indexes on the parent apply to all partitions automatically
CREATE INDEX ON events (created_at);

-- Query — planner auto-prunes to relevant partition
SELECT * FROM events
WHERE created_at >= '2026-01-15' AND created_at < '2026-02-01';
```

**When to partition:**
- Table exceeds ~100GB or 100M rows
- You regularly query a subset by a stable dimension (date, region, tenant)
- You need to archive/drop old data fast (`DROP TABLE events_2025_01` is instant vs. DELETE)

---

## Performance Monitoring

### pg_stat_statements — find the slowest queries

```sql
-- Enable the extension (requires superuser, add to postgresql.conf)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Top 10 slowest queries by total time
SELECT
    query,
    calls,
    round(total_exec_time::numeric, 2) AS total_ms,
    round(mean_exec_time::numeric, 2)  AS mean_ms,
    round(stddev_exec_time::numeric, 2) AS stddev_ms
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;

-- Queries with worst cache hit rate
SELECT
    query,
    shared_blks_hit,
    shared_blks_read,
    round(100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0), 1) AS cache_hit_pct
FROM pg_stat_statements
WHERE shared_blks_hit + shared_blks_read > 0
ORDER BY cache_hit_pct ASC
LIMIT 10;
```

### Index usage audit

```sql
-- Indexes never used — candidates for removal
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS times_used
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY tablename, indexname;

-- Table cache hit rate — below 99% means you need more RAM or fewer seq scans
SELECT
    relname AS table,
    round(100.0 * heap_blks_hit / nullif(heap_blks_hit + heap_blks_read, 0), 1) AS cache_hit_pct
FROM pg_statio_user_tables
ORDER BY cache_hit_pct ASC NULLS LAST;
```

### Active queries and locks

```sql
-- Long-running queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY duration DESC;

-- Lock waits
SELECT blocked.pid, blocked.query, blocking.pid AS blocking_pid, blocking.query AS blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocking.pid = ANY(pg_blocking_pids(blocked.pid))
WHERE cardinality(pg_blocking_pids(blocked.pid)) > 0;
```

---

## VACUUM and Autovacuum

PostgreSQL uses MVCC (Multi-Version Concurrency Control) — deleted or updated rows are marked dead but not physically removed until VACUUM runs.

```sql
-- Manual vacuum (rarely needed if autovacuum is healthy)
VACUUM ANALYZE users;           -- reclaim dead tuples + update statistics
VACUUM FULL users;              -- rewrite table to disk — locks table, use only off-peak

-- Check autovacuum stats
SELECT
    relname AS table,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
    last_autovacuum,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

**Table bloat warning sign:** `dead_pct` consistently above 20% means autovacuum isn't keeping up. Tune `autovacuum_vacuum_cost_delay` or run manual VACUUM.

---

## Useful Extensions

| Extension | Purpose |
|---|---|
| `pgvector` | Vector similarity search for AI embeddings |
| `pg_trgm` | Fuzzy string matching, trigram similarity |
| `pg_stat_statements` | Query performance monitoring |
| `uuid-ossp` | UUID generation functions |
| `hstore` | Key-value store (largely superseded by JSONB) |
| `PostGIS` | Geographic objects and spatial queries |
| `pg_partman` | Automatic partition management and rotation |
| `timescaledb` | Time-series optimisation on top of PostgreSQL |

---

## Connections

- [[sql/sql-fundamentals]] — core SQL: joins, aggregations, transactions
- [[sql/query-optimization]] — EXPLAIN ANALYZE, index selection, N+1 detection
- [[sql/sqlalchemy-patterns]] — Python ORM and async engine patterns
- [[sql/sql-for-ai]] — pgvector, LLM observability schema, JSONB for AI payloads
- [[infra/vector-stores]] — pgvector in depth for AI workloads
