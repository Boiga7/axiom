---
type: entity
category: observability
para: resource
tags: [langfuse, observability, tracing, llm-monitoring, open-source, self-hosted]
sources: []
updated: 2026-05-01
tldr: Open-source LLM observability platform. The standard self-hosted choice for teams that want full data ownership.
---

# Langfuse

Open-source LLM observability platform. The standard self-hosted choice for teams that want full data ownership. MIT-licensed since June 2025; acquired by ClickHouse in January 2026 (now uses ClickHouse as the backend for high-scale trace storage).

**Use when:** you want production-grade LLM tracing, eval tracking, and prompt management without sending data to a third party.

---

## What It Gives You

- **Traces and spans** — every LLM call, retrieval step, and agent action as a tree structure
- **Cost tracking** — token usage and estimated cost per trace, user, and session
- **Latency monitoring** — p50/p95/p99 per model, per prompt version
- **Eval framework** — attach scores to traces (model-based or human annotation)
- **Prompt management** — versioned prompt registry; pull prompts at runtime
- **Dataset management** — store golden test cases; run evals against new model versions

---

## Integration — Python SDK

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    host="https://cloud.langfuse.com",   # or your self-hosted URL
)

# Decorator approach — simplest integration
@observe()
async def chat(user_message: str) -> str:
    response = await anthropic_client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text

# The @observe decorator automatically:
# - Creates a trace for each call
# - Records input, output, latency
# - Tracks token usage from the Anthropic response
```

---

## Manual Tracing — Full Control

```python
from langfuse import Langfuse

langfuse = Langfuse()

def rag_pipeline(query: str, user_id: str) -> str:
    trace = langfuse.trace(
        name="rag-query",
        user_id=user_id,
        input={"query": query},
        metadata={"version": "v2.1"},
    )

    # Span: retrieval step
    retrieval_span = trace.span(name="retrieval")
    chunks = retrieve_chunks(query)
    retrieval_span.end(output={"n_chunks": len(chunks), "chunks": chunks[:2]})

    # Generation span
    gen_span = trace.span(name="generation")
    answer = generate_answer(query, chunks)
    gen_span.end(output={"answer": answer})

    # Score the trace programmatically
    trace.score(name="has_sources", value=1 if "[1]" in answer else 0)

    trace.update(output={"answer": answer})
    langfuse.flush()
    return answer
```

---

## LLM-as-Judge Evaluation

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Fetch recent traces for evaluation
traces = langfuse.fetch_traces(
    name="rag-query",
    from_timestamp=datetime(2026, 5, 1),
    limit=100,
).data

for trace in traces:
    # Run LLM judge
    score = evaluate_faithfulness(
        query=trace.input["query"],
        answer=trace.output["answer"],
        chunks=trace.input.get("chunks", []),
    )

    # Attach score to trace
    langfuse.score(
        trace_id=trace.id,
        name="faithfulness",
        value=score,        # float 0-1
        comment="GPT-4o judge",
    )
```

---

## Prompt Management

```python
from langfuse import Langfuse

langfuse = Langfuse()

# Pull prompt from registry (versioned, cached)
prompt = langfuse.get_prompt("rag-answer-prompt", version=3)

# Compile with variables
compiled = prompt.compile(context=chunks, query=query)

response = anthropic_client.messages.create(
    model="claude-sonnet-4-6",
    messages=[{"role": "user", "content": compiled}],
)

# Link the LLM generation to the prompt version in the trace
# (happens automatically when using the Langfuse SDK wrapper)
```

---

## FastAPI Integration — Automatic Tracing

```python
from langfuse.decorators import observe

@app.post("/chat")
@observe(name="chat-endpoint")
async def chat_endpoint(request: ChatRequest):
    langfuse_context.update_current_trace(
        user_id=request.user_id,
        session_id=request.session_id,
        metadata={"model": "claude-sonnet-4-6"},
    )
    return {"response": await generate_response(request.message)}
```

---

## Self-Hosting

```yaml
# docker-compose.yml
services:
  langfuse-server:
    image: langfuse/langfuse:latest
    environment:
      DATABASE_URL: postgresql://langfuse:langfuse@postgres:5432/langfuse
      NEXTAUTH_SECRET: your-secret
      SALT: your-salt
    ports:
      - "3000:3000"

  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: langfuse
      POSTGRES_DB: langfuse
```

Post-acquisition by ClickHouse (Jan 2026): high-volume deployments can replace Postgres with ClickHouse for dramatically better query performance on trace data.

---

## Key Facts

- Open-source (MIT since June 2025); acquired by ClickHouse Jan 2026
- Alternatives: LangSmith (best if all-in on LangChain), Arize Phoenix (best for ML+LLM unified), Helicone (simplest integration)
- Self-hosted: Docker Compose + Postgres (or ClickHouse for scale)
- SDK: `pip install langfuse`; supports Python + TypeScript
- OpenTelemetry: Langfuse accepts OTel traces (OTLP exporter) — works with any instrumented framework

---

## Connections

[[observability/platforms]] · [[observability/tracing]] · [[observability/helicone]] · [[evals/methodology]] · [[rag/pipeline]] · [[web-frameworks/fastapi]]
