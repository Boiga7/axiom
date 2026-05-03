---
type: entity
category: agents
tags: [google-adk, google, agents, multi-agent, a2a, python, vertex-ai, gemini]
sources: [raw/inbox/google-adk-websearch-2026-05-03.md]
updated: 2026-05-03
para: resource
tldr: Google's open-source Python SDK for building production-ready agents — code-first, A2A-native, deploys to Vertex AI Agent Engine. v1.0.0 went GA in 2025; v1.18.0 is the current release (November 2025).
---

# Google Agent Development Kit (ADK)

> **TL;DR** Google's open-source Python SDK for building production-ready agents — code-first, A2A-native, deploys to Vertex AI Agent Engine. v1.0.0 went GA in 2025; v1.18.0 is the current release (November 2025).

Google's official Python framework for building, evaluating, and deploying AI agents. Released alongside the [[protocols/a2a]] protocol in April 2025. By November 2025, it reached v1.18.0 with active ongoing development. Designed to complement — not replace — existing frameworks: LangGraph agents can be wrapped as A2A agents and interoperate with ADK agents.

> [Source: google/adk-python GitHub, Google Developers Blog, 2026-05-03]

---

## Key Facts

- **GitHub**: [google/adk-python](https://github.com/google/adk-python)
- **Docs**: https://google.github.io/adk-docs
- **PyPI**: `pip install google-adk`
- **v1.0.0**: first stable/GA release — all core interfaces moved to async
- **v1.18.0**: current release as of November 5, 2025
- **A2A native**: the reference SDK for building agents that speak the [[protocols/a2a]] protocol
- **Deploy to**: Vertex AI Agent Engine (via `google-cloud-aiplatform >= 1.95.0`)
- **Default model**: Gemini (any Gemini model via Vertex AI or Google AI Studio)

---

## Core Pattern

```python
from google.adk.agents import LlmAgent
from google.adk.tools import google_search

root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="research_agent",
    instruction="You are a helpful research assistant. Use google_search to find current information.",
    tools=[google_search]
)
```

Agents are Python objects. Tools are Python functions decorated with `@tool` or built-in tools. The ADK handles the ReAct loop automatically.

---

## Architecture

### Agents

- **LlmAgent**: the standard agent — wraps a Gemini model, tools, and instructions
- **SequentialAgent**: runs sub-agents in sequence, passing state forward
- **ParallelAgent**: runs sub-agents concurrently, merges results
- **LoopAgent**: repeats a sub-agent until a termination condition is met

### Tools

```python
from google.adk.tools import FunctionTool

def get_stock_price(ticker: str) -> dict:
    """Fetch the current stock price for a ticker symbol."""
    # ... API call
    return {"ticker": ticker, "price": 182.45, "currency": "USD"}

price_tool = FunctionTool(get_stock_price)
```

Type hints and docstrings generate the tool schema. The Gemini model sees the schema and decides when to call the tool.

### Sessions and Memory

ADK v1.0.0 made all session/artifact/memory service interfaces async:

```python
from google.adk.sessions import InMemorySessionService

session_service = InMemorySessionService()
session = await session_service.create_session(
    app_name="my_agent",
    user_id="user-123"
)
```

For production, use `VertexAiSessionService` to persist sessions in Vertex AI.

---

## Multi-Agent with A2A

ADK's primary multi-agent pattern uses the [[protocols/a2a]] protocol. Agents expose themselves as A2A services; other agents discover them via Agent Cards at `/.well-known/agent.json`.

```python
from google.adk.a2a import A2AServer

# Make this agent available as an A2A service
server = A2AServer(agent=research_agent, port=8080)
await server.start()
```

A root agent can delegate to remote A2A agents:

```python
from google.adk.a2a import A2AClient

remote_agent = A2AClient(url="http://research-agent:8080")
root_agent = LlmAgent(
    model="gemini-2.0-flash",
    name="orchestrator",
    tools=[remote_agent.as_tool()]
)
```

This lets you build networks of specialised agents built on different frameworks (LangGraph, CrewAI, AutoGen) as long as they implement A2A.

---

## Deployment: Vertex AI Agent Engine

```python
import vertexai
from vertexai.preview import reasoning_engines

vertexai.init(project="my-project", location="us-central1")

app = reasoning_engines.ReasoningEngine.create(
    reasoning_engines.AdkApp(agent=root_agent),
    requirements=["google-adk>=1.0.0"],
)

# Query the deployed agent
response = app.query(input="What's the latest on quantum computing?")
```

Agent Engine provides managed hosting, session persistence, logging, and horizontal scaling.

---

## vs LangGraph

| Dimension | Google ADK | LangGraph |
|---|---|---|
| Graph model | Implicit (SequentialAgent, ParallelAgent) | Explicit graph (nodes, edges, state) |
| A2A protocol | Native | Via adapter |
| Default model | Gemini | Any (model-agnostic) |
| Deployment | Vertex AI Agent Engine | LangGraph Cloud (or self-host) |
| Checkpointing | Via Vertex AI sessions | Built-in, pluggable |
| Framework flexibility | ADK-native tools | Any LangChain/custom tool |
| Best for | Google Cloud AI stacks, A2A interop | Fine-grained stateful workflows, HITL |

---

## Connections

- [[protocols/a2a]] — ADK is the reference implementation of the A2A protocol
- [[agents/langgraph]] — primary competitor; LangGraph agents can be wrapped as A2A agents for ADK interop
- [[agents/strands-agents-sdk]] — AWS equivalent; also A2A compatible
- [[apis/google-ai]] — Gemini models that power ADK agents
- [[agents/multi-agent-patterns]] — Supervisor, parallel fan-out, and sequential patterns ADK implements
- [[infra/deployment]] — Vertex AI Agent Engine for managed ADK deployment

## Open Questions

- When does ADK beat LangGraph? (ADK wins when you need A2A interop or are all-in on Google Cloud; LangGraph wins when you need fine-grained graph control or HITL interrupts)
- How does ADK Python 2.0 Beta (workflows + agent teams) change the architecture? [unverified — monitor release notes]
- Does ADK support non-Gemini models for production workloads without LiteLLM?
