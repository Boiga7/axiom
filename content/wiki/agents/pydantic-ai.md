---
type: entity
category: agents
para: resource
tags: [pydantic-ai, agents, python, typed-agents, dependency-injection, structured-output]
sources: []
updated: 2026-05-04
tldr: "Python-first agent framework by the Pydantic team — type-safe agents with Pydantic-validated outputs, dependency injection via RunContext, and automatic retry on validation failure."
---

# PydanticAI

> **TL;DR** Python-first agent framework by the Pydantic team — type-safe agents with Pydantic-validated outputs, dependency injection via RunContext, and automatic retry on validation failure.

## Key Facts

- GA v1.0 shipped September 2025; latest release v1.88.0 as of April 2026 [unverified]
- 22k+ GitHub stars, 300k+ weekly PyPI downloads as of early 2026 [unverified]
- Stated goal: "bring the FastAPI feeling to GenAI app and agent development"
- Agents are generic over two types: `Agent[Deps, OutputType]` — both flow through the type checker
- Automatic retry on validation failure: if the model output fails Pydantic validation, the framework re-prompts with the error message
- Built-in test utilities (`TestModel`, `FunctionModel`) designed for deterministic unit testing without real API calls
- Structured outputs and tool schemas are both derived from Pydantic models — one schema definition, two uses

## Why It Exists

Most agent frameworks treat type safety as an afterthought. PydanticAI makes it structural: the agent's dependency type and output type are both generics, so mypy/pyright catches mismatches at write-time, not runtime. The design mirrors how FastAPI treats request/response schemas — declare once, validate always.

Compare to [[python/instructor]], which also wraps LLM clients to enforce Pydantic validation, but operates at the single-call level. PydanticAI is a full agent loop with tools, system prompts, retries, and streaming.

---

## Core Concepts

### Agent Class

The central abstraction. An agent encapsulates:
- The model to use
- A static or dynamic system prompt
- Registered tools
- The output type (a Pydantic model or a primitive)

```python
from pydantic import BaseModel
from pydantic_ai import Agent

class SearchResult(BaseModel):
    title: str
    summary: str
    confidence: float

agent = Agent(
    "anthropic:claude-sonnet-4-6",
    output_type=SearchResult,
    system_prompt="You are a research assistant. Return structured results.",
)

result = agent.run_sync("Explain attention mechanisms")
print(result.output.title)      # type-checked: str
print(result.output.confidence) # type-checked: float
```

The `output_type` parameter drives both the JSON schema sent to the model and the Pydantic validation applied to the response.

### System Prompts — Static and Dynamic

Static prompts are set at agent construction. Dynamic prompts are decorated functions that run on each invocation and can access injected dependencies:

```python
@agent.system_prompt
async def build_system_prompt(ctx: RunContext[MyDeps]) -> str:
    user_name = await ctx.deps.db.get_user_name(ctx.deps.user_id)
    return f"You are helping {user_name}. Today is {date.today()}."
```

Multiple `@agent.system_prompt` decorators can be stacked; PydanticAI concatenates them.

### Tools

Function tools are Python functions registered on an agent. The framework extracts the JSON schema from the type annotations and docstring:

```python
@agent.tool
async def search_docs(ctx: RunContext[MyDeps], query: str) -> list[str]:
    """Search the documentation index.

    Args:
        query: The search query string.
    """
    return await ctx.deps.search_client.query(query)
```

PydanticAI builds the tool schema from:
- Parameter names and types (excluding `RunContext`)
- Descriptions extracted from the Google-style docstring

**System prompt tools** are a second tool type decorated with `@agent.tool_plain` — they do not receive `RunContext` and are mainly used for injecting context into the prompt rather than returning data.

---

## Dependency Injection

PydanticAI's DI system is the primary differentiator from simpler agent wrappers. Dependencies are typed via a generic `RunContext[DepsT]` dataclass.

### Defining Dependencies

