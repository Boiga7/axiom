---
type: concept
category: agents
tags: [openai, agents-sdk, swarm, handoffs, guardrails, tracing, python]
sources: []
updated: 2026-04-29
para: resource
tldr: OpenAI's official Python framework for multi-agent systems (March 2025) — lightweight, model-driven handoffs, built-in guardrails; trade-off vs LangGraph is simplicity at the cost of persistence and HITL support.
---

# OpenAI Agents SDK

> **TL;DR** OpenAI's official Python framework for multi-agent systems (March 2025) — lightweight, model-driven handoffs, built-in guardrails; trade-off vs LangGraph is simplicity at the cost of persistence and HITL support.

OpenAI's official Python framework for building multi-agent systems, released March 2025. The spiritual successor to their experimental **Swarm** library (late 2024). Lightweight by design — it doesn't try to do everything LangGraph does, but it's idiomatic, well-documented, and you'll encounter it in production repos.

Install: `pip install openai-agents`

---

## Core Concepts

Four primitives cover almost everything:

| Primitive | What it is |
|---|---|
| **Agent** | An LLM with a name, instructions, tools, and optional handoffs |
| **Handoff** | Transfer control from one agent to another mid-conversation |
| **Guardrail** | Input/output validation that runs before/after the agent |
| **Runner** | Executes the agent loop, manages history, handles tool calls |

---

## Basic Agent

```python
from agents import Agent, Runner

agent = Agent(
    name="Support Assistant",
    instructions="You are a helpful customer support agent. Be concise.",
)

result = Runner.run_sync(agent, "How do I reset my password?")
print(result.final_output)
```

`Runner.run_sync` is the blocking version. For async:

```python
import asyncio

async def main():
    result = await Runner.run(agent, "How do I reset my password?")
    print(result.final_output)

asyncio.run(main())
```

---

## Tools

Any Python function decorated with `@function_tool` becomes available to the agent.

```python
from agents import Agent, Runner, function_tool

@function_tool
def get_weather(city: str) -> str:
    """Get current weather for a city."""
    # In production: call a weather API
    return f"The weather in {city} is 18°C and cloudy."

@function_tool
def search_knowledge_base(query: str) -> str:
    """Search internal documentation for relevant articles."""
    # In production: call your vector store
    return f"Found 3 articles matching '{query}'..."

agent = Agent(
    name="Research Assistant",
    instructions="Help users find information. Use the knowledge base before answering.",
    tools=[get_weather, search_knowledge_base],
)
```

The SDK automatically extracts the function signature and docstring into a JSON schema that the model receives. Keep docstrings clear — they're part of the prompt.

---

## Handoffs (Multi-Agent)

Handoffs transfer control to a specialised agent. The receiving agent inherits the conversation history.

```python
from agents import Agent, Runner

billing_agent = Agent(
    name="Billing Agent",
    instructions="Handle billing questions: invoices, refunds, payment methods.",
)

technical_agent = Agent(
    name="Technical Agent",
    instructions="Handle technical issues: bugs, integrations, API errors.",
)

triage_agent = Agent(
    name="Triage Agent",
    instructions="""Classify the customer's issue and hand off to the right agent.
- Billing questions → billing_agent
- Technical questions → technical_agent
- Everything else: handle yourself.""",
    handoffs=[billing_agent, technical_agent],
)

result = Runner.run_sync(triage_agent, "My payment keeps failing with error code 402")
print(result.final_output)
# Triage agent routes to billing_agent, which handles the payment issue
```

The triage agent decides when to hand off — it's still model-driven, not rule-based. For rule-based routing, use Python logic in a tool instead.

---

## Guardrails

Guardrails validate inputs and outputs. Run before the agent processes input (input guardrail) or before returning to the user (output guardrail).

