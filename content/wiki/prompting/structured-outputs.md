---
type: concept
category: prompting
para: resource
tags: [structured-outputs, constrained-decoding, instructor, xgrammar, outlines, json, pydantic, json-schema]
sources: []
updated: 2026-05-03
tldr: "Three tiers of reliability — prompt-based (fragile), retry-based via instructor (good enough for most hosted APIs), constrained decoding via XGrammar/Outlines (guaranteed, zero retries) — with native API support from OpenAI and Gemini but not yet Anthropic."
---

# Structured Outputs and Constrained Decoding

> **TL;DR** Three tiers of reliability — prompt-based (fragile), retry-based via [[python/instructor]] (good enough for most hosted APIs), constrained decoding via XGrammar/Outlines (guaranteed, zero retries) — with native API support from OpenAI and Gemini but not yet Anthropic.

Getting LLMs to reliably output valid JSON, XML, or any schema-conformant structure is not solved by asking nicely. The approaches differ in guarantees, cost, and deployment requirements.

---

## The Three Tiers

### Tier 1 — Prompt-Based (Fragile)

Ask the model to output JSON and provide an example.

```xml
<output_format>
Return your answer as a JSON object matching this schema:
{"name": "string", "age": "integer", "email": "string"}

Example:
{"name": "Alice", "age": 30, "email": "alice@example.com"}
</output_format>
```

**What breaks it:**
- Long context (instructions drift to the bottom of attention)
- Complex or deeply nested schemas — models hallucinate missing fields or invent extra ones
- Optional fields — models often omit them entirely rather than including `null`
- Numeric precision — floats become strings, integers become floats

**When to use:** Prototyping, one-off scripts, contexts where occasional failures are acceptable and parsing with a try/except is fine.

**When not to use:** Any production pipeline where downstream code depends on the structure.

---

### Tier 2 — Retry-Based: `instructor`

Call the model, validate with Pydantic, send the validation error back as feedback, retry. See [[python/instructor]] for the full API reference.

```python
import anthropic
import instructor
from pydantic import BaseModel, field_validator

client = instructor.from_anthropic(anthropic.Anthropic())

class ExtractedEntity(BaseModel):
    name: str
    entity_type: str
    confidence: float

    @field_validator("confidence")
    @classmethod
    def confidence_must_be_unit(cls, v: float) -> float:
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence must be between 0 and 1")
        return v

result = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    messages=[{"role": "user", "content": "Extract the main entity from: Apple released the iPhone 16."}],
    response_model=ExtractedEntity,
    max_retries=2,
)
```

**How the retry loop works:**

1. Send the prompt, ask for structured output
2. If the model's response fails Pydantic validation, send the error message back: *"confidence must be between 0 and 1. Please fix and return only valid JSON."*
3. Repeat up to `max_retries` times
4. Raise `InstructorRetryException` if exhausted

**Performance characteristics:**

| Retries | Cost multiplier | Reliability |
|---|---|---|
| 0 (first try success) | 1× | ~85–95% depending on schema complexity |
| 1 retry | ~1.5–2× | ~97–99% |
| 2 retries | ~2–3× | ~99%+ |
| 3+ retries | Expensive | Often indicates a schema design problem |

If you are regularly hitting 3+ retries, simplify the schema — not add more retries.

**instructor language support:** Python (primary), TypeScript, Go, Ruby.

**When to use:** Any hosted API (Anthropic, Google, Mistral, Cohere) that does not offer native constrained decoding. Best for most production use cases.

---

### Tier 3 — Constrained Decoding (Guaranteed)

Force the model's token sampling to only produce tokens valid for the target schema at every step. No retries needed. No post-processing. Mathematically guaranteed valid output.

**How it works:** The schema (JSON Schema, regex, CFG) is compiled to a finite automaton or pushdown automaton. At each decoding step, the automaton masks the logits to allow only tokens that keep the output on a valid path. The model never gets the chance to produce an invalid token.

**Cost:** Near-zero overhead (< 50 microseconds per token for XGrammar). **Benefit:** Eliminates all retry costs.

#### XGrammar

The current state of the art for constrained decoding at inference time.

- Developed by the MLC team; became the default structured generation backend for vLLM 0.6+, SGLang, and TensorRT-LLM
- Compiles JSON Schema to a context-free grammar (CFG), then uses a hybrid pushdown automaton (PDA) that splits vocabulary into context-independent tokens (~99% of vocab) and context-dependent tokens (~1%)
- Context-independent tokens are pre-computed once per grammar, eliminating per-step overhead
- Result: CFG-level expressiveness with FSM-level performance — up to 100× faster than naive grammar-constrained methods
- Per-token overhead: under 40 microseconds in benchmarks (March 2026)

