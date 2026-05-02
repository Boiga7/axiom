---
type: entity
category: observability
para: resource
tags: [helicone, observability, llm-monitoring, ai-gateway, caching, open-source]
sources: []
updated: 2026-05-01
tldr: Open-source LLM observability platform and AI gateway. One-line integration. Combines monitoring, tracing, prompt management, semantic caching, and multi-provider routing in a single proxy layer.
---

# Helicone

Open-source LLM observability platform and AI gateway. One-line integration. Combines monitoring, tracing, prompt management, semantic caching, and multi-provider routing in a single proxy layer. YC W23. SOC 2 + GDPR compliant.

See [[observability/platforms]] for a comparison of Helicone, Langfuse, LangSmith, and Arize Phoenix.

---

## What It Does

Helicone sits between your application and any LLM provider. Every request passes through Helicone, which logs it, applies caching, and routes it. No code changes beyond the base URL.

```python
from openai import OpenAI

# Before: direct to OpenAI
client = OpenAI(api_key="sk-...")

# After: route through Helicone (one line change)
client = OpenAI(
    api_key="sk-...",
    base_url="https://oai.helicone.ai/v1",
    default_headers={"Helicone-Auth": "Bearer sk-helicone-..."},
)
```

Works identically for Anthropic, Azure OpenAI, Google AI, and 100+ other providers.

---

## Core Features

### Monitoring and Tracing

- Traces and sessions for agents, chatbots, and pipelines
- Per-request metrics: cost, latency, token count, error rate
- p50/p95/p99 latency dashboards
- Filter by model, user, session, custom properties

```python
# Tag requests for filtering
headers = {
    "Helicone-Auth": "Bearer sk-helicone-...",
    "Helicone-User-Id": "user-123",
    "Helicone-Session-Id": "session-abc",
    "Helicone-Property-Environment": "production",
}
```

### Semantic Caching

Caches responses for semantically similar queries. Not just exact matches. Returns cached results for queries that mean the same thing even if worded differently.

```python
headers = {
    "Helicone-Auth": "Bearer sk-helicone-...",
    "Helicone-Cache-Enabled": "true",
    "Helicone-Cache-Bucket-Max-Size": "20",   # cache up to 20 similar responses
}
```

Typical savings: 20–30% cost reduction on FAQ bots and applications with repetitive queries.

### AI Gateway — Routing and Fallback

```python
# Automatic fallback if primary model fails
headers = {
    "Helicone-Auth": "Bearer sk-helicone-...",
    "Helicone-Fallbacks": json.dumps([
        {"provider": "openai", "model": "gpt-4o"},
        {"provider": "anthropic", "model": "claude-sonnet-4-6"},
    ]),
}
```

Handles load balancing across multiple API keys and automatic retry on rate limits.

### Prompt Management

Version and deploy prompts without code changes. Production prompt versions are managed in the Helicone UI and served via the gateway. No redeploy needed to update a prompt.

---

## Self-Hosting

```bash
git clone https://github.com/Helicone/helicone
docker compose up
```

Full self-hosted option available. The gateway and dashboard run in Docker. Data stays in your infrastructure.

---

## vs Other Platforms

| | Helicone | Langfuse | LangSmith |
|--|----------|----------|-----------|
| Primary strength | Gateway + caching + monitoring | Open-source tracing + evals | LangChain-native tracing |
| Self-host | Yes | Yes (best option) | Partial |
| Semantic caching | Yes | No | No |
| Multi-provider routing | Yes (100+ providers) | No | No |
| Integration effort | Minimal (base URL swap) | SDK/decorator | SDK |
| Open-source | Yes (Apache 2.0) | Yes (MIT) | Partial |

Helicone is the best choice when you want a quick drop-in that adds caching + routing + monitoring with minimal code changes. Langfuse wins for deep tracing and eval workflows. LangSmith wins if you're all-in on LangChain.

---

## Common Failure Cases

**Semantic cache returns a stale cached response after the underlying data changed**  
Why: Helicone's semantic cache has no automatic invalidation; a query cached before your knowledge base was updated returns the old answer even though the correct answer changed.  
Detect: users receive outdated information; the `Helicone-Cache-Hit` response header is `true` for a query that should have fetched fresh data.  
Fix: disable semantic caching for queries that must always reflect live data via `"Helicone-Cache-Enabled": "false"` on those requests; or use a short TTL by setting `Helicone-Cache-Bucket-Max-Size` to a small value and accepting lower cache hit rates.

**All requests blocked when Helicone gateway has an outage**  
Why: routing all traffic through a single proxy creates a single point of failure; if Helicone's cloud gateway is down, every LLM call fails even though the underlying providers are healthy.  
Detect: all LLM calls return connection errors; direct provider calls succeed; Helicone status page shows an incident.  
Fix: implement a circuit-breaker that falls back to direct provider calls when the Helicone proxy returns 5xx errors; or self-host the gateway to control availability.

**`Helicone-User-Id` header not set, making per-user cost attribution impossible in the dashboard**  
Why: without the `Helicone-User-Id` header, all requests are grouped under an anonymous bucket; cost and latency dashboards cannot be broken down by user.  
Detect: the Helicone dashboard shows no user breakdown; all requests attributed to a single unnamed group.  
Fix: inject `Helicone-User-Id` with the authenticated user's ID in every request; do this at the HTTP client constructor level so it applies globally rather than per-call.

**Prompt version rollback causes cache hits to return responses from the old prompt**  
Why: semantic caching keys on the query text; if the system prompt changed but the user query is similar to a cached query, the old response is returned even with the new prompt.  
Detect: after a prompt deployment, some responses still reflect the old prompt behaviour; `Helicone-Cache-Hit: true` on those requests.  
Fix: use `Helicone-Cache-Seed` with a version identifier tied to your prompt version; changing the seed invalidates all existing cache entries for that prompt version.

## Connections

- [[observability/platforms]] — full platform comparison including Helicone, Langfuse, LangSmith, Arize Phoenix
- [[observability/tracing]] — OTel tracing concepts; Helicone exports compatible traces
- [[infra/caching]] — Helicone semantic caching vs Redis-based approaches
- [[synthesis/cost-optimisation]] — semantic caching as cost lever