```python
from agents import Agent, Runner, GuardrailFunctionOutput, input_guardrail, output_guardrail
from pydantic import BaseModel

class ContentCheck(BaseModel):
    is_safe: bool
    reason: str

@input_guardrail
async def check_safe_input(ctx, agent, input: str) -> GuardrailFunctionOutput:
    """Block requests containing PII or harmful content."""
    # Use a cheap model for the check
    check = await fast_safety_check(input)
    return GuardrailFunctionOutput(
        output_info=ContentCheck(is_safe=check.safe, reason=check.reason),
        tripwire_triggered=not check.safe,  # True = block the request
    )

@output_guardrail
async def check_safe_output(ctx, agent, output: str) -> GuardrailFunctionOutput:
    """Ensure output doesn't leak sensitive data."""
    contains_pii = detect_pii(output)
    return GuardrailFunctionOutput(
        output_info=ContentCheck(is_safe=not contains_pii, reason="PII detected" if contains_pii else "OK"),
        tripwire_triggered=contains_pii,
    )

agent = Agent(
    name="Secure Agent",
    instructions="Answer user questions helpfully.",
    input_guardrails=[check_safe_input],
    output_guardrails=[check_safe_output],
)
```

If `tripwire_triggered=True`, the SDK raises a `GuardrailTripwireTriggered` exception — catch it to return a safe fallback response.

---

## Structured Output

Force the agent to return a specific schema:

```python
from pydantic import BaseModel
from agents import Agent, Runner

class TicketClassification(BaseModel):
    category: str        # billing | technical | refund | general
    priority: str        # low | medium | high
    sentiment: str       # positive | neutral | negative
    summary: str

classifier = Agent(
    name="Classifier",
    instructions="Classify support tickets accurately.",
    output_type=TicketClassification,
)

result = Runner.run_sync(classifier, "I've been charged twice this month and I'm furious!")
ticket = result.final_output  # type: TicketClassification
print(ticket.category)   # billing
print(ticket.sentiment)  # negative
```

---

## Context and State

Pass shared state through the `context` parameter — available to all tools and agents in the run:

```python
from dataclasses import dataclass
from agents import Agent, Runner, RunContextWrapper, function_tool

@dataclass
class UserContext:
    user_id: str
    plan: str           # free | pro | enterprise
    account_age_days: int

@function_tool
def get_user_plan(ctx: RunContextWrapper[UserContext]) -> str:
    """Get the user's current subscription plan."""
    return f"Plan: {ctx.context.plan}, Account age: {ctx.context.account_age_days} days"

agent = Agent(
    name="Account Agent",
    instructions="Help users understand their account.",
    tools=[get_user_plan],
)

user_ctx = UserContext(user_id="u_123", plan="pro", account_age_days=180)
result = Runner.run_sync(agent, "What features do I have access to?", context=user_ctx)
```

---

## Tracing

Built-in tracing with OpenAI's platform — automatic when you have `OPENAI_API_KEY` set.

```python
from agents import Agent, Runner
from agents.tracing import set_tracing_export_api_key

# Or export to a custom endpoint
set_tracing_export_api_key("your-key")

agent = Agent(name="My Agent", instructions="...")
result = Runner.run_sync(agent, "Hello")
# Visit platform.openai.com to inspect the trace
```

Trace data includes: agent runs, tool calls, handoffs, input/output at each step, latency per step. Not self-hostable (unlike Langfuse). If you need self-hosted tracing, hook into OpenTelemetry instead.

---

## Streaming

Stream responses to the user in real time:

```python
from agents import Agent, Runner

agent = Agent(name="Streaming Agent", instructions="Be helpful.")

async def stream_response(query: str):
    async with Runner.run_streamed(agent, query) as stream:
        async for event in stream.stream_events():
            if event.type == "raw_response_event":
                # Print each text chunk as it arrives
                print(event.data.delta, end="", flush=True)
```

---

## SDK vs LangGraph

