---
type: concept
category: javascript
para: resource
tags: [nodejs, async, event-loop, libuv, streams, promises, async-await, concurrency]
sources: []
updated: 2026-05-02
tldr: Node.js runs JavaScript on a single-threaded event loop backed by libuv's thread pool — I/O is non-blocking by default, CPU work blocks everything; async/await is syntactic sugar over Promises; key gotchas vs Python asyncio are explicit context, unhandled rejections, and the lack of asyncio.gather semantics.
---

# Node.js Async and the Event Loop

> **TL;DR** Node.js processes JavaScript on a single thread using an event loop. I/O (network, disk) is non-blocking via libuv callbacks. CPU-bound work blocks the loop and kills latency. `async/await` is sugar over Promises; `Promise.all()` is the concurrency primitive. The model feels like Python asyncio but the runtime differences matter.

---

## The Event Loop

Node.js executes JavaScript on a single OS thread. The event loop processes callbacks in phases:

```
┌─────────────────────────────────────────────────────┐
│                      Event Loop                      │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  timers  │→ │  I/O     │→ │  check (setImm.) │  │
│  │setTimeout│  │callbacks │  │                  │  │
│  │setInterval│  │          │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│       ↑                                   |         │
│       └───────────────────────────────────┘         │
│                                                      │
│  Microtask queue (Promises, queueMicrotask) drains   │
│  between every phase                                 │
└─────────────────────────────────────────────────────┘
```

**Phases:**
1. **timers** — `setTimeout` and `setInterval` callbacks
2. **I/O callbacks** — callbacks for completed async I/O
3. **idle/prepare** — internal use
4. **poll** — retrieve new I/O events; block here if nothing to do
5. **check** — `setImmediate` callbacks
6. **close callbacks** — `socket.on("close", ...)` etc.

**Microtask queue** drains after each phase: resolved Promise callbacks, `queueMicrotask()`. This means resolved Promises run before `setTimeout` callbacks even if the timer fired.

```typescript
setTimeout(() => console.log("timeout"), 0);
Promise.resolve().then(() => console.log("promise"));
console.log("sync");

// Output:
// sync
// promise
// timeout
```

---

## libuv: The Thread Pool Under the Hood

libuv is the C library that Node.js uses for async I/O. It maintains a **thread pool** (default 4 threads) that handles:
- File system operations
- DNS lookups
- Crypto operations
- `zlib` compression

Network I/O (TCP, HTTP) uses the OS's non-blocking I/O APIs (epoll on Linux, kqueue on macOS, IOCP on Windows) — these do not use thread pool threads.

```typescript
// This does NOT block the event loop — network I/O is async at OS level
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  /* ... */
});

// This CAN block a libuv thread — file I/O goes through thread pool
import { readFile } from "fs/promises";
const content = await readFile("/large/file.txt", "utf8"); // uses a thread pool slot
```

**Implication:** You can make thousands of concurrent HTTP requests from Node.js with a single thread. File I/O can bottleneck at the thread pool limit (increase with `UV_THREADPOOL_SIZE=8`).

---

## Promises

The primitive for async values. A Promise is either pending, fulfilled, or rejected.

```typescript
// Creating a Promise
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  return Promise.race([
    fetch(url),
    delay(timeoutMs).then(() => {
      throw new Error(`Timeout after ${timeoutMs}ms`);
    }),
  ]);
}
```

**Promise combinators:**

```typescript
// Promise.all — all succeed or first failure throws
// Best for: N independent async operations where you need all results
const [users, messages, preferences] = await Promise.all([
  fetchUsers(),
  fetchMessages(),
  fetchPreferences(),
]);

// Promise.allSettled — waits for all, returns results including failures
// Best for: fire N requests, handle each result individually
const results = await Promise.allSettled([
  callModel("claude-haiku-4-5", prompt),
  callModel("claude-sonnet-4-6", prompt),
]);
for (const result of results) {
  if (result.status === "fulfilled") {
    console.log(result.value);
  } else {
    console.error(result.reason);
  }
}

// Promise.race — resolves/rejects with whichever settles first
// Best for: timeout pattern, speculative execution
const result = await Promise.race([
  callPrimaryModel(prompt),
  delay(5000).then(() => { throw new Error("timeout"); }),
]);

// Promise.any — resolves with first success; rejects only if ALL fail
// Best for: redundant providers, take fastest successful response
const fastest = await Promise.any([
  callAnthropicAPI(prompt),
  callFallbackAPI(prompt),
]);
```

---

## async/await

Syntactic sugar over Promises. An `async` function always returns a Promise. `await` suspends the function and returns control to the event loop.

```typescript
// These are equivalent
function fetchData(): Promise<string> {
  return fetch("/api/data")
    .then((r) => r.json())
    .then((data) => data.value);
}

async function fetchDataAsync(): Promise<string> {
  const response = await fetch("/api/data");
  const data = await response.json();
  return data.value;
}
```

**Error handling with async/await:**

