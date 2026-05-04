---
type: concept
category: python
tags: [async, asyncio, python, concurrency, await, event-loop, async-generators]
sources: []
updated: 2026-05-04
para: resource
tldr: Python async/await is cooperative multitasking on a single thread — critical for LLM API calls, streaming, and any I/O-bound AI workload where waiting for a model response shouldn't block other work.
---

# Python Async Programming

> **TL;DR** Python async/await is cooperative multitasking on a single thread — critical for LLM API calls, streaming, and any I/O-bound AI workload where waiting for a model response shouldn't block other work.

Python's async/await model implements cooperative multitasking via an event loop. One thread handles many concurrent I/O operations by yielding control while waiting. For AI engineering this matters because LLM API calls are I/O-bound — a 2-second Claude call blocks nothing else if it's `await`ed.

---

## The Event Loop Model

```
Event Loop (single thread)
├── Task A: await client.messages.create(...)  → suspended
├── Task B: await db.fetch(...)                → suspended  
├── Task C: running (CPU work)
│
│   [A's network I/O completes]
├── Task A: resumes, processes response
```

Key insight: async does not add parallelism — it adds concurrency. CPU-bound tasks (tokenising 100MB of text) still block. Use `asyncio.run_in_executor()` or multiprocessing for CPU-bound work.

---

## Basics

```python
import asyncio

async def fetch_completion(prompt: str) -> str:
    # Simulates an LLM API call
    await asyncio.sleep(1)  # yields control while "waiting"
    return f"Response to: {prompt}"

async def main():
    result = await fetch_completion("Hello")
    print(result)

asyncio.run(main())  # the standard entry point
```

---

## Concurrent LLM Calls

The main use case in AI engineering — calling the API N times without waiting serially:

```python
import anthropic
import asyncio

async def call_claude(client: anthropic.AsyncAnthropic, prompt: str) -> str:
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text

async def batch_completions(prompts: list[str]) -> list[str]:
    client = anthropic.AsyncAnthropic()
    tasks = [call_claude(client, p) for p in prompts]
    return await asyncio.gather(*tasks)

results = asyncio.run(batch_completions(["Prompt 1", "Prompt 2", "Prompt 3"]))
# All 3 calls run concurrently — total time ≈ slowest single call, not sum
```

---

## Streaming with Async Generators

LLM streaming is the canonical use case for async generators:

```python
import anthropic

async def stream_response(prompt: str):
    client = anthropic.AsyncAnthropic()
    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    ) as stream:
        async for text in stream.text_stream:
            yield text  # async generator — caller iterates with async for

async def main():
    async for chunk in stream_response("Explain async in Python"):
        print(chunk, end="", flush=True)
```

---

## Controlling Concurrency

Unbounded `gather()` will hit rate limits. Use a semaphore:

```python
import asyncio

async def rate_limited_batch(prompts: list[str], max_concurrent: int = 5) -> list[str]:
    client = anthropic.AsyncAnthropic()
    semaphore = asyncio.Semaphore(max_concurrent)

    async def call_with_limit(prompt: str) -> str:
        async with semaphore:
            return await call_claude(client, prompt)

    return await asyncio.gather(*[call_with_limit(p) for p in prompts])
```

---

## Async with SQLAlchemy

See [[python/sqlalchemy]] for the full treatment. Quick reference:

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")

async with AsyncSession(engine) as session:
    result = await session.execute(select(User).where(User.id == 1))
    user = result.scalar_one()
```

---

## Async with FastAPI

FastAPI is natively async — `async def` route handlers run on the event loop:

```python
from fastapi import FastAPI
import anthropic

app = FastAPI()
client = anthropic.AsyncAnthropic()

@app.post("/complete")
async def complete(prompt: str) -> dict:
    message = await client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": prompt}],
    )
    return {"text": message.content[0].text}
```

---

## Common Mistakes

**Blocking the event loop with sync code:**
```python
# WRONG — blocks the event loop for all other tasks
async def bad():
    import time
    time.sleep(5)  # blocks; use await asyncio.sleep(5) instead
    result = requests.get("https://...")  # blocks; use httpx.AsyncClient instead
```

**Forgetting to await:**
```python
async def oops():
    result = client.messages.create(...)  # returns a coroutine, not a result
    # Fix: result = await client.messages.create(...)
```

**Creating a new event loop inside an existing one:**
```python
# WRONG inside async context (e.g., FastAPI handler, Jupyter)
asyncio.run(some_coroutine())  # raises RuntimeError: event loop already running
# Fix: await some_coroutine() directly
```

---

## Key Facts

- `asyncio.run()` creates an event loop, runs the coroutine, and closes the loop — the standard entry point
- `asyncio.gather()` runs coroutines concurrently and returns results in order
- `asyncio.Semaphore(n)` limits concurrent tasks to n — essential for API rate limiting
- Anthropic SDK: use `anthropic.AsyncAnthropic()` for async; `anthropic.Anthropic()` for sync
- FastAPI: `async def` routes run on the event loop; `def` routes run in a thread pool
- CPU-bound tasks still block: use `loop.run_in_executor()` or `asyncio.to_thread()`
- Jupyter runs its own event loop — use `await coroutine()` directly, not `asyncio.run()`

## Common Failure Cases

**Rate limit errors from unbounded concurrent LLM calls**
Use `asyncio.Semaphore` to cap concurrency at the API's per-minute limit.

**`RuntimeError: This event loop is already running` in Jupyter**
Jupyter runs an event loop; `asyncio.run()` tries to create another. Use `await` directly or `import nest_asyncio; nest_asyncio.apply()` as a workaround.

**Sync SQLAlchemy session called inside async route**
The sync session blocks the event loop. Switch to `create_async_engine` + `AsyncSession`. See [[python/sqlalchemy]].

## Connections

- [[python/ecosystem]] — async fits into the broader Python AI stack
- [[python/sqlalchemy]] — async SQLAlchemy with `asyncpg` driver
- [[web-frameworks/fastapi]] — FastAPI is built around async request handling
- [[apis/anthropic-api]] — `AsyncAnthropic` client for concurrent LLM calls
- [[cs-fundamentals/concurrency]] — threading vs async vs multiprocessing tradeoffs
