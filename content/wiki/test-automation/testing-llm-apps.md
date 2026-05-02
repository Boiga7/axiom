---
type: concept
category: test-automation
tags: [testing, llm, pytest, mocking, respx, rag, agents, determinism, integration-tests]
sources: []
updated: 2026-04-29
para: resource
tldr: Test the plumbing, not the model — use respx to mock the Anthropic SDK's HTTP calls at zero cost, test RAG retrieval and prompt assembly independently, verify agent loop termination and max_steps enforcement, and never use a real API key in CI.
---

# Testing LLM-Powered Applications

> **TL;DR** Test the plumbing, not the model — use respx to mock the Anthropic SDK's HTTP calls at zero cost, test RAG retrieval and prompt assembly independently, verify agent loop termination and max_steps enforcement, and never use a real API key in CI.

The hardest part of testing AI features is that the LLM itself is non-deterministic and expensive. The discipline is: **test the plumbing, not the model**. Your job is to verify that your application correctly handles inputs, routes requests, parses outputs, and manages state. Not to re-evaluate the LLM on every test run. Evals (see [[evals/methodology]]) handle model quality separately from the test suite.

---

## The Core Distinction

```
Unit/integration tests → test your code's behaviour
Evals                  → test the LLM's output quality
```

These are different concerns, run at different cadences, with different tools:

| | Tests | Evals |
|---|---|---|
| What fails | Your code | The model |
| Speed | Fast (milliseconds) | Slow (seconds per case) |
| When runs | Every commit (CI) | Before model/prompt changes |
| LLM calls | Zero (mocked) | Real |
| Tool | pytest | inspect-ai, promptfoo, Braintrust |
| Output | Pass / fail | Score, pass rate |

Never let evals block your test suite. Never let unit tests substitute for evals.

---

## Mocking the Anthropic API

Use `respx` to intercept HTTP calls from the Anthropic SDK. Your code doesn't know it's hitting a mock.

### Basic Message Mock

```python
# conftest.py
import pytest
import respx
import httpx
import json

MOCK_MESSAGE_RESPONSE = {
    "id": "msg_01XFDUDYJgAACzvnptvVoYEL",
    "type": "message",
    "role": "assistant",
    "content": [{"type": "text", "text": "Paris"}],
    "model": "claude-sonnet-4-6",
    "stop_reason": "end_turn",
    "stop_sequence": None,
    "usage": {
        "input_tokens": 25,
        "output_tokens": 1,
        "cache_creation_input_tokens": 0,
        "cache_read_input_tokens": 0,
    },
}

@pytest.fixture
def mock_anthropic():
    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(
            return_value=httpx.Response(200, json=MOCK_MESSAGE_RESPONSE)
        )
        yield mock
```

```python
# test_chat.py
def test_simple_query_returns_answer(mock_anthropic):
    result = my_chat_function("What is the capital of France?")
    assert result == "Paris"
    assert mock_anthropic.calls.call_count == 1
```

### Mock Specific Responses by Input

```python
@pytest.fixture
def mock_anthropic_routing():
    """Return different responses based on what the model receives."""
    with respx.mock(base_url="https://api.anthropic.com") as mock:
        def route_response(request):
            body = json.loads(request.content)
            content = body["messages"][0]["content"]

            if "billing" in content.lower():
                text = "billing"
            elif "technical" in content.lower():
                text = "technical"
            else:
                text = "general"

            return httpx.Response(200, json={
                **MOCK_MESSAGE_RESPONSE,
                "content": [{"type": "text", "text": text}]
            })

        mock.post("/v1/messages").mock(side_effect=route_response)
        yield mock


def test_billing_ticket_routes_correctly(mock_anthropic_routing):
    result = classify_ticket("I was charged twice this month")
    assert result == TicketCategory.BILLING
```

### Mock Tool Use Responses

