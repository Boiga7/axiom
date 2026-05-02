---
type: concept
category: protocols
para: resource
tags: [mcp, http, streamable-http, sse, transport, json-rpc, session, mcpindex]
tldr: Streamable HTTP (2025-03-26 spec) replaced the old SSE transport. One HTTP endpoint handles everything via POST (send) and GET (receive SSE). Stateless by default — scalable behind load balancers. SSE deprecated mid-2026.
sources: []
updated: 2026-05-01
---

# MCP HTTP Transport Deep Dive

> **TL;DR** Streamable HTTP (2025-03-26 spec) replaced the old SSE transport. One HTTP endpoint handles everything via POST (send) and GET (receive SSE). Stateless by default — scalable behind load balancers. SSE deprecated mid-2026.

Directly relevant to mcpindex Weekend 2. HTTP transport scanning and latency baselines.

## Key Facts
- Streamable HTTP introduced in MCP spec 2025-03-26; the old HTTP+SSE transport is deprecated and will be unsupported mid-2026
- All traffic is JSON-RPC 2.0 in UTF-8 encoding over a single HTTP endpoint (e.g., `/mcp`)
- POST: client sends messages; GET: client opens SSE stream for server-initiated messages
- Server upgrades to SSE only when streaming is needed — single-message responses return plain JSON
- Stateless operation is native: can run behind load balancers with no sticky sessions required
- Session management is optional: `Mcp-Session-Id` header used if the server issues sessions
- SSE keep-alive: server sends `: keep-alive` comments on the GET stream to maintain the connection

## Why Streamable HTTP Replaced SSE

The original HTTP+SSE transport (2024-11-05 spec) had structural problems:
- Required two separate endpoints: one for POST (client→server), one for SSE (server→client)
- SSE connections are persistent — hostile to load balancers, serverless, and firewalls that close idle connections
- No stateless operation path — every request needed to reach the same backend instance

Streamable HTTP fixes all of these: one endpoint, stateless by default, SSE used only when genuinely needed.

## The Single Endpoint Contract

All MCP traffic flows through one path (conventionally `/mcp`):

| Method | Purpose | Request headers | Response |
|---|---|---|---|
| POST | Send JSON-RPC messages | `Content-Type: application/json`, `Accept: application/json, text/event-stream` | JSON (single response) or SSE (streaming) |
| GET | Open SSE stream for server-initiated notifications | `Accept: text/event-stream` | SSE stream |
| DELETE | Terminate a session (optional) | `Mcp-Session-Id: <id>` | 200 or 405 if not supported |

## Connection Lifecycle

### Initialization (no session)

```
Client                          Server
  │                               │
  │── POST /mcp ──────────────────►│  {"jsonrpc":"2.0","id":1,"method":"initialize",...}
  │◄── 200 JSON ───────────────────│  {"result":{"protocolVersion":"2025-03-26",...}}
  │                               │
  │── POST /mcp ──────────────────►│  {"jsonrpc":"2.0","method":"notifications/initialized"}
  │◄── 202 ────────────────────────│  (notification acknowledgement, no body)
```

### Initialization (with session)

```
Client                          Server
  │── POST /mcp ──────────────────►│  initialize request
  │◄── 200 JSON ───────────────────│  response + Mcp-Session-Id: abc123
  │                               │
  │── POST /mcp ──────────────────►│  (subsequent requests include Mcp-Session-Id: abc123)
```

If the server issues a session ID, the client MUST include it in all subsequent requests. If the server terminates a session (returns 404 on session ID), the client re-initializes.

### Tool Call (non-streaming response)

```
Client                          Server
  │── POST /mcp ──────────────────►│  {"jsonrpc":"2.0","id":2,"method":"tools/call","params":{...}}
  │                               │  (server processes tool synchronously)
  │◄── 200 application/json ───────│  {"jsonrpc":"2.0","id":2,"result":{"content":[...]}}
```

Server returns `Content-Type: application/json` for single-message responses. No SSE upgrade needed.

### Tool Call (streaming response)

```
Client                          Server
  │── POST /mcp ──────────────────►│  tools/call (includes Accept: text/event-stream)
  │◄── 200 text/event-stream ──────│  Server upgrades to SSE
  │                               │
  │◄── data: {"jsonrpc":"2.0"... ──│  progress notification 1
  │◄── data: {"jsonrpc":"2.0"... ──│  progress notification 2
  │◄── data: {"jsonrpc":"2.0"... ──│  final result
  │◄── event: close ───────────────│  stream ends
```

The client indicates willingness to receive SSE by including `text/event-stream` in the Accept header. If the server needs to send multiple messages (progress + result), it upgrades to SSE even if the client didn't request it.

### Server-Initiated Notifications (GET stream)

```
Client                          Server
  │── GET /mcp ───────────────────►│  Accept: text/event-stream
  │◄── 200 text/event-stream ──────│
  │◄── : keep-alive ───────────────│  (periodic keep-alive comment, no data)
  │◄── data: {"jsonrpc":"2.0"... ──│  server pushes notification
  │◄── : keep-alive ───────────────│
```

The GET stream is for server-initiated messages. Things the server wants to send without being asked. Clients that don't need server push don't need to open a GET stream.

## SSE Format

MCP uses standard Server-Sent Events format:

```
data: {"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"hello"}]}}

: keep-alive

data: {"jsonrpc":"2.0","method":"notifications/progress","params":{"progressToken":1,"progress":50}}

event: close
data: {}
```

Rules:
- Each message is a `data:` line followed by a blank line
- Keep-alive: `: keep-alive` (comment line, no `data:`)
- Stream termination: `event: close` followed by `data: {}`
- Multiple `data:` lines before a blank line = multi-line message (rare in practice)

## Multiplexing Tool Calls

