---
type: concept
category: agents
tags: [multi-agent, orchestration, supervisor, swarm, parallelism, handoff]
sources: []
updated: 2026-05-01
para: resource
tldr: The three foundational multi-agent topologies (supervisor, swarm, parallel fan-out) and when each is worth the added complexity over a single agent.
---

# Multi-Agent Patterns

> **TL;DR** The three foundational multi-agent topologies (supervisor, swarm, parallel fan-out) and when each is worth the added complexity over a single agent.

When one agent isn't enough. Multi-agent systems distribute work across specialised agents, enabling parallelism, specialisation, and tasks that exceed a single context window.

---

## When to Go Multi-Agent

Single agent first. Only add agents when you hit real limits:
- Task requires more context than fits in one window (50+ page document analysis)
- Independent subtasks that can run in parallel (10x speedup potential)
- Specialised expertise that's better isolated (code review agent vs deployment agent)
- Safety: isolate risky operations in sandboxed subagents

Multi-agent overhead is real: communication latency, context marshalling, harder debugging. Don't pay it without a clear benefit.

---

## The Three Fundamental Patterns

### 1. Supervisor / Orchestrator

A central orchestrator LLM routes tasks to specialist sub-agents via tool calls. The orchestrator maintains global state and synthesises final results.

```
User Request
     ↓
[Orchestrator LLM]
 ├─ route to research_agent → results
 ├─ route to code_agent     → results
 └─ synthesise → final answer
```

**Strengths:** Clear control flow, easy to debug, orchestrator has full picture.

**Weaknesses:** Orchestrator is a bottleneck; sequential by default unless orchestrator explicitly parallelises.

**Implementation:** LangGraph Supervisor pattern. The orchestrator uses tool calls to invoke sub-agents; each sub-agent is itself a compiled graph.

### 2. Swarm / Handoff

Agents transfer control directly to each other. No central coordinator. The active agent decides who should handle the next step.

```
User Request
     ↓
[Agent A] → handoff_to_B() → [Agent B] → handoff_to_C() → [Agent C] → FINISH
```

**Strengths:** Decentralised, each agent only knows its own concern.

**Weaknesses:** Hard to reason about overall state; routing bugs create infinite loops; hard to add cross-agent monitoring.

**Implementation:** LangGraph `Command(goto="agent_name")` for handoffs. OpenAI Swarm library popularised this pattern.

### 3. Parallel Fan-Out / Fan-In

Dispatch N independent subtasks simultaneously, gather results, synthesise.

```
[Orchestrator] ─┬─ subagent_1 (parallel) ─┐
                ├─ subagent_2 (parallel) ──┤─ [Merge node] → answer
                └─ subagent_3 (parallel) ─┘
```

**Strengths:** Best for throughput — N tasks in time of 1.

**Weaknesses:** All subtasks must be truly independent; merge step can be complex.

**Implementation:** LangGraph parallel node branches with a `RunnableParallel` merge.

---

## Context Window Management in Multi-Agent

Each agent in a multi-agent system gets its own context window. This is both a benefit (no shared state pollution) and a challenge (state must be explicitly handed off).

**Patterns for cross-agent state:**

1. **Structured message passing** — marshal state to/from JSON in the handoff payload
2. **Shared external store** — Redis, database, or vector store that all agents read/write
3. **Summarisation before handoff** — compress prior context to fit in the next agent's window

Never pass the full conversation history between agents unless truly necessary. It eats context budget and introduces noise.

---

## Trust and Security in Multi-Agent

In a chain of agents, a compromised or mistaken agent can cause downstream harm. Core principle: **each agent should validate its inputs, not blindly trust the previous agent.**

- Tool-calling agents should verify tool results before incorporating them
- Agents receiving instructions from other agents should apply the same safety checks as for human instructions
- Use minimum-privilege tool scopes per agent — the research agent doesn't need write access

See [[security/prompt-injection]] for prompt injection via agent messages.

---

## Agent Memory Architecture

| Memory type | Storage | Scope | Use |
|---|---|---|---|
| **In-context** | Context window | Current run | Conversation history, task state |
| **External episodic** | Vector store | Cross-run | Past experiences, learned facts |
| **External semantic** | Database | Cross-agent | Shared knowledge base, user profiles |
| **Working memory** | State dict | Current graph run | Intermediate computation |