```python
MOCK_TOOL_USE_RESPONSE = {
    **MOCK_MESSAGE_RESPONSE,
    "content": [
        {
            "type": "tool_use",
            "id": "toolu_01A09q90qw90lq917835lq9",
            "name": "search_knowledge_base",
            "input": {"query": "password reset"},
        }
    ],
    "stop_reason": "tool_use",
}

MOCK_FINAL_RESPONSE = {
    **MOCK_MESSAGE_RESPONSE,
    "content": [{"type": "text", "text": "To reset your password, go to Settings > Security."}],
    "stop_reason": "end_turn",
}

@pytest.fixture
def mock_tool_use():
    call_count = {"n": 0}

    with respx.mock(base_url="https://api.anthropic.com") as mock:
        def tool_then_answer(request):
            call_count["n"] += 1
            if call_count["n"] == 1:
                return httpx.Response(200, json=MOCK_TOOL_USE_RESPONSE)
            return httpx.Response(200, json=MOCK_FINAL_RESPONSE)

        mock.post("/v1/messages").mock(side_effect=tool_then_answer)
        yield mock


def test_agent_calls_tool_and_returns_answer(mock_tool_use):
    result = run_support_agent("How do I reset my password?")
    assert "Settings" in result
    assert mock_tool_use.calls.call_count == 2  # tool call + final answer
```

---

## Testing RAG Pipelines

Split the pipeline and test each stage independently. The retrieval stage and the generation stage have different failure modes.

### Test Retrieval Independently

```python
# No LLM involved here — test the vector search logic directly
def test_retrieval_returns_relevant_chunks(vector_store):
    docs = vector_store.search("password reset instructions", k=3)

    assert len(docs) == 3
    # All chunks should be semantically relevant
    assert all("password" in doc.content.lower() or "reset" in doc.content.lower() for doc in docs)
    # Scores should be above threshold
    assert all(doc.score > 0.7 for doc in docs)


def test_retrieval_respects_k_parameter(vector_store):
    docs_3 = vector_store.search("any query", k=3)
    docs_5 = vector_store.search("any query", k=5)
    assert len(docs_3) == 3
    assert len(docs_5) == 5


def test_retrieval_on_empty_store():
    empty_store = VectorStore()
    docs = empty_store.search("anything", k=5)
    assert docs == []
```

### Test Prompt Assembly

The prompt builder is pure logic. Test it without any API call:

```python
def test_rag_prompt_includes_context():
    docs = [
        Document(content="Passwords must be 8+ characters.", metadata={"source": "policy.pdf"}),
        Document(content="Reset via Settings > Security.", metadata={"source": "guide.pdf"}),
    ]
    prompt = build_rag_prompt(query="How do I reset my password?", docs=docs)

    assert "Passwords must be 8+ characters." in prompt
    assert "Reset via Settings > Security." in prompt
    assert "How do I reset my password?" in prompt


def test_rag_prompt_respects_token_budget():
    # 50 large docs — prompt must stay within budget
    docs = [Document(content="x" * 1000) for _ in range(50)]
    prompt = build_rag_prompt(query="test", docs=docs, max_tokens=4000)

    token_estimate = len(prompt.split()) * 1.3
    assert token_estimate < 4000


def test_rag_prompt_has_no_context_fallback():
    prompt = build_rag_prompt(query="What is the moon made of?", docs=[])
    assert "no relevant documents" in prompt.lower() or "cannot find" in prompt.lower()
```

### Test the Full RAG Pipeline End-to-End (Mocked LLM)

```python
@pytest.fixture
def mock_rag_answer():
    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(return_value=httpx.Response(200, json={
            **MOCK_MESSAGE_RESPONSE,
            "content": [{"type": "text", "text": "Reset via Settings > Security > Change Password."}],
        }))
        yield mock


def test_rag_pipeline_returns_grounded_answer(mock_rag_answer, seeded_vector_store):
    result = rag_pipeline.query("How do I change my password?")

    assert result.answer == "Reset via Settings > Security > Change Password."
    assert len(result.sources) > 0  # sources were retrieved
    assert mock_rag_answer.calls.call_count == 1  # exactly one LLM call
```

