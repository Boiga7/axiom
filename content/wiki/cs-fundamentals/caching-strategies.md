---
type: concept
category: cs-fundamentals
para: resource
tags: [caching, redis, cache-aside, write-through, eviction, cdn]
sources: []
updated: 2026-05-01
tldr: Storing computed or fetched data closer to where it's needed to reduce latency and backend load. Caching is the most common performance optimisation — and a common source of bugs when done wrong.
---

# Caching Strategies

Storing computed or fetched data closer to where it's needed to reduce latency and backend load. Caching is the most common performance optimisation, and a common source of bugs when done wrong.

---

## Cache Strategies

### Cache-Aside (Lazy Loading)

Application checks cache first; on miss, loads from DB and populates cache. Most common pattern.

```python
import redis
import json
from functools import wraps

r = redis.Redis.from_url("redis://localhost:6379", decode_responses=True)

def cached(key_prefix: str, ttl: int = 300):
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{key_prefix}:{':'.join(str(a) for a in args)}"
            cached_value = r.get(key)
            if cached_value is not None:
                return json.loads(cached_value)

            result = func(*args, **kwargs)
            r.setex(key, ttl, json.dumps(result))
            return result
        return wrapper
    return decorator

@cached("product", ttl=3600)
def get_product(product_id: str) -> dict:
    return db.query_product(product_id)
```

**Drawback:** Cache miss on first request (thundering herd if many concurrent misses). Mitigate with a lock or probabilistic early expiration.

### Write-Through

Write to cache and DB simultaneously. Cache is always up to date. No stale reads.

```python
def update_product(product_id: str, data: dict) -> None:
    db.update_product(product_id, data)          # write to DB
    r.setex(f"product:{product_id}", 3600, json.dumps(data))  # write to cache
```

**Drawback:** Every write hits both systems. Cache fills with data that may never be read.

### Write-Behind (Write-Back)

Write to cache immediately; asynchronously flush to DB. Fast writes, eventual persistence.

**Drawback:** Data loss if cache fails before flush. Use only where brief data loss is acceptable.

### Read-Through

Cache sits in front of DB; application never calls DB directly. The cache layer handles it. Common in managed cache services (ElastiCache with DAX for DynamoDB).

---

## Cache Invalidation

"There are only two hard things in Computer Science: cache invalidation and naming things."

> **→** [Data as a System](/synthesis/data-as-system) — cache inconsistency is a data contract problem. Covers dual-write hazards, CDC, and freshness SLAs across services.

```python
# Strategy 1: TTL expiry — simple, eventually consistent
r.setex(f"product:{product_id}", ttl=3600, value=json.dumps(product))

# Strategy 2: Explicit invalidation on write
def update_product(product_id: str, data: dict) -> None:
    db.update(product_id, data)
    r.delete(f"product:{product_id}")
    r.delete("product:list:*")   # wildcard delete — use SCAN not KEYS in production

# Strategy 3: Cache tagging — group related keys
def tag_cache(key: str, tags: list[str], ttl: int = 3600) -> None:
    r.setex(key, ttl, cached_value)
    for tag in tags:
        r.sadd(f"tag:{tag}", key)
        r.expire(f"tag:{tag}", ttl + 60)

def invalidate_tag(tag: str) -> None:
    keys = r.smembers(f"tag:{tag}")
    if keys:
        r.delete(*keys)
    r.delete(f"tag:{tag}")

# When product 123 is updated: invalidate tag "product:123"
invalidate_tag("product:123")
```

---

## Redis Patterns

```python
# Rate limiting with sliding window
def is_rate_limited(user_id: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rate:{user_id}:{int(time.time() // window)}"
    count = r.incr(key)
    if count == 1:
        r.expire(key, window)
    return count > limit

# Distributed lock (prevent thundering herd / double processing)
from contextlib import contextmanager

@contextmanager
def distributed_lock(name: str, timeout: int = 30):
    lock_key = f"lock:{name}"
    acquired = r.set(lock_key, "1", nx=True, ex=timeout)
    try:
        if not acquired:
            raise LockNotAcquiredError(f"Could not acquire lock: {name}")
        yield
    finally:
        if acquired:
            r.delete(lock_key)

# Pub/Sub for cache invalidation across services
# Publisher:
r.publish("cache:invalidate", json.dumps({"entity": "product", "id": "123"}))

# Subscriber:
pubsub = r.pubsub()
pubsub.subscribe("cache:invalidate")
for message in pubsub.listen():
    if message["type"] == "message":
        data = json.loads(message["data"])
        invalidate_local_cache(data["entity"], data["id"])
```