```python
from dataclasses import dataclass
from pydantic_ai import RunContext

@dataclass
class AgentDeps:
    user_id: str
    db: DatabaseClient
    search_client: SearchClient
```

### Passing Dependencies at Runtime

```python
deps = AgentDeps(
    user_id="u-123",
    db=database,
    search_client=search,
)
result = await agent.run("Find me recent papers on MoE", deps=deps)
```

### Accessing in Tools and System Prompts

`ctx.deps` inside any tool or dynamic system prompt function is fully typed to `AgentDeps` — the type checker knows every attribute.

This pattern makes swapping real services for test doubles trivial: pass a different `deps` object in tests. No mocking required.

---

## Structured Output and Automatic Retry

When the model returns output that fails Pydantic validation, PydanticAI re-prompts automatically, appending the validation error to the conversation so the model can correct itself:

```
User: <original prompt>
Model: {"title": "Attention", "confidence": "high"}   # fails: confidence must be float
System: ValidationError: confidence must be float, got str. Please correct.
Model: {"title": "Attention", "confidence": 0.92}     # passes
```

The retry limit is configurable (`max_retries`, default 1). On exhaustion, `UnexpectedModelBehavior` is raised.

**Limitation:** `ModelRetry` in output validators is not supported when streaming structured output — an open issue as of early 2026. [unverified]

---

## Multi-Model Support

PydanticAI ships provider adapters for:

| Provider | Model string prefix |
|---|---|
| Anthropic | `anthropic:` |
| OpenAI | `openai:` |
| Google Gemini | `google-gla:` / `google-vertex:` |
| Groq | `groq:` |
| Mistral | `mistral:` |
| Ollama | `ollama:` |
| AWS Bedrock | `bedrock:` |
| DeepSeek | `deepseek:` |
| Cohere | `cohere:` |

LiteLLM is also supported as a proxy, giving access to 100+ providers through a single string.

The model string is passed at agent construction or overridden per-run, so switching providers requires one line change — the rest of the code is unchanged.

---

## Streaming

PydanticAI supports two streaming modes:

**Text streaming** — yields tokens as they arrive:

```python
async with agent.run_stream("Explain transformers", deps=deps) as response:
    async for chunk in response.stream_text():
        print(chunk, end="", flush=True)
```

**Structured streaming** — streams partial Pydantic model construction (supported for output types that can be built incrementally):

```python
async with agent.run_stream("Analyse this document", deps=deps) as response:
    async for partial in response.stream():
        print(partial)  # PartialResult[SearchResult]
```

Streaming integrates cleanly with FastAPI's `StreamingResponse` and the [[web-frameworks/vercel-ai-sdk]] SSE pattern.

---

## Testing

### TestModel

`TestModel` is a deterministic fake that returns a fixed or computed response without calling any real API. It is the primary tool for unit testing agents:

```python
from pydantic_ai.models.test import TestModel

def test_search_agent():
    with agent.override(model=TestModel()):
        result = agent.run_sync("test query", deps=test_deps)
    assert result.output.title == "Test Title"
```

`TestModel` records all tool calls made during the run, enabling assertions about which tools were called and with what arguments.

### FunctionModel

`FunctionModel` accepts a callable that receives the message list and returns a model response. Useful for testing conditional logic — e.g., simulating a model that calls a tool on the first turn and returns text on the second:

```python
from pydantic_ai.models.function import FunctionModel

def my_model_function(messages, info):
    if len(messages) == 1:
        return ModelResponse(parts=[ToolCallPart("search_docs", {"query": "test"})])
    return ModelResponse(parts=[TextPart("Done.")])

with agent.override(model=FunctionModel(my_model_function)):
    result = agent.run_sync("test", deps=test_deps)
```

Both test models work with `agent.override()` as a context manager, leaving production configuration untouched.

---

## When to Use PydanticAI vs Alternatives

