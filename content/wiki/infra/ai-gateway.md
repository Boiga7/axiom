---
type: concept
category: infra
para: resource
tags: [ai-gateway, litellm, portkey, kong, openrouter, helicone, proxy, routing, semantic-caching, cost-optimisation]
sources: []
updated: 2026-05-03
tldr: "An AI gateway is a proxy layer between your application and LLM providers that centralises auth, routing, failover, caching, and observability — so your app code talks to one endpoint regardless of which provider is called."
---

# AI Gateway

> **TL;DR** An AI gateway is a proxy layer between your application and LLM providers that centralises auth, routing, failover, caching, and observability — so your app code talks to one endpoint regardless of which provider is called.

This page covers the category and compares the main options. For LiteLLM implementation detail, see [[infra/litellm]]. For difficulty-based model routing (cheap vs frontier models by query difficulty), see [[infra/model-routing]].

---

## What an AI Gateway Is

```
Application code
      |
      v
[ AI Gateway ]   ← single endpoint; handles auth, retries, caching, logging
      |
  +---+---+---+
  |       |   |
OpenAI  Claude  Bedrock  (any provider)
```

Your application issues standard LLM calls to the gateway. The gateway handles the concerns your app code should not need to care about:

- **Auth** — one API key to the gateway; the gateway holds provider credentials
- **Routing and failover** — if OpenAI is overloaded, fall back to Azure or Bedrock transparently
- **Semantic caching** — return a cached response for semantically equivalent queries; eliminates API calls entirely on hits; see [[infra/caching]]
- **Budget limits and cost attribution** — hard stops per team, per user, or per feature; tracked at the gateway layer
- **Observability** — logs every request with latency, token count, and cost before forwarding; feeds [[observability/platforms]]
- **Rate limiting** — protect downstream providers from runaway agent loops
- **Guardrails / PII filtering** — inspect and sanitise inputs and outputs before they reach the model

Without a gateway, each application service manages provider credentials, retry logic, fallback chains, and cost tracking independently. At team scale this becomes unmaintainable.

---

## Gateway vs Model Router

These are complementary layers, not alternatives:

| Concern | AI Gateway | Model Router |
|---|---|---|
| Auth and credential management | Yes | No |
| Retry and failover | Yes | No |
| Semantic caching | Yes | No |
| Observability and cost tracking | Yes | Partial |
| Route by query difficulty (cheap vs frontier) | No | Yes |
| Budget limits | Yes | No |
| Guardrails and PII filtering | Some | No |

A model router (see [[infra/model-routing]]) decides *which model tier* to call based on query difficulty. A gateway handles *how* that call is made — reliably, cheaply, and with full audit trail. In production they stack: the router picks the model; the gateway executes the call.

---

## Options

### LiteLLM

Open-source (MIT). Runs as a Python library (in-process) or a self-hosted proxy server (AI gateway mode). Provides a single OpenAI-compatible API endpoint across 100+ providers.

**Strengths:**
- Provider coverage is the best in class — Claude, OpenAI, Gemini, Bedrock, Mistral, HuggingFace, and more
- Model aliasing: clients use stable names like `gpt-4o`; the proxy maps them to actual deployments
- Router with retry, fallback, and load balancing across deployments of the same alias
- Virtual keys for team access control — each team/service gets its own key with its own spend limit
- Budget enforcement: hard-stop users or keys when spend limit is hit
- Integrates with Langfuse, LangSmith, Helicone for observability callbacks

**Weaknesses:**
- No native enterprise governance (RBAC, workspaces, approval workflows) out of the box
- Observability is callback-based — you need to wire up a separate tracing platform
- No built-in guardrails or PII filtering
- Setup requires YAML configuration and Docker knowledge; 15–30 minutes vs minutes for managed options

**Best for:** self-hosted infrastructure, cost-conscious teams, multi-tenant internal services, teams that already run their own infra.

See [[infra/litellm]] for implementation detail, proxy configuration, and common failure cases.

---

### Portkey

