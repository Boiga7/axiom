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

MCP handles tool connectivity (agent ↔ tool). A2A handles peer connectivity (agent ↔ agent). When you have a network of specialised agents — a planning agent, a coding agent, a web research agent — A2A gives them a standard way to communicate without tight coupling.

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

A2A is younger than MCP. Adoption is concentrated in Google ecosystem (Vertex AI agents, ADK) and enterprises running multi-cloud agent networks. LangChain and AutoGen have experimental support. Less widespread than MCP in independent projects. [unverified]

---

## ACP (Agent Communication Protocol)

An alternative agent-to-agent protocol, developed by IBM and BeeAgent. More opinionated about message formats; tighter integration with enterprise workflow systems. Smaller ecosystem than A2A. [unverified]

---

## Key Facts

- Announced: April 2025 with Google Agent Development Kit (ADK)
- Agent Card: JSON manifest served at `/.well-known/agent.json`; describes capabilities, URL, skills
- Task state machine: submitted → working → input-required → completed/failed
- MCP vs A2A: MCP connects agent↔tool (stateless); A2A connects agent↔agent (stateful tasks)
- ADK agents automatically expose an A2A endpoint when deployed
- ACP (IBM/BeeAgent): alternative agent protocol; smaller ecosystem [unverified]
- LangGraph: unofficial A2A adapter via Python SDK; not natively integrated

## Connections

- [[protocols/mcp]] — tool connectivity (complementary to A2A)
- [[agents/langgraph]] — multi-agent orchestration that can wrap A2A agents
- [[agents/multi-agent-patterns]] — when and how to use agent-to-agent delegation

## Open Questions

- Will A2A achieve the same cross-framework adoption as MCP, or remain primarily a Google/ADK feature?
- How does A2A's task state machine handle partial failures in long-running agent delegations?
- Does ACP (IBM) offer meaningful advantages over A2A for enterprise workflow systems?