| Criterion | PydanticAI | [[agents/langgraph]] | [[agents/crewai]] | [[agents/autogen]] |
|---|---|---|---|---|
| Type safety | First-class (generics) | Manual | Minimal | Minimal |
| Setup complexity | Low | High | Medium | Medium |
| Stateful graph | No | Yes (core feature) | Via Flows | Limited |
| Durable execution / resumability | No | Yes (checkpointing) | No | No |
| HITL (human-in-the-loop) | Basic | First-class | Limited | Yes |
| Role-based multi-agent | No | Yes | Yes (core) | Yes |
| Learning curve | Low (FastAPI-like) | High | Medium | Medium |
| Best for | Single/small-team agents, structured output, FastAPI apps | Complex stateful workflows, long-running tasks | Role-based orchestration | Event-driven multi-agent |

**Choose PydanticAI when:**
- You need reliable structured output with validation guarantees
- Type safety and IDE support are priorities
- The agent is a single agent or a small, linear pipeline
- You are already using Pydantic/FastAPI and want consistent idioms
- You want clean, testable dependency injection without framework magic

**Choose LangGraph when:**
- The workflow has complex branching, cycles, or parallel paths
- Durable execution (crash recovery, resumption) is a requirement
- You need fine-grained state machine control
- The task is long-running and must survive process restarts

**Choose CrewAI when:**
- The use case maps cleanly to a crew of specialised role-based agents
- Rapid prototyping is the priority over type safety

---

## Observability Integration

PydanticAI ships a Logfire integration (Pydantic's own observability product) and supports OpenTelemetry traces. Each agent run emits spans covering:
- Model call parameters and token usage
- Tool calls (name, arguments, result)
- Validation retries and errors

[[observability/langfuse]] and [[observability/arize]] can consume these traces via OTel. See [[observability/tracing]] for the integration pattern.

---

## Installation

```bash
pip install pydantic-ai
# With a specific provider:
pip install "pydantic-ai[anthropic]"
pip install "pydantic-ai[openai,groq]"
```

Requires Python 3.9+. Uses [[python/ecosystem]] tooling: compatible with `uv`, ships with `py.typed` marker, full mypy and pyright support.

---

## Connections

- [[python/instructor]] — structured output at the single-call level; complementary rather than competing with PydanticAI
- [[agents/langgraph]] — graph-based stateful alternative; better choice when workflows require durable execution or complex branching
- [[agents/react-pattern]] — the Thought/Action/Observation loop PydanticAI implements internally per agent run
- [[observability/tracing]] — OTel integration pattern for capturing PydanticAI agent spans
- [[cs-fundamentals/dependency-injection]] — PydanticAI's RunContext is a practical implementation of this pattern
- [[security/guardrails]] — output validation libraries that complement PydanticAI's built-in retry mechanism

## Open Questions

- Does the automatic retry on validation failure introduce meaningful latency or cost at scale, and what is the recommended `max_retries` ceiling for production?
- How well does PydanticAI's DI system compose with async context managers and connection pools in long-lived FastAPI apps?
- Is structured streaming with `ModelRetry` likely to be supported, and what is the recommended workaround until it is?

## Related Pages

- [[python/instructor]] — structured output at the single-call level; complementary, not competing
- [[agents/langgraph]] — graph-based stateful alternative; better for complex workflows
- [[agents/crewai]] — role-based crew orchestration
- [[agents/autogen]] — event-driven multi-agent with GroupChat
- [[agents/openai-agents-sdk]] — OpenAI's own Python SDK (handoffs, guardrails)
- [[agents/practical-agent-design]] — framework-agnostic agent design principles
- [[agents/react-pattern]] — the Thought/Action/Observation loop PydanticAI implements internally
- [[prompting/techniques]] — prompt design patterns that pair with PydanticAI's system prompt functions
- [[security/guardrails]] — output validation libraries that complement PydanticAI's built-in retry
- [[observability/tracing]] — OTel integration for PydanticAI runs
- [[cs-fundamentals/dependency-injection]] — DI patterns; PydanticAI's RunContext is a practical example
