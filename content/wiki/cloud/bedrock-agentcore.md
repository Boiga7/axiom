---
type: entity
category: cloud
tags: [aws, bedrock, agentcore, serverless, agents, microvm, deployment, langgraph, strands]
sources: [raw/inbox/bedrock-agentcore-websearch-2026-05-03.md]
updated: 2026-05-03
para: resource
tldr: AWS's serverless hosting platform for AI agents. GA October 2025. Each session runs in a dedicated microVM with isolated CPU/memory. Pay-per-second billing — no charge during LLM/tool I/O wait. Supports LangGraph, Strands, CrewAI, and any Python framework.
---

# Amazon Bedrock AgentCore Runtime

> **TL;DR** AWS's serverless hosting platform for AI agents. GA October 2025. Each session runs in a dedicated microVM with isolated CPU/memory. Pay-per-second billing — no charge during LLM/tool I/O wait. Supports LangGraph, Strands, CrewAI, and any Python framework.

AWS's purpose-built hosting layer for agentic workloads. Released into general availability on October 13, 2025. Solves the operational problem of running long-running, I/O-heavy agents without paying for idle compute. AgentCore Runtime is one component of the broader Amazon Bedrock AgentCore suite, which also includes memory, identity, and gateway services.

> [Source: AWS official documentation and blog, 2026-05-03]

---

## Key Facts

- **GA date**: October 13, 2025
- **Landing page**: https://aws.amazon.com/bedrock/agentcore/
- **Framework support**: LangGraph, Strands Agents, CrewAI, or any Python code
- **Model agnostic**: Bedrock models, Anthropic Claude direct, Google Gemini, OpenAI
- **Billing model**: per-second, consumption-based
- **Session isolation**: dedicated microVM per session

---

## Why AgentCore Runtime Exists

Traditional serverless (Lambda) doesn't fit agents:
- Lambda max execution: 15 minutes — many agent tasks run longer
- Lambda cold starts interrupt conversational sessions
- Lambda doesn't maintain in-memory state between tool calls

EC2/ECS/Fargate fits agents but is wasteful:
- Agents spend 30–70% of session time in I/O wait (LLM calls, tool calls, DB queries)
- You pay for compute even when nothing runs

AgentCore Runtime solves this: **you only pay for CPU cycles actually consumed**. During LLM/tool I/O wait, no CPU charge accrues.

---

## Pricing

| Resource | Price |
|---|---|
| CPU | $0.0895 per vCPU-hour |
| Memory | $0.00945 per GB-hour |

Billing: per-second increments, minimum 1 second. Only actual CPU consumption and peak memory charged.

**Example** — a 10-minute agent session that spends 65% time waiting on LLM responses:
- Effective CPU billing: ~3.5 minutes of actual compute
- Much cheaper than Fargate at 10 full minutes

---

## Session Lifecycle and Isolation

Each session runs in a **dedicated microVM**:

```
Boot → Initialize agent code → Process requests → (idle during I/O) → Terminate
```

Isolation guarantees:
- Separate CPU, memory, and filesystem per session
- After session end: microVM terminated, memory sanitised
- No cross-session contamination — each user's agent runs in its own VM

This makes AgentCore suitable for multi-tenant AI agents (one VM per user).

---

## Deployment Methods

### 1. Container-based (for production)

```bash
# Build and push your agent as a Docker image
docker build -t my-agent .
aws ecr get-login-password | docker login --username AWS --password-stdin <account>.dkr.ecr.us-east-1.amazonaws.com
docker push <account>.dkr.ecr.us-east-1.amazonaws.com/my-agent:latest

# Deploy to AgentCore Runtime
aws bedrock-agentcore create-agent-runtime \
  --runtime-name my-agent \
  --runtime-artifact containerImage={imageUri=<ecr-uri>}
```

### 2. Direct code upload (added November 2025)

Zip your Python code and upload — no Docker required:

```bash
zip -r agent.zip . -x "*.pyc" "__pycache__/*"
aws bedrock-agentcore create-agent-runtime \
  --runtime-name my-agent \
  --runtime-artifact codeArchive={s3Uri=s3://my-bucket/agent.zip}
```

Best for rapid prototyping and iteration.

---

## Framework Integration: LangGraph

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class AgentState(TypedDict):
    messages: list

def build_graph():
    # ... your LangGraph agent
    return graph.compile()

# AgentCore Runtime invokes this as your agent endpoint
# Configure via runtime environment variables
agent = build_graph()
```

AgentCore Runtime wraps your agent in an HTTP server and manages session routing.

---

## Framework Integration: Strands Agents

```python
from strands import Agent
from strands.models import BedrockModel

agent = Agent(
    model=BedrockModel(model_id="us.anthropic.claude-sonnet-4-6-20250514-v1:0"),
    system_prompt="You are a DevOps assistant."
)

# Strands agents deploy natively to AgentCore Runtime via the Strands SDK
```

See [[agents/strands-agents-sdk]] — Strands is AWS's own agent SDK and is designed to deploy to AgentCore Runtime.

---

## MCP Server Hosting

AgentCore Runtime can host MCP servers as well as agents. Deploy an MCP server alongside an agent, or make MCP tools available to multiple agents:

```bash
# Deploy an MCP server to AgentCore
aws bedrock-agentcore create-agent-runtime \
  --runtime-name my-mcp-server \
  --runtime-artifact codeArchive={s3Uri=s3://my-bucket/mcp-server.zip} \
  --runtime-type MCP_SERVER
```

---

## Enterprise Features (GA)

All available at GA:
- **VPC integration**: deploy agents inside your VPC for private networking
- **AWS PrivateLink**: connect to AgentCore endpoints without public internet
- **CloudFormation**: provision and manage runtimes as IaC
- **Resource tagging**: cost allocation, access control

---

## vs Alternatives

| Option | Best for | Weakness |
|---|---|---|
| AgentCore Runtime | Long-running agents on AWS, multi-tenant | AWS vendor lock-in |
| Lambda | Short async tasks (<15 min) | No session state, time limit |
| Fargate | Always-on agents, custom networking | Pay for idle compute |
| Modal | GPU-heavy agents, Python-first | Smaller ecosystem |
| Cloud Run | GCP-native agents | No AWS ecosystem integration |

---

## Connections

- [[agents/strands-agents-sdk]] — AWS's agent SDK; designed to deploy natively to AgentCore Runtime
- [[cloud/aws-core]] — EC2, Lambda, ECS context for understanding when AgentCore Runtime wins
- [[agents/langgraph]] — LangGraph agents can be hosted on AgentCore Runtime
- [[protocols/mcp]] — AgentCore Runtime can host MCP servers alongside agents
- [[infra/deployment]] — deployment options comparison for AI systems
- [[cloud/aws-lambda-patterns]] — Lambda is the alternative for short-running tasks

## Open Questions

- How does AgentCore Runtime handle agent checkpointing for very long sessions (>1 hour)?
- What is the microVM boot latency at session start — does it add cold-start overhead?
- Can AgentCore Runtime session affinity route the same user to the same microVM across multiple turns?
