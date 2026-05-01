---
type: entity
category: agents
para: resource
tags: [langmem, memory, long-term, langchain, langgraph, semantic-memory, episodic]
tldr: LangMem is LangChain's library for long-term agent memory — extracting, storing, and retrieving facts from conversations across sessions. Works with any storage backend. Integrates natively with LangGraph's memory store.
sources: []
updated: 2026-05-01
---

# LangMem

> **TL;DR** LangMem is LangChain's library for long-term agent memory — extracting, storing, and retrieving facts from conversations across sessions. Works with any storage backend. Integrates natively with LangGraph's memory store.

## Key Facts
- Released by LangChain; open-source; integrates natively with LangGraph's long-term memory store
- Handles three memory types: episodic (conversation facts), semantic (extracted knowledge), procedural (prompt updates)
- Background memory manager: automatically extracts, consolidates, and updates knowledge from conversations
- Storage-agnostic: plugs in to any vector store (Pinecone, Weaviate, Redis) via a small adapter
- Not the same as LangGraph checkpointing — checkpointing preserves full state within a run; LangMem manages cross-session long-term memory
- LangChain also offers a managed LangMem service (hosted vector store with additional features)

## The Memory Problem LangMem Solves

LangGraph checkpointing handles within-session state (what happened in this run). LangMem handles across-session memory (what the agent has learned over time).

```
Session 1: User explains their codebase structure → agent learns architecture
Session 2 (new thread): Agent should remember the architecture without re-explanation

→ LangGraph checkpoint: doesn't help (different thread)
→ LangMem: extracts and stores architecture facts after session 1, retrieves them in session 2
```

## Memory Types

### Episodic Memory
Facts extracted from specific conversations. "User prefers pytest over unittest." "The project uses FastAPI with PostgreSQL."

### Semantic Memory
General knowledge the agent has accumulated about a domain, user, or codebase. Structured knowledge base built over many interactions.

### Procedural Memory
How the agent should behave — updated system prompt fragments that reflect learned preferences. "Always check for existing tests before writing new ones."

## Core API

```python
from langmem import create_memory_manager, MemoryStore

# Set up storage (using LangGraph's InMemoryStore for development)
from langgraph.store.memory import InMemoryStore
store = InMemoryStore()

# Create a memory manager
memory_manager = create_memory_manager(
    store=store,
    namespace=("user_123",),  # scope memories to a user
)

# After a conversation, extract memories
conversation = [
    {"role": "user", "content": "I'm building mcpindex — a CLI for scanning MCP servers"},
    {"role": "assistant", "content": "I can help with that..."},
]

await memory_manager.aupdate(conversation)
# Manager extracts: "User is building mcpindex, a CLI for MCP server security scanning"
```

## Retrieval at Agent Start

```python
from langmem import create_memory_retriever

retriever = create_memory_retriever(
    store=store,
    namespace=("user_123",),
)

# At the start of a new session, retrieve relevant memories
memories = await retriever.aretrieve(
    query="mcpindex MCP security scanning",
    k=5,
)

# Inject into system prompt
memory_context = "\n".join(m.content for m in memories)
system_prompt = f"""You are a helpful AI assistant.

Context from previous conversations:
{memory_context}

---
"""
```

## Background Memory Manager

The background manager automatically processes conversations after they end:

```python
from langmem import BackgroundMemoryManager

bg_manager = BackgroundMemoryManager(
    store=store,
    extraction_model="claude-haiku-4-5-20251001",  # cheap model for extraction
)

# Call after each session ends
await bg_manager.aprocess(thread_id="thread_456")
# Extracts, deduplicates, and merges new memories with existing ones
```

The background manager handles deduplication — if the user has mentioned mcpindex in 10 sessions, it doesn't store 10 identical facts.

## LangGraph Integration

```python
from langgraph.store.memory import InMemoryStore
from langgraph.graph import StateGraph
from langmem import create_manage_memory_tool, create_search_memory_tool

store = InMemoryStore()

# Give the agent memory tools it can call explicitly
memory_tools = [
    create_manage_memory_tool(store, namespace=("user",)),  # save/update memories
    create_search_memory_tool(store, namespace=("user",)),  # search memories
]

# Add tools to your LangGraph agent
graph = StateGraph(AgentState)
graph.add_node("agent", create_react_agent(model, memory_tools + other_tools))
```

This pattern lets the agent decide when to save and recall memories, rather than automatically extracting them.

## Storage Backend Options

```python
# Development: in-memory (no persistence)
from langgraph.store.memory import InMemoryStore
store = InMemoryStore()

# Production: PostgreSQL with pgvector
from langchain_postgres import PostgresStore
store = PostgresStore(connection_string="postgresql://...")

# Production: Redis vector store
from langchain_redis import RedisStore
store = RedisStore(redis_url="redis://localhost:6379")

# Third-party: Pinecone, Weaviate, etc. via small adapter
```

## When to Use LangMem

| Scenario | Recommendation |
|---|---|
| Agent that improves with use | LangMem (learn user preferences) |
| Multi-session project work | LangMem (remember project context) |
| Personal assistant with long relationship | LangMem (episodic + semantic) |
| Single-session task agent | Skip — LangGraph checkpointing is enough |
| Retrieval from a fixed knowledge base | Skip — use RAG instead |

LangMem adds complexity. Only add it when users would genuinely benefit from the agent "remembering" them across sessions. For mcpindex or evalcheck, relevant if the agent learns patterns about a user's codebase over multiple scans.

> [Source: LangMem SDK launch blog post, LangChain, 2025]
> [Source: LangMem documentation, langchain-ai.github.io/langmem]

## Connections
- [[agents/memory]] — in-context, episodic, semantic, procedural memory taxonomy
- [[agents/langgraph]] — LangMem integrates with LangGraph's long-term memory store
- [[agents/langgraph-cloud]] — LangGraph Platform manages the store backend in production
- [[rag/pipeline]] — LangMem retrieval is semantically similar to RAG but for conversational memory
- [[infra/vector-stores]] — storage backends LangMem can plug into

## Open Questions
- How does LangMem handle privacy — can users request deletion of their stored memories?
- At what volume of interactions does automatic memory extraction become unreliable (extracting wrong facts)?