---

## Eviction Policies

When the cache is full, Redis evicts using the configured policy:

| Policy | Behaviour | Use when |
|---|---|---|
| `allkeys-lru` | Evict least recently used keys | General purpose cache |
| `volatile-lru` | Evict LRU keys with TTL set | Mixed cache/session store |
| `allkeys-lfu` | Evict least frequently used | Skewed access patterns |
| `volatile-ttl` | Evict keys closest to expiry | Prefer expiring keys first |
| `noeviction` | Error when full | Primary database use case |

```bash
# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
redis-cli CONFIG SET maxmemory 2gb
```

---

## CDN Caching

```nginx
# nginx cache control headers
location /static/ {
    expires 1y;                           # static assets: cache forever (content-hashed filenames)
    add_header Cache-Control "public, immutable";
}

location /api/ {
    add_header Cache-Control "no-store";  # API responses: never cache by default
}

location /api/products {
    add_header Cache-Control "public, max-age=60, stale-while-revalidate=30";
    # Cache 60s; serve stale for 30s while revalidating in background
}
```

```python
# Vary header — cache different responses per header value
response.headers["Cache-Control"] = "public, max-age=300"
response.headers["Vary"] = "Accept-Encoding, Accept-Language"
# → CDN caches separate copies per encoding + language
```

---

## Cache Stampede Prevention

```python
# Probabilistic early expiration — refresh slightly before TTL to avoid simultaneous misses
import math, random

def get_with_early_refresh(key: str, ttl: int, beta: float = 1.0):
    cached = r.get(key)
    if cached:
        data, expiry = json.loads(cached)
        # XFetch algorithm: early recompute if close to expiry
        remaining_ttl = expiry - time.time()
        if remaining_ttl - beta * math.log(random.random()) * compute_time < 0:
            return recompute_and_cache(key, ttl)
        return data
    return recompute_and_cache(key, ttl)
```

---

## Common Failure Cases

**Cache stampede on cold start**  
Why: many concurrent requests all miss simultaneously, all hit the origin, and all try to populate the cache at once.  
Detect: origin CPU spikes to 100% immediately after a cache flush or deployment; cache hit rate drops to near zero briefly.  
Fix: use a distributed lock (Redis `SET NX EX`) so only one request populates the cache; others wait or serve slightly stale data.

**Stale data served after a write**  
Why: write-through or explicit invalidation missed a cache key. Commonly due to inconsistent key naming between the write path and the read path.  
Detect: read after write returns old data in staging; compare cache key generated on write vs read in code.  
Fix: centralise key generation in a single function; add an integration test that writes then reads and asserts fresh data.

**Wrong key structure causes cache pollution**  
Why: key includes mutable state (e.g., timestamp or random nonce) so each call gets a unique key, effectively bypassing the cache.  
Detect: Redis key count grows unboundedly; `INFO keyspace` shows millions of keys with zero hits.  
Fix: audit key construction; keys should be deterministic from stable inputs only (user_id, resource_id, query params).

**TTL too short kills hit rate**  
Why: TTL set to seconds instead of minutes; most requests arrive after expiry.  
Detect: cache hit rate below 30% despite high traffic; origin request rate matches total request rate.  
Fix: profile access patterns; set TTL to the practical staleness tolerance of the data, not the shortest safe interval.

**Write-behind data loss on cache eviction**  
Why: write-behind buffers dirty data in memory; if the cache node dies before flushing, writes are lost.  
Detect: data inconsistency after cache restart; DB shows fewer records than the application created.  
Fix: use write-behind only for truly disposable data (counters, analytics); use write-through or outbox pattern for anything that must persist.

## Connections
[[se-hub]] · [[cs-fundamentals/database-design]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/performance-optimisation-se]] · [[cloud/aws-rds-aurora]] · [[cloud/finops-cost-management]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
