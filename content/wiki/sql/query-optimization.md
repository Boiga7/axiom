---
type: concept
category: sql
para: resource
tags: [sql, postgresql, performance, indexes, explain-analyze, query-planning, vacuuming, pgvector]
tldr: How PostgreSQL plans and executes queries — reading EXPLAIN ANALYZE output, choosing indexes, and avoiding common performance traps.
sources: []
updated: 2026-05-04
---

# Query Optimization

> **TL;DR** How PostgreSQL plans and executes queries — reading EXPLAIN ANALYZE output, choosing indexes, and avoiding common performance traps.

## EXPLAIN ANALYZE

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

Key output fields:
- **Seq Scan** — full table scan; bad on large tables
- **Index Scan** — uses a B-tree or other index
- **Bitmap Heap Scan** — used when many rows match; batches index lookups
- **Hash Join / Merge Join / Nested Loop** — join strategies; planner picks based on row estimates
- **rows=X** — planner's row estimate (compare to actual to spot bad statistics)
- **actual time=X..Y** — X = time to first row, Y = total time
- **Buffers: shared hit=X read=Y** — cache hits vs disk reads

If `rows=1000` but `actual rows=1000000`, run `ANALYZE tablename` to refresh statistics.

## Index Types

```sql
-- B-tree (default) — equality, ranges, ORDER BY, LIKE 'prefix%'
CREATE INDEX idx_users_email ON users(email);

-- Hash — equality only, faster than B-tree for pure equality
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- GIN — full-text search, JSONB containment, array operators
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
CREATE INDEX idx_docs_body_fts ON documents USING GIN (to_tsvector('english', body));

-- GiST — geometric types, ranges, nearest-neighbor (used by PostGIS)
CREATE INDEX idx_events_range ON events USING GIST (tsrange);

-- BRIN — block range index; very small, good for naturally-ordered data (timestamps)
CREATE INDEX idx_logs_ts ON logs USING BRIN (created_at);

-- Partial index — index only matching rows
CREATE INDEX idx_active_users ON users(email) WHERE active = true;

-- Expression index — index computed values
CREATE INDEX idx_lower_email ON users(LOWER(email));
```

For [[infra/pgvector]], vector similarity search uses `ivfflat` or `hnsw` index types:
```sql
CREATE INDEX ON embeddings USING hnsw (embedding vector_cosine_ops);
```

## Common Performance Traps

### Function on indexed column

```sql
-- Bad: index on created_at is not used
WHERE DATE(created_at) = '2025-01-01'

-- Good: range that matches the index
WHERE created_at >= '2025-01-01' AND created_at < '2025-01-02'
```

### Implicit type cast

```sql
-- Bad: user_id is integer, '42' causes a cast; index skipped
WHERE user_id = '42'

-- Good
WHERE user_id = 42
```

### N+1 query pattern

```sql
-- Application sends one query per user — catastrophic at scale
for user in users:
    orders = query("SELECT * FROM orders WHERE user_id = ?", user.id)

-- Fix: JOIN or IN clause
SELECT u.*, o.* FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.id = ANY(ARRAY[1, 2, 3, ...]);
```

### Missing index on foreign key

PostgreSQL does not automatically index foreign keys. Every `JOIN` on an un-indexed FK does a seq scan on the child table.

```sql
-- After adding the FK, add the index too
ALTER TABLE orders ADD CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id);
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

## Query Planner Hints

PostgreSQL has no query hints, but you can nudge the planner:

```sql
-- Disable seq scan temporarily to force index usage (diagnostic only)
SET enable_seqscan = off;
EXPLAIN SELECT ...;
SET enable_seqscan = on;

-- Increase statistics target for columns with poor estimates
ALTER TABLE events ALTER COLUMN event_type SET STATISTICS 500;
ANALYZE events;
```

## VACUUM and Table Bloat

PostgreSQL uses MVCC — dead row versions accumulate. `VACUUM` reclaims them.

```sql
-- Manual vacuum (autovacuum usually handles this)
VACUUM ANALYZE users;

-- Full vacuum: reclaims disk space, requires exclusive lock (use with caution)
VACUUM FULL users;

-- Check bloat
SELECT relname, n_dead_tup, n_live_tup,
       round(n_dead_tup::numeric / NULLIF(n_live_tup + n_dead_tup, 0) * 100, 1) AS dead_pct
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;
```

Tables with > 10% dead tuples and high write volume should have autovacuum tuned more aggressively.

## Partitioning

```sql
-- Range partition by month
CREATE TABLE events (
  id BIGSERIAL,
  created_at TIMESTAMPTZ NOT NULL,
  payload JSONB
) PARTITION BY RANGE (created_at);

CREATE TABLE events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

Partition pruning: queries with `WHERE created_at BETWEEN ...` only scan relevant partitions.

## Useful Diagnostic Queries

```sql
-- Slow queries (requires pg_stat_statements extension)
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Index usage stats
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;  -- low idx_scan = rarely used index

-- Table sizes
SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS total_size
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;
```

## Connections

- [[sql/window-functions]] — window functions and their planning implications
- [[cs-fundamentals/sql]] — core SQL fundamentals
- [[infra/pgvector]] — vector index types (ivfflat, hnsw)
- [[python/sqlalchemy]] — SQLAlchemy query profiling
- [[observability/datadog]] — APM for database query tracing
