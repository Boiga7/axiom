---
type: entity
category: protocols
tags: [a2a, agent-to-agent, google, adk, protocol, multi-agent]
sources: []
updated: 2026-04-29
para: resource
tldr: Google's April 2025 agent-to-agent protocol — Agent Cards at /.well-known/agent.json, Task state machine, SSE streaming, complementing MCP (tools) with peer-to-peer agent delegation.
---

# A2A Protocol (Agent-to-Agent)

> **TL;DR** Google's April 2025 agent-to-agent protocol — Agent Cards at /.well-known/agent.json, Task state machine, SSE streaming, complementing MCP (tools) with peer-to-peer agent delegation.

Google's open protocol for agent-to-agent communication. Announced April 2025 with the Google Agent Development Kit (ADK). Enables agents built on different frameworks to discover each other, delegate tasks, and exchange results.

---

## What Problem It Solves

MCP handles tool connectivity (agent ↔ tool). A2A handles peer connectivity (agent ↔ agent). When you have a network of specialised agents. A planning agent, a coding agent, a web research agent. A2A gives them a standard way to communicate without tight coupling.

---

## Core Concepts

### Agent Card

A JSON manifest that describes an agent's capabilities, location, and supported operations. Served at `/.well-known/agent.json`.

```json
{
  "name": "research-agent",
  "description": "Performs web research and returns structured summaries",
  "url": "https://research.example.com/agent",
  "capabilities": {
    "streaming": true,
    "push_notifications": false
  },
  "skills": [
    {
      "id": "web_research",
      "name": "Web Research",
      "description": "Searches the web and summarises findings",
      "inputModes": ["text"],
      "outputModes": ["text", "data"]
    }
  ]
}
```

### Tasks

The unit of work in A2A. An agent sends a Task to another agent and gets back a Task result. Tasks have:
- A unique ID
- An input message (text, files, data)
- State machine: `submitted → working → input-required → completed/failed`
- Streaming support (SSE for incremental results)

### Message and Part Types

A2A messages contain Parts: `TextPart`, `FilePart`, `DataPart`. This mirrors the multimodal structure of LLM APIs.

---

## How It Relates to MCP

| Aspect | MCP | A2A |
|---|---|---|
| Connects | Agent ↔ Tool | Agent ↔ Agent |
| Initiator | Agent (client) | Agent (client) |
| Responder | Tool (server) | Agent (server) |
| State | Stateless tools | Stateful tasks |
| Streaming | Streamable HTTP | SSE |
| Auth | OAuth 2.0 / API key | OAuth 2.0 |

In a real system you use both: MCP for tools (file system, web search, database), A2A for agent-to-agent delegation.

---

## Google ADK Integration

The Google Agent Development Kit natively supports A2A. Agents built with ADK automatically expose an A2A endpoint when deployed.

```python
from google.adk.agents import Agent
from google.adk.tools import google_search

research_agent = Agent(
    name="researcher",
    model="gemini-2.0-flash",
    tools=[google_search],
    description="Researches topics and returns summaries"
)
# Deploy → automatically serves /.well-known/agent.json
```

---

## LangGraph Integration

A2A is not natively built into LangGraph, but the A2A Python SDK provides an adapter. A remote A2A agent can be wrapped as a LangGraph tool node, making it callable from a LangGraph graph like any other tool.

---

## Adoption Status (April 2026)

A2A was transferred to the Linux Foundation in June 2025 and has grown to 150+ supporting organisations as of April 2026, including LangChain, Salesforce, SAP, ServiceNow, Workday, and all major cloud platforms. Wider than MCP in enterprise multi-vendor contexts; MCP remains dominant for tool and data connectivity.

---

## ACP (Agent Communication Protocol)

An alternative agent-to-agent protocol developed by IBM, originating from the open-source BeeAI project (reference implementation at `i-am-bee/acp`). Uses JSON-RPC over HTTP/WebSockets. Now under Linux Foundation governance. More opinionated about message formats than A2A; tighter integration with enterprise workflow systems. Smaller ecosystem than A2A.

---

## Key Facts

- Announced: April 2025 with Google Agent Development Kit (ADK)
- Agent Card: JSON manifest served at `/.well-known/agent.json`; describes capabilities, URL, skills
- Task state machine: submitted → working → input-required → completed/failed
- MCP vs A2A: MCP connects agent↔tool (stateless); A2A connects agent↔agent (stateful tasks)
- ADK agents automatically expose an A2A endpoint when deployed
- ACP (IBM/BeeAI): alternative agent protocol; JSON-RPC over HTTP/WS; Linux Foundation governance; smaller ecosystem than A2A
- LangGraph: unofficial A2A adapter via Python SDK; not natively integrated

## Common Failure Cases

**Agent Card not discovered because `/.well-known/agent.json` returns 404 behind a path-prefix reverse proxy**  
Why: if the agent is deployed at `https://example.com/agents/research/`, the A2A client looks for `https://example.com/.well-known/agent.json` at the root, not at the agent's sub-path; the route does not exist.  
Detect: `A2AClientError: Failed to fetch agent card from /.well-known/agent.json`; the card is accessible at the sub-path URL but not the root.  
Fix: configure the reverse proxy to serve the Agent Card at the domain root `/.well-known/agent.json`; or register the agent with its full canonical URL including the path prefix in your agent registry.

**Task stuck in `working` state indefinitely because the remote agent crashed without sending a terminal state**  
Why: A2A has no built-in heartbeat or timeout; if the remote agent process dies during execution, the task remains `working` forever and the calling agent waits indefinitely.  
Detect: tasks with `working` state older than the expected maximum execution time; the remote agent's health endpoint is down.  
Fix: implement a task timeout in the calling agent (poll task state and cancel after N seconds); remote agents must catch exceptions and transition to `failed` state rather than crashing silently.

**SSE streaming connection drops mid-task, and the calling agent re-submits the task, causing duplicate execution**  
Why: SSE connections drop on network interruption; the A2A spec does not guarantee exactly-once delivery; a calling agent that re-submits after a disconnection may trigger the remote agent to run the task twice.  
Detect: remote agent logs show two executions of the same task ID; side effects (API calls, file writes) occur twice.  
Fix: implement idempotency on the remote agent using the task ID as the idempotency key; check whether the task ID already exists before starting execution; return the existing result if found.

**`input-required` task state ignored by the calling agent, causing the task to time out**  
Why: `input-required` signals that the remote agent needs clarification; if the calling agent's loop only handles `completed` and `failed` states, it never sends the required input and the task stalls.  
Detect: tasks consistently time out on multi-turn workflows; remote agent logs show state transition to `input-required` with no subsequent input message.  
Fix: handle all five task states in the calling agent's polling loop; implement a handler for `input-required` that either asks the user for clarification or provides a default response.

## Connections

- [[protocols/mcp]] — tool connectivity (complementary to A2A)
- [[agents/langgraph]] — multi-agent orchestration that can wrap A2A agents
- [[agents/multi-agent-patterns]] — when and how to use agent-to-agent delegation
- [[agents/google-adk]] — the reference Python SDK for building A2A-compatible agents

## Open Questions

- Will A2A achieve the same cross-framework adoption as MCP, or remain primarily a Google/ADK feature?
- How does A2A's task state machine handle partial failures in long-running agent delegations?
- Does ACP (IBM) offer meaningful advantages over A2A for enterprise workflow systems?
