---
type: concept
category: agents
tags: [memory, agents, episodic, semantic, working-memory, checkpointing, langgraph]
sources: []
updated: 2026-04-29
para: resource
tldr: Covers the four agent memory types (in-context, episodic, semantic, procedural) and how to implement each — getting this right separates agents that learn across sessions from ones that forget everything.
---

# Agent Memory

> **TL;DR** Covers the four agent memory types (in-context, episodic, semantic, procedural) and how to implement each — getting this right separates agents that learn across sessions from ones that forget everything.

The four types of memory an agent can use, when to use each, and how to implement them. Getting memory architecture right is the difference between an agent that learns across sessions and one that forgets everything.

---

## The Four Types

| Type | What it stores | Lifetime | Analogy |
|---|---|---|---|
| **In-context (working)** | Current task, active conversation | This invocation only | RAM |
| **Episodic** | Past interactions, conversation history | Across sessions | Diary |
| **Semantic** | Facts, knowledge, entity state | Long-term, updated | Notes |
| **Procedural** | How to do things | Long-term, rarely changes | Skills |

---

## In-Context Memory (Working Memory)

The model's context window is the working memory. Everything the agent needs for the current task must fit here.

```python
# LangGraph state as working memory
from typing import Annotated
from langgraph.graph import MessagesState

class AgentState(MessagesState):
    # messages: already included in MessagesState
    current_task: str
    tool_results: list[dict]
    step_count: int
```

**Limits:**
- Hard limit: context window size (1M tokens for Claude, 128K for GPT-4o)
- Soft limit: quality degrades for retrieval from middle of context ("lost in the middle")
- Practical limit: cost. 100K tokens × $3/M = $0.30 per call. At scale this adds up fast.

**Manage it actively:**
```python
def trim_messages_to_budget(messages: list, max_tokens: int = 50_000):
    total = 0
    trimmed = []
    for msg in reversed(messages):
        tokens = count_tokens(msg["content"])
        if total + tokens > max_tokens:
            break
        trimmed.insert(0, msg)
        total += tokens
    return trimmed
```

---

## Episodic Memory

Stores past interaction summaries so the agent can refer to previous sessions.

### Implementation with LangGraph + PostgreSQL

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver.from_conn_string("postgresql://user:pass@localhost/db")

graph = agent_graph.compile(checkpointer=checkpointer)

# Each thread_id is a separate conversation
config = {"configurable": {"thread_id": "user_123_session_456"}}
result = graph.invoke({"messages": [HumanMessage(content="Hello")]}, config)

# Later session — history is automatically loaded
result2 = graph.invoke(
    {"messages": [HumanMessage(content="What did we discuss last time?")]},
    config  # same thread_id
)
```

The checkpointer serialises the full graph state (messages + any custom fields) to PostgreSQL. On the next invocation with the same `thread_id`, state is restored.

### Summarisation for Long Histories

Don't let episodic memory grow unbounded. Summarise periodically:

```python
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-haiku-4-5-20251001")

def summarise_history(messages: list) -> str:
    summary_prompt = f"""Summarise this conversation history concisely:

{format_messages(messages)}

Focus on: decisions made, facts established, tasks completed."""
    return llm.invoke(summary_prompt).content

# Trim to last N turns + prepend summary
def compress_history(state: AgentState) -> AgentState:
    if len(state["messages"]) > 20:
        summary = summarise_history(state["messages"][:-10])
        compressed = [SystemMessage(content=f"Previous conversation summary: {summary}")]
        state["messages"] = compressed + state["messages"][-10:]
    return state
```

---

## Semantic Memory

Long-lived facts about users, entities, or the world that the agent learns and updates.

### Simple Key-Value Store

```python
import json
from pathlib import Path

class SemanticMemory:
    def __init__(self, path: str = "agent_memory.json"):
        self.path = Path(path)
        self.store = json.loads(self.path.read_text()) if self.path.exists() else {}
    
    def remember(self, key: str, value: str):
        self.store[key] = {"value": value, "updated": datetime.now().isoformat()}
        self.path.write_text(json.dumps(self.store, indent=2))
    
    def recall(self, key: str) -> str | None:
        entry = self.store.get(key)
        return entry["value"] if entry else None

memory = SemanticMemory()
memory.remember("user_preferences.language", "Python")
memory.remember("project.tech_stack", "FastAPI + PostgreSQL + React")
```

### Vector-Based Semantic Memory

For fuzzy retrieval ("what do I know about the user's work?"):

```python
from langchain_community.vectorstores import Chroma
from langchain_openai import OpenAIEmbeddings

memory_store = Chroma(
    collection_name="agent_memory",
    embedding_function=OpenAIEmbeddings(),
    persist_directory="./memory_db",
)

# Store a memory
memory_store.add_texts(
    texts=["User prefers Python over JavaScript for backend work"],
    metadatas=[{"type": "preference", "user_id": "user_123", "timestamp": "2026-04-29"}],
)

# Retrieve relevant memories
relevant = memory_store.similarity_search(
    "What language does the user prefer?",
    k=3,
    filter={"user_id": "user_123"},
)
```

### LangMem (LangChain's Memory Library)

```python
from langmem import create_memory_manager

