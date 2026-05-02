---
type: entity
category: apis
tags: [anthropic, api, claude, prompt-caching, batch-api, streaming, tool-use]
sources: []
updated: 2026-05-01
para: resource
tldr: The Anthropic Messages API covers prompt caching, batch processing, streaming, tool use, and extended thinking — the features that matter most for production cost and quality optimisation.
---

# Anthropic API

> **TL;DR** The Anthropic Messages API covers prompt caching, batch processing, streaming, tool use, and extended thinking — the features that matter most for production cost and quality optimisation.

The primary interface for all Claude models. REST API with Python and TypeScript SDKs. This page covers the features that matter most for production AI engineering.

> [Source: Perplexity research, 2026-04-29] [unverified]

---

## Messages API

The core endpoint. Every interaction is a list of `messages` with `role` (user/assistant) and `content`.

```python
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=1024,
    system="You are a senior software engineer.",
    messages=[{"role": "user", "content": "Explain KV cache."}]
)
print(response.content[0].text)
```

**Current models (April 2026):**
- `claude-opus-4-7` — most capable, highest cost
- `claude-sonnet-4-6` — balanced (this wiki runs on it)
- `claude-haiku-4-5-20251001` — fastest, cheapest

---

## Prompt Caching

The single highest-impact cost optimisation for repeat API calls. Marks a prefix of the prompt as cacheable; subsequent calls with the same prefix pay 0.1x the read cost.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": "<very long system prompt>",
            "cache_control": {"type": "ephemeral"}  # mark for caching
        }
    ],
    messages=[{"role": "user", "content": user_question}]
)
```

**Cache tiers:**

| TTL | Write cost | Read cost | When to use |
|---|---|---|---|
| 5 minutes (default) | 1.25x | 0.1x | Conversational loops, repeated queries |
| 1 hour (extended) | 2.0x | 0.1x | Long codebases, large documents |

**Workspace isolation** — as of February 5 2026, caches are isolated per workspace. Shared API keys cannot share caches across teams.

Minimum cacheable block: 1,024 tokens (Opus/Sonnet), 2,048 tokens (Haiku). Up to 4 cache breakpoints per request.

---

## Batch API

Asynchronous processing for large-scale workloads. 50% cost reduction. Up to 100,000 requests per batch.

```python
batch = client.messages.batches.create(
    requests=[
        {"custom_id": f"req-{i}", "params": {"model": "claude-haiku-4-5-20251001", ...}}
        for i in range(10_000)
    ]
)
# Poll or use webhook; 24-hour processing window
results = client.messages.batches.results(batch.id)
```

Requires the `anthropic-beta: message-batches-2024-09-24` header. Up to 300,000 output tokens per batch with the extended-output beta header.

**Use cases:** mass document processing, eval runs, synthetic data generation, nightly report generation.

---

## Streaming

Server-sent events (SSE) for token-by-token output. Essential for chat UIs and long-running generations.

```python
with client.messages.stream(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "..."}]
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
```

Events: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`. The `message_delta` event carries `usage` (input/output tokens) for billing.

---

## Tool Use

Claude can call tools declared in the `tools` array. The API returns a `tool_use` content block; the caller executes the tool and returns a `tool_result`.

```python
tools = [{
    "name": "get_weather",
    "description": "Get current weather for a location.",
    "input_schema": {
        "type": "object",
        "properties": {"location": {"type": "string"}},
        "required": ["location"]
    }
}]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    messages=[{"role": "user", "content": "What's the weather in London?"}]
)
```

**`tool_choice`** — `{"type": "auto"}` (default), `{"type": "any"}` (must use a tool), `{"type": "tool", "name": "specific_tool"}`.

**Parallel tool use** — Claude can call multiple tools in a single turn when they're independent. Check `response.content` for multiple `tool_use` blocks.

MCP tools integrate via [[protocols/mcp]] — the MCP client translates MCP tool schemas to the Anthropic tool format automatically.

---

## Extended Thinking

Deep reasoning mode. Claude produces a `thinking` content block before its final answer.

```python
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "Prove Fermat's Last Theorem."}]
)
```

`budget_tokens` is the max tokens Claude can spend reasoning. The thinking block does not count toward prompt caching. Do not use standard chain-of-thought prompting when extended thinking is enabled — they conflict. See [[prompting/techniques]] for when to use which.

---

## Files API

Upload files (PDFs, images, documents) once and reference by `file_id` across multiple requests. Avoids re-sending large base64 blobs on every call. Useful for document processing pipelines.

---

## Citations

When processing documents, Claude can return citations: which part of which document it drew each claim from. Requires passing source documents in a structured format. Generally available on Anthropic API and Vertex AI (launched January 2025).

---

## Rate Limits and Error Handling

| Error code | Meaning | Action |
|---|---|---|
| 529 | Overloaded | Exponential backoff, retry |
| 413 | Request too large | Truncate or chunk input |
| 429 | Rate limited | Respect `retry-after` header |
| 400 | Bad request | Fix request structure |

Both Python and TypeScript SDKs include automatic retry with backoff for 529 and 529 errors.

---

## SDK Patterns

**Python:**
```python
from anthropic import Anthropic, AsyncAnthropic
client = Anthropic()                   # sync
async_client = AsyncAnthropic()        # async (use with asyncio)
```

**TypeScript:**
```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();
```

---

## Cost Optimisation Checklist

1. Enable prompt caching for any system prompt > 1,024 tokens
2. Use Haiku for classification, routing, extraction — Opus only for deep reasoning
3. Batch all workloads that don't need real-time responses
4. Set `max_tokens` precisely — unused token budget costs nothing, but it's a good hygiene signal
5. Monitor token usage per call with [[observability/platforms]]
6. Hard-gate runaway agent loops (cost > $X → abort)

---

## Key Facts

- Prompt cache TTLs: 5 minutes (1.25x write, 0.1x read) and 1 hour (2.0x write, 0.1x read)
- Minimum cacheable block: 1,024 tokens for Opus/Sonnet; 2,048 tokens for Haiku
- Up to 4 cache breakpoints per request
- Cache workspace isolation added February 5, 2026 — shared API keys cannot share caches
- Batch API: 50% cost reduction, up to 100,000 requests, 24-hour processing window
- Extended thinking: `budget_tokens` controls reasoning spend; thinking block excluded from caching
- Error code 529 = overloaded; both SDKs retry with backoff automatically
- `tool_choice` options: `auto`, `any`, `{"type": "tool", "name": "..."}`

## Connections

- [[prompting/techniques]] — prompt patterns that get the most from Claude
- [[prompting/context-engineering]] — managing context window budget within API calls
- [[protocols/mcp]] — MCP tools integrate on top of the tool use API
- [[observability/platforms]] — tracing API calls for cost and latency
- [[evals/methodology]] — testing Claude integrations; eval-driven development
- [[synthesis/cost-optimisation]] — caching and batching as the top cost levers
- [[apis/google-ai]] — sibling provider API; comparison on caching, tool use, and pricing
- [[apis/aws-bedrock]] — Claude via AWS Bedrock; IAM auth, managed RAG, Guardrails; when to use Bedrock vs direct API
- [[apis/what-is-an-api]] — fundamentals: HTTP, REST, JSON, status codes, rate limits, API keys

## Open Questions

- What are the rate limits and document size caps for the citations API in production use?
- How does the extended-output beta header interact with prompt caching — does it affect cache key?
- What are the cross-workspace cache sharing options beyond workspace isolation for enterprise teams?
