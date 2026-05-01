---
type: concept
category: cs-fundamentals
para: resource
tags: [concurrency, async, threading, race-conditions, locks, goroutines]
sources: []
updated: 2026-05-01
---

# Concurrency

Running multiple tasks that overlap in time. Concurrency is about structure (managing many tasks); parallelism is about execution (running on multiple CPUs simultaneously). Both solve different problems.

---

## Concurrency vs Parallelism

```
Concurrency: one cook, multiple dishes — switches between tasks
Parallelism: multiple cooks — each works on a dish simultaneously

Python:
  CPU-bound (ML, number crunching) → multiprocessing (bypasses GIL)
  I/O-bound (HTTP, DB, files) → asyncio or threading (GIL released during I/O)
  Mixed → run asyncio + ProcessPoolExecutor

Go: goroutines + channels handle both naturally (no GIL)
```

---

## Python asyncio

```python
import asyncio
import httpx

# async/await — concurrent I/O without threads
async def fetch_user(client: httpx.AsyncClient, user_id: str) -> dict:
    response = await client.get(f"/users/{user_id}")
    response.raise_for_status()
    return response.json()

async def fetch_all_users(user_ids: list[str]) -> list[dict]:
    async with httpx.AsyncClient(base_url="https://api.example.com") as client:
        tasks = [fetch_user(client, uid) for uid in user_ids]
        # Run all concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)

    users, errors = [], []
    for r in results:
        if isinstance(r, Exception):
            errors.append(r)
        else:
            users.append(r)

    if errors:
        raise ExceptionGroup("Some user fetches failed", errors)
    return users

# Run from synchronous entry point
asyncio.run(fetch_all_users(["u1", "u2", "u3"]))
```

---

## Semaphore — Limit Concurrency

```python
# Prevent hammering an API with too many concurrent requests
async def fetch_with_limit(urls: list[str], max_concurrent: int = 10) -> list[dict]:
    semaphore = asyncio.Semaphore(max_concurrent)

    async def fetch_one(client: httpx.AsyncClient, url: str) -> dict:
        async with semaphore:  # blocks if 10 requests already in flight
            response = await client.get(url)
            return response.json()

    async with httpx.AsyncClient() as client:
        return await asyncio.gather(*[fetch_one(client, url) for url in urls])
```

---

## Thread Safety and Race Conditions

```python
# Race condition: two threads read-increment-write the same value
import threading

counter = 0

def unsafe_increment():
    global counter
    for _ in range(100_000):
        counter += 1   # NOT atomic: read → add → write (3 operations)

threads = [threading.Thread(target=unsafe_increment) for _ in range(10)]
for t in threads: t.start()
for t in threads: t.join()
print(counter)   # < 1,000,000 — race condition

# Fix: Lock
lock = threading.Lock()
counter = 0

def safe_increment():
    global counter
    for _ in range(100_000):
        with lock:
            counter += 1

# Fix: atomic operations via queue
from queue import Queue

work_queue: Queue = Queue()
result_queue: Queue = Queue()
```

---

## asyncio.Queue — Producer/Consumer

```python
async def producer(queue: asyncio.Queue, items: list) -> None:
    for item in items:
        await queue.put(item)
    await queue.put(None)   # sentinel

async def consumer(queue: asyncio.Queue, worker_id: int) -> list:
    results = []
    while True:
        item = await queue.get()
        if item is None:
            await queue.put(None)   # pass sentinel to next consumer
            break
        result = await process(item)
        results.append(result)
        queue.task_done()
    return results

async def pipeline(items: list, workers: int = 5) -> list:
    queue: asyncio.Queue = asyncio.Queue(maxsize=workers * 2)

    producer_task = asyncio.create_task(producer(queue, items))
    consumer_tasks = [asyncio.create_task(consumer(queue, i)) for i in range(workers)]

    await producer_task
    results = await asyncio.gather(*consumer_tasks)
    return [r for batch in results for r in batch]
```

---

## Python Multiprocessing (CPU-bound)

```python
from concurrent.futures import ProcessPoolExecutor
import numpy as np

def compute_chunk(data_chunk: np.ndarray) -> float:
    return np.sum(data_chunk ** 2)   # CPU-intensive

def parallel_compute(data: np.ndarray, workers: int = 4) -> float:
    chunks = np.array_split(data, workers)

    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(compute_chunk, chunks))

    return sum(results)
```

---

## Go Goroutines and Channels

```go
// Fan-out/fan-in pattern
func fetchAllUsers(userIDs []string) []User {
    results := make(chan User, len(userIDs))

    for _, id := range userIDs {
        go func(uid string) {
            user := fetchUser(uid)   // runs concurrently
            results <- user
        }(id)
    }

    users := make([]User, 0, len(userIDs))
    for range userIDs {
        users = append(users, <-results)
    }
    return users
}

// sync.WaitGroup — wait for goroutines to finish
var wg sync.WaitGroup
var mu sync.Mutex
results := make([]int, 0)

for _, n := range numbers {
    wg.Add(1)
    go func(n int) {
        defer wg.Done()
        result := heavyCompute(n)
        mu.Lock()
        results = append(results, result)
        mu.Unlock()
    }(n)
}
wg.Wait()
```

---

## Deadlock

```python
# Deadlock: Thread A holds lock1 and waits for lock2
#           Thread B holds lock2 and waits for lock1

# Prevent: always acquire locks in the same order
LOCK_ORDER = [lock1, lock2]   # document and enforce acquisition order

# Or use timeout
if lock.acquire(timeout=5):
    try:
        ...
    finally:
        lock.release()
else:
    raise TimeoutError("Could not acquire lock in 5s")
```

---

## Connections
[[se-hub]] · [[cs-fundamentals/distributed-systems]] · [[cs-fundamentals/performance-optimisation-se]] · [[python/ecosystem]] · [[llms/ae-hub]]
