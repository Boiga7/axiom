---
type: concept
category: agents
para: resource
tags: [memory, mem0, zep, letta, memgpt, graphiti, agent-infrastructure, production]
sources: []
updated: 2026-05-03
tldr: "Production memory infrastructure for AI agents — Mem0 (ecosystem breadth), Zep/Graphiti (temporal facts), and Letta (long-horizon paging) — with the dual-layer hot/cold architecture as the emerging production standard."
---

# Agent Memory Systems

> **TL;DR** Production memory infrastructure for AI agents — Mem0 (ecosystem breadth), Zep/Graphiti (temporal facts), and Letta (long-horizon paging) — with the dual-layer hot/cold architecture as the emerging production standard.

This page covers the concrete infrastructure engineers deploy. For the conceptual taxonomy (in-context, episodic, semantic, procedural), see [[agents/memory]]. For LangMem specifically, see [[agents/langmem]].

---

## Why Dedicated Memory Infrastructure

In-context memory is wiped on session end. That alone is not the hard problem — naive external storage (append-only vector store, key-value JSON) fails in subtler ways:

- **State changes are not tracked.** A user who lived in London and moved to Tokyo has two facts in the store. Neither is marked superseded. The agent picks the wrong one.
- **Temporal validity is implicit.** When did a fact become true? When did it stop being true? Vector similarity cannot answer either question.
- **Retrieval quality degrades at scale.** A vector search over 50,000 memories returns cosine-similar results, not contextually relevant ones. Without reranking and entity-aware retrieval, precision collapses.
- **Multi-user isolation is manual.** Every query must be scoped to a user ID, or memories bleed across tenants.

Dedicated memory systems exist to solve these four problems as first-class concerns.

---

## The Three Main Options

### Mem0

Mem0 is a hybrid memory layer (vector + graph + key-value) exposed as a simple HTTP API. The core abstraction is a memory object with an associated user ID; the system handles extraction, deduplication, and conflict resolution internally using an LLM-based pipeline.

**Storage layer.** Three stores in parallel: a vector store for semantic retrieval, an optional knowledge graph (Pro tier) for entity/relationship linking, and a key-value store for exact-match lookups. Retrieval fuses results from all three using semantic, BM25 keyword, and entity matching.

**API surface.** `add(messages, user_id)` — `search(query, user_id)` — `get_all(user_id)` — `delete(memory_id)`. The surface is intentionally thin; there is nothing framework-specific to learn.

**Ecosystem integrations.** Native integrations with CrewAI, LangGraph, LlamaIndex, Flowise, and OpenAI Assistants API. In May 2025, AWS selected Mem0 as the exclusive memory provider for its Strands Agents SDK. Framework-agnostic by design: "It's just an HTTP API."

**Self-hosting.** Apache 2.0 licence; Docker-based self-hosted option. Managed cloud tiers available for teams that want zero infrastructure.

**Benchmarks.** ECAI 2025 paper (arXiv:2504.19413) reported 67.13% LLM-as-a-Judge score on LOCOMO with p95 search latency of ~200ms. The same paper claims 91% lower p95 latency and 90% token reduction versus full-context approaches. The Letta team contested Mem0's reported MemGPT/Letta comparison numbers; treat head-to-head figures with caution.

**Best for.** Teams that want minimal infrastructure overhead and broad ecosystem compatibility. The safe default when temporal reasoning is not a hard requirement.

```python
from mem0 import MemoryClient

client = MemoryClient(api_key="...")

# Store memories from a conversation
client.add(
    messages=[
        {"role": "user", "content": "I moved from London to Tokyo last year."},
        {"role": "assistant", "content": "Got it, I'll remember that."},
    ],
    user_id="user_123",
)

# Retrieve at session start
memories = client.search("Where does the user live?", user_id="user_123")
# Returns the Tokyo fact, not London — Mem0's conflict resolver marked London invalid
```

---

### Zep / Graphiti

