---
type: concept
category: cs-fundamentals
para: resource
tags: [networking, http, https, rest, dns, tcp, websockets, status-codes, headers, tls]
tldr: Networking fundamentals for software engineers — HTTP/HTTPS, DNS, TCP/IP, status codes, headers, WebSockets, and how the web actually works.
sources: []
updated: 2026-05-01
---

# Networking

> **TL;DR** Networking fundamentals for software engineers — HTTP/HTTPS, DNS, TCP/IP, status codes, headers, WebSockets, and how the web actually works.

## What Happens When You Open a URL

Understanding this sequence unlocks most networking concepts:

1. **DNS resolution** — browser asks a DNS resolver to convert `api.anthropic.com` to an IP address (`204.16.xxx.xxx`)
2. **TCP handshake** — browser and server establish a connection (SYN → SYN-ACK → ACK)
3. **TLS handshake** — for HTTPS, negotiate encryption (certificate exchange, key agreement)
4. **HTTP request** — browser sends a GET request with headers
5. **Server processes request** — runs application code, queries database, etc.
6. **HTTP response** — server sends back status code, headers, and body
7. **Browser renders** — parses HTML, loads CSS/JS/images (triggering more HTTP requests)

---

## TCP/IP Model

| Layer | What it does | Protocol examples |
|---|---|---|
| Application | What data means | HTTP, HTTPS, DNS, SMTP, FTP |
| Transport | End-to-end delivery | TCP (reliable), UDP (fast, unreliable) |
| Internet | Routing across networks | IP (IPv4, IPv6) |
| Network Access | Physical transmission | Ethernet, Wi-Fi |

**TCP vs UDP:**
- **TCP:** guaranteed delivery, ordered, error-checked. Used for HTTP, SMTP, FTP. Slower due to acknowledgements.
- **UDP:** no delivery guarantee, no ordering. Used for DNS, video streaming, gaming. Faster, lower overhead.

---

## DNS (Domain Name System)

Translates human-readable names to IP addresses.

```
Browser asks: "What's the IP for api.anthropic.com?"

1. Check local cache → not found
2. Ask recursive resolver (your ISP or 8.8.8.8)
3. Resolver asks root nameserver → "ask .com TLD server"
4. TLD server → "ask anthropic.com nameserver"
5. anthropic.com nameserver → "204.16.x.x" (the A record)
6. Result cached for TTL duration (e.g., 300 seconds)
```

**DNS record types:**

| Record | Purpose | Example |
|---|---|---|
| A | Domain → IPv4 address | `api.example.com → 1.2.3.4` |
| AAAA | Domain → IPv6 address | `api.example.com → 2001:db8::1` |
| CNAME | Domain → another domain | `www.example.com → example.com` |
| MX | Mail server for domain | `example.com → mail.example.com` |
| TXT | Arbitrary text (SPF, DKIM, verification) | `"v=spf1 include:..."` |

**AI relevance:** when deploying an AI API, you set A records to point your domain to your server's IP. CDNs use CNAME records to route traffic through their edge network.

---

## HTTP

Stateless request-response protocol. Every request is independent.

### HTTP Methods

| Method | Purpose | Idempotent? | Safe? |
|---|---|---|---|
| GET | Retrieve resource | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Partial update | No | No |
| DELETE | Delete resource | Yes | No |
| HEAD | Like GET but no body | Yes | Yes |

**Idempotent:** calling the same request multiple times produces the same result. Safe: doesn't modify data.

### HTTP Status Codes

| Range | Meaning | Common examples |
|---|---|---|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirect | 301 Moved Permanently, 302 Found, 304 Not Modified |
| 4xx | Client error | 400 Bad Request, 401 Unauthorised, 403 Forbidden, 404 Not Found, 422 Unprocessable, 429 Too Many Requests |
| 5xx | Server error | 500 Internal Server Error, 502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout |

**For AI APIs:** 429 (rate limit) and 529 (overloaded — Anthropic-specific) are the most common errors to handle. Always implement exponential backoff with jitter for retries.

### HTTP Headers

```http
-- Request headers
GET /v1/messages HTTP/1.1
Host: api.anthropic.com
Authorization: Bearer sk-ant-...
Content-Type: application/json
Accept: application/json
User-Agent: my-app/1.0

-- Response headers
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 1234
Cache-Control: no-cache
X-Request-Id: req_01abc...
```

**Key headers:**

| Header | Purpose |
|---|---|
| `Authorization` | API keys, JWT tokens, Bearer tokens |
| `Content-Type` | Format of the request body (`application/json`) |
| `Accept` | Formats the client can handle |
| `Cache-Control` | Caching directives (`no-cache`, `max-age=3600`) |
| `X-RateLimit-*` | Rate limit information from APIs |
| `CORS` headers | `Access-Control-Allow-Origin` — controls browser cross-origin access |