---

## Testing Agents

Agents are harder because they run multi-step loops. Test the loop logic separately from the tools.

### Test Tool Execution

```python
# Tools are plain Python functions — test them directly, no LLM needed
def test_search_tool_returns_results():
    result = search_knowledge_base(query="password reset")
    assert isinstance(result, str)
    assert len(result) > 0


def test_search_tool_handles_empty_query():
    result = search_knowledge_base(query="")
    assert "no results" in result.lower() or result == ""


def test_calculator_tool_handles_division_by_zero():
    result = calculator(expression="10 / 0")
    assert "error" in result.lower()
```

### Test Agent Loop Termination

```python
@pytest.mark.asyncio
async def test_agent_terminates_without_tools(mock_anthropic):
    """Agent should stop after one turn when no tool is called."""
    result = await agent_loop("What is 2 + 2?")
    assert result == "Paris"  # whatever the mock returns
    assert mock_anthropic.calls.call_count == 1


@pytest.mark.asyncio
async def test_agent_respects_max_steps():
    """Agent must not run forever — bound the loop."""
    # Mock that always returns a tool call (infinite loop if not bounded)
    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(return_value=httpx.Response(
            200, json=MOCK_TOOL_USE_RESPONSE  # always tool use, never end_turn
        ))
        result = await agent_loop("Do something", max_steps=3)

    assert "Max steps reached" in result or result is not None
    assert mock.calls.call_count == 3  # stopped at max_steps
```

### Test Tool Result Parsing

The agent's ability to parse tool results is testable without a running LLM:

```python
def test_tool_result_formatted_correctly():
    """Tool results must be formatted as the API expects."""
    tool_result = format_tool_result(
        tool_use_id="toolu_abc123",
        content="Found 3 matching documents.",
    )
    assert tool_result["type"] == "tool_result"
    assert tool_result["tool_use_id"] == "toolu_abc123"
    assert tool_result["content"] == "Found 3 matching documents."
```

---

## Testing Streaming Responses

Streaming is pure plumbing. Test that your consumer handles chunks correctly.

```python
def fake_stream_chunks(texts: list[str]):
    """Generate SSE chunks the way the Anthropic SDK streams them."""
    for text in texts:
        yield {"type": "content_block_delta", "delta": {"type": "text_delta", "text": text}}
    yield {"type": "message_stop"}


def test_stream_consumer_assembles_full_response():
    chunks = ["Hello", ", ", "world", "!"]
    result = consume_stream(fake_stream_chunks(chunks))
    assert result == "Hello, world!"


def test_stream_consumer_handles_empty_stream():
    result = consume_stream(fake_stream_chunks([]))
    assert result == ""


def test_stream_consumer_yields_chunks_incrementally():
    """Verify chunks arrive before the full message — important for UX."""
    received = []
    chunks = ["word1 ", "word2 ", "word3"]

    for chunk in streaming_generator(fake_stream_chunks(chunks)):
        received.append(chunk)

    assert len(received) == 3  # consumer yielded each chunk, not the full string
```

---

## Testing Structured Outputs

If your code parses the LLM's JSON output, test the parsing logic with fixed inputs. Never trust the model to always produce valid JSON in tests.

```python
import pytest
from pydantic import ValidationError

def test_extraction_parses_valid_json():
    raw = '{"parties": ["Acme Corp", "Widgets Ltd"], "effective_date": "2026-01-01"}'
    result = ContractExtraction.model_validate_json(raw)
    assert result.parties == ["Acme Corp", "Widgets Ltd"]


def test_extraction_raises_on_missing_required_field():
    raw = '{"parties": ["Acme Corp"]}'  # missing effective_date
    with pytest.raises(ValidationError):
        ContractExtraction.model_validate_json(raw)


def test_extraction_handles_null_optional_field():
    raw = '{"parties": ["Acme"], "effective_date": "2026-01-01", "termination_date": null}'
    result = ContractExtraction.model_validate_json(raw)
    assert result.termination_date is None


def test_extraction_handles_model_prefix():
    """Models sometimes prefix JSON with 'Here is the extracted data:'"""
    raw = 'Here is the data:\n```json\n{"parties": ["Acme"], "effective_date": "2026-01-01"}\n```'
    result = extract_json_from_response(raw)
    assert result["parties"] == ["Acme"]
```

