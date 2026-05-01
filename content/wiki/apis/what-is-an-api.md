---
type: concept
category: apis
tags: [api, http, rest, json, request, response, authentication, fundamentals]
sources: []
updated: 2026-05-01
para: resource
tldr: An API is a contract that lets two pieces of software talk to each other without knowing each other's internals — you send a structured request, you get a structured response back.
---

# What is an API?

An API (Application Programming Interface) is a contract that lets two pieces of software talk to each other. You don't need to know how the other system works internally — you just need to know what to send and what you'll get back.

When you call Claude, you're using an API. You send a request (your prompt, model name, settings). The Anthropic servers process it and send a response (the generated text, token counts). You never see how Claude actually works — the API is the boundary.

---

## The Basic Pattern

Every API interaction follows the same shape:

```
You                       The API server
 │                              │
 │──── request ────────────────►│
 │     (what you want)          │  (does the work)
 │                              │
 │◄─── response ───────────────│
 │     (what you got back)      │
```

In web APIs (the kind you'll use for AI), requests and responses travel over HTTP — the same protocol your browser uses to load web pages.

---

## A Real Example

Calling the Anthropic API to generate text:

```python
import anthropic

client = anthropic.Anthropic(api_key="sk-ant-...")

# Request: tell the server what you want
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=100,
    messages=[{"role": "user", "content": "What is 2 + 2?"}]
)

# Response: what came back
print(response.content[0].text)  # "2 + 2 equals 4."
```

You sent a request with a model name and a message. The server processed it and sent back the generated text. You didn't need to know anything about how Claude works internally.

---

## HTTP Methods

Web APIs use HTTP verbs to signal intent:

| Method | Meaning | Example |
|---|---|---|
| **GET** | Read something | Fetch a list of your past conversations |
| **POST** | Create or trigger something | Send a message to Claude |
| **PUT** | Replace something | Update your settings |
| **DELETE** | Remove something | Delete a conversation |

Most AI API calls use POST — you're submitting data to trigger work.

---

## What Goes in a Request

**URL (endpoint):** Where to send the request.  
`https://api.anthropic.com/v1/messages`

**Headers:** Metadata about the request — who you are, what format you're sending.
```
Authorization: Bearer sk-ant-...
Content-Type: application/json
```

**Body:** The actual data, usually as JSON.
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "messages": [{"role": "user", "content": "Hello"}]
}
```

---

## What Comes Back

**Status code:** A number indicating success or failure.

| Code | Meaning |
|---|---|
| 200 | Success |
| 400 | Bad request (you sent something wrong) |
| 401 | Unauthorized (wrong or missing API key) |
| 429 | Rate limited (too many requests) |
| 500 | Server error (their problem, not yours) |

**Body:** The response data, again usually JSON.
```json
{
  "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
  "content": [{"type": "text", "text": "Hello! How can I help?"}],
  "usage": {"input_tokens": 10, "output_tokens": 8}
}
```

---

## API Keys

APIs need to know who you are — mostly so they can bill you and enforce rate limits. You prove identity with an **API key**: a long secret string that acts like a password for your account.

```python
# Never hard-code the key in your code
import os
client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
```

Keep API keys in environment variables, never in source code. If you commit a key to GitHub it will be found and abused within minutes.

---

## Rate Limits

APIs limit how fast you can call them — to protect their servers and ensure fair access. You'll see limits like:
- **Requests per minute (RPM)**: how many calls you can make per minute
- **Tokens per minute (TPM)**: total tokens (input + output) per minute

When you exceed a limit, you get a 429 error. The fix: wait and retry, or use exponential backoff:

```python
import time

for attempt in range(5):
    try:
        response = client.messages.create(...)
        break
    except anthropic.RateLimitError:
        time.sleep(2 ** attempt)  # wait 1s, 2s, 4s, 8s, 16s
```

---

## REST vs Other Styles

Most AI APIs are **REST** APIs — they use HTTP verbs and URLs to represent actions on resources. REST is the dominant style because it's simple and works everywhere.

You may also encounter:
- **GraphQL**: one endpoint, you specify exactly what data you want in the query (GitHub's API uses this)
- **gRPC**: binary protocol, much faster, used for service-to-service communication (see [[java/grpc]])
- **WebSockets**: persistent connection for real-time streaming (GPT-4o Realtime API uses this)

For LLM APIs, REST + Server-Sent Events (SSE) for streaming is the standard pattern.

---

## Key Facts

- API = contract between two pieces of software: defined request format, defined response format
- Web APIs travel over HTTP; most use JSON for request/response bodies
- Status codes: 2xx = success, 4xx = your error, 5xx = their error
- API keys authenticate you — treat them like passwords, store in environment variables
- Rate limits are per account; 429 means slow down; use exponential backoff
- REST is the dominant API style; most AI APIs are REST + SSE for streaming

## Connections

- [[apis/anthropic-api]] — the Anthropic Messages API in detail: caching, streaming, tool use
- [[java/grpc]] — gRPC: an alternative to REST for high-performance service-to-service calls
- [[python/async]] — async HTTP clients for calling APIs without blocking
- [[web-frameworks/fastapi]] — building your own API endpoints with Python
- [[security/owasp-llm-top10]] — API security concerns: key exposure, injection, rate limit bypass
