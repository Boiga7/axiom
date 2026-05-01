---
type: entity
category: agents
tags: [langgraph, multi-agent, orchestration, python, langchain]
sources: []
updated: 2026-04-29
para: resource
tldr: LangGraph v1.0 is the production standard for stateful multi-agent orchestration in Python, offering fine-grained graph-based control with built-in checkpointing and human-in-the-loop support.
---

# LangGraph

> **TL;DR** LangGraph v1.0 is the production standard for stateful multi-agent orchestration in Python, offering fine-grained graph-based control with built-in checkpointing and human-in-the-loop support.

Graph-based agent runtime from LangChain. Went GA as v1.0 in October 2025 and became the default runtime for production multi-agent systems in Python.

> [Source: Perplexity research, 2026-04-29] [unverified]

---

## Core Abstraction

LangGraph models agent execution as a directed graph:

- **Nodes** — Python functions (or `RunnableLambda`s) that read from state and write back to state
- **Edges** — routing logic; conditional edges branch based on state values
- **State** — a typed `TypedDict` that flows through every node; the single source of truth for the graph run

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    tool_calls: list

graph = StateGraph(AgentState)
graph.add_node("llm", call_llm)
graph.add_node("tools", run_tools)
graph.add_conditional_edges("llm", route_after_llm, {"tools": "tools", "end": END})
graph.add_edge("tools", "llm")
graph.set_entry_point("llm")
app = graph.compile()
```

---

## Key Features

### Checkpointing

Persistent state snapshots after every node execution. Enables:

- **Resumability** — pick up mid-run after a crash
- **Time-travel debugging** — replay any historical state
- **Human-in-the-loop** — pause at `interrupt_before` / `interrupt_after` hooks, collect input, resume

Backends: `MemorySaver` (in-process, dev only), `SqliteSaver`, `PostgresSaver` (production).

### Human-in-the-Loop

```python
app = graph.compile(interrupt_before=["tools"])  # pause before tool execution
```

The graph halts, surfaces state to a human, and resumes when `app.invoke(None, config)` is called with the original thread ID.

### Streaming

Four streaming modes: `values` (full state), `updates` (node deltas), `messages` (LLM token stream), `custom` (arbitrary events). Critical for production UX.

---

## Multi-Agent Patterns

### Supervisor

A central supervisor LLM routes tasks to specialist sub-agents. Each sub-agent is itself a compiled graph. The supervisor maintains a shared state and delegates based on tool/capability routing.

### Swarm / Handoffs

Agents transfer control directly to each other using handoff tools. No central coordinator. The active agent changes by returning a `Command(goto="agent_name")`.

### Sequential Chaining

Simple pipeline: Agent A → Agent B → Agent C. Each graph's output becomes the next graph's input. Useful for preprocessing → analysis → formatting pipelines.

---

## LangGraph vs Alternatives

| Runtime | Model | State | Strength |
|---|---|---|---|
| **LangGraph** | Graph (nodes/edges) | Typed TypedDict | Fine-grained control, checkpointing |
| **CrewAI** | Role-based crews | Shared crew memory | Fast to prototype, opinionated |
| **AutoGen/AG2** | Event-driven actors | Per-agent memory | Complex conversation topologies |
| **Google ADK** | A2A protocol | Google Cloud native | Interop with Vertex agents |

LangGraph wins on control and observability. CrewAI wins on time-to-first-demo.

---

## LangGraph Cloud

Managed runtime for LangGraph graphs. Features:

- Persistent checkpointers (no self-hosted database needed)
- Built-in streaming
- Horizontal scaling
- Studio UI (visual debugger, state inspector)

---

## Integration with LangSmith

LangGraph traces are automatically sent to [[observability/platforms|LangSmith]] when `LANGCHAIN_TRACING_V2=true`. Every node execution appears as a span. Essential for debugging complex multi-hop agent runs.

---

## Production Considerations

- **State size** — grows unbounded in long runs; prune or summarise messages
- **Parallel nodes** — `graph.add_node` supports branching; merge with `RunnableParallel`
- **Tool errors** — catch inside tool nodes; don't let unhandled exceptions abort the graph
- **Context windows** — in multi-agent setups, each sub-agent gets a fresh context; cross-agent memory requires explicit handoff
- **Cost gates** — add an observability node that counts tokens and hard-stops at threshold

---

## Key Facts

- Went GA as v1.0 in October 2025; prior to that it was the de facto standard but pre-release
- Core abstractions: Nodes (Python functions), Edges (routing logic), State (typed TypedDict — single source of truth)
- Four streaming modes: `values`, `updates`, `messages`, `custom`
- Checkpointing backends: `MemorySaver` (dev only), `SqliteSaver`, `PostgresSaver` (production)
- Human-in-the-loop via `interrupt_before` / `interrupt_after` hooks — graph halts, resumes on `app.invoke(None, config)`
- Three multi-agent patterns: Supervisor (central LLM router), Swarm/Handoffs (`Command(goto=...)`), Sequential Chaining
- Traces auto-sent to LangSmith when `LANGCHAIN_TRACING_V2=true`; every node appears as a span
- LangGraph wins vs alternatives on control and observability; CrewAI wins on time-to-first-demo

## Connections

- [[agents/langchain]] — LangChain is the base framework LangGraph is built on; use LangChain for simple chains, LangGraph for stateful workflows
- [[agents/react-pattern]] — the ReAct loop (observe, think, act) is what individual LangGraph nodes implement
- [[protocols/mcp]] — MCP tool servers connect to LangGraph as tool nodes; security considerations apply
- [[observability/platforms]] — LangSmith is the native tracing target; Langfuse works via OTel
- [[apis/anthropic-api]] — Claude is called from within graph nodes using the Anthropic Messages API
- [[agents/multi-agent-patterns]] — covers CrewAI, AutoGen, and Swarm as alternatives to LangGraph
- [[security/mcp-cves]] — MCP tools integrated into LangGraph nodes inherit MCP's attack surface

## Open Questions

- How does LangGraph v1.0 compare to the OpenAI Agents SDK (released early 2025) on production workloads — which wins on latency, cost, and developer ergonomics for Claude-based agents?
- What are the practical limits of `PostgresSaver` checkpointing at scale — what checkpoint size and throughput does it support before becoming a bottleneck?
- Does LangGraph Cloud's horizontal scaling model handle stateful graphs correctly when a single thread's state is large (e.g., multi-turn agent with large message history)?