| Feature | OpenAI Agents SDK | LangGraph |
|---|---|---|
| Learning curve | Low | High |
| Verbosity | Minimal | Verbose |
| Routing | Model-driven handoffs | Explicit graph edges |
| State management | Simple context object | Full StateGraph with reducers |
| Persistence / checkpointing | None built-in | PostgresSaver, RedisSaver |
| Human-in-the-loop | Not built-in | interrupt(), Command |
| Framework lock-in | OpenAI API only | Any LLM via LangChain |
| Tracing | OpenAI platform | LangSmith (built-in), Langfuse |
| Production maturity | v1.0 (March 2025) | v1.0 (stable) |

**Use OpenAI Agents SDK when:** you're already using OpenAI, want simple multi-agent handoffs fast, don't need checkpointing or HITL.

**Use LangGraph when:** you need durable state, human-in-the-loop, complex conditional routing, or provider agnosticism.

---

## With Claude (via LiteLLM)

The SDK is OpenAI-centric but can use Claude via LiteLLM as a proxy:

```python
import litellm
from agents import Agent, Runner, OpenAIChatCompletionsModel
from openai import AsyncOpenAI

# LiteLLM proxies Claude to OpenAI-compatible endpoints
litellm_client = AsyncOpenAI(
    api_key="sk-1234",  # LiteLLM proxy key
    base_url="http://localhost:4000",
)

claude_model = OpenAIChatCompletionsModel(
    model="claude-sonnet-4-6",
    openai_client=litellm_client,
)

agent = Agent(
    name="Claude Agent",
    instructions="You are a helpful assistant.",
    model=claude_model,
)
```

In practice: if you're using Claude natively, the Anthropic SDK with a custom agent loop (or LangGraph) is cleaner. The Agents SDK shines for OpenAI workflows.

---

## Real-World Pattern: Research + Writer Pipeline

```python
from agents import Agent, Runner, function_tool

@function_tool
def search_web(query: str) -> str:
    """Search the web and return relevant excerpts."""
    # call Perplexity, Tavily, or similar
    return web_search(query)

researcher = Agent(
    name="Researcher",
    instructions="""Search for information on the given topic.
Return a structured research summary with sources.""",
    tools=[search_web],
)

writer = Agent(
    name="Writer",
    instructions="""Take the research provided and write a clear, concise blog post.
Target 500 words. Use the research findings directly.""",
)

# Sequential pipeline
async def research_and_write(topic: str) -> str:
    research_result = await Runner.run(researcher, f"Research: {topic}")
    research_summary = research_result.final_output

    write_result = await Runner.run(
        writer,
        f"Write a blog post based on this research:\n\n{research_summary}",
    )
    return write_result.final_output
```

---

## Key Facts

- Install: `pip install openai-agents` (released March 2025)
- Four primitives: Agent, Handoff, Guardrail, Runner
- `Runner.run_sync` for blocking; `Runner.run` for async; `Runner.run_streamed` for streaming
- Routing is model-driven — for rule-based routing, use Python logic in a tool instead
- `tripwire_triggered=True` raises `GuardrailTripwireTriggered` exception
- Built-in tracing exports to OpenAI platform only; not self-hostable
- No built-in checkpointing/persistence — use LangGraph if you need durable state
- Can use Claude via LiteLLM proxy as an OpenAI-compatible endpoint

## Connections

- [[agents/multi-agent-patterns]] — Supervisor, Swarm, Parallel fan-out patterns the SDK implements
- [[agents/react-pattern]] — the single-agent loop each SDK Agent runs internally
- [[protocols/tool-design]] — writing good tool descriptions (used in SDK function docstrings)
- [[apis/openai-api]] — the underlying API the SDK calls
- [[synthesis/architecture-patterns]] — where the Agents SDK fits in the broader pattern map
- [[observability/platforms]] — alternative tracing since SDK tracing is OpenAI-platform-only

## Open Questions

- How does the Agents SDK handle token counting and context window management for long handoff chains?
- Will OpenAI add built-in checkpointing to close the gap with LangGraph for durable workflows?
- What is the actual failure rate of model-driven handoff routing vs rule-based routing in production?