---

## Property-Based Testing with Hypothesis

For AI input handling, Hypothesis finds edge cases you wouldn't think to write:

```python
from hypothesis import given, strategies as st

@given(st.text(min_size=0, max_size=10000))
def test_prompt_builder_never_crashes(arbitrary_user_input):
    """Prompt builder must handle any string without raising."""
    prompt = build_rag_prompt(query=arbitrary_user_input, docs=[])
    assert isinstance(prompt, str)


@given(st.text(min_size=1, max_size=500))
def test_ticket_classifier_always_returns_valid_category(text, mock_anthropic_routing):
    """Classifier must always return one of the valid enum values."""
    result = classify_ticket(text)
    assert result in list(TicketCategory)


@given(st.lists(st.text(min_size=1, max_size=200), min_size=0, max_size=100))
def test_history_trimmer_respects_budget(messages):
    msgs = [{"role": "user", "content": m} for m in messages]
    trimmed = trim_conversation_history(msgs, max_tokens=2000)
    total_tokens = sum(len(m["content"].split()) * 1.3 for m in trimmed)
    assert total_tokens <= 2000
```

---

## Async Test Patterns

Most LLM code is async. Configure pytest-asyncio correctly:

```python
# pyproject.toml
[tool.pytest.ini_options]
asyncio_mode = "auto"  # no need for @pytest.mark.asyncio on every test
```

```python
# conftest.py
import pytest
import anthropic

@pytest.fixture
async def async_mock_client():
    """Async version of the Anthropic client for async code paths."""
    with respx.mock(base_url="https://api.anthropic.com") as mock:
        mock.post("/v1/messages").mock(
            return_value=httpx.Response(200, json=MOCK_MESSAGE_RESPONSE)
        )
        client = anthropic.AsyncAnthropic(api_key="test-key")
        yield client, mock


async def test_async_chat_function(async_mock_client):
    client, mock = async_mock_client
    result = await async_chat(client, "Hello")
    assert result == "Paris"
```

---

## CI Integration

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    env:
      ANTHROPIC_API_KEY: "sk-test-fake-key"  # never real key; tests use mocks
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"
      - run: pip install uv && uv sync
      - run: uv run pytest tests/ -x --tb=short
