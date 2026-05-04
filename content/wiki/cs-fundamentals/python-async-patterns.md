---
type: concept
category: cs-fundamentals
para: resource
tags: [asyncio, task-groups, cancellation, semaphore, timeout, async-generators, trio]
sources: []
updated: 2026-05-01
tldr: Beyond `await` — task groups, cancellation, timeouts, and structured concurrency.
---

# Advanced Async Patterns in Python

Beyond `await`. Task groups, cancellation, timeouts, and structured concurrency.

---

## Structured Concurrency with TaskGroup (Python 3.11+)

```python
import asyncio

# Old way: gather() — harder to reason about cancellation
results = await asyncio.gather(fetch_user(id), fetch_orders(id), fetch_prefs(id))

# New way: TaskGroup — structured, cancels all tasks on first failure
async def load_dashboard_data(user_id: str) -> dict:
    async with asyncio.TaskGroup() as tg:
        user_task = tg.create_task(fetch_user(user_id))
        orders_task = tg.create_task(fetch_orders(user_id))
        prefs_task = tg.create_task(fetch_prefs(user_id))
    # All tasks are done when we exit the context manager
    # If ANY task raises, ALL others are cancelled
    return {
        "user": user_task.result(),
        "orders": orders_task.result(),
        "preferences": prefs_task.result(),
    }
```

---

## Timeout Management

```python
import asyncio

# asyncio.timeout (Python 3.11+) — cleanest API
async def fetch_with_timeout(url: str) -> bytes:
    try:
        async with asyncio.timeout(5.0):   # 5 second deadline
            return await http_get(url)
    except TimeoutError:
        raise HTTPException(504, f"Upstream timed out: {url}")

# Timeout with fallback
async def get_recommendations_with_fallback(user_id: str) -> list:
    try:
        async with asyncio.timeout(0.2):    # 200ms SLA for personalisation
            return await ml_recommendations(user_id)
    except TimeoutError:
        return get_default_recommendations()   # fast static fallback

# asyncio.wait_for — Python 3.10 and earlier
async def fetch_with_timeout_compat(url: str) -> bytes:
    try:
        return await asyncio.wait_for(http_get(url), timeout=5.0)
    except asyncio.TimeoutError:
        raise HTTPException(504)
```

---

## Semaphore — Concurrency Limiting

```python
import asyncio

async def fetch_all_with_limit(urls: list[str], max_concurrent: int = 10) -> list:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_one(url: str) -> bytes:
        async with semaphore:   # blocks if max_concurrent already running
            return await http_get(url)

    return await asyncio.gather(*[fetch_one(url) for url in urls])

# Rate limiting: requests per second
import time

class RateLimiter:
    def __init__(self, calls_per_second: float) -> None:
        self._interval = 1.0 / calls_per_second
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    async def __aenter__(self) -> None:
        async with self._lock:
            now = asyncio.get_event_loop().time()
            wait = self._interval - (now - self._last_call)
            if wait > 0:
                await asyncio.sleep(wait)
            self._last_call = asyncio.get_event_loop().time()

    async def __aexit__(self, *args) -> None:
        pass

rate_limiter = RateLimiter(calls_per_second=10)

async def rate_limited_fetch(url: str) -> bytes:
    async with rate_limiter:
        return await http_get(url)
```

---

## Task Cancellation

```python
import asyncio

# Tasks can be cancelled — handle it correctly
async def long_running_job(job_id: str) -> dict:
    try:
        result = await do_expensive_work(job_id)
        return result
    except asyncio.CancelledError:
        # Cleanup on cancellation (rollback, close connections, etc.)
        await cleanup_partial_work(job_id)
        raise   # ALWAYS re-raise CancelledError — don't swallow it

# Cancelling a task
async def run_with_deadline(job_id: str, deadline_seconds: float) -> dict | None:
    task = asyncio.create_task(long_running_job(job_id))
    try:
        return await asyncio.wait_for(task, timeout=deadline_seconds)
    except asyncio.TimeoutError:
        # wait_for already cancelled the task
        return None

# Shield: prevent cancellation of critical cleanup
async def save_checkpoint(data: dict) -> None:
    try:
        await asyncio.shield(write_to_db(data))   # not cancellable
    except asyncio.CancelledError:
        pass   # checkpoint was saved even if outer task was cancelled
```

---

## Async Generators and Streaming

```python
from typing import AsyncGenerator

async def stream_database_rows(query: str) -> AsyncGenerator[dict, None]:
    """Lazy streaming — doesn't load all rows into memory."""
    async with get_db_connection() as conn:
        async with conn.cursor() as cursor:
            await cursor.execute(query)
            async for row in cursor:
                yield dict(row)

# Consume the stream
async def process_large_dataset() -> int:
    count = 0
    async for row in stream_database_rows("SELECT * FROM orders WHERE year = 2026"):
        await process_row(row)
        count += 1
    return count

# Async generator with cleanup
async def managed_stream(source_id: str) -> AsyncGenerator[bytes, None]:
    stream = await open_stream(source_id)
    try:
        async for chunk in stream:
            yield chunk
    finally:
        await stream.close()   # cleanup always runs, even if consumer breaks early
```

