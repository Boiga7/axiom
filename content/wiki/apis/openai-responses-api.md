---
type: entity
category: apis
para: resource
tags: [openai, responses-api, agents, stateful, tools, mcp, built-in-tools]
sources: []
updated: 2026-05-03
tldr: OpenAI's stateful successor to Chat Completions (March 2025). Server-side conversation state via previous_response_id, built-in tools (web search, file search, code interpreter, MCP), and 40–80% better cache utilisation. Assistants API deprecated August 2025.
---

# OpenAI Responses API

> **TL;DR** OpenAI's stateful successor to Chat Completions (March 2025). Server-side conversation state via `previous_response_id`, built-in tools (web search, file search, code interpreter, remote MCP), and 40–80% better cache utilisation. Assistants API deprecated August 2025 — migrate by August 2026.

Launched March 2025. The Responses API unifies the simplicity of Chat Completions with the agentic capabilities that previously required the Assistants API. OpenAI's stated position: Responses is the recommended API for all new projects.

> [Source: OpenAI Developers Blog, developers.openai.com/blog/responses-api, 2026-05-03]

---

## API Landscape — The Three Surfaces

| API | State | Built-in tools | Use when |
|---|---|---|---|
| Chat Completions | Client-managed | None (function calling only) | Stateless apps, deterministic context control, existing integrations |
| **Responses API** | Server-side (`store: true`) | web_search, file_search, code_interpreter, computer_use, remote MCP | All new projects needing tools or multi-turn state |
| Assistants API | Server-side (Threads) | file_search, code_interpreter | **Deprecated** Aug 2025 — migrate by Aug 2026 |

Chat Completions remains supported with no planned deprecation. Responses API is the recommended default for new work.

---

## Core Concepts

### Server-side state with `store: true`

```python
from openai import OpenAI

client = OpenAI()

# Turn 1 — store response on OpenAI's servers
response = client.responses.create(
    model="gpt-4o",
    store=True,
    input="Summarise the RLHF training process in 3 steps.",
)

response_id = response.id  # store this
```

### Multi-turn with `previous_response_id`

```python
# Turn 2 — pass only the new message; history is retrieved server-side
followup = client.responses.create(
    model="gpt-4o",
    store=True,
    previous_response_id=response_id,   # links to turn 1
    input="Now explain how DPO replaces step 2.",
)
```

No need to replay the full message history. OpenAI fetches the stored context, including any reasoning traces from o-series models.

---

## Built-in Tools

### Web Search

```python
response = client.responses.create(
    model="gpt-4o",
    tools=[{"type": "web_search_preview"}],
    input="What were the key announcements at Google I/O 2026?",
)
```

Model searches in real time and returns citations inline. Use `web_search_preview` — [unverified whether this is the stable tool name vs `web_search`].

### File Search

```python
# Upload files first and create a vector store via the Files API
response = client.responses.create(
    model="gpt-4o",
    tools=[{
        "type": "file_search",
        "vector_store_ids": ["vs_abc123"],
    }],
    input="What does our internal runbook say about handling OOM kills?",
)
```

Semantic + keyword retrieval over uploaded files. The underlying mechanism is the same vector store as the Assistants API — migration is straightforward.

### Code Interpreter

```python
response = client.responses.create(
    model="gpt-4o",
    tools=[{"type": "code_interpreter"}],
    input="Read the attached CSV and plot revenue by month. Return the chart as a PNG.",
)
```

Runs Python in a sandboxed environment. Supports data analysis, charting, mathematical computation, file generation.

### Remote MCP Servers

```python
response = client.responses.create(
    model="gpt-4o",
    tools=[{
        "type": "mcp",
        "server_label": "github",
        "server_url": "https://mcp.github.com/",
        "allowed_tools": ["create_issue", "list_pull_requests"],  # limit scope
    }],
    input="Open a GitHub issue titled 'Fix CORS headers on /api/v2/users'",
)
```

Any remote MCP server over HTTP. Use `allowed_tools` to limit which tools the model can call — reduces token overhead and narrows decision space.

---

## Mixing Tools in a Single Request

The model handles the agentic loop internally — it can call multiple tools sequentially within one API call before returning a final answer.

