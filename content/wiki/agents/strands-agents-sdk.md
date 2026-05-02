---
type: entity
category: agents
para: resource
tags: [strands, aws, bedrock, agents, python-sdk, mcp, tool-decorator, open-source]
sources: [raw/inbox/mcp-server-development-websearch-2026-05-02.md]
tldr: Strands Agents is AWS's open-source Python SDK for building agents in a few lines of code. Uses the Bedrock Converse API under the hood; @tool decorator turns any Python function into an agent tool; native MCP server support. Used in production by Amazon Q Developer and AWS Glue.
updated: 2026-05-02
---

# Strands Agents SDK

> **TL;DR** Strands Agents is AWS's open-source Python SDK for building agents in a few lines of code. Uses the Bedrock Converse API under the hood; `@tool` decorator turns any Python function into an agent tool; native MCP server support. Used in production by Amazon Q Developer and AWS Glue.

## Key Facts
- Open-source, built by AWS teams; used internally by Amazon Q Developer, AWS Glue, VPC Reachability Analyzer
- Model-driven: the LLM decides when to use tools; you write the tools
- Default model: Amazon Bedrock Converse API (any tool-use model)
- Also supports: Anthropic API directly, Llama API, Ollama (local), OpenAI via LiteLLM
- `@tool` decorator: any Python function becomes a tool — type hints generate the schema automatically
- Native MCP server support: consume any published MCP server as a tool source
- 20+ pre-built tools (file ops, HTTP requests, AWS API calls)
- Deploy to Amazon Bedrock AgentCore Runtime for serverless scaling

---

## Minimal Agent

```python
from strands import Agent
from strands.models import BedrockModel

agent = Agent(
    model=BedrockModel(model_id="us.anthropic.claude-sonnet-4-6-20250514-v1:0"),
    system_prompt="You are a helpful DevOps assistant."
)

response = agent("How many S3 buckets are in my AWS account?")
print(response)
```

The agent reasons about whether to use a tool, calls it if needed, observes the result, and repeats until it can answer.

---

## Defining Tools

```python
from strands import Agent, tool
import boto3

@tool
def list_s3_buckets() -> list[str]:
    """List all S3 bucket names in the current AWS account."""
    s3 = boto3.client("s3")
    return [b["Name"] for b in s3.list_buckets()["Buckets"]]

@tool
def get_object_count(bucket_name: str) -> int:
    """Count the number of objects in an S3 bucket."""
    s3 = boto3.client("s3")
    paginator = s3.get_paginator("list_objects_v2")
    total = 0
    for page in paginator.paginate(Bucket=bucket_name):
        total += page.get("KeyCount", 0)
    return total

agent = Agent(
    system_prompt="You are an AWS assistant.",
    tools=[list_s3_buckets, get_object_count]
)

response = agent("Which of my S3 buckets has the most objects?")
```

Type hints + docstrings generate the tool schema. The model sees the schema and decides when to call which tool.

---

## Multi-Step Reasoning

Strands automatically runs the ReAct loop — no explicit loop code needed:

```python
@tool
def search_logs(query: str, minutes: int = 60) -> list[dict]:
    """Search CloudWatch logs for the last N minutes."""
    # ... boto3 CloudWatch Logs query
    return results

@tool  
def create_jira_ticket(title: str, description: str, priority: str = "Medium") -> str:
    """Create a Jira ticket and return the ticket ID."""
    # ... Jira API call
    return ticket_id

agent = Agent(
    system_prompt="You are an on-call engineer assistant.",
    tools=[search_logs, create_jira_ticket]
)

# Agent will: search logs → analyse → decide if ticket needed → create ticket → report
response = agent(
    "Check the last hour of logs for errors and create a Jira ticket if there are more than 5 errors."
)
```

---

## Model Providers

```python
from strands.models import BedrockModel, AnthropicModel

# Default: Amazon Bedrock (any tool-use model)
model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-6-20250514-v1:0",
    region_name="us-east-1"
)

# Direct Anthropic API (no Bedrock needed)
model = AnthropicModel(
    model_id="claude-sonnet-4-6",
    api_key="sk-ant-..."
)

# Ollama (local, for dev/testing)
from strands.models import OllamaModel
model = OllamaModel(model_id="llama3.2")

# Any OpenAI-compatible endpoint via LiteLLM
from strands.models import LiteLLMModel
model = LiteLLMModel(model_id="gpt-4o")
```

---

## MCP Server Integration

Any MCP server can be used as a tool source — thousands of published servers become immediately available:

```python
from strands import Agent
from strands.tools.mcp import MCPClient
from mcp import stdio_client, StdioServerParameters

# Connect to a local MCP server via stdio
mcp_client = MCPClient(
    lambda: stdio_client(StdioServerParameters(
        command="python",
        args=["-m", "my_mcp_server"]
    ))
)

with mcp_client:
    tools = mcp_client.list_tools_sync()
    agent = Agent(tools=tools)
    response = agent("Use the docs server to find information about our API.")
```

---

## Streaming

```python
# Stream the agent's response token by token
with agent.stream_async("Summarise last week's deployment logs.") as stream:
    async for event in stream:
        if hasattr(event, "data"):
            print(event.data, end="", flush=True)
```

---

## Deployment — Bedrock AgentCore Runtime

For production serverless deployment, push the agent to Amazon Bedrock AgentCore Runtime. It handles scaling, session management, and secrets automatically:

```python
# Deploy locally then push
from strands_deploy import AgentCoreDeployment

deployment = AgentCoreDeployment(
    agent=agent,
    name="my-devops-agent",
    memory_enabled=True
)
deployment.deploy()
```

AgentCore Runtime is compatible with any Python agent framework (LangGraph, CrewAI, Strands, custom) — not Strands-exclusive.

---

## Strands vs Alternatives

| | Strands | LangGraph | CrewAI | OpenAI Agents SDK |
|---|---|---|---|---|
| Abstraction level | High (model-driven) | Low (explicit graph) | High (role-based) | Medium |
| AWS/Bedrock integration | Native (first-class) | Via adapters | Via adapters | No |
| MCP support | Native | Via adapters | No | No |
| Multi-agent | Supported | First-class | First-class | Yes |
| Deployment target | Bedrock AgentCore | Anywhere | Anywhere | Anywhere |
| Best for | AWS-native agents | Complex stateful graphs | Role-playing crews | OpenAI-native |

**When to choose Strands:** you're on AWS, want minimal boilerplate, and don't need the fine-grained graph control that LangGraph provides.

---

## Key Facts

- `@tool` decorator is the core primitive — any Python function with type hints and a docstring becomes an agent tool
- Strands is used in production by Amazon Q Developer, AWS Glue, VPC Reachability Analyzer [unverified — from AWS blog]
- Supports parallel tool execution when the model issues multiple tool calls in one turn
- Session memory via Bedrock AgentCore or a custom memory store
- Open-source at `github.com/strands-agents/sdk-python`

---

## Connections

- [[apis/aws-bedrock]] — Strands uses the Bedrock Converse API as its default model backend
- [[agents/mcp-server-development]] — MCP servers are a first-class tool source in Strands
- [[agents/langgraph]] — LangGraph is the alternative for fine-grained stateful agent graphs
- [[agents/practical-agent-design]] — single-agent vs multi-agent design decisions apply here
- [[infra/litellm]] — Strands uses LiteLLM for non-Bedrock model providers

## Open Questions

- How does Strands handle long-running agents that exceed Lambda's 15-minute timeout on AgentCore?
- Is Strands's multi-agent pattern (sub-agent delegation via tools) equivalent to LangGraph's supervisor pattern?