For long-running agents: summarise in-context memory every N turns. Store summaries in external episodic memory (a vector store with timestamps). At session start, retrieve relevant summaries.

---

## Debugging Multi-Agent Systems

The hardest part. Strategies:

1. **Trace every agent call** — Langfuse/LangSmith can trace nested agent calls as a parent-child span tree
2. **Structured logging with agent ID** — always tag log lines with which agent generated them
3. **Deterministic replay** — LangGraph checkpointing enables re-running from any saved state
4. **Unit test individual agents** — test each agent in isolation before testing the full system
5. **Visualise the graph** — LangGraph Studio renders the full agent topology

---

## Key Facts

- Supervisor pattern: orchestrator routes via tool calls; sequential by default unless parallelised explicitly
- Swarm/handoff pattern: `Command(goto="agent_name")` in LangGraph; decentralised routing
- Parallel fan-out requires all subtasks to be truly independent or merge step complexity explodes
- Each agent gets its own context window — state must be explicitly marshalled between agents
- Minimum-privilege tool scopes per agent is a security requirement, not an optimisation
- LangGraph Studio visualises the full agent topology for debugging

## Common Failure Cases

**Supervisor orchestrator exceeds context budget marshalling sub-agent results**  
Why: each sub-agent returns full verbose output; the supervisor accumulates all results before synthesising, filling its context window.  
Detect: supervisor token usage exceeds 80% of the context budget on runs with 4+ sub-agents; responses degrade in coherence.  
Fix: instruct sub-agents to return structured summaries, not raw transcripts; have each sub-agent compress to key findings before returning.

**Swarm handoff creates an infinite loop between two agents**  
Why: agent A's exit condition matches agent B's entry condition and vice versa; neither has a termination path.  
Detect: the same two agent names alternate in trace spans indefinitely; token spend keeps climbing.  
Fix: add a global `step_count` state field; add an explicit `FINISH` transition if step_count exceeds a threshold.

**Parallel fan-out produces conflicting results that the merge step cannot reconcile**  
Why: two sub-agents independently analyse the same data and reach different conclusions; the merge step receives contradictory facts.  
Detect: merge step output contains hedging language ("some agents say X, others say Y"); or merge node raises a logic error.  
Fix: assign non-overlapping data partitions to parallel agents; if overlap is unavoidable, design the merge to resolve conflicts by recency or confidence score.

**State handoff between agents loses fields due to dict serialisation mismatch**  
Why: agent A returns a dict with extra keys; when deserialized into agent B's TypedDict, extra keys are silently dropped.  
Detect: agent B behaves as if it didn't receive certain fields that agent A clearly computed.  
Fix: use a shared `AgentState` TypedDict that all agents in the system reference; avoid ad-hoc dicts for cross-agent payloads.

**Minimum-privilege tool scoping causes sub-agent to fail on an unforeseen capability need**  
Why: the sub-agent was given read-only tools but discovers it needs to write a result; it either fails silently or calls a forbidden tool.  
Detect: sub-agent returns an incomplete result with a note that it "couldn't complete step X"; tool call logs show denied calls.  
Fix: iterate on tool assignments during testing before production; add a structured error return type that surfaces capability gaps to the supervisor.

## Connections

- [[agents/langgraph]] — LangGraph is the primary implementation surface for all three patterns
- [[agents/react-pattern]] — the single-agent ReAct loop that each agent in a multi-agent system uses
- [[agents/memory]] — memory architecture choices (shared vs private) within multi-agent systems
- [[protocols/a2a]] — cross-framework agent-to-agent communication protocol
- [[observability/platforms]] — tracing nested agent calls as parent-child span trees
- [[security/prompt-injection]] — prompt injection via inter-agent messages is a distinct attack surface
- [[agents/openai-agents-sdk]] — OpenAI's framework implementing the same supervisor and handoff patterns

## Open Questions

- At what task complexity does the communication overhead of multi-agent systems outweigh the parallelism benefit?
- How do you deterministically test swarm patterns where handoff routing is model-driven?
- What are the latency characteristics of LangGraph parallel branches at scale vs sequential orchestration?
