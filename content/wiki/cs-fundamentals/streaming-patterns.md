---
type: concept
category: cs-fundamentals
para: resource
tags: [sse, streaming, backpressure, async-generator, langchain, fastapi, chunked-transfer]
sources: []
updated: 2026-05-01
tldr: Server-Sent Events, chunked responses, and backpressure — the mechanics of real-time data delivery.
---

# Streaming Patterns

Server-Sent Events, chunked responses, and backpressure. The mechanics of real-time data delivery.

---

## SSE vs WebSocket vs Long Polling

```
Technique        Direction         Protocol  Reconnect  Use case
────────────────────────────────────────────────────────────────────
Long polling     Server→Client     HTTP      Manual     Legacy; avoid
SSE              Server→Client     HTTP      Automatic  LLM streams, dashboards, notifications
WebSocket        Bidirectional     WS        Manual     Chat, games, collaborative editing
HTTP Streaming   Server→Client     HTTP      Manual     File downloads, progress events
```

---

## SSE with FastAPI

```python
# app/streaming/endpoints.py
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio, json, time

app = FastAPI()

async def event_generator(topic: str):
    """Yields SSE-formatted chunks."""
    try:
        async for event in subscribe_to_topic(topic):
            # SSE format: "data: <payload>\n\n"
            payload = json.dumps(event)
            yield f"data: {payload}\n\n"
            # Named event type (client listens with addEventListener)
            # yield f"event: order_update\ndata: {payload}\n\n"
    except asyncio.CancelledError:
        yield "data: {\"type\": \"close\"}\n\n"


@app.get("/events/{topic}")
async def stream_events(topic: str):
    return StreamingResponse(
        event_generator(topic),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable Nginx buffering
            "Connection": "keep-alive",
        },
    )
```

---

## LLM Streaming (Anthropic → Browser)

```python
# FastAPI route that streams Claude responses directly to the browser
import anthropic
from fastapi.responses import StreamingResponse

client = anthropic.AsyncAnthropic()

@app.post("/chat")
async def chat_stream(request: ChatRequest):
    async def generate():
        async with client.messages.stream(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            messages=[{"role": "user", "content": request.message}],
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {json.dumps({'text': text})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache"})
```

```typescript
// Browser: consume SSE from LLM endpoint
async function streamChat(message: string, onChunk: (text: string) => void) {
    const response = await fetch("/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
    });

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") return;
                const parsed = JSON.parse(data);
                onChunk(parsed.text);
            }
        }
    }
}
```

---

## Streaming Large Files

```python
# StreamingResponse for large files — avoids loading into memory
import aiofiles
from pathlib import Path

@app.get("/files/{filename}")
async def download_file(filename: str):
    file_path = Path("uploads") / filename
    if not file_path.exists():
        raise HTTPException(404)

    async def file_generator():
        async with aiofiles.open(file_path, "rb") as f:
            while chunk := await f.read(65536):   # 64KB chunks
                yield chunk

    return StreamingResponse(
        file_generator(),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# Progress reporting during processing
async def process_with_progress(items: list) -> AsyncGenerator[str, None]:
    total = len(items)
    for i, item in enumerate(items):
        result = await process_item(item)
        progress = {"done": i + 1, "total": total, "result": result}
        yield f"data: {json.dumps(progress)}\n\n"
    yield "data: {\"done\": true}\n\n"
```

---

## Backpressure

```python
# Backpressure: consumer is slower than producer.
# Without it: memory fills up, process crashes.

import asyncio

async def producer(queue: asyncio.Queue) -> None:
    """Generates data; blocks when queue is full (natural backpressure)."""
    for i in range(1_000_000):
        await queue.put(i)          # blocks when queue.maxsize reached
    await queue.put(None)           # sentinel

async def consumer(queue: asyncio.Queue) -> None:
    """Processes at its own pace."""
    while True:
        item = await queue.get()
        if item is None:
            break
        await process_slowly(item)  # slow operation

async def run_with_backpressure() -> None:
    queue = asyncio.Queue(maxsize=100)   # maxsize = backpressure buffer
    await asyncio.gather(
        producer(queue),
        consumer(queue),
    )
```

```python
# Async generator with backpressure via asyncio.sleep / rate limiting
import asyncio
from collections import deque
from datetime import datetime

class RateLimitedStream:
    """Streams events but respects consumer rate."""

    def __init__(self, events_per_second: float = 100) -> None:
        self.interval = 1.0 / events_per_second
        self._buffer: deque = deque()

    async def __aiter__(self):
        last_emit = datetime.now().timestamp()
        async for event in self._source():
            elapsed = datetime.now().timestamp() - last_emit
            if elapsed < self.interval:
                await asyncio.sleep(self.interval - elapsed)
            yield event
            last_emit = datetime.now().timestamp()
```

---

## Chunked Transfer Encoding

```python
# HTTP/1.1 chunked transfer — server sends unknown-length response
@app.get("/report")
async def generate_report():
    async def generate():
        yield b"Report header\n"
        async for row in fetch_report_rows_lazily():   # lazy DB cursor
            yield (row.to_csv() + "\n").encode()
        yield b"Report footer\n"

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        # Content-Length intentionally omitted → chunked transfer encoding
    )
```

---

## Testing Streaming Endpoints

```python
import httpx
import pytest

@pytest.mark.asyncio
async def test_streaming_response():
    async with httpx.AsyncClient(app=app, base_url="http://test") as client:
        chunks = []
        async with client.stream("GET", "/events/orders") as response:
            assert response.status_code == 200
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    chunks.append(json.loads(line[6:]))
                if len(chunks) >= 5:
                    break
        assert len(chunks) == 5
```

---

## Common Failure Cases

**Nginx or a reverse proxy buffers the SSE stream, delaying delivery**
Why: many reverse proxies buffer response bodies before forwarding, which prevents SSE chunks from reaching the client until the buffer fills.
Detect: SSE events arrive in large batches rather than one by one; no events appear until the connection closes or after a multi-second delay.
Fix: add `X-Accel-Buffering: no` to the response headers and set `proxy_buffering off` in the Nginx config for the SSE route.

**SSE client not handling partial chunks, causing JSON parse errors**
Why: TCP does not respect SSE message boundaries; a single `read()` call can deliver part of one message concatenated with part of the next.
Detect: intermittent `JSON.parse` errors in the browser, especially on slow connections or large payloads.
Fix: buffer received bytes and only parse after splitting on `\n\n` (the SSE message terminator), as shown in the TypeScript consumer above.

**Generator not cleaned up when the client disconnects mid-stream**
Why: if the async generator holds an open database cursor or external API connection, a client disconnect that raises `CancelledError` inside the generator may skip the `finally` block if the exception is not propagated correctly.
Detect: connection pool exhaustion or resource leak warnings after clients drop connections during long streams.
Fix: wrap resource acquisition in an `async with` block inside the generator's `try/finally` so cleanup always runs, regardless of how the generator is exited.

**Unbounded queue causes OOM when consumer is slower than producer**
Why: `asyncio.Queue()` with no `maxsize` grows without limit; a slow consumer paired with a fast producer will exhaust available memory.
Detect: process RSS grows continuously during streaming; memory alerts fire on the host.
Fix: always set `maxsize` on the queue to enforce backpressure — the producer blocks when the buffer is full rather than growing indefinitely.

## Connections

[[se-hub]] · [[cs-fundamentals/websockets-se]] · [[cs-fundamentals/concurrency]] · [[web-frameworks/fastapi]] · [[apis/anthropic-api]] · [[llms/ae-hub]]