**Zep** is a production memory server. **Graphiti** is its temporal knowledge graph engine — the architectural core that distinguishes Zep from other memory systems.

#### Graphiti's Temporal Model

Every edge (fact) in the graph carries four timestamps:

| Field | Meaning |
|---|---|
| `t_created` | When this fact was ingested |
| `t_expired` | When this fact was invalidated in the system |
| `t_valid` | When this fact became true in the real world |
| `t_invalid` | When this fact stopped being true in the real world |

When new information arrives that conflicts with an existing fact, Graphiti does not overwrite or delete. It sets `t_invalid` on the old edge and creates a new edge with an updated `t_valid`. The full history is preserved; the query layer returns the most recent valid fact by default.

This handles the "moved to Tokyo" case correctly. A flat vector store and Mem0's basic tier do not.

**Retrieval.** Graphiti combines semantic, keyword, and graph traversal search to surface relevant facts. Because entities and relationships are first-class nodes, the system can answer multi-hop questions ("who did the user report to at their previous job?") that pure vector retrieval cannot.

**Zep Community Edition deprecation.** The self-hosted Community Edition was deprecated in April 2025. Self-hosting now requires running Graphiti (open-source, MIT licence) plus a compatible graph database (Neo4j or FalkorDB). The managed Zep cloud product continues to operate.

**MCP integration.** Graphiti ships a native MCP server, giving Claude Code and Cursor clients temporal graph-based memory without framework changes.

**Benchmarks.** Zep outperforms Mem0 by approximately 22 percentage points on LongMemEval, with the gap concentrated on knowledge-update and temporal-reasoning questions — the exact scenarios where validity windows provide structural advantage.

**Best for.** Agents where facts change over time and the system must reason about when a fact was true — CRM-style customer data, HR systems, anything tracking entity state evolution.

```python
from graphiti_core import Graphiti

g = Graphiti(neo4j_uri="bolt://localhost:7687", neo4j_user="neo4j", neo4j_password="...")

# Ingest an episode (conversation turn or event)
await g.add_episode(
    name="user_location_update",
    episode_body="User moved from London to Tokyo in March 2025.",
    source_description="chat session",
)

# Query — returns Tokyo with London marked invalid
results = await g.search("Where does the user currently live?")
```

---

### Letta (formerly MemGPT)

Letta is the production framework that emerged from the MemGPT research project at UC Berkeley's Sky Computing Lab. The original paper — "MemGPT: Towards LLMs as Operating Systems" (Packer et al., arXiv:2310.08560, October 2023) — proposed virtual context management by direct analogy to OS virtual memory.

#### The Paging Model

| OS concept | MemGPT/Letta equivalent |
|---|---|
| RAM | Main context window (core memory blocks) |
| Disk | Archival memory (external database) |
| Memory controller | Memory editing tools the agent calls explicitly |
| Page fault | Agent detects it needs information and issues archival_memory_search |

The agent is given explicit memory tools:

- `memory_replace(old_str, new_str)` — edit core memory in-place
- `memory_insert(content)` — write to archival memory
- `archival_memory_search(query)` — page content into context on demand
- `conversation_search(query)` — search prior conversation history

The agent decides what to remember, what to page out, and when to retrieve. This is fundamentally different from Mem0 and Zep, which handle memory management transparently.

**Production stack.** Letta exposes each agent as a stateful service behind a REST API with a Postgres-backed persistence layer. Agents carry persistent state across calls without the application managing session continuity.

**Best for.** Long-horizon single-agent conversations where the agent itself should reason about what to keep in context — personal assistants, coding agents with multi-week project context, research agents.

**Limitation.** The self-managing paging model adds latency and LLM calls per turn. For short interactions, Mem0 or LangMem is simpler.

---

## Dual-Layer Hot/Cold Architecture

The pattern that has emerged as the production standard pairs two memory tiers coordinated by a Memory Node that runs after each agent turn.