```

Key rule: **never use a real API key in CI**. If a test requires a real key, it's an eval, not a unit test. Run it in a separate job gated on main branch only.

---

## What Not to Test

| What | Why not |
|---|---|
| Whether Claude gives a good answer | That's an eval, not a test |
| Specific phrasing in LLM output | Fragile — model output varies even at temperature 0 |
| That the Anthropic SDK works | Not your code |
| Token count of model responses | Varies; test your *budget enforcement* logic instead |
| Latency | Flaky in CI; use observability in production instead |

Test that your code correctly calls the API, handles the response, routes based on it, parses it, and errors gracefully. Leave judging the response to evals.

---

## Key Facts

- Tests vs evals: tests run every commit (milliseconds, mocked); evals run before model/prompt changes (seconds, real API)
- respx mocks at the HTTP layer: `respx.mock(base_url="https://api.anthropic.com")` intercepts all SDK calls
- Mock shape: `{"id": ..., "type": "message", "role": "assistant", "content": [...], "stop_reason": "end_turn", "usage": {...}}`
- Tool-use mock: first call returns `stop_reason: "tool_use"`, second returns `stop_reason: "end_turn"` — verify `call_count == 2`
- Never test specific LLM phrasing — model output varies even at temperature 0; that's an eval concern
- CI rule: `ANTHROPIC_API_KEY: "sk-test-fake-key"` in environment; any test requiring a real key is an eval, not a unit test
- Hypothesis `@given(st.text(...))` for prompt builders: finds edge cases (empty string, 10K chars, unicode) automatically
- `asyncio_mode = "auto"` in pyproject.toml removes need for `@pytest.mark.asyncio` on every async test

## Common Failure Cases

**`respx.mock` is active but the Anthropic SDK bypasses it because the SDK uses its own `httpx.Client` instance created before the mock context**  
Why: `respx.mock` patches the default `httpx` transport at the module level; if the Anthropic client is instantiated at module import time (as a global), the client's internal transport is bound before `respx.mock` can intercept it.  
Detect: the test raises `ConnectionError: All connection attempts failed` even with `respx.mock` active; removing the global client and constructing it inside the test or fixture fixes the error.  
Fix: never instantiate `anthropic.AsyncAnthropic()` at module level in application code that will be tested; construct clients inside functions or use dependency injection so the fixture controls the client's lifetime.

**The mock tool-use fixture returns `MOCK_TOOL_USE_RESPONSE` on every call, causing the agent loop to never terminate**  
Why: a stateless mock returns the same tool-use response on every API call; an agent loop that checks `stop_reason == "end_turn"` never sees it and loops indefinitely until `max_steps` is exceeded or the test times out.  
Detect: the test hangs for the full pytest timeout duration; adding a call count assertion shows the mock was called far more than `expected_steps` times.  
Fix: use a stateful counter (as shown in the tool-use fixture pattern) that returns `MOCK_TOOL_USE_RESPONSE` on call 1 and `MOCK_FINAL_RESPONSE` on call 2+; always assert on `mock.calls.call_count` to verify the loop terminated at the expected step.

**RAG retrieval test passes in isolation but fails in CI because the vector store fixture is `scope="session"` and seeded data persists between tests**  
Why: a session-scoped vector store fixture that inserts documents on setup does not clean up between tests; a test that deletes documents or runs a destructive query leaves the store in a modified state for subsequent tests, causing ordering-dependent failures.  
Detect: the retrieval test passes when run alone (`pytest tests/test_rag.py::test_retrieval`) but fails in full suite runs; the failure shows fewer documents returned than expected.  
Fix: use `scope="function"` for vector store fixtures that tests mutate; or add explicit teardown that deletes all seeded documents after `yield`; reserve session scope for read-only fixtures.

**`test_agent_respects_max_steps` does not actually verify termination because the agent swallows the `MaxStepsError` and returns `None`**  
Why: if the agent catches all exceptions and returns `None` on failure, the test assertion `assert result is not None` passes even when the loop exited abnormally; the test verifies the mock call count but not the agent's reported outcome.  
Detect: changing `max_steps=3` to `max_steps=1` still makes the test pass; the assertion is too weak to distinguish graceful termination from error swallowing.  
Fix: assert on the specific return value or exception type — either `assert "Max steps" in result` or `with pytest.raises(MaxStepsError)` depending on the desired contract; never accept `result is not None` as proof of correct termination.

## Connections

- [[evals/methodology]] — testing model quality (the other half, different cadence)
- [[evals/llm-as-judge]] — automated LLM output scoring in evals
- [[test-automation/pytest-patterns]] — fixture patterns, parametrize, conftest, respx setup
- [[apis/anthropic-api]] — real API response shape to model your mocks from
- [[agents/react-pattern]] — agent loop structure to understand what you're testing
- [[synthesis/architecture-patterns]] — the pipelines these tests cover

## Open Questions

- Is property-based testing with Hypothesis worth the setup overhead for typical LLM application input handling, or does parametrize cover enough cases?
- For streaming response testing, is it better to mock the SSE chunks or test the consumer with a fake generator as shown here?
- At what point does a "mocked integration test" become misleading if the mock doesn't accurately reflect real API behaviour (rate limits, 529s, partial failures)?
