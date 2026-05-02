---
type: concept
category: web-frameworks
tags: [fastapi, python, api, async, pydantic, streaming, websocket]
sources: []
updated: 2026-04-29
para: resource
tldr: FastAPI is the standard async Python framework for AI backends — Pydantic-native, SSE streaming built-in, auto-generated OpenAPI docs, and the right choice when you need a Python service to expose an LLM API.
---

# FastAPI

> **TL;DR** FastAPI is the standard async Python framework for AI backends — Pydantic-native, SSE streaming built-in, auto-generated OpenAPI docs, and the right choice when you need a Python service to expose an LLM API.

The standard Python API framework for AI backends. Pydantic-native, async-first, auto-generates OpenAPI docs. The right choice for any Python service that needs to expose an API.

---

## Why FastAPI for AI Backends

- **Streaming responses** — SSE built-in for LLM token streaming
- **Async-native** — non-blocking LLM API calls without thread pools
- **Pydantic v2 integration** — request/response validation with zero boilerplate
- **Auto-docs** — OpenAPI / Swagger UI auto-generated from type hints
- **Background tasks** — fire-and-forget for async work (e.g., sending results to a queue)

---

## Minimal LLM API

```python
from fastapi import FastAPI
from pydantic import BaseModel
from anthropic import AsyncAnthropic

app = FastAPI()
client = AsyncAnthropic()

class ChatRequest(BaseModel):
    message: str
    model: str = "claude-sonnet-4-6"
    max_tokens: int = 1024

class ChatResponse(BaseModel):
    reply: str
    input_tokens: int
    output_tokens: int

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    response = await client.messages.create(
        model=request.model,
        max_tokens=request.max_tokens,
        messages=[{"role": "user", "content": request.message}]
    )
    return ChatResponse(
        reply=response.content[0].text,
        input_tokens=response.usage.input_tokens,
        output_tokens=response.usage.output_tokens,
    )
```

---

## Streaming Responses (SSE)

Server-sent events for streaming LLM tokens to the client.

```python
from fastapi.responses import StreamingResponse
import asyncio

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        async with client.messages.stream(
            model=request.model,
            max_tokens=request.max_tokens,
            messages=[{"role": "user", "content": request.message}]
        ) as stream:
            async for text in stream.text_stream:
                yield f"data: {text}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

Frontend consumption with `fetch` and `ReadableStream`:
```javascript
const response = await fetch("/chat/stream", { method: "POST", body: JSON.stringify({message: "..."}) });
const reader = response.body.getReader();
// read chunks, decode, update UI
```

Or use the [[web-frameworks/vercel-ai-sdk]] for the frontend. It handles SSE parsing automatically.

---

## Dependency Injection

The FastAPI pattern for shared state, auth, and configuration.

```python
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    if credentials.credentials != os.environ["API_TOKEN"]:
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials

@app.post("/chat")
async def chat(request: ChatRequest, token: str = Depends(verify_token)):
    ...
```

**Database session dependency (SQLAlchemy 2.0 async):**
```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

engine = create_async_engine("postgresql+asyncpg://...")

async def get_db() -> AsyncSession:
    async with AsyncSession(engine) as session:
        yield session

@app.get("/users/{user_id}")
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    ...
```

---

## Background Tasks

Non-blocking post-response work:

```python
from fastapi import BackgroundTasks

async def log_to_langfuse(trace_id: str, response: str):
    await langfuse_client.create_trace(...)

@app.post("/chat")
async def chat(request: ChatRequest, background_tasks: BackgroundTasks):
    response = await client.messages.create(...)
    background_tasks.add_task(log_to_langfuse, trace_id, response.content[0].text)
    return {"reply": response.content[0].text}
```

For longer background work (minutes+), use Celery, ARQ, or a message queue. Not BackgroundTasks.

---

## Router Structure

For larger apps, split routes into modules:

```
app/
  main.py          # FastAPI instance, router includes
  routers/
    chat.py        # /chat endpoints
    tools.py       # /tools endpoints
  models/          # Pydantic models
  services/        # Business logic (calls Anthropic API, etc.)
```

```python
# main.py
from fastapi import FastAPI
from app.routers import chat, tools

app = FastAPI()
app.include_router(chat.router, prefix="/api/v1")
app.include_router(tools.router, prefix="/api/v1")
```

---

## Error Handling

```python
from fastapi import HTTPException
from fastapi.exception_handlers import http_exception_handler
from anthropic import APIStatusError

