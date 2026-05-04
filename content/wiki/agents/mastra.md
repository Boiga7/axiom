---
type: entity
category: agents
para: resource
tags: [mastra, typescript, agents, workflows, framework, yc-w25]
sources: []
updated: 2026-05-03
tldr: "TypeScript-native agent and workflow framework from the Gatsby team — batteries-included alternative to LangGraph for JS/TS stacks, with built-in memory, evals, observability, and durable workflows."
---

# Mastra

TypeScript-first framework for building AI agents and durable workflows. From the team behind Gatsby (Sam Bhagwat et al.), YC W25 batch (January 2025). Raised $13M. 22k+ GitHub stars as of mid-2026; stable 1.0 shipped January 2026 with 300k+ weekly npm downloads.

Production users include Replit and WorkOS.

> [Source: Mastra GitHub, mastra.ai, Generative.inc guide, Speakeasy comparison — 2025–2026] [unverified — cross-referenced across 4 sources]

---

## What It Is

Mastra is an opinionated TypeScript framework that bundles agents, durable workflows, tool integrations, memory, evals, and observability into one cohesive package. It is not a Python library ported to TypeScript — it was designed TypeScript-first, with full type inference on tool schemas, model names, and workflow steps.

The core design philosophy: give the developer one framework that handles the full agent development loop from local prototyping (Mastra Studio) to production deployment (Mastra Cloud or self-hosted), with no external orchestration layer required.

---

## Core Primitives

### Agents

An agent is an LLM + tools + memory configured as a single TypeScript object. Agents reason over goals, decide which tools to call, iterate internally, and emit a final answer. Key properties:

- `model` — any of 3,300+ models from 94 providers via the unified model router (full IDE autocomplete for model names)
- `tools` — typed tool definitions (Zod schemas for inputs and outputs)
- `memory` — one of four memory types (see below)
- `instructions` — system prompt string or function

Agents expose an OpenAPI/Swagger interface automatically when deployed via Mastra Server.

### Workflows

Mastra's workflow engine is the primary differentiator over simpler agent loops. Workflows are durable, step-based, and can suspend and resume across process restarts. Key features:

- **Sequential steps** — `.then()` chaining with typed state passing between steps
- **Parallel branches** — `.parallel()` for fan-out
- **Conditional logic** — `.branch()` for if/else routing
- **Loops** — for iterative refinement
- **Suspend/resume** — workflows can halt awaiting human input (HITL) and resume from persistent storage; execution state is checkpointed
- **Type safety** — each step's input and output types are inferred end-to-end

Workflow durability is backed by a storage layer (configurable — Postgres, LibSQL, Upstash). This is the equivalent of LangGraph's checkpointing but first-class and automatic.

### Tools

Tools are defined with Zod schemas, giving full TypeScript type inference at both definition time and call time. Mastra ships 100+ pre-built integrations (GitHub, Slack, Google Drive, Notion, HubSpot, etc.) via the `@mastra/integrations` package, each with typed inputs and outputs.

Custom tools follow the pattern:

```typescript
const myTool = createTool({
  id: 'my-tool',
  description: 'Does something useful',
  inputSchema: z.object({ query: z.string() }),
  execute: async ({ context }) => { ... }
});
```

### MCP Support

Mastra supports [[protocols/mcp]] bidirectionally:
- **Consumer** — load tools from any remote MCP server into an agent
- **Provider** — expose your own agents and tools as an MCP server for Claude, Cursor, or any MCP-compatible client

---

## Memory System

Four memory types, all built in (no external library required):

| Type | Description |
|---|---|
| **Message history** | Conversation thread stored per session |
| **Working memory** | Structured data persisted across sessions, validated with Zod schemas |
| **Semantic recall** | Vector search over past messages — retrieves relevant history by meaning, not recency |
| **Entity memory** | Stores facts about named entities (people, companies, concepts) across interactions |

Semantic and entity memory use a vector store under the hood (pgvector, Pinecone, or others). This makes Mastra's memory system comparable in capability to [[agents/langmem]] but without a separate library.

See also: [[agents/memory]] for the general memory taxonomy.

---

## RAG Integration

Mastra includes a first-class RAG pipeline primitive. Agents can be configured with a knowledge base that handles chunking, embedding, retrieval, and reranking. The RAG pipeline integrates with the same vector stores used for semantic memory. See [[rag/pipeline]] for chunking and retrieval strategy detail.

---

## Evals

The `@mastra/evals` package (63k+ weekly downloads as of early 2026) provides evaluation primitives directly in the framework:

- Define evals as TypeScript functions that score agent output
- Run evals in CI as part of the test suite
- View eval results in Mastra Studio / Mastra Cloud dashboard
- Supports LLM-as-judge, deterministic, and hybrid evaluation strategies