Open-source core, managed cloud option. Built for teams that need governance and compliance as first-class features rather than add-ons.

**Strengths:**
- Guardrails and PII filtering built into the gateway — 20+ PII categories, jailbreak detection, output validation
- Semantic caching built-in; up to 40% cost reduction [unverified]
- Prompt management with versioning and environment promotion from the UI
- RBAC, workspaces, and audit logs without additional tooling
- SOC 2 and ISO 27001 certified — relevant for regulated industries
- One-line integration (base URL swap) for the managed option; no infrastructure to run

**Weaknesses:**
- Managed option means data leaves your infrastructure (self-hosted option available but requires more ops)
- More opinionated than LiteLLM — you accept Portkey's governance model
- Enterprise features (SLA, dedicated support) are paid tier

**Best for:** regulated industries (fintech, healthcare), teams with compliance requirements, teams that want guardrails and PII filtering without building them.

---

### Kong AI Gateway

Kong's enterprise API gateway with an AI plugin layer. Sits in the Kong ecosystem (KongHQ) rather than being AI-first.

**Strengths:**
- Raw throughput: Kong benchmarks show 228% faster than Portkey and 859% faster than LiteLLM [unverified — figures from Kong's own benchmark]
- Full Kong plugin ecosystem: rate limiting, authentication, analytics, logging, mTLS
- MCP and A2A support added in v3.12 (October 2025) — see [[protocols/mcp]]
- RAG pipeline plugin (v3.10): automatic vector DB query to augment prompts on-the-fly
- PII sanitisation plugin: 20+ PII categories across 12 languages (v3.10)
- Multicloud: routes to OpenAI, Anthropic, GCP Gemini, AWS Bedrock, Azure AI, Mistral, HuggingFace

**Weaknesses:**
- Significant ops overhead: Kong requires its own cluster, database (Postgres or Cassandra), and operational expertise
- Overkill for teams not already running Kong
- AI features are plugins on top of a general API gateway, not purpose-built for LLM workflows
- Not open-source in the same sense as LiteLLM — Kong Gateway has a community edition but enterprise features require a licence

**Best for:** organisations already running Kong as their API gateway who want to extend it to LLM traffic; large enterprises with platform engineering teams who can absorb the operational overhead.

---

### OpenRouter

Hosted service (not self-hosted). Routes to 200+ models across providers via a single API key. You do not deploy OpenRouter — you call their API.

**What it is:**
- Sign up, get one API key, access every major model (OpenAI, Anthropic, Google, Meta, Mistral, and smaller open-source models)
- Model catalog updated continuously; includes models not available via direct API
- Cost-based and availability-based routing: sends your call to the cheapest available endpoint for the model you request

**Common misconception:** OpenRouter's "auto" routing is load-balancing across equivalent endpoints and availability routing, not difficulty-based routing. It does not analyse query complexity to pick a cheaper model for easy questions. For difficulty-based routing, see [[infra/model-routing]].

**Strengths:**
- Zero infrastructure — pure API service
- Instant access to models during prototyping without managing multiple provider accounts
- Useful for comparing model outputs in development

**Weaknesses:**
- Data goes through OpenRouter's infrastructure — not suitable for sensitive data
- No self-hosted option
- No semantic caching, no guardrails, no PII filtering
- Limited governance: not designed for multi-team production environments
- Pricing adds OpenRouter's margin on top of provider costs

**Best for:** prototyping, personal projects, benchmarking multiple models, situations where infrastructure overhead matters more than cost or compliance.

---

### Helicone

Observability-first proxy. Adds monitoring, semantic caching, and routing via a single base URL change. No infrastructure required.

**Strengths:**
- Minimal integration: change the base URL, add two headers — done
- Semantic caching: 20–30% cost reduction on repetitive query workloads; see [[infra/caching]]
- Strong observability: per-request cost, latency, token count; session and user-level dashboards
- Budget alerts and cost attribution by user/session via headers
- Self-hosted option (Docker)
- Open-source (Apache 2.0)

**Weaknesses:**
- Less feature-complete as a router than LiteLLM or Portkey
- No built-in guardrails or PII filtering
- Routing is provider-level failover, not difficulty-based
- Observability is its primary differentiator — if you already have Langfuse, the overlap is high

**Best for:** teams that want fast observability with caching and minimal setup, particularly when already calling a single provider and not yet needing multi-provider routing.

See [[observability/helicone]] for implementation patterns and failure cases.

---

## Feature Comparison

| Feature | LiteLLM | Portkey | Kong | OpenRouter | Helicone |
|---|---|---|---|---|---|
| Self-hosted | Yes | Yes / cloud | Yes | No | Yes / cloud |
| Provider coverage | 100+ | 100+ | 8+ | 200+ | 100+ |
| Semantic caching | Yes (proxy) | Yes | Yes (v3.10) | No | Yes |
| Guardrails / PII filtering | No | Yes | Yes (v3.10) | No | No |
| Budget tracking | Yes | Yes | Yes (plugin) | No | Yes |
| Model routing / fallback | Yes | Yes | Yes | No (availability only) | Yes (basic) |
| Prompt versioning | No | Yes | No | No | Yes |
| RBAC / workspaces | Basic (virtual keys) | Yes | Yes (enterprise) | No | Basic |
| Enterprise SLA | No | Yes (paid) | Yes (enterprise) | No | Yes (paid) |
| Raw throughput | Moderate | Moderate | Highest | N/A | Moderate |
| Setup time | 15–30 min | < 5 min | Hours | < 5 min | < 5 min |
| Open-source licence | MIT | Apache 2.0 (core) | Community / Enterprise | No | Apache 2.0 |

---

## When You Need a Gateway

Add a gateway when any of these are true:

- **Multiple LLM providers** — you call OpenAI for some tasks, Anthropic for others, or need fallback between them
- **Multiple teams or services** — virtual keys give each team its own spend limit and audit trail
- **Cost attribution** — you need to know which feature or user is spending what
- **Semantic caching is viable** — you have a FAQ bot, support agent, or knowledge base Q&A where queries repeat
- **Compliance or audit logging required** — every LLM call must be logged with inputs, outputs, and metadata
- **Agent loops** — runaway agents need rate limiting and hard budget stops at the infrastructure layer

---

## When You Do Not Need a Gateway

Skip the gateway when:

- **Single provider, stable usage** — one API key, one provider, no fallback needed
- **Low volume** — under ~500 calls/day, the engineering overhead and added latency outweigh the benefits
- **Prototyping** — add complexity only when it earns its place; use direct SDK calls first
- **All traffic is async batch** — Anthropic's Batch API already gives 50% cost reduction on non-real-time workloads; [[apis/anthropic-api]]

The correct order: direct provider call → add [[infra/caching]] when you see repetition → add LiteLLM when you add providers or need fallback → add a full gateway when you need team governance or compliance.

---

## Connections

- [[infra/litellm]] — LiteLLM implementation detail: proxy configuration, virtual keys, router patterns, failure cases
- [[infra/model-routing]] — difficulty-based routing (cheap vs frontier model selection per query) — the complementary layer to a gateway
- [[infra/caching]] — semantic caching architecture with Redis and RediSearch; the mechanism gateways plug into
- [[observability/helicone]] — Helicone as gateway + observability combined
- [[observability/platforms]] — Langfuse, LangSmith, Arize Phoenix for tracing LLM calls routed through gateways
- [[protocols/mcp]] — Kong AI Gateway v3.12 added MCP support; MCP tool calls can be routed through gateway layers
- [[synthesis/cost-optimisation]] — gateway features (caching, routing, batch) as cost levers in the seven-lever framework
- [[apis/anthropic-api]] — prompt caching is an Anthropic-side mechanism that complements gateway-level semantic caching
- [[security/owasp-llm-top10]] — excessive agency (A09) and model denial-of-service (A04) are mitigated by gateway-level rate limiting and budget controls