```
┌─────────────────────────────────────────────────────┐
│                    Agent Turn                        │
│                                                      │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │  HOT PATH    │    │      COLD PATH           │    │
│  │              │    │                          │    │
│  │  Recent ctx  │    │  Compressed history      │    │
│  │  Session KV  │    │  Vector-indexed facts    │    │
│  │  <50ms       │    │  Graph relationships     │    │
│  │              │    │  50–200ms retrieval       │    │
│  └──────┬───────┘    └────────────┬────────────┘    │
│         │                         │                  │
│         └─────────────┬───────────┘                  │
│                       │                              │
│               ┌───────▼────────┐                     │
│               │  Memory Node   │                     │
│               │  (post-turn)   │                     │
│               └───────┬────────┘                     │
│                       │                              │
│            Extract → Store → Invalidate stale        │
└───────────────────────────────────────────────────── ┘
```

**Hot path.** The last N turns or a sliding token budget kept in-context or in a fast key-value store (Redis). Latency under 50ms. No retrieval step — it is already in context.

**Cold path.** The accumulated memory store — Mem0, Zep, or a custom vector DB. Retrieved at session start via similarity search. Latency 50–200ms depending on store and index size.

**Memory Node.** Runs after each turn (or asynchronously after session end). Responsibilities: extract new facts, write to cold store, mark superseded facts invalid, compress old hot-path entries into cold storage. In practice this is often a separate LangGraph node or a background task.

Even with Claude's 1M token and Gemini's 2M token context windows, full-history approaches are impractical in production — the cost per call and the "lost in the middle" quality degradation make external memory mandatory at scale.

---

## Decision Matrix

| Criterion | Mem0 | Zep / Graphiti | Letta |
|---|---|---|---|
| Setup complexity | Low | Medium | Medium-High |
| Temporal reasoning | Basic (LLM conflict resolver) | Native (validity windows) | Depends on agent logic |
| Ecosystem integrations | Broadest (CrewAI, LangGraph, Strands, Flowise) | LangGraph, MCP server | LangGraph, REST API |
| Self-hosting | Yes (Apache 2.0, Docker) | Graphiti + Neo4j/FalkorDB | Yes (Postgres-backed) |
| Managed cloud | Yes | Yes | Yes (Letta Cloud) |
| Best use case | Chatbots, personal assistants, low-complexity state | CRM, HR, entity-state tracking | Long-horizon single agents |
| Latency (p95) | ~200ms | Not published | Not published |
| Benchmark strength | LOCOMO accuracy | LongMemEval temporal recall | Long-session document analysis |

**Choose Mem0** when you need the shortest path to production and your agent's facts are mostly additive (users add context; they don't often change previously stated facts).

**Choose Zep/Graphiti** when facts change over time and the difference between "currently lives in Tokyo" and "used to live in London" matters to your application.

**Choose Letta** when you are building a single agent with very long-running sessions (weeks to months) and want the agent itself to manage what it holds in context — the paging model is a better fit than background extraction.

---

## Production Considerations

### Retrieval Latency

Vector search adds 50–200ms per query. In an interactive agent this is on the critical path to first token. Mitigations:

- Run memory retrieval concurrently with the LLM call where possible; inject memories into the second turn if first-turn latency is the bottleneck.
- Cache retrieved memories for the session duration — memories rarely change turn-to-turn.
- Use the hot/cold split to keep the most recent memories below the retrieval threshold.

### Memory Invalidation

The naive pattern is append-only: every fact is stored, none are removed. This causes the agent to cite stale facts. Production systems need an invalidation pass:

- Mem0's LLM-based conflict resolver handles this automatically on `add()`.
- Graphiti's validity windows make it explicit and auditable.
- Hand-rolled stores require an explicit upsert/invalidation step.

### PII and Sensitive Data

Memory stores accumulate personal data across sessions. Treat them as sensitive stores:

