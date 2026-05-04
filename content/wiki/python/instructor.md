---
type: concept
category: python
para: resource
tags: [structured-outputs, pydantic, instructor, llm-patterns]
sources: []
updated: 2026-05-01
tldr: "instructor wraps the Anthropic and OpenAI clients to enforce Pydantic schema validation on every LLM response, with automatic retry on validation failure."
---

# instructor — Structured LLM Outputs

`instructor` wraps the Anthropic and OpenAI clients to enforce Pydantic schema validation on every LLM response, with automatic retry on validation failure. It is the standard library for getting reliable structured outputs from LLMs in Python.

## Why It Exists

Raw LLM APIs return strings. Getting structured data means either:
- Parsing JSON yourself (brittle, fails on malformed output)
- Using `response_format={"type": "json_object"}` (no schema enforcement)
- Using `instructor` (schema enforcement + automatic retry + streaming support)

`instructor` patches the client so you call `.chat.completions.create()` as normal, but pass `response_model=YourPydanticModel` and get back a validated instance.

---

## Installation

```bash
pip install instructor
```

---

## Basic Usage

### With Anthropic

```python
import anthropic
import instructor
from pydantic import BaseModel

client = instructor.from_anthropic(anthropic.Anthropic())

class User(BaseModel):
    name: str
    age: int
    email: str

user = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Extract: John Smith, 34, john@example.com"}
    ],
    response_model=User,
)

print(user.name)   # "John Smith"
print(user.age)    # 34
```

### With OpenAI

```python
import openai
import instructor

client = instructor.from_openai(openai.OpenAI())

user = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract: Alice, 28, alice@example.com"}],
    response_model=User,
)
```

---

## Validation with Pydantic

Pydantic validators run after extraction. If they fail, `instructor` retries the LLM call with the validation error as feedback. Up to `max_retries` times.

```python
from pydantic import BaseModel, field_validator

class UserProfile(BaseModel):
    name: str
    age: int
    email: str

    @field_validator("age")
    @classmethod
    def age_must_be_positive(cls, v: int) -> int:
        if v < 0:
            raise ValueError("age must be positive")
        return v

    @field_validator("email")
    @classmethod
    def email_must_have_at(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("not a valid email")
        return v
```

If the LLM returns `age: -5`, the validator raises, `instructor` sends the error back to the model: *"age must be positive. Please fix"*, and retries. Default is 3 retries.

```python
# Configure retries
profile = client.messages.create(
    ...,
    response_model=UserProfile,
    max_retries=5,
)
```

---

## Nested Models

```python
from typing import Optional

class Address(BaseModel):
    street: str
    city: str
    country: str

class Company(BaseModel):
    name: str
    founded: int
    headquarters: Address
    employees: Optional[int] = None

company = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Tell me about Anthropic the AI company"}],
    response_model=Company,
)

print(company.headquarters.city)   # "San Francisco"
```

---

## Lists and Optional Fields

```python
from typing import Optional
from pydantic import BaseModel

class Ingredient(BaseModel):
    name: str
    quantity: str

class Recipe(BaseModel):
    title: str
    ingredients: list[Ingredient]
    prep_time_minutes: int
    difficulty: Optional[str] = None

recipe = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=2048,
    messages=[{"role": "user", "content": "Give me a pasta recipe"}],
    response_model=Recipe,
)
```

---

## Streaming Partial Objects

For large structures, stream partial results as they arrive:

```python
from instructor import Partial

for partial_user in client.messages.create_partial(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Extract user data from this CV..."}],
    response_model=Partial[UserProfile],
):
    print(partial_user.name)  # fills in as tokens arrive
```

---

## Classification Pattern

A common use: enum-constrained classification.

