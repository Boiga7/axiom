---
type: synthesis
category: synthesis
para: resource
tags: [debugging, database, performance, slow-query, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing slow database queries causing API latency or timeouts.
---

# Debug: Slow Query

**Symptom:** API endpoint is slow. DB query taking seconds instead of milliseconds. p99 latency climbing. Timeouts under load.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Slow on large tables, fast on small | Missing index — full table scan |
| Slows under concurrent load | Lock contention or connection pool exhaustion |
| Slow only for specific filter values | Uneven data distribution, index not used for that value |
| Was fast, now slow after data growth | Index exists but query planner switched to seq scan |
| Slow in prod, fast in dev | Data volume difference or missing prod index |

---

## Likely Causes (ranked by frequency)

1. Missing index on the filter or join column
2. Query planner choosing a sequential scan despite an index existing
3. Lock contention — another query holds a lock on the same rows
4. N+1 — one query per row instead of one query for all rows
5. Returning more columns or rows than needed

---

## First Checks (fastest signal first)

- [ ] Run `EXPLAIN ANALYZE` on the query — confirm whether it is using an index or doing a seq scan
- [ ] Check rows examined vs rows returned — a ratio above 100:1 is a red flag
- [ ] Check for lock waits in `pg_stat_activity` — is the query waiting, not running slow?
- [ ] Confirm the index exists on the exact column combination used in the WHERE clause
- [ ] Check whether the ORM is generating an N+1 — log the queries, not just the endpoint latency

**Signal example:** `EXPLAIN ANALYZE` shows `Seq Scan on orders (cost=0.00..45000)` with 2M rows examined for 10 results — index on `user_id` exists but query filters on `user_id AND status`, and the composite index is missing.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Index missing or not being used | [[cs-fundamentals/database-design]] |
| Lock contention under concurrent load | [[cs-fundamentals/database-transactions]] |
| ORM generating N+1 queries | [[python/sqlalchemy]] |
| Query performance analysis in depth | [[cs-fundamentals/performance-optimisation-se]] |
| Slow query in production context | [[cs-fundamentals/debugging-systems]] |

---

## Fix Patterns

- Add a composite index matching the exact WHERE and ORDER BY columns — order matters
- Use `EXPLAIN ANALYZE` before and after every index change to confirm improvement
- Add `select_related` / `prefetch_related` (Django) or `joinedload` (SQLAlchemy) to fix N+1 — do not add indexes to fix what is an ORM problem
- Reduce columns returned — `SELECT *` on wide tables is expensive at scale
- Create indexes `CONCURRENTLY` in production — a standard `CREATE INDEX` takes a full table lock

---

## When This Is Not the Issue

If `EXPLAIN ANALYZE` shows an index is being used and lock waits are absent:

- Query may be fast but called too frequently — check how many times it runs per request
- The bottleneck may be network transfer, not query execution — check rows returned vs rows needed
- Connection pool may be the constraint, not the query — check pool wait time

Pivot to [[cs-fundamentals/performance-optimisation-se]] to profile whether the cost is in the query, the connection, or the application layer.

---

## Connections

[[cs-fundamentals/database-design]] · [[cs-fundamentals/database-transactions]] · [[cs-fundamentals/performance-optimisation-se]] · [[python/sqlalchemy]] · [[cs-fundamentals/debugging-systems]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
