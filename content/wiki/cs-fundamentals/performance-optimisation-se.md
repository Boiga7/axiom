---
type: concept
category: cs-fundamentals
para: resource
tags: [performance, optimisation, profiling, caching, database, async, benchmarking]
sources: []
updated: 2026-05-01
tldr: "Systematic approach to improving system performance: measure first, optimise the bottleneck, measure again."
---

# Performance Optimisation

Systematic approach to improving system performance: measure first, optimise the bottleneck, measure again. Premature optimisation is the root of all evil — but ignoring performance in production is inexcusable.

---

## The Process

```
1. Measure — establish a baseline with real workloads (not synthetic)
2. Profile — find the actual bottleneck (not the assumed one)
3. Hypothesise — why is this slow?
4. Optimise — change one thing at a time
5. Measure again — did it help? Did it regress anything else?
6. Repeat

Common wrong assumptions:
  - "The loop is slow" → often it's the DB call inside the loop
  - "Python is slow" → often it's waiting on I/O
  - "The query is slow" → often it's missing an index
  - "It's the network" → often it's serialisation or N+1 queries
```

---

## Python Profiling

```python
# cProfile — function-level profiling
import cProfile
import pstats
import io

def profile(func):
    def wrapper(*args, **kwargs):
        pr = cProfile.Profile()
        pr.enable()
        result = func(*args, **kwargs)
        pr.disable()
        s = io.StringIO()
        ps = pstats.Stats(pr, stream=s).sort_stats("cumulative")
        ps.print_stats(20)  # top 20 functions by cumulative time
        print(s.getvalue())
        return result
    return wrapper

@profile
def expensive_operation():
    ...

# line_profiler — line-by-line timing
# pip install line-profiler
@profile  # use kernprof -l -v script.py
def process_orders(orders):
    results = []
    for order in orders:           # line timing shown here
        total = sum(i.price for i in order.items)
        tax = total * 0.2
        results.append(total + tax)
    return results

# memory_profiler — memory usage per line
from memory_profiler import profile as mem_profile

@mem_profile
def load_large_dataset():
    return pd.read_csv("huge_file.csv")  # see exactly where memory spikes
```

---

## Database Performance

```python
# N+1 detection and fix

# BAD — N+1 query: 1 query for orders + N queries for users
orders = db.query(Order).all()
for order in orders:
    print(order.user.name)  # each triggers a SELECT

# GOOD — eager loading with JOIN
orders = db.query(Order).options(joinedload(Order.user)).all()
for order in orders:
    print(order.user.name)  # no additional queries

# GOOD — batch load for large sets
orders = db.query(Order).options(subqueryload(Order.items)).all()

# Explain query plans
result = db.execute(text("EXPLAIN (ANALYZE, BUFFERS) SELECT ..."))
for row in result:
    print(row[0])  # look for "Seq Scan" on large tables — add index

# Index analysis — find slow queries
# In postgres: pg_stat_statements, auto_explain
# AWS RDS: Performance Insights
```

```sql
-- Add index for common filter patterns
CREATE INDEX CONCURRENTLY idx_orders_user_status
  ON orders(user_id, status)
  WHERE status != 'completed';   -- partial index — only index active orders

-- Covering index — avoid table lookup entirely
CREATE INDEX CONCURRENTLY idx_products_category_name_price
  ON products(category, name, price);
-- SELECT name, price FROM products WHERE category = 'x' ORDER BY name
-- → Index-Only Scan: no heap access
```

---

## Async I/O for Throughput

```python
import asyncio
import httpx

# SLOW — sequential requests (10 requests × 200ms each = 2s)
async def fetch_all_sequential(product_ids: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        results = []
        for pid in product_ids:
            resp = await client.get(f"/api/products/{pid}")
            results.append(resp.json())
        return results

# FAST — concurrent requests (10 requests × 200ms max = 200ms)
async def fetch_all_concurrent(product_ids: list[str]) -> list[dict]:
    async with httpx.AsyncClient() as client:
        tasks = [client.get(f"/api/products/{pid}") for pid in product_ids]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        return [r.json() for r in responses if not isinstance(r, Exception)]

# With rate limiting — don't hammer downstream
async def fetch_with_limit(product_ids: list[str], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)
    async with httpx.AsyncClient() as client:
        async def fetch_one(pid):
            async with semaphore:
                resp = await client.get(f"/api/products/{pid}")
                return resp.json()
        return await asyncio.gather(*[fetch_one(pid) for pid in product_ids])
```

---

## Caching for Latency

```python
from functools import lru_cache
import time

# In-process cache — fastest (no network hop)
@lru_cache(maxsize=1000)
def get_exchange_rate(currency_pair: str) -> float:
    return external_api.get_rate(currency_pair)

# TTL-aware cache
def ttl_cache(ttl_seconds: int):
    cache = {}
    def decorator(func):
        def wrapper(*args):
            key = args
            if key in cache:
                value, expires_at = cache[key]
                if time.time() < expires_at:
                    return value
            result = func(*args)
            cache[key] = (result, time.time() + ttl_seconds)
            return result
        return wrapper
    return decorator

@ttl_cache(ttl_seconds=60)
def get_product_category_tree() -> dict:
    return db.query_category_tree()  # expensive; fine to cache 60s
```

---

## Response Payload Optimisation

```python
# Return only requested fields (reduce bandwidth + serialisation cost)
@app.get("/api/products")
def list_products(fields: str = None):
    products = db.query(Product).all()
    if fields:
        allowed = {"id", "name", "price", "category"}
        requested = set(fields.split(",")) & allowed
        return [
            {k: getattr(p, k) for k in requested}
            for p in products
        ]
    return products

# Streaming large responses — don't buffer in memory
from fastapi.responses import StreamingResponse
import json

@app.get("/api/reports/orders")
async def stream_orders():
    async def generate():
        yield "["
        first = True
        async for order in db.stream_orders():
            if not first:
                yield ","
            yield json.dumps(order.dict())
            first = False
        yield "]"
    return StreamingResponse(generate(), media_type="application/json")
```

---

## Benchmarking

```python
# pytest-benchmark
def test_order_total_calculation_performance(benchmark):
    order = Order(items=[OrderItem(price=9.99, quantity=i) for i in range(100)])
    result = benchmark(order.calculate_total)
    assert result > 0

# benchmark.pedantic for more control
def test_db_query_performance(benchmark, db_session):
    result = benchmark.pedantic(
        target=lambda: db_session.query(Product).filter_by(category="electronics").all(),
        rounds=10,
        iterations=5,
    )
    assert len(result) > 0
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/caching-strategies]] · [[cs-fundamentals/database-design]] · [[cs-fundamentals/concurrency]] · [[cs-fundamentals/observability-se]] · [[technical-qa/load-testing-advanced]]
