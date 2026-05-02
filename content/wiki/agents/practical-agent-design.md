---
type: synthesis
category: agents
para: resource
tags: [agents, orchestration, tools, guardrails, production, openai, single-agent, multi-agent]
tldr: Single agent first — only escalate to multi-agent when tooling-rich single agents consistently fail. Tools have three types. Guardrails are layered, not singular.
sources: []
updated: 2026-05-01
---

# Practical Agent Design

> **TL;DR** Single agent first — only escalate to multi-agent when tooling-rich single agents consistently fail. Tools have three types. Guardrails are layered, not singular.

## Key Facts
- An agent = LLM + tools + instructions in a loop until task complete or ceiling hit
- Most workflows don't need multi-agent; start with one agent and good tooling, add complexity only when that ceiling is genuinely reached
- Tools fall into exactly three types: data retrieval, action execution, orchestration (agents calling agents)
- No single guardrail is sufficient — use multiple, layered; add new ones from observed failure modes, not anticipated ones
- Model selection should match task complexity: cheap/fast for retrieval and classification, capable for judgment calls
- Workflow redesign has more ROI impact than model selection (McKinsey, 2025): enterprises get this backwards
- Path to production: start small, validate with real users, grow capabilities over time

## When to Use Agents

Agents make sense when:
- The task requires multiple steps with decision points between them
- The optimal path cannot be determined upfront (dynamic tool selection needed)
- Long-running workflows benefit from checkpointing and resumption
- Human-in-the-loop at specific decision points adds meaningful risk mitigation

Agents are overkill when:
- A single LLM call with good prompting solves the problem
- The workflow is linear and fully determined (no branching)
- Latency requirements rule out multi-turn loops
- The task is a single retrieval + generation (use [[rag/pipeline]] instead)

## The Three Components

### Models

Match capability to task, not hype:

| Task type | Model tier |
|---|---|
| Intent classification, retrieval, filtering | Small/fast (Haiku 4.5, GPT-4o-mini) |
| Structured output, summarisation | Medium (Sonnet 4.6, GPT-4o) |
| Complex judgment, multi-step reasoning | Capable (Opus 4.7, o3) |

Using frontier models for every step is the most common source of avoidable agent cost.

### Tools

Every tool falls into one of three categories:

1. **Data retrieval** — query databases, read files, search the web, call read-only APIs. Idempotent; safe to retry.
2. **Action execution** — send emails, update CRM records, write files, call mutating APIs. Irreversible; guard carefully.
3. **Orchestration** — an agent calling another agent as a tool. The foundation of multi-agent design.

Tool design rules:
- If a human engineer cannot say definitively which tool to use in a given situation, the model cannot either — redesign the tools
- Self-contained: a tool should function without knowing the agent's broader task
- Robust: return structured error messages, not exceptions
- Minimal: a focused set of well-named tools outperforms a large set of overlapping ones

See [[protocols/tool-design]] for full naming and schema guidance.

### Instructions

High-quality instructions reduce ambiguity and improve decision quality. Practices:
- Use existing documentation (SOPs, runbooks) as source material rather than writing from scratch
- Break tasks into explicit decision steps rather than describing the goal abstractly
- Define clear branches: "If X, do Y; if Z, do W"
- Capture known edge cases explicitly — the model will not infer them reliably
- Use XML structuring for Claude: `<context>`, `<task>`, `<output_format>` (see [[prompting/techniques]])

## Orchestration Patterns

### Single-Agent (start here)

One agent, multiple tools, a loop until done. Handles the majority of real-world workflows.

```
Agent → Tool 1 → Agent → Tool 2 → Agent → Output
```

Add multi-agent only when this pattern consistently fails despite good tooling and clear instructions.

### Multi-Agent: Manager Pattern

A central manager agent coordinates specialised sub-agents via tool calls. Sub-agents are opaque to each other.

```
Manager Agent
  ├── Research Agent (tool call)
  ├── Drafting Agent (tool call)
  └── Review Agent (tool call)
```

When to use: tasks decompose naturally into distinct expert domains; single-agent context window is a genuine bottleneck.

### Multi-Agent: Decentralised (Handoff) Pattern

Agents operate as peers. Each hands off to the next based on task state. No central coordinator.

```
Intake Agent → Research Agent → Drafting Agent → Review Agent
```