This puts eval-driven development first-class in the development loop — you write evals before deploying, not as an afterthought. See [[evals/methodology]] for general eval strategy.

---

## Observability

Built-in OTel-compatible tracing. Every agent run, workflow step, tool call, and model interaction is captured as a trace span. Integrates out of the box with:

- [[observability/langfuse]] (Langfuse)
- LangSmith
- [[observability/arize]] (Arize Phoenix)
- Braintrust
- Sentry
- Any OpenTelemetry-compatible backend

No instrumentation code required — tracing is enabled by configuration.

---

## Developer Tooling

**Mastra Studio** — local web-based IDE for testing agents and workflows before deploying. Visualises tool calls, LLM reasoning traces, and workflow step state. Available self-hosted and in Mastra Cloud.

**Model router** — unified interface to 3,300+ models from 94 providers. Model names have full IDE autocomplete, preventing typos at write time.

**OpenAPI auto-docs** — every deployed agent and workflow gets a Swagger UI automatically.

---

## Deployment

Three deployment targets:

| Mode | How |
|---|---|
| **Mastra Cloud** | Managed hosting; push to deploy; Studio + monitoring + Memory Gateway included |
| **Self-hosted** | Run `mastra serve`; deploys as a Node.js server with REST API |
| **Edge / serverless** | One-command deploy to Vercel, Cloudflare Workers, or Netlify; compatible with [[web-frameworks/nextjs]] App Router and [[web-frameworks/vercel-ai-sdk]] |

Mastra Server wraps agents and workflows as REST endpoints. Supports streaming responses via SSE.

---

## When to Use Mastra vs Alternatives

| Dimension | Mastra | [[agents/langgraph]] | PydanticAI |
|---|---|---|---|
| Language | TypeScript (primary), Python (limited) | Python + TypeScript (parity) | Python only |
| Design | Batteries-included; opinionated | Primitive graph building blocks; low-level | Type-safe agents; minimal |
| Workflow durability | First-class, built-in suspend/resume | Checkpointing via LangGraph Platform | Not built-in |
| Memory | 4 types built-in | Via LangMem or custom | Manual |
| Evals | Built-in (`@mastra/evals`) | External (inspect-ai, braintrust) | External |
| Observability | Built-in OTel | LangSmith (tight coupling) | External |
| Deployment | Mastra Cloud / one-command serverless | LangGraph Platform / LangGraph Cloud | Manual / any |
| Best for | TypeScript teams; full-stack AI apps; workflow-heavy agents | Complex state machines; fine-grained graph control; Python teams | Python + type safety + simplicity |

**Choose Mastra when:** TypeScript stack, need workflow durability without DIY infrastructure, want batteries-included (memory + evals + observability) without stitching libraries together.

**Choose LangGraph when:** Python team, need fine-grained control over the state graph, already invested in LangChain ecosystem, or the agent requires complex branching that benefits from explicit graph primitives.

**Choose PydanticAI when:** Python team, want type safety and validation with minimal framework overhead, simpler agent patterns without complex workflows.

In real-world comparisons, the Mastra implementation required roughly 60% less code than an equivalent LangGraph agent and achieved a higher task completion rate (94.2% vs 87.4% in one benchmark). [unverified — single source]

---

## Ecosystem and Adoption

- **GitHub stars:** 22k+ (grew from 1.5k to 7.5k in a single week after Hacker News front page, February 2025)
- **npm downloads:** 1.8M/month by February 2026; 300k+/week at 1.0 launch
- **Integrations:** 100+ pre-built tool integrations; 3,300+ models via model router
- **Community:** Active Discord; YC-backed; production-proven at Replit, WorkOS

---

## Related Pages

- [[agents/langgraph]] — primary Python alternative; comparison above
- [[agents/crewai]] — role-based crew framework (Python)
- [[agents/openai-agents-sdk]] — OpenAI's own agent SDK
- [[agents/practical-agent-design]] — framework selection heuristics
- [[agents/memory]] — general agent memory taxonomy
- [[agents/langmem]] — LangGraph's long-term memory library
- [[protocols/mcp]] — Mastra's bidirectional MCP support
- [[web-frameworks/nextjs]] — Next.js App Router deployment target
- [[web-frameworks/vercel-ai-sdk]] — Vercel AI SDK integration
- [[evals/methodology]] — eval strategy (Mastra's built-in evals fit here)
- [[observability/platforms]] — OTel backend options Mastra integrates with
- [[rag/pipeline]] — RAG pipeline that Mastra wraps
- [[javascript/typescript-fundamentals]] — TypeScript type system Mastra relies on