manager = create_memory_manager(
    "anthropic:claude-haiku-4-5-20251001",
    schemas=[UserProfile, ProjectContext],  # Pydantic schemas
)

# After each conversation turn, extract and store memories
await manager.ainvoke({"messages": conversation_history})
memories = await manager.aget_memories(user_id="user_123")
```

---

## Procedural Memory

The agent's tools, prompts, and CLAUDE.md/system prompts are its procedural memory. Unlike the other types, procedural memory is baked in at deployment time and changes require redeployment.

For dynamic procedural memory (tools the agent can learn to use), store tool definitions in semantic memory and load them at runtime:

```python
def load_tools_for_context(task_type: str) -> list:
    if task_type == "coding":
        return [read_file_tool, run_tests_tool, git_commit_tool]
    elif task_type == "research":
        return [web_search_tool, arxiv_tool, summarise_tool]
    else:
        return base_tools
```

---

## Memory in Multi-Agent Systems

In multi-agent systems, memory architecture gets complex:

- **Shared episodic:** All agents use the same thread/checkpoint (simple, single writer preferred)
- **Private episodic:** Each sub-agent has its own history (avoids state bloat)
- **Shared semantic:** Central vector store all agents query (read-many, write carefully)
- **Working memory handoff:** Parent passes relevant context to sub-agent in the invocation message

```python
# Parent → sub-agent handoff with relevant context
subagent_input = {
    "task": "Analyse the Q4 financial report",
    "context": {
        "user_preferences": memory.recall("user_preferences"),
        "prior_analysis": memory.recall("q3_analysis_summary"),
    },
    "messages": [],
}
```

---

## Common Mistakes

- **Putting everything in context.** Context is expensive and has quality limits. Route long-term facts to semantic memory.
- **No memory between sessions.** Users expect agents to remember them. Thread-based checkpointing is table stakes.
- **Unbounded history.** Summarise or truncate histories that exceed a few hundred turns.
- **Memory leakage in multi-tenant.** Always scope memory queries by `user_id`. Never let one user's memory bleed into another's context.

---

## Key Facts

- In-context (working) memory hard limit: 1M tokens for Claude, 128K for GPT-4o
- Prompt caching cost at 100K tokens: ~$0.30 per call at $3/M
- PostgresSaver enables thread-based episodic memory across sessions in LangGraph
- Summarise histories exceeding ~20 turns to prevent unbounded growth
- Always scope semantic memory queries by `user_id` in multi-tenant systems
- LangGraph `thread_id` is the key that identifies a conversation for checkpointing
- Procedural memory (tools, prompts) requires redeployment to change

## Common Failure Cases

**Memory leaks between users in multi-tenant deployments**  
Why: semantic memory queries are not scoped by `user_id`; one user's stored facts appear in another user's context.  
Detect: user B sees references to user A's project names or preferences in responses.  
Fix: always pass `filter={"user_id": user_id}` in vector similarity searches; never query the full memory store without a user scope.

**Thread ID collision causes wrong episodic history to load**  
Why: `thread_id` values are predictable (sequential integers, session timestamps) and collide between users or environments.  
Detect: agent appears to "remember" things the current user never said; prior conversation history is wrong.  
Fix: use UUIDs for thread IDs (`uuid.uuid4()`); namespace by user: `f"{user_id}:{session_uuid}"`.

**Unbounded conversation history causes context window overflow**  
Why: episodic memory appended on every turn grows indefinitely; at 200 turns, the full history exceeds the context budget.  
Detect: `ContextWindowExceededError` or token count warnings after extended sessions; cost per call increases steadily.  
Fix: summarise histories exceeding 20 turns; compress to summary + last 10 messages using the pattern in this page.

**Semantic memory stores contradictory facts, newest not winning**  
Why: memory.remember() stores new values but old entries persist; the vector store returns both old and new facts for the same key.  
Detect: agent gives conflicting answers about a stored preference when queried on successive turns.  
Fix: implement an upsert pattern: check for existing entries with the same key before writing; delete or overwrite stale entries.

**Procedural memory (tools/prompts) drifts from semantic memory context**  
Why: the agent's available tools are defined at deployment time, but semantic memory references tools that no longer exist.  
Detect: agent attempts to call a tool mentioned in memory that raises `ToolNotFoundError`.  
Fix: audit stored procedural references when deploying new tool sets; add a startup check that validates tool names against the registry.

## Connections

- [[agents/langgraph]] — LangGraph checkpointing is the primary episodic memory implementation
- [[agents/multi-agent-patterns]] — memory architecture in multi-agent systems; shared vs private episodic
- [[infra/vector-stores]] — backing store for vector-based semantic memory
- [[prompting/context-engineering]] — techniques for managing the in-context working memory budget

## Open Questions

- When does LangMem reach production maturity compared to hand-rolled semantic memory stores?
- What are the privacy/compliance implications of storing user episodic memory in PostgreSQL vs an encrypted vector store?
- How should agents handle memory conflicts when the same fact is updated by two agents concurrently?