When to use: sequential pipelines with clear handoff conditions. Analogous to LangGraph's `Command(goto=...)`. See [[agents/langgraph]] and [[agents/multi-agent-patterns]].

## Guardrails

Guardrails are layered, not singular. A single guardrail cannot protect against all failure modes:

| Layer | What it does | Priority |
|---|---|---|
| Input filtering | Block harmful or malformed requests before the agent processes them | Build first |
| Tool input validation | Validate tool arguments before execution | Build first |
| Destructive action confirmation | Require explicit approval before irreversible tool calls | Build first |
| Output filtering | Check agent output for policy violations before returning | Build early |
| Human-in-the-loop (HITL) | Pause at high-stakes decision points for human approval | Build early |
| Rate limiting | Prevent runaway tool calls or cost explosions | Build early |

Build guardrails incrementally: identify risks from real usage, add targeted guardrails, review as new failure modes emerge. See [[security/owasp-llm-top10]] for the threat taxonomy.

## Production Path

1. **Prototype** — single agent, minimal tools, representative test cases
2. **Validate** — real users, real data, measure where failures happen
3. **Harden** — add guardrails for observed failure modes only
4. **Scale** — add multi-agent patterns when the single-agent ceiling is genuinely hit
5. **Monitor** — trace every production agent; track cost, latency, error rate. See [[observability/tracing]]

> [Source: OpenAI Practical Guide to Building Agents, 2025] [unverified]

## Common Failure Cases

**Agent loop runs indefinitely when no termination condition is met**  
Why: the agent's instructions describe the goal but not when to stop; the model continues calling tools looking for more evidence.  
Detect: wall-clock time and token spend keep growing past the expected task duration; no `FINISH` or final answer.  
Fix: add a `max_iterations` hard limit (10-15 for most tasks); define explicit termination conditions in the instructions.

**Tool namespace collision causes wrong tool to be called**  
Why: two tools with similar names ("search", "web_search") cause the model to pick the wrong one for the context.  
Detect: enable tool call logging; count how often each tool is called vs how often it should be; unexpected high usage of one tool.  
Fix: rename tools to be unambiguous; use verb+noun patterns (`search_knowledge_base` vs `search_web`) and differentiate descriptions.

**Destructive action executes without user confirmation**  
Why: irreversible tools (delete_record, send_email) are called directly without a confirmation guardrail.  
Detect: review your tool list; any tool with `delete`, `send`, `update`, `post` in the name requires a confirmation gate.  
Fix: add a `confirm_action` tool that requires explicit approval before destructive calls; treat confirmation as part of the guardrail stack.

**Guardrail catches too aggressively, blocking legitimate requests**  
Why: input filters trained on harmful content patterns trigger on technical jargon ("execute", "inject", "exploit" in a coding context).  
Detect: legitimate user requests are blocked at a rate >1%; users report false positives.  
Fix: tune guardrail thresholds with domain-specific examples; add an allow-list for context-specific terminology.

**Single-agent context fills with irrelevant tool results, degrading later decisions**  
Why: tool results are appended to the conversation; after 10+ tool calls, the context contains stale, contradictory, or irrelevant observations.  
Detect: agent makes contradictory decisions mid-run; references tool results from 5+ steps ago when a fresher result exists.  
Fix: summarise or prune old tool results; keep only the 3-5 most recent observations in active context.

## Connections
- [[agents/langgraph]] — graph-based orchestration with checkpointing
- [[agents/multi-agent-patterns]] — supervisor, swarm, and fan-out patterns in depth
- [[agents/openai-agents-sdk]] — OpenAI's SDK implementation of these patterns
- [[agents/react-pattern]] — the single-agent loop foundation
- [[protocols/tool-design]] — tool naming, schemas, and return value design
- [[security/owasp-llm-top10]] — threat model for the guardrails layer
- [[security/guardrails]] — output validation libraries: instructor, Guardrails AI, NeMo Guardrails
- [[observability/tracing]] — monitoring agents in production
- [[prompting/context-engineering]] — managing context across long agent runs
- [[landscape/enterprise-ai-adoption]] — why workflow redesign matters more than model choice

## Open Questions
- At what task complexity does multi-agent consistently outperform a well-tooled single agent?
- How do you calibrate the right HITL threshold — too many checkpoints destroy the value proposition, too few create risk?
