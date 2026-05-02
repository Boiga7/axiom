---
type: concept
category: security
para: resource
tags: [guardrails, output-validation, structured-outputs, safety, llm-reliability]
sources: []
updated: 2026-05-01
tldr: Runtime enforcement of LLM output contracts — ensuring models return valid structure, safe content, and correct format before that output reaches your users or downstream systems.
---

# Guardrails and Output Validation

Runtime enforcement of LLM output contracts — ensuring models return valid structure, safe content, and correct format before that output reaches your users or downstream systems.

Distinct from [[security/prompt-injection]] (blocking bad inputs) and [[security/owasp-llm-top10]] (the threat taxonomy). This page is about validating and constraining what comes *out*.

---

## The Problem

LLMs are probabilistic — even with clear instructions they can:
- Return malformed JSON
- Include off-topic or harmful content
- Hallucinate fields or values
- Ignore output format instructions under certain prompts

Production systems need a validation layer between the LLM response and the application.

---

## Pattern 1: instructor (Schema Enforcement)

The lightest-weight solution. Wraps the Anthropic/OpenAI client to enforce a Pydantic schema with automatic retry on validation failure. See [[python/instructor]] for full coverage.

```python
import instructor
import anthropic
from pydantic import BaseModel, field_validator

client = instructor.from_anthropic(anthropic.Anthropic())

class ReviewDecision(BaseModel):
    approved: bool
    reason: str
    confidence: float

    @field_validator("confidence")
    @classmethod
    def confidence_in_range(cls, v):
        if not 0.0 <= v <= 1.0:
            raise ValueError("confidence must be between 0 and 1")
        return v

decision = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": "Review this PR: ..."}],
    response_model=ReviewDecision,
    max_retries=3,
)
```

**Best for:** Schema enforcement and type validation. Simple and composable.

---

## Pattern 2: Guardrails AI

A framework for building "guardrails" — named validators that can run before (input) and after (output) every LLM call. Validators are composable and reusable.

```bash
pip install guardrails-ai
```

```python
from guardrails import Guard
from guardrails.hub import ValidLength, DetectPII, ToxicLanguage

guard = Guard().use_many(
    ValidLength(min=10, max=500, on_fail="reask"),
    DetectPII(pii_entities=["EMAIL_ADDRESS", "PHONE_NUMBER"], on_fail="fix"),
    ToxicLanguage(threshold=0.5, on_fail="filter"),
)

response, validated, *rest = guard(
    anthropic.Anthropic().messages.create,
    prompt="Summarise this customer complaint: {complaint}",
    prompt_params={"complaint": complaint_text},
    model="claude-sonnet-4-6",
    max_tokens=512,
)

print(validated.validated_output)   # cleaned output
```

### On-fail actions

| Action | Behaviour |
|--------|-----------|
| `"reask"` | Send output + error back to LLM for correction |
| `"fix"` | Apply automated fix (e.g., truncate length, redact PII) |
| `"filter"` | Remove the offending content |
| `"exception"` | Raise `ValidationError` |
| `"noop"` | Log but pass through |

### Validator hub

Guardrails AI has a hub of pre-built validators:

```bash
guardrails hub install hub://guardrails/detect_pii
guardrails hub install hub://guardrails/toxic_language
guardrails hub install hub://guardrails/valid_length
guardrails hub install hub://guardrails/regex_match
```

**Best for:** Multi-rule validation pipelines, PII redaction, content safety at scale.

---

## Pattern 3: NVIDIA NeMo Guardrails

Conversation-level guardrails using a domain-specific language (Colang) to define allowed/disallowed conversational flows. Primarily for chatbot safety.

```bash
pip install nemoguardrails
```

```colang
# config/rails.co
define user ask politics
  "What do you think about the election?"
  "Which party should I vote for?"

define bot refuse to answer politics
  "I'm not able to discuss political topics."

define flow politics
  user ask politics
  bot refuse to answer politics
```

```python
from nemoguardrails import RailsConfig, LLMRails

config = RailsConfig.from_path("./config")
rails = LLMRails(config)

response = rails.generate(
    messages=[{"role": "user", "content": "What about the election?"}]
)
```

**Best for:** Topic control, conversation flow enforcement, customer-facing chatbots with strict scope limits.

---

## Pattern 4: Manual Validation Layer

For simple cases, write your own:

```python
import json
import re
from anthropic import Anthropic

client = Anthropic()

def extract_json(text: str) -> dict:
    # Find JSON block in model output
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if not match:
        raise ValueError("No JSON found in response")
    return json.loads(match.group())

def call_with_validation(prompt: str, max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        response = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        try:
            return extract_json(response.content[0].text)
        except (ValueError, json.JSONDecodeError) as e:
            if attempt == max_retries - 1:
                raise
            prompt += f"\n\nYour previous response had an error: {e}. Please try again."
    raise RuntimeError("Max retries exceeded")
```

---

## Choosing an Approach

| Scenario | Best approach |
|----------|--------------|
| Structured output with Pydantic schema | `instructor` |
| Multi-rule validation pipeline | Guardrails AI |
| Chatbot topic/flow control | NeMo Guardrails |
| Simple JSON extraction | Manual regex + retry |
| PII redaction at scale | Guardrails AI with `DetectPII` |
| Agent tool return validation | `instructor` or manual |

---

## Input vs Output Guardrails

This page focuses on output validation. Input validation (blocking malicious prompts) is covered in:
- [[security/prompt-injection]] — injection attack patterns and defences
- [[security/owasp-llm-top10]] — LLM01 (prompt injection), LLM02 (insecure output handling)

A production system needs both: validate inputs before the LLM sees them, validate outputs before your application uses them.

---

## Connections

- [[python/instructor]] — schema enforcement via Pydantic (Pattern 1 above, in depth)
- [[security/prompt-injection]] — input-side defence
- [[security/owasp-llm-top10]] — LLM02 (insecure output handling) and LLM06 (sensitive info disclosure)
- [[evals/methodology]] — guardrails can be modelled as automated evals running on every call
- [[agents/practical-agent-design]] — agent output validation as a safety layer
