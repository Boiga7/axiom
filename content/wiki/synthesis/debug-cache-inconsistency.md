---
type: synthesis
category: synthesis
para: resource
tags: [debugging, cache, redis, stale-data, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing stale, wrong, or missing data caused by cache inconsistency.
---

# Debug: Cache Inconsistency

**Symptom:** Users see stale data after an update, different users see different versions of the same record, or data is correct in the database but wrong in the response.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| Stale data after write, clears itself eventually | TTL too long, no cache invalidation on write |
| Different users see different values | Cache key includes user context unintentionally, or partial invalidation |
| Data correct in DB but wrong in response | Cache not invalidated after update |
| Cache miss storm after deploy | Keys all expire simultaneously (thundering herd) |
| Stale data only on some nodes | Local in-process cache not invalidated across instances |

---

## Likely Causes (ranked by frequency)

1. Write updates DB but does not invalidate or update the cache key
2. TTL too long — stale data outlives its usefulness
3. Cache key is wrong — different keys for the same logical data
4. In-process (local) cache not cleared on other instances after write
5. Race condition — read-through populates cache between write and invalidation

---

## First Checks (fastest signal first)

- [ ] Confirm the value in the DB matches what the cache returns — is this a stale cache or a bad write?
- [ ] Check whether the write path invalidates or updates the cache key — is invalidation missing entirely?
- [ ] Confirm the cache key is deterministic — does the same request always produce the same key?
- [ ] Check TTL on the affected key — is it longer than the acceptable staleness window?
- [ ] If multiple instances: confirm invalidation is broadcast to all nodes, not just the writing instance

**Signal example:** Product price updated in DB, but API returns old price for 60 seconds — write path updates DB only, TTL is 60s, no explicit invalidation on price change.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Cache invalidation missing on write | [[cs-fundamentals/caching]] |
| Redis key inspection and TTL debugging | [[infra/vector-stores]] |
| Thundering herd after mass expiry | [[cs-fundamentals/error-handling-patterns]] |
| In-process cache across instances | [[cs-fundamentals/distributed-systems]] |
| Cache layer in the full request path | [[synthesis/request-flow-anatomy]] |

---

## Fix Patterns

- Invalidate or update cache immediately on write — do not rely on TTL alone for correctness
- Use write-through caching for high-consistency data — update cache and DB in the same operation
- Set TTL appropriate to staleness tolerance — not a default; choose per data type
- Add jitter to TTL to prevent mass expiry at the same time
- For multi-instance: use a pub/sub invalidation broadcast (Redis keyspace events or a message bus)

---

## When This Is Not the Issue

If the cache is being invalidated correctly and TTLs are appropriate but inconsistency persists:

- The write itself may not be completing — check DB transaction logs for rollbacks
- A second writer may be overwriting the DB after the cache is set
- The cache key may be correct but serialisation is producing a different value on each read

Pivot to [[cs-fundamentals/database-transactions]] to confirm the write is actually committed before the cache is populated.

---

## Connections

[[cs-fundamentals/error-handling-patterns]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/database-transactions]] · [[synthesis/request-flow-anatomy]]