```typescript
// Option 1: try/catch (preferred for complex error handling)
async function callAPI(prompt: string): Promise<string> {
  try {
    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    return response.content[0].type === "text" ? response.content[0].text : "";
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 529) {
        throw new Error("API overloaded — retry with backoff");
      }
      throw new Error(`API error ${error.status}: ${error.message}`);
    }
    throw error; // re-throw unknown errors
  }
}

// Option 2: Result type (no exceptions, explicit error handling)
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function safeCallAPI(
  prompt: string
): Promise<Result<string>> {
  try {
    const text = await callAPI(prompt);
    return { ok: true, value: text };
  } catch (error) {
    return { ok: false, error: error as Error };
  }
}
```

**Sequential vs parallel — the most common performance mistake:**

```typescript
// SLOW — sequential, each awaits the previous
async function slowFanOut(prompts: string[]): Promise<string[]> {
  const results: string[] = [];
  for (const prompt of prompts) {
    results.push(await callModel(prompt)); // one at a time
  }
  return results;
}

// FAST — parallel, all start immediately
async function fastFanOut(prompts: string[]): Promise<string[]> {
  return Promise.all(prompts.map((p) => callModel(p)));
}

// CONTROLLED — parallel with concurrency limit
async function limitedFanOut(
  prompts: string[],
  concurrency = 5
): Promise<string[]> {
  const results: string[] = [];
  for (let i = 0; i < prompts.length; i += concurrency) {
    const batch = prompts.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map((p) => callModel(p)));
    results.push(...batchResults);
  }
  return results;
}
```

---

## Streams

Node.js streams are the mechanism for processing data incrementally — essential for LLM streaming responses.

### ReadableStream (Web API, works in Node.js 18+)

```typescript
// Reading a streaming Anthropic response via the @anthropic-ai/sdk
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function streamCompletion(prompt: string): Promise<void> {
  const stream = client.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      process.stdout.write(event.delta.text);
    }
  }

  const finalMessage = await stream.finalMessage();
  console.log(`\nTotal tokens: ${finalMessage.usage.input_tokens + finalMessage.usage.output_tokens}`);
}
```

### Piping a stream to an HTTP response (Next.js Route Handler)

```typescript
// app/api/stream/route.ts
import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  const encoder = new TextEncoder();

  const readableStream = new ReadableStream({
    async start(controller) {
      const stream = client.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });

      for await (const event of stream) {
        if (
          event.type === "content_block_delta" &&
          event.delta.type === "text_delta"
        ) {
          controller.enqueue(encoder.encode(event.delta.text));
        }
      }
      controller.close();
    },
  });

  return new Response(readableStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
    },
  });
}
```

### Node.js Transform Streams (for server-side processing pipelines)

```typescript
import { Transform, TransformCallback } from "stream";

class TokenCounter extends Transform {
  private count = 0;

  _transform(chunk: Buffer, _encoding: string, callback: TransformCallback) {
    const text = chunk.toString();
    this.count += text.split(/\s+/).length;
    this.push(chunk); // pass through unchanged
    callback();
  }

  _flush(callback: TransformCallback) {
    console.log(`Total tokens (approx): ${this.count}`);
    callback();
  }
}
```

---

## Node.js vs Python asyncio — Key Differences

| Aspect | Node.js | Python asyncio |
|---|---|---|
| Thread model | Single thread, non-blocking I/O via libuv | Single thread, event loop via asyncio |
| Starting async code | `async` functions return Promise immediately | Must `await asyncio.run(main())` to start |
| Concurrency primitive | `Promise.all()` | `asyncio.gather()` |
| Concurrency with limit | Manual batching or `p-limit` library | `asyncio.Semaphore` |
| CPU-bound work | Blocks the loop; use `worker_threads` | Blocked by GIL; use `ProcessPoolExecutor` |
| Error propagation | Unhandled Promise rejection = warning/crash | Unhandled exception in coroutine = warning |
| Context propagation | `AsyncLocalStorage` (Node 16+) | `contextvars.ContextVar` |
| Stream handling | Streams, ReadableStream, async generators | `async for` over async generators |
| Timeout | `AbortController` + `AbortSignal` | `asyncio.wait_for(coro, timeout)` |

**Equivalent patterns:**

```typescript
// Node.js — concurrency limit
import pLimit from "p-limit";
const limit = pLimit(5);
const results = await Promise.all(
  items.map((item) => limit(() => processItem(item)))
);
```

```python
# Python asyncio — concurrency limit
sem = asyncio.Semaphore(5)
async def bounded(item):
    async with sem:
        return await process_item(item)
results = await asyncio.gather(*[bounded(i) for i in items])
```

**Async generators** work the same way in both:

```typescript
// Node.js async generator
async function* tokenStream(prompt: string): AsyncGenerator<string> {
  const stream = client.messages.stream({ /* ... */ });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

// Consume
for await (const token of tokenStream("Hello")) {
  process.stdout.write(token);
}
```

---

## AbortController and Timeouts

The standard way to cancel async operations in Node.js 16+.

```typescript
async function callModelWithTimeout(
  prompt: string,
  timeoutMs = 30_000
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "content-type": "application/json",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal, // pass AbortSignal to fetch
    });

    return (await response.json()).content[0].text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## AsyncLocalStorage — Context Without Prop Drilling

Node.js equivalent of Python's `contextvars`. Propagates context (request ID, user ID) through async call chains without passing it as a parameter.

```typescript
import { AsyncLocalStorage } from "async_hooks";