- Validate content before writing: scan for PII patterns (email, phone, SSN), credentials, API keys.
- Redact or hash sensitive values before storage; store a reference, not the raw value.
- Implement a deletion API so users can exercise right-to-erasure without manual DB queries.
- Audit memory store contents periodically — LLM extraction can surface things users said casually without expecting persistence.

### Multi-User Isolation

Every read and write must be scoped to a `user_id` (and optionally `agent_id`). A missing filter lets one user's memories appear in another's context.

```python
# Always: scope by user_id
memories = client.search(query, user_id=current_user.id)

# Never: unscoped search across all users
memories = client.search(query)  # returns everyone's memories
```

Derive `user_id` from the application's authenticated identity, not from a value the agent or user can supply. Memory isolation is only as strong as the auth layer upstream.

---

## ECAI 2025 Benchmarks

The Mem0 team published an ECAI 2025 paper (arXiv:2504.19413) benchmarking ten memory approaches against LOCOMO — a long-context conversational memory benchmark testing single-hop, temporal, multi-hop, and open-domain recall.

Key reported findings:
- Mem0's graph-enhanced variant: 68.5% on LOCOMO (Letta's counter-analysis figure) vs Mem0's own reported 91.6 score — the discrepancy arises from different evaluation setups [unverified, numbers contested]
- Zep outperforms Mem0 by ~22 points on LongMemEval for temporal and knowledge-update questions
- Full-context (no external memory): 74.0% on LoCoMo with GPT-4o mini in some configurations — illustrating that naive full-context is still competitive on shorter benchmarks but impractical in production

The Letta team disputed Mem0's reported MemGPT comparison numbers and states they could not reproduce the evaluation methodology. Treat direct cross-system benchmark comparisons from vendor-published papers with scepticism; run your own evaluation on representative data.

---

## Key Facts

- Mem0 paper: arXiv:2504.19413, ECAI 2025, UC Berkeley + Mem0 team
- MemGPT paper: arXiv:2310.08560, October 2023, UC Berkeley Sky Computing Lab
- Graphiti arxiv paper: arXiv:2501.13956v1 (January 2025)
- Zep Community Edition deprecated: April 2025
- AWS Strands Agents SDK selected Mem0 as exclusive memory provider: May 2025
- Vector search retrieval latency: 50–200ms (Mem0 p95 ~200ms)
- Mem0 licence: Apache 2.0
- Graphiti licence: MIT
- Letta licence: Apache 2.0

---

## Connections

- [[agents/memory]] — conceptual taxonomy: in-context, episodic, semantic, procedural memory types
- [[agents/langmem]] — LangMem (LangChain's memory library): storage-agnostic background extraction, LangGraph integration
- [[agents/langgraph]] — LangGraph checkpointing (within-session state) distinct from cross-session memory infrastructure
- [[agents/practical-agent-design]] — production agent design patterns; memory is one of the three key infrastructure decisions
- [[agents/multi-agent-patterns]] — multi-agent memory sharing: scoped vs shared semantic stores
- [[infra/vector-stores]] — backing stores (pgvector, Qdrant, Pinecone) used by Mem0 and Graphiti
- [[rag/pipeline]] — retrieval mechanics shared with memory search; reranking applies to memory retrieval too
- [[security/owasp-llm-top10]] — persistent memory exploitation listed in OWASP Agentic Top 10 2026
- [[protocols/mcp]] — Graphiti ships a native MCP server for memory access from Claude Code / Cursor

---

## Open Questions

- At what scale (users × sessions) does Mem0 managed cloud become cost-prohibitive compared to self-hosted Graphiti?
- Can Graphiti's temporal model be used without the full Zep server, or is a standalone Graphiti deployment the right self-hosted path post-CE deprecation?
- How should deletion (GDPR right-to-erasure) be implemented across a system that uses both a vector store and a knowledge graph?
- What is the right warm-up strategy for the hot path when a user resumes a session after a long gap?