**Usage via vLLM:**

```python
from openai import OpenAI  # vLLM exposes OpenAI-compatible endpoint

client = OpenAI(base_url="http://localhost:8000/v1", api_key="token")

response = client.chat.completions.create(
    model="meta-llama/Meta-Llama-3-8B-Instruct",
    messages=[{"role": "user", "content": "Extract product info: MacBook Pro 16-inch, $2499"}],
    extra_body={
        "guided_json": {
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "price_usd": {"type": "number"},
            },
            "required": ["product_name", "price_usd"],
        }
    },
)
```

vLLM also supports `guided_regex` (regex pattern), `guided_choice` (exactly one of a list), and `guided_grammar` (raw CFG in EBNF). See [[infra/inference-serving]].

#### Outlines

Python library by .txt (dottxt-ai). The original open-source constrained decoding library; predates XGrammar and has broader integration surface.

- Integrates with: llama.cpp, HuggingFace `transformers`, vLLM, TGI
- Supports: JSON Schema, Pydantic models, regex, enum/choice constraints, context-free grammars
- Under the hood: compiles schemas to regex via `outlines-core` (Rust), then masks logits via finite automata

```python
import outlines

model = outlines.models.transformers("mistralai/Mistral-7B-v0.1")

from pydantic import BaseModel

class Product(BaseModel):
    name: str
    price: float
    in_stock: bool

generator = outlines.generate.json(model, Product)
result = generator("Extract: MacBook Pro 16-inch, $2499, available")
# result is a validated Product instance, guaranteed
```

**Outlines vs XGrammar:**

| | Outlines | XGrammar |
|---|---|---|
| Primary use | Local inference (llama.cpp, transformers) | Production serving (vLLM, SGLang) |
| Schema compilation | Regex-based FSM via outlines-core (Rust) | Hybrid PDA with vocab pre-partitioning |
| vLLM integration | Available as backend option | Default backend (v0.6+) |
| Pydantic support | Native | Via JSON Schema conversion |
| Regex constraints | Yes | Yes |
| Context-free grammars | Yes | Yes |

**When to use Outlines:** Local inference, custom grammar constraints, integration with `transformers` or `llama.cpp` directly.

#### LMQL

A query language for LLMs with built-in constraints. Less commonly used in 2026; uses Python-embedded syntax to define output structure with logical constraints.

```python
# LMQL example
"Q: What is the capital of France? A: [ANSWER]" where len(ANSWER) < 20
```

Better suited for complex conditional constraints than pure schema enforcement. Niche use.

#### Guidance (Microsoft)

Microsoft's structured generation library. Uses Handlebars-like templates with generation variables. Supports constrained generation via regex and CFG. Less adopted than Outlines for pure JSON schema use cases; stronger for interleaved generation and conditional logic.

---

## Native API Support

### OpenAI — `json_schema` (Server-Side Constrained Decoding)

OpenAI runs constrained decoding on their servers. Supported on `gpt-4o-2024-08-06` and later, `gpt-4o-mini`, `o1`, `o3`.

```python
from openai import OpenAI
import json

client = OpenAI()

schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string"},
        "age": {"type": "integer"},
        "email": {"type": "string"},
    },
    "required": ["name", "age", "email"],
    "additionalProperties": False,
}

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Extract: John Smith, 34, john@example.com"}],
    response_format={
        "type": "json_schema",
        "json_schema": {
            "name": "user_extraction",
            "schema": schema,
            "strict": True,
        },
    },
)

data = json.loads(response.choices[0].message.content)
```

`strict: True` enforces the schema at the server side. `additionalProperties: False` is required for strict mode. The OpenAI Python SDK also supports passing a Pydantic model directly via `client.beta.chat.completions.parse()`.

**Limitation:** Not all JSON Schema features are supported in strict mode. No `anyOf`, limited `pattern`, no `$ref` to external schemas.

### Anthropic — No Native Support (as of May 2026)

Anthropic's API has no `response_format` equivalent. The recommended approach is [[python/instructor]] with `max_retries=2`. Tool use (`tool_choice="any"`) can be repurposed to enforce a schema, since tool parameters are validated by the API — but this is a workaround, not a first-class structured output feature.

```python
# Tool-use workaround for schema enforcement
tools = [{
    "name": "extract_user",
    "description": "Extract user information",
    "input_schema": {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "integer"},
        },
        "required": ["name", "age"],
    },
}]

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    tools=tools,
    tool_choice={"type": "tool", "name": "extract_user"},
    messages=[{"role": "user", "content": "Extract: Alice, 28"}],
)
# response.content[0].input is a dict conforming to the schema
```