@app.exception_handler(APIStatusError)
async def anthropic_error_handler(request, exc: APIStatusError):
    if exc.status_code == 529:
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
    raise HTTPException(status_code=500, detail="AI service error")
```

---

## Running

```bash
# Development (with reload)
uvicorn app.main:app --reload --port 8000

# Production (with Gunicorn workers)
gunicorn app.main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker
```

---

## Key Facts

- `StreamingResponse` with `media_type="text/event-stream"` is the SSE pattern for LLM token streaming
- `BackgroundTasks` is for short post-response work; use Celery or ARQ for work taking minutes or longer
- Dependency injection (`Depends`) handles auth, DB sessions, and shared config across routes
- Anthropic 529 status maps to HTTP 503 at the API boundary — always handle it explicitly
- Production deployment: Gunicorn + UvicornWorker for multiple worker processes
- SQLAlchemy 2.0 async engine requires `postgresql+asyncpg://` DSN prefix

## Common Failure Cases

**`StreamingResponse` generator is not async, causing the event loop to block during streaming**  
Why: `StreamingResponse` with a sync generator (`def generate()`) runs synchronously in the event loop, blocking all other requests during the entire stream duration; async generators (`async def generate()`) are required.  
Detect: all other requests queue behind a streaming response; response time for concurrent requests spikes to the full stream duration.  
Fix: always define the generator function with `async def generate(): ... yield ...` and use `await` inside for any I/O (including LLM streaming calls).

**`BackgroundTasks.add_task()` used for a long-running operation, causing the response to complete but the task to silently fail**  
Why: `BackgroundTasks` runs in the same process as the response; if the task takes longer than the server's connection timeout or raises an unhandled exception, it fails silently — no error is returned to the client.  
Detect: the response completes successfully but the expected side effect (Langfuse log, database write) never occurs; adding `try/except` to the background task reveals an exception.  
Fix: add explicit exception handling in background tasks; use Celery or ARQ for tasks that can fail in ways that need retrying; only use `BackgroundTasks` for fire-and-forget operations under 5 seconds.

**Pydantic `response_model` strips extra fields from the response without error, hiding bugs**  
Why: FastAPI uses `response_model` to validate and serialise the response; any extra fields in the returned object that are not in `response_model` are silently stripped; if the route handler returns the wrong structure, the client gets a valid-but-incomplete response.  
Detect: the client receives fewer fields than expected; comparing the route handler's return value to `response_model` shows discrepancies that FastAPI silently resolves.  
Fix: use `response_model_exclude_unset=True` and add assertions in development mode that the returned object matches the expected model; or use `model_config = ConfigDict(extra="forbid")` in the Pydantic model to raise on unexpected fields.

**Dependency injection creates a new database connection per request instead of per session when `yield` is not used**  
Why: a `get_db` dependency that does not use `yield` creates a session but never closes it; the session stays open for the lifetime of the process rather than the request, consuming connection pool slots.  
Detect: database connection count grows proportionally to requests; pool exhaustion under moderate load.  
Fix: always use `async def get_db() -> AsyncGenerator[AsyncSession, None]: yield session` with `try/finally` or `async with` to ensure the session is closed after each request.

## Connections

- [[python/ecosystem]] — async patterns (asyncio, httpx), Pydantic v2, packaging tools used with FastAPI
- [[web-frameworks/django]] — Django when you need ORM, admin, auth, or management commands out of the box
- [[web-frameworks/nextjs]] — the frontend that consumes a FastAPI backend via SSE or REST
- [[web-frameworks/vercel-ai-sdk]] — handles SSE stream parsing on the Next.js frontend side
- [[observability/platforms]] — adding Langfuse tracing to FastAPI endpoints via background tasks or middleware
- [[apis/anthropic-api]] — the Anthropic AsyncAnthropic client used in FastAPI route handlers

## Open Questions

- What is the performance ceiling of FastAPI + UvicornWorker for concurrent LLM streaming responses compared to a dedicated async queue?
- When does the overhead of Celery/ARQ become worth it versus FastAPI BackgroundTasks for post-response logging?
- How does FastAPI's dependency injection compare with Django DRF's permission classes for complex multi-tenant AI APIs?