```python
from enum import Enum

class Sentiment(str, Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"

class SentimentResult(BaseModel):
    sentiment: Sentiment
    confidence: float
    reasoning: str

result = client.messages.create(
    model="claude-haiku-4-5-20251001",  # fast model for classification
    max_tokens=256,
    messages=[{"role": "user", "content": "The product was okay, nothing special."}],
    response_model=SentimentResult,
)
```

---

## When to Use

| Scenario | Use instructor? |
|----------|----------------|
| Extracting structured data from text | Yes |
| Classification into known categories | Yes |
| Multi-step reasoning where intermediate steps need validation | Yes |
| Simple Q&A or chat | No — raw API is simpler |
| Agent tool calls (tools already return typed data) | Usually no |
| Batch processing with strict schema requirements | Yes |

---

## Relationship to Other Approaches

- **Raw API `tool_use`** — also returns structured data, but you define a JSON Schema tool instead of a Pydantic model. More verbose. Use when the schema needs to vary at runtime.
- **DSPy** — optimises prompts automatically; instructor enforces output structure. Complementary: use DSPy to optimise the prompt, instructor to validate the output.
- **Guardrails AI** — broader output safety/validation framework; instructor focuses specifically on Pydantic schema enforcement. See [[security/guardrails]] for comparison.

---

## Common Failure Cases

**`instructor` exhausts `max_retries` and raises `InstructorRetryException` for a valid model response**  
Why: the model returns a valid JSON object but includes it inside a markdown code fence (`\`\`\`json ... \`\`\``); instructor's default parser fails to extract the JSON, retries the call each time, and eventually exhausts retries.  
Detect: `InstructorRetryException` raised even though the model's raw response contains correct JSON when inspected manually; the validation error message says "JSON parse error" or "Expecting value".  
Fix: set `mode=instructor.Mode.MD_JSON` for models that reliably wrap JSON in markdown; or set `mode=instructor.Mode.JSON` to force JSON mode via the API when supported.

**Nested Pydantic model fails to validate because a required field is missing from the model output**  
Why: when the LLM generates a nested object, it may omit an inner required field, especially for deeply nested structures; instructor retries but the model continues to omit the same field, leading to `max_retries` exhaustion.  
Detect: retry loop always fails on the same `Field required` validation error for a nested field; the model never includes the field despite the retry error message.  
Fix: add a `description` to the missing field explaining what it represents and an example value; make the field `Optional` with a sensible default if it can genuinely be absent; simplify nested structures.

**`Partial[Model]` streaming returns incomplete objects that are not caught before use**  
Why: `create_partial()` yields partial model instances as tokens arrive; calling code that accesses attributes on partially-filled objects may encounter `None` where a required field is expected, causing `AttributeError` or `ValidationError`.  
Detect: intermittent `AttributeError` when processing partial stream results; the final complete object is valid but intermediate partials have `None` for expected fields.  
Fix: check for `None` on all accessed attributes when consuming partial results; or accumulate the stream and only process the final complete object if partial updates are not needed for the UX.

**Using the sync `instructor.from_anthropic(anthropic.Anthropic())` client in an async function blocks the event loop**  
Why: the sync Anthropic client blocks the thread while waiting for the API response; inside an async function, this blocks the entire asyncio event loop, preventing other coroutines from running.  
Detect: other concurrent async tasks pause during the instructor call; overall throughput degrades significantly when multiple instructor calls run concurrently.  
Fix: use `instructor.from_anthropic(AsyncAnthropic())` for the async client and `await client.messages.create(...)` in async functions.

## Connections

- [[python/ecosystem]] — Pydantic v2, async httpx (instructor has async support: `instructor.from_anthropic(AsyncAnthropic())`)
- [[apis/anthropic-api]] — underlying API being patched
- [[prompting/techniques]] — structuring prompts for extraction tasks
- [[security/guardrails]] — broader output validation and safety patterns
- [[evals/methodology]] — use instructor to extract structured eval results from LLM judges
## Open Questions

- What performance characteristics only become problems at production scale?
- What does this library handle poorly that its documentation does not mention?