---

## Async Context Managers

```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def timed_operation(name: str):
    start = asyncio.get_event_loop().time()
    try:
        yield
    finally:
        elapsed = asyncio.get_event_loop().time() - start
        logger.info(f"{name} completed in {elapsed:.3f}s")

@asynccontextmanager
async def transaction(db_pool):
    conn = await db_pool.acquire()
    async with conn.transaction():
        try:
            yield conn
        except Exception:
            raise   # transaction auto-rolled-back on exception
    await db_pool.release(conn)

# Usage
async def create_order_with_metrics(order: Order) -> dict:
    async with timed_operation("create_order"):
        async with transaction(pool) as conn:
            await conn.execute("INSERT INTO orders ...", order.dict())
            await conn.execute("UPDATE inventory ...", ...)
```

---

## Event-Driven Async with Queue

```python
import asyncio
from dataclasses import dataclass
from typing import Callable

@dataclass
class Event:
    type: str
    payload: dict

class AsyncEventBus:
    """In-process pub/sub for async event handling."""

    def __init__(self) -> None:
        self._subscribers: dict[str, list[Callable]] = {}
        self._queue: asyncio.Queue[Event] = asyncio.Queue()
        self._running = False

    def subscribe(self, event_type: str, handler: Callable) -> None:
        self._subscribers.setdefault(event_type, []).append(handler)

    async def publish(self, event: Event) -> None:
        await self._queue.put(event)

    async def run(self) -> None:
        self._running = True
        while self._running:
            event = await self._queue.get()
            handlers = self._subscribers.get(event.type, [])
            await asyncio.gather(*[h(event) for h in handlers], return_exceptions=True)
            self._queue.task_done()

bus = AsyncEventBus()

@bus.subscribe("order.placed")
async def send_confirmation_email(event: Event) -> None:
    await email_service.send(event.payload["user_email"], "Order confirmed!")

@bus.subscribe("order.placed")
async def update_analytics(event: Event) -> None:
    await analytics.track("order_placed", event.payload)
```

---

## Common Failure Cases

**Swallowing `CancelledError` and blocking clean shutdown**
Why: catching `Exception` inside an async task catches `CancelledError` in Python 3.7, silently suppressing the cancellation signal and leaving tasks running after `TaskGroup` or timeout expects them to be done.
Detect: `asyncio.TaskGroup` hangs indefinitely on exit; or `wait_for` raises `TimeoutError` but the underlying coroutine keeps running.
Fix: always re-raise `CancelledError` — catch it only to clean up, then `raise`.

**Using `asyncio.gather()` when one failure should cancel siblings**
Why: by default `gather(return_exceptions=False)` propagates the first exception but does not cancel the other running coroutines, leaving them orphaned.
Detect: orphaned tasks appear in `asyncio.all_tasks()` after an exception; resources (DB connections, file handles) are not released.
Fix: switch to `asyncio.TaskGroup` (Python 3.11+), which cancels all siblings automatically on first failure.

**Creating a `Semaphore` or `Lock` outside the running event loop**
Why: asyncio synchronisation primitives capture the event loop at construction time; creating them at module import time (before `asyncio.run()`) attaches them to a different or non-existent loop.
Detect: `RuntimeError: no running event loop` or `got Future attached to a different loop`.
Fix: create `Semaphore` / `Lock` / `Queue` inside an `async` function or as an instance variable initialised on first use.

**Blocking the event loop with a synchronous call**
Why: any blocking I/O or CPU-heavy call (`requests.get`, `time.sleep`, heavy pandas operation) stalls the entire event loop for its duration, defeating the purpose of async.
Detect: request latency spikes correlate with CPU usage; `asyncio` debug mode logs `Executing <Task>` taking longer than 100ms.
Fix: use `await asyncio.to_thread(blocking_func)` (Python 3.9+) or `loop.run_in_executor(None, blocking_func)` to offload to a thread pool.

**`RateLimiter` not working correctly across concurrent callers**
Why: the `asyncio.Lock` serialises callers, but if two coroutines both acquire the lock and calculate `wait = interval - elapsed`, the second one measures elapsed time from when the first *released* the lock, not from when it made its call, so bursts can still exceed the target rate.
Detect: actual call rate measured externally exceeds the configured `calls_per_second` under concurrency.
Fix: record `_last_call` *before* releasing the lock and calculate the next permitted time as an absolute timestamp, not a relative elapsed window.

## Connections

[[se-hub]] · [[cs-fundamentals/concurrency]] · [[cs-fundamentals/streaming-patterns]] · [[cs-fundamentals/background-jobs]] · [[web-frameworks/fastapi]] · [[python/ecosystem]]
## Open Questions

- What are the most common misapplications of this concept in production codebases?
- When should you explicitly choose not to use this pattern or technique?