This works because the API enforces that the model calls the specified tool — but schema conformance is still prompt-based, not constrained decoding. Use [[python/instructor]] for reliability.

### Gemini — `response_schema`

```python
import google.generativeai as genai

model = genai.GenerativeModel("gemini-1.5-pro")

response = model.generate_content(
    "Extract product info: MacBook Pro 16-inch, $2499",
    generation_config=genai.GenerationConfig(
        response_mime_type="application/json",
        response_schema={
            "type": "object",
            "properties": {
                "product_name": {"type": "string"},
                "price_usd": {"type": "number"},
            },
        },
    ),
)
```

Server-side constrained decoding. Supported on Gemini 1.5 Pro, 1.5 Flash, 2.0 Flash, and later.

---

## Decision Framework

```
Which API / deployment?
│
├── OpenAI API
│   └── Use native json_schema (response_format) with strict: True
│       └── Or: instructor for Pydantic-native code
│
├── Anthropic API
│   └── Use instructor with max_retries=2
│       └── Or: tool_choice workaround for critical paths
│
├── Gemini API
│   └── Use response_mime_type + response_schema
│
├── Self-hosted vLLM
│   └── Use XGrammar (already the default)
│       └── guided_json, guided_regex, guided_choice, guided_grammar
│
├── Local inference (transformers / llama.cpp)
│   └── Use Outlines
│
└── Need regex or enum constraints (not JSON Schema)
    └── Use Outlines or vLLM guided_regex / guided_choice
```

---

## Common Failure Modes

**Schema too complex or deeply nested**
Models reliably produce flat schemas. Once you have objects nested 3+ levels deep with optional fields at each level, error rates climb sharply. Fix: flatten the schema or split into sequential extraction calls.

**Optional fields omitted instead of nulled**
Models interpret "optional" as "can skip entirely." They output `{"name": "Alice"}` when the schema expects `{"name": "Alice", "age": null}`. Fix: make optional fields explicit with a description like `"If unknown, return null"`. With constrained decoding, this is enforced correctly since `null` is a valid token for optional fields.

**Numeric precision: floats become strings**
A model may output `"price": "29.99"` instead of `"price": 29.99`. This passes JSON parse but fails Pydantic validation on a `float` field. Fix: add field descriptions like `"must be a number, not a string"`, or use instructor's retry loop to correct it.

**instructor exhausting retries on a valid response wrapped in markdown**
The model outputs correct JSON inside a code fence (` ```json ... ``` `). instructor's default parser fails. Fix: set `mode=instructor.Mode.MD_JSON` or `mode=instructor.Mode.JSON` explicitly. See [[python/instructor]] for mode reference.

**Constrained decoding hurts reasoning quality**
For complex tasks, forcing the model to generate valid JSON token-by-token can degrade reasoning — the model cannot use intermediate "thinking" tokens to work through the problem. Fix: separate reasoning from extraction. Let the model reason freely first, then extract structured data from its answer in a second call.

---

## Key Facts

- XGrammar is the default in vLLM 0.6+ (2024) and the default across vLLM, SGLang, and TensorRT-LLM as of early 2025; per-token overhead is under 40 microseconds
- Outlines is the library to use for local inference with `transformers` or `llama.cpp`; it supports regex, JSON Schema, Pydantic, enum, and CFG constraints
- OpenAI `json_schema` with `strict: True` requires `additionalProperties: False` on all objects
- Anthropic has no native structured output API as of May 2026; tool-use workaround or instructor is required
- instructor has 3M+ monthly PyPI downloads and supports 15+ LLM providers with a consistent API
- 1–2 retries with instructor recovers ~97–99% of malformed outputs for typical schemas; 3+ retries signals schema design problems, not model capability

---

## Connections

- [[python/instructor]] — retry-based structured output library; full API reference and failure cases
- [[apis/anthropic-api]] — tool use API that can be used as a structured output workaround
- [[apis/openai-api]] — json_schema response_format and beta.chat.completions.parse
- [[infra/inference-serving]] — vLLM deployment where XGrammar runs as the default backend
- [[prompting/techniques]] — XML structuring for Claude; prompt design for extraction tasks
- [[prompting/dspy]] — auto-optimising prompt modules; complementary to structured outputs
- [[python/ecosystem]] — Pydantic v2 validation that powers instructor
- [[security/guardrails]] — broader output safety validation beyond schema conformance
- [[evals/methodology]] — using structured output extraction to get LLM judge scores as typed objects
- [[test-automation/testing-llm-apps]] — testing structured output pipelines with pytest and respx mocking
