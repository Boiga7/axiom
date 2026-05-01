---
type: entity
category: agents
para: resource
tags: [langgraph, cloud, platform, deployment, checkpointing, studio, scaling, langsmith]
tldr: LangGraph Cloud (now part of LangSmith Deployment) is the managed runtime for LangGraph agents. Handles persistence, horizontal scaling, and Studio UI. Cloud (SaaS) is fastest to start; self-hosted is available for compliance.
sources: []
updated: 2026-05-01
---

# LangGraph Cloud / LangGraph Platform

> **TL;DR** LangGraph Cloud (now part of LangSmith Deployment) is the managed runtime for LangGraph agents. Handles persistence, horizontal scaling, and Studio UI. Cloud (SaaS) is fastest to start; self-hosted is available for compliance.

## Key Facts
- LangGraph Platform GA'd in 2025; as of late 2025 it is branded "LangSmith Deployment"
- Manages persistence (Postgres checkpointer), horizontal scaling, and task queues automatically
- LangGraph Studio: interactive environment for visualising, debugging, and stepping through agent runs
- Three deployment options: Cloud (SaaS fastest), self-hosted managed, self-hosted (DIY)
- LangGraph 1.0 (October 2025) was the first stable release, signalling production readiness
- All checkpoints are stored automatically — no lost work even if the agent runs for hours or days
- Streaming is built-in: real-time token output, state updates, and custom events

## The Platform Stack

```
LangSmith (observability, eval, annotation)
  └── LangGraph Platform (deployment runtime)
        ├── Task queues (horizontal scaling)
        ├── Postgres checkpointer (durable state)
        ├── API server (exposes agent as HTTP API)
        └── LangGraph Studio (debug UI)
```

When you deploy a LangGraph agent to the platform:
1. Your agent code is packaged and deployed
2. The platform provisions infrastructure: Postgres for checkpointing, task queues for parallelism
3. An HTTP API is exposed for your clients to interact with
4. Studio UI connects to that API for visual debugging

## Deployment Options

### Cloud (SaaS) — recommended for speed

```bash
pip install langgraph-cli
langgraph deploy
```

Fastest path. Hosted by LangChain. Postgres and task queues provisioned automatically. Metrics and logs via LangSmith dashboard.

### Self-Hosted Managed

LangChain manages the infrastructure in your cloud account (AWS/GCP/Azure). You own the data; LangChain manages the ops. For compliance requirements that prevent using SaaS.

### Self-Hosted (DIY)

You run the platform infrastructure yourself. Full control. Requires managing Postgres, Redis/queue, and the server process. Only for teams with infrastructure capability and strict data sovereignty needs.

## LangGraph Studio

Studio is an IDE-like environment for agent workflows:

**What it shows:**
- Visual graph of your agent's nodes and edges
- State at every checkpoint, inspectable mid-run
- Real-time message flow as the agent executes
- Breakpoints: pause execution at any node

**What you can do:**
- Step forward through an agent run one node at a time
- Modify state mid-execution and continue
- Branch to explore alternative paths from any checkpoint
- Replay failed runs from the last successful checkpoint

```python
# Studio connects automatically when you run in development mode
langgraph dev  # starts local Studio at localhost:8123
```

## Checkpointing in the Platform

The platform provisions a Postgres checkpointer automatically. Your graph code doesn't change:

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list
    eval_results: list

# Build your graph normally
graph = StateGraph(AgentState)
graph.add_node("evaluate", run_evals)
graph.add_node("report", generate_report)
graph.add_edge("evaluate", "report")
graph.add_edge("report", END)

# The platform handles checkpointing — no explicit checkpointer needed
app = graph.compile()
```

When deployed, every node execution is checkpointed. If the agent crashes, it resumes from the last checkpoint on the next invocation.

## Invoking Deployed Agents

The platform exposes an HTTP API for your deployed agent:

```python
from langgraph_sdk import get_client

client = get_client(url="https://your-deployment.langchain.app")

# Create a thread (analogous to a conversation)
thread = await client.threads.create()

# Run the agent
async for chunk in client.runs.stream(
    thread["thread_id"],
    assistant_id="your-agent-name",
    input={"messages": [{"role": "user", "content": "Run the eval suite"}]},
    stream_mode="updates",
):
    print(chunk.data)
```

## Horizontal Scaling

The platform uses task queues to handle concurrent agent runs:

- Multiple instances of your agent can run simultaneously
- The Postgres checkpointer is shared — any instance can resume any thread
- Queue depth is configurable; auto-scales based on load
- No sticky session requirement — stateless agent execution with external state store

## Cron and Scheduled Runs

```python
# Schedule a daily eval run via the platform API
cron = await client.crons.create(
    assistant_id="evalcheck-agent",
    schedule="0 6 * * *",  # 6 AM UTC daily
    input={"messages": [{"role": "user", "content": "Run daily eval suite"}]},
)
```

## When to Use LangGraph Platform

Use it when:
- Your agent needs to run reliably for hours or days without supervision
- You need pause/resume across sessions (HITL workflows)
- You're running many concurrent agent instances
- You need a visual debugging environment for complex graphs
- Production observability via LangSmith is required

Don't need it when:
- Your agent completes in seconds (simple tool call + response)
- You're still prototyping (run locally with `langgraph dev`)
- Your use case fits a simpler framework (CrewAI Flows, OpenAI Agents SDK)

> [Source: LangGraph Platform GA announcement, LangChain Blog, 2025]
> [Source: LangGraph 1.0 release notes, October 2025]

## Connections
- [[agents/langgraph]] — the framework this platform runs
- [[agents/multi-agent-patterns]] — multi-agent patterns that the platform scales
- [[observability/platforms]] — LangSmith (integrated with LangGraph Platform) for traces and evals
- [[infra/deployment]] — self-hosted deployment considerations
- [[para/projects]] — evalcheck and mcpindex are candidates for platform deployment when agent workflows are added

## Open Questions
- What is the pricing model for LangGraph Platform (SaaS) — per-run, per-seat, or usage-based?
- Can you deploy a LangGraph agent that calls Claude without going through LangChain's model wrappers?