Multiple tool calls can be in-flight simultaneously over the same HTTP connection. Each has a unique `id` in the JSON-RPC envelope:

```json
// Request 1 (in flight)
{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "search", "arguments": {...}}}

// Request 2 (in flight simultaneously)
{"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "read_file", "arguments": {...}}}
```

When responses arrive on the SSE stream, the client matches by `id`. This is standard JSON-RPC 2.0 behaviour. Multiplexing is built in.

## Stateless vs Stateful Deployment

| Mode | Server issues Mcp-Session-Id | When to use |
|---|---|---|
| Stateless | No | Serverless, load-balanced deployments, tools that don't need state between calls |
| Stateful | Yes | Servers that maintain per-client state (conversation history, open resources) |

For stateless mode: every POST is self-contained. Any server instance handles any request. Horizontally scalable with no configuration.

For stateful mode: the server uses the session ID as a key into its state store (Redis, Postgres). Requests with the same session ID may or may not need to reach the same instance depending on the state store.

## Python Implementation Reference

```python
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
import json
import asyncio

app = FastAPI()

@app.post("/mcp")
async def handle_post(request: Request):
    body = await request.json()
    accepts_sse = "text/event-stream" in request.headers.get("accept", "")
    session_id = request.headers.get("mcp-session-id")

    result = await dispatch_jsonrpc(body, session_id)

    if accepts_sse or result.get("_streaming"):
        return StreamingResponse(
            sse_generator(result),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )
    return JSONResponse(result)

async def sse_generator(result: dict):
    yield f"data: {json.dumps(result)}\n\n"
    yield ": keep-alive\n\n"  # keep the connection alive if needed

@app.get("/mcp")
async def handle_get(request: Request):
    """Server-initiated notification stream."""
    session_id = request.headers.get("mcp-session-id")
    
    async def notification_stream():
        while True:
            notification = await get_next_notification(session_id)
            if notification:
                yield f"data: {json.dumps(notification)}\n\n"
            else:
                yield ": keep-alive\n\n"
                await asyncio.sleep(30)

    return StreamingResponse(
        notification_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
```

## Security Considerations for HTTP Transport

Transport-level security matters more for HTTP than STDIO:

- **CORS**: configure explicit `Access-Control-Allow-Origin` — never `*` in production
- **DNS rebinding**: validate the `Host` header against expected server hostnames
- **TLS**: HTTPS required for any non-localhost deployment
- **Origin validation**: validate `Origin` header to prevent cross-origin requests

See [[security/mcp-cves]] for known HTTP transport attack vectors.

> [Source: MCP Specification 2025-03-26 — Transports]
> [Source: fka.dev — Why MCP Deprecated SSE, 2025]
> [Source: auth0.com — MCP Streamable HTTP Security, 2025]

## Common Failure Cases

**Nginx/Caddy terminates the SSE stream early with a 504 or 502 before the tool call completes**  
Why: reverse proxies have default upstream timeout settings (often 60s); a slow tool call that holds the SSE stream open longer than the proxy's read timeout causes the proxy to close the connection and return a 504 to the client.  
Detect: tool calls that complete in <60s succeed; those taking longer return `502 Bad Gateway` or `504 Gateway Timeout`; no error in the MCP server logs.  
Fix: set `proxy_read_timeout 300s;` (Nginx) or `timeout 5m` (Caddy) on the `/mcp` location; add `X-Accel-Buffering: no` response header to disable Nginx's SSE buffering.

**Client sends requests without `Mcp-Session-Id` to a stateful server, causing a new session to be created on every request**  
Why: if the client does not persist the session ID returned in the `initialize` response, each subsequent request initialises a new session; the server accumulates orphaned sessions and any per-session state is lost.  
Detect: server logs show a new session created on every tool call; the server's session count grows without bound; tool calls that depend on prior state return unexpected results.  
Fix: store the `Mcp-Session-Id` header from the `initialize` response and include it in all subsequent requests; implement session expiry on the server with a configurable TTL.

**CORS pre-flight rejects requests from a browser-based MCP client**  
Why: MCP HTTP transport running on `localhost:3000` accessed from a browser extension at a different origin triggers CORS; if `Access-Control-Allow-Origin` is not set correctly, the browser blocks all requests.  
Detect: browser DevTools shows `CORS error` on `OPTIONS /mcp`; the MCP server logs show no POST requests despite the client initiating them.  
Fix: add CORS headers to all responses including `OPTIONS`: `Access-Control-Allow-Origin: <allowed-origin>`, `Access-Control-Allow-Methods: GET, POST, DELETE`, `Access-Control-Allow-Headers: Content-Type, Mcp-Session-Id`; never set `*` in production.

**Multiplexed tool calls with the same JSON-RPC `id` cause responses to be routed to the wrong handler**  
Why: if the client reuses JSON-RPC `id` values across concurrent in-flight requests (e.g., always using `id: 1`), responses arriving out of order are matched to the wrong pending handler.  
Detect: tool call results appear in the wrong handler callback; one call's result is processed as another's response; errors occur only under concurrent load.  
Fix: use a monotonically incrementing counter or UUID for each JSON-RPC `id`; the id must be unique across all in-flight requests for the same connection.

## Connections
- [[protocols/mcp]] — full MCP spec overview (transports, tool schema, auth)
- [[security/mcp-cves]] — known CVEs, many involving transport-level issues
- [[security/oauth-boundary-testing]] — auth boundaries sit on top of this transport
- [[python/latency-benchmarking]] — how to benchmark this transport vs STDIO
- [[para/projects]] — mcpindex HTTP transport scanning

## Open Questions
- At what request rate does stateless HTTP transport become better than STDIO (which spawns a new process per scan)?
- Does mcpindex need to test both stateless and stateful server configurations in its scanning methodology?