```python
response = client.responses.create(
    model="gpt-4o",
    store=True,
    tools=[
        {"type": "web_search_preview"},
        {"type": "file_search", "vector_store_ids": ["vs_abc123"]},
    ],
    input="Compare the latest public benchmark scores for GPT-4.1 with what our internal eval results say.",
)
# Model searches the web, then queries the vector store, then synthesises
```

---

## Streaming

```python
with client.responses.stream(
    model="gpt-4o",
    store=True,
    tools=[{"type": "web_search_preview"}],
    input="Summarise the latest MCP security CVEs.",
) as stream:
    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="", flush=True)
```

Events: `response.created`, `response.output_text.delta`, `response.completed`, `response.failed`.

---

## Migrating from Chat Completions

| Chat Completions | Responses API |
|---|---|
| `client.chat.completions.create(messages=[...])` | `client.responses.create(input=[...])` |
| Manage `messages` array manually | Pass `previous_response_id` on subsequent turns |
| `tools=[{"type": "function", ...}]` | Same, plus built-in tool types |
| No server-side state | `store=True` to persist |
| Response in `response.choices[0].message.content` | Response in `response.output_text` |

Chat Completions users with no need for server-side state or built-in tools can stay on Chat Completions indefinitely. Responses is additive, not a forced migration.

---

## Migrating from Assistants API

The Assistants API is deprecated as of August 26, 2025. Removal: August 26, 2026.

| Assistants Concept | Responses Equivalent |
|---|---|
| Thread | Chain of `previous_response_id` values |
| Assistant (persistent config) | System prompt in each request (or stored via `store`) |
| Run | Single `responses.create()` call |
| Thread messages | `input` field per turn |
| file_search tool | `{"type": "file_search", "vector_store_ids": [...]}` — same vector stores |
| code_interpreter tool | `{"type": "code_interpreter"}` — same capability |

Vector store IDs are portable between APIs — no re-upload needed.

---

## Cost and Cache

- 40–80% improvement in cache hit rates vs Chat Completions (OpenAI internal tests) [unverified — reported in the Responses API announcement]
- Server-side state means OpenAI can cache reasoning traces and prior turns more effectively
- `store=True` has a storage cost; stored responses are retained for 30 days by default [unverified — retention policy may differ by plan]

---

## Relationship to the OpenAI Agents SDK

The [[agents/openai-agents-sdk]] wraps the Responses API. `Agent` → `Runner.run()` internally calls `client.responses.create()` with tools and `previous_response_id` managed automatically. Use the raw Responses API when you need fine-grained control; use the Agents SDK when you want the orchestration layer handled.

---

## Common Failure Cases

**`previous_response_id` returns 404 after 30 days**
Why: stored responses expire. If you cache `response.id` in a database and reuse it weeks later, the server-side context is gone.
Detect: `404 NotFoundError` on a `responses.create()` with `previous_response_id`.
Fix: treat a 404 as a session restart — rebuild context from your own conversation log and start a new chain without `previous_response_id`.

**Model calls wrong MCP tool because `allowed_tools` not set**
Why: without `allowed_tools`, the model sees every tool the MCP server exposes; in servers with 20+ tools, the model often picks a similar-sounding but incorrect one.
Detect: tool call in the response uses an unintended tool name.
Fix: always set `allowed_tools` to the minimal set the request actually needs.

**Streaming drops events when tools are executing**
Why: during tool execution (web search, code interpreter), the model emits no `output_text.delta` events — only a `tool_call` event followed by a pause, then more deltas. Consumers expecting continuous deltas may time out.
Detect: streaming consumer reports "no data" for several seconds mid-response.
Fix: handle `response.tool_call.created` and `response.tool_call.completed` events; show a "searching..." indicator to the user during the gap.

---

## Connections

- [[apis/openai-api]] — Chat Completions, function calling, embeddings — the stable stateless surface
- [[agents/openai-agents-sdk]] — high-level SDK that orchestrates Responses API calls
- [[protocols/mcp]] — the protocol behind remote MCP tool integration
- [[apis/anthropic-api]] — compare with Anthropic's tool use and prompt caching patterns
- [[observability/tracing]] — trace Responses API calls with OpenTelemetry or LangSmith

## Open Questions

- What is the exact retention period for `store=True` responses, and can it be extended?
- Does `store=True` incur per-response storage fees, or is storage included in the base token cost?
- Are reasoning traces from o3/o4 models accessible via the stored response, or only the final output?