interface RequestContext {
  requestId: string;
  userId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

// Set in middleware
function withContext<T>(
  context: RequestContext,
  fn: () => Promise<T>
): Promise<T> {
  return requestContext.run(context, fn);
}

// Read anywhere in the async call chain
function getCurrentRequestId(): string | undefined {
  return requestContext.getStore()?.requestId;
}

// Usage in Next.js middleware
export async function middleware(request: NextRequest) {
  return withContext(
    { requestId: crypto.randomUUID(), userId: getUser(request) },
    () => handleRequest(request)
  );
}
```

---

## CPU-Bound Work: Worker Threads

CPU-intensive operations (JSON parsing of large payloads, compression, cryptography in bulk) block the event loop. Use `worker_threads` to offload to a separate thread.

```typescript
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";

// worker.ts
if (!isMainThread) {
  const { text } = workerData as { text: string };
  // CPU-heavy tokenisation
  const tokens = expensiveTokenise(text);
  parentPort!.postMessage(tokens);
}

// main.ts
function tokeniseInWorker(text: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(__filename, { workerData: { text } });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
    });
  });
}
```

For production use, use a worker pool library (`workerpool`, `piscina`) rather than creating workers per request.

---

## Key Facts

- Node.js is single-threaded for JavaScript execution; libuv handles I/O with OS async APIs and a 4-thread pool
- `Promise.all()` starts all Promises in parallel and waits for all; it does NOT limit concurrency — use `p-limit` for that
- Unhandled Promise rejections crash Node.js 15+; always attach `.catch()` or use `try/catch` in async functions
- `for await...of` works on any async iterable, including `@anthropic-ai/sdk` streams
- `AbortController` / `AbortSignal` is the standard timeout/cancellation mechanism; pass `signal` to `fetch`
- `AsyncLocalStorage` propagates context (request ID, correlation ID) through async chains without parameters
- CPU-bound work (JSON parsing, compression, tokenisation) blocks the event loop — offload to `worker_threads`
- The microtask queue (Promises) drains before the next event loop phase — `Promise.resolve().then()` runs before `setTimeout(() => ..., 0)`

## Common Failure Cases

**Sequential awaits in a loop**
Why: `for (const item of items) { await process(item); }` runs items one at a time.
Detect: Loop body contains `await`; high latency that scales linearly with item count.
Fix: `await Promise.all(items.map(process))` — or with concurrency limit: batch by `concurrency` using `p-limit`.

**Unhandled Promise rejection**
Why: A Promise is rejected and nothing catches it. In Node.js 15+, this crashes the process.
Detect: `UnhandledPromiseRejectionWarning` in logs; process exits with code 1 unexpectedly.
Fix: Always add `try/catch` in async functions. Add a global handler as a last resort: `process.on("unhandledRejection", (reason) => { logger.error(reason); process.exit(1); })`.

**Blocking the event loop with synchronous CPU work**
Why: `JSON.parse()` on a 50MB payload, synchronous regex on large text, or a tight calculation loop runs synchronously on the main thread.
Detect: Event loop lag metric (measure with `perf_hooks.monitorEventLoopDelay`); p99 latency spikes while p50 is fine; `--cpu-prof` shows one function dominating.
Fix: Break into smaller chunks with `setImmediate` to yield, or move to a `worker_threads` pool.

**Not propagating AbortSignal through fetch chains**
Why: A timeout controller is created but its `signal` is not passed down to nested `fetch` calls.
Detect: Requests continue running after the timeout fires; the AbortError is thrown from the outer call but inner fetches still consume network resources.
Fix: Thread `signal` through every `fetch` and HTTP client call in the chain.

**Race condition on shared mutable state**
Why: Two concurrent async operations both read-modify-write the same object. Even though JavaScript is single-threaded, `await` yields control, letting another operation interleave.
Detect: Intermittent state corruption; bugs that appear only under concurrent load.
Fix: Use a queue or mutex (e.g., `async-mutex` npm package) around critical sections. Better: model state as immutable and use functional update patterns.

## Connections

- [[javascript/javascript-hub]] — ecosystem overview
- [[javascript/typescript-fundamentals]] — typing async functions and Promises
- [[javascript/ai-sdk-patterns]] — streaming LLM responses with async iterables
- [[web-frameworks/nextjs]] — App Router route handlers, streaming responses
- [[python/ecosystem]] — Python asyncio parallel: AsyncAnthropic, asyncio.gather
- [[cs-fundamentals/concurrency]] — concurrency models across languages

## Open Questions

- Will Node.js native async context API (`AsyncLocalStorage`) become standard for tracing without explicit OpenTelemetry instrumentation?
- Does `Promise.all` with hundreds of concurrent Anthropic API calls hit rate limits faster than batched sequential calls at the same total throughput?
- When is `piscina` (worker thread pool) preferable to a separate Python subprocess for CPU-heavy tokenisation in a Node.js app?