---

## HTTPS and TLS

HTTPS = HTTP + TLS (Transport Layer Security). Encrypts data in transit so it can't be read by anyone between client and server.

**TLS handshake (simplified):**
1. Client sends supported cipher suites and TLS version
2. Server sends its certificate (contains public key, signed by a CA)
3. Client verifies the certificate against trusted Certificate Authorities
4. Both sides derive a shared symmetric session key
5. Encrypted communication begins

**Why it matters:**
- Without HTTPS, API keys sent in `Authorization` headers are visible on the network
- Certificate validation prevents man-in-the-middle attacks
- Always use HTTPS for any API call, especially to LLM providers

---

## REST API Design

REST (Representational State Transfer) is a set of constraints for building scalable web APIs over HTTP.

```
GET    /users          — list all users
POST   /users          — create a user
GET    /users/{id}     — get a specific user
PUT    /users/{id}     — replace a user
PATCH  /users/{id}     — partially update a user
DELETE /users/{id}     — delete a user

GET    /users/{id}/orders   — nested resource
POST   /users/{id}/orders   — create an order for a user
```

**Key principles:**
- URLs are nouns (resources), not verbs (`/users`, not `/getUsers`)
- Use HTTP methods to express the action
- Stateless — no session state on the server
- Return appropriate status codes (201 on create, 404 on missing resource)
- Version the API (`/v1/`, `/v2/`) to avoid breaking clients

---

## WebSockets

Persistent bidirectional connection over a single TCP connection. Unlike HTTP, the server can push data to the client at any time.

```
HTTP:       Client → Request → Server → Response (connection closes)
WebSocket:  Client → Upgrade → Server (connection stays open)
            Server → push data → Client (at any time)
            Client → message → Server (at any time)
```

**Use when:** real-time features — chat, live notifications, collaborative editing, streaming LLM responses (though SSE is simpler for server-only push).

```python
# FastAPI WebSocket example
from fastapi import WebSocket

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        await websocket.send_text(f"Echo: {data}")
```

---

## Server-Sent Events (SSE)

One-way: server pushes data to client over a regular HTTP connection. Simpler than WebSockets for streaming.

```
Client → GET /stream (long-lived connection)
Server → data: {"token": "Hello"}\n\n
Server → data: {"token": " world"}\n\n
Server → data: [DONE]\n\n
```

**This is how LLM streaming works.** Anthropic's streaming API, OpenAI's streaming API — all SSE. Each token is a separate event. The client reads them as they arrive and appends to the UI.

```python
# Client-side SSE consumption with httpx
import httpx

async with httpx.AsyncClient() as client:
    async with client.stream("POST", "https://api.anthropic.com/v1/messages",
                             headers=headers, json={**payload, "stream": True}) as r:
        async for line in r.aiter_lines():
            if line.startswith("data: "):
                event = json.loads(line[6:])
                print(event["delta"]["text"], end="", flush=True)
```

---

## Latency and Performance

```
DNS lookup:           ~10-100ms (first time; 0ms when cached)
TCP handshake:        ~10-50ms (same region)
TLS handshake:        ~50-100ms (adds ~1 RTT)
Time to first byte:   server processing + network
Content download:     depends on payload size and bandwidth

Anthropic API typical latency:
  claude-haiku-4-5:    p50 ~1s, p95 ~3s
  claude-sonnet-4-6:   p50 ~2s, p95 ~6s
  claude-opus-4-7:     p50 ~5s, p95 ~15s
```

**Reducing latency:**
- Use connection pooling — don't create a new TCP+TLS connection per request
- Keep HTTP connections alive (`Connection: keep-alive`)
- Use HTTP/2 — multiplexes multiple requests over one connection
- Cache DNS results and TLS sessions
- Deploy closer to your users (edge, CDN, regional endpoints)

---

## CORS (Cross-Origin Resource Sharing)

Browsers block JavaScript from making requests to a different domain than the page it's on — unless the server explicitly allows it via CORS headers.

```python
# FastAPI CORS setup
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],   # not "*" in production
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
```

**Only matters for browser-to-API calls.** Server-to-server calls (your backend calling Anthropic's API) are not subject to CORS.

## Connections

- [[cs-fundamentals/system-design]] — networks are the transport layer between components in a distributed system
- [[cs-fundamentals/git]] — git push/pull uses HTTPS or SSH
- [[protocols/mcp]] — MCP uses HTTP transport; understanding HTTP headers and SSE is essential
- [[protocols/mcp-http-transport]] — Streamable HTTP lifecycle relies on SSE for streaming
- [[apis/anthropic-api]] — streaming responses use SSE; rate limit headers (429) need exponential backoff
- [[web-frameworks/fastapi]] — FastAPI serves HTTP; understanding the protocol makes middleware and routing clearer
