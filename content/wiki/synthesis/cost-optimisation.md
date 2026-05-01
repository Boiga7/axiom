---
type: synthesis
category: synthesis
tags: [cost, optimisation, caching, batching, model-routing, prompt-compression, tokens]
sources: []
updated: 2026-04-29
para: resource
tldr: Seven cost levers (prompt caching, model routing, Batch API, prompt compression, output token control, semantic caching, streaming) applied together typically reduce LLM API costs by 60-90% without quality loss.
---

# LLM Cost Optimisation

> **TL;DR** Seven cost levers (prompt caching, model routing, Batch API, prompt compression, output token control, semantic caching, streaming) applied together typically reduce LLM API costs by 60-90% without quality loss.

LLM API costs compound fast at scale. A pipeline that costs $0.03/call at 100 calls/day is $900/month. At 10,000 calls/day it's $9,000/month. These levers, applied together, typically reduce costs by 60-90% without quality loss.

---

## The Cost Equation

```
Cost = (input_tokens × input_price + output_tokens × output_price) × calls_per_day × 30
```

At Claude Sonnet 4.6 ($3/$15 per M):
- 1,000 token input + 500 token output × 1,000 calls/day = **$67.50/month**
- 10,000 token input + 500 token output × 1,000 calls/day = **$345/month**
- 10,000 token input + 500 token output × 10,000 calls/day = **$3,450/month**

The input token count is usually the biggest lever — and it's where prompt caching helps most.

---

## Lever 1: Prompt Caching (Highest Impact)

Cache the static prefix of your prompt — system prompt, documents, few-shot examples. Pay 0.1x on cache reads.

```python
import anthropic

client = anthropic.Anthropic()

SYSTEM_PROMPT = "..." * 5000  # 5,000-token system prompt

response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": SYSTEM_PROMPT,
            "cache_control": {"type": "ephemeral"},  # 5-min TTL
        }
    ],
    messages=[{"role": "user", "content": user_query}],  # only this varies
)
```

**Savings calculation:**
- Uncached: 5,000 system tokens × $3/M = $0.015 per call
- Cached (after first): 5,000 × $0.30/M = $0.0015 per call → **90% reduction on system prompt**
- 1-hour TTL (`cache_control: {"type": "persistent"}`) — 2x write cost, 0.1x read cost — use for documents queried repeatedly

**When to use:** any time the same prefix is sent across multiple calls. System prompts, RAG documents used for multiple queries, few-shot examples.

---

## Lever 2: Model Routing

Not every task needs Sonnet. Route by complexity.

```python
def route_to_model(task_type: str, complexity: str) -> str:
    routing = {
        ("classification", "any"):      "claude-haiku-4-5-20251001",
        ("extraction", "any"):          "claude-haiku-4-5-20251001",
        ("summarisation", "short"):     "claude-haiku-4-5-20251001",
        ("summarisation", "long"):      "claude-sonnet-4-6",
        ("code", "simple"):             "claude-sonnet-4-6",
        ("code", "complex"):            "claude-opus-4-7",
        ("reasoning", "any"):           "claude-opus-4-7",
        ("chat", "any"):                "claude-sonnet-4-6",
    }
    return routing.get((task_type, complexity),
           routing.get((task_type, "any"), "claude-sonnet-4-6"))
```

**Cost difference:**
| Model | Relative cost |
|---|---|
| Claude Haiku 4.5 | 1x (baseline) |
| Claude Sonnet 4.6 | ~3x |
| Claude Opus 4.7 | ~5x |

Route classification, routing, extraction, short summarisation → Haiku. Save Sonnet/Opus for where quality matters.

### Classifier-Based Routing

```python
def classify_complexity(query: str) -> str:
    """Use a cheap model to decide which expensive model to use."""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # cheap classifier
        max_tokens=10,
        messages=[{
            "role": "user",
            "content": f"""Classify this query complexity: simple/complex.
Simple = factual lookup, extraction, classification, short summary.
Complex = multi-step reasoning, code generation, analysis.
Query: {query}
Respond with only: simple or complex"""
        }],
    )
    complexity = response.content[0].text.strip().lower()
    return "claude-haiku-4-5-20251001" if complexity == "simple" else "claude-sonnet-4-6"
```

The classifier call costs ~$0.0001. If it routes 50% of calls to Haiku, saves 50% on those calls.

---

## Lever 3: Batch API (50% Off)

Anthropic's Batch API processes requests asynchronously within 24 hours at 50% of standard pricing.

```python
import anthropic

client = anthropic.Anthropic()

# Create a batch of up to 10,000 requests
batch = client.messages.batches.create(
    requests=[
        {
            "custom_id": f"request-{i}",
            "params": {
                "model": "claude-sonnet-4-6",
                "max_tokens": 512,
                "messages": [{"role": "user", "content": prompt}],
            },
        }
        for i, prompt in enumerate(prompts)
    ]
)

# Poll until complete (or use webhook)
import time
while True:
    batch = client.messages.batches.retrieve(batch.id)
    if batch.processing_status == "ended":
        break
    time.sleep(60)

# Collect results
results = {}
for result in client.messages.batches.results(batch.id):
    if result.result.type == "succeeded":
        results[result.custom_id] = result.result.message.content[0].text
```

**When to use:** any offline workload — document processing, bulk embeddings, dataset annotation, nightly reports, eval runs. Never for real-time user-facing calls.

---

## Lever 4: Prompt Compression

Reduce input tokens without losing information.

### Trim Unnecessary Context

```python
def trim_conversation_history(messages: list[dict], max_tokens: int = 4000) -> list[dict]:
    """Keep system + last N turns that fit in budget."""
    system = [m for m in messages if m["role"] == "system"]
    turns = [m for m in messages if m["role"] != "system"]

    total = sum(len(m["content"].split()) * 1.3 for m in system)  # rough token estimate
    kept = []
    for msg in reversed(turns):
        tokens = len(msg["content"].split()) * 1.3
        if total + tokens > max_tokens:
            break
        kept.insert(0, msg)
        total += tokens

    return system + kept
```

### Remove Redundancy from Prompts

```python
# Before: 800 tokens
VERBOSE_PROMPT = """
You are a helpful AI assistant. Your goal is to help users with their questions.
Please be polite, professional, and thorough in your responses. Make sure to...
[500 more tokens of generic instructions]
"""

# After: 80 tokens — same quality
CONCISE_PROMPT = """You are a helpful assistant. Be concise and accurate."""
```

Generic filler instructions add tokens without improving quality. Strip them.

### Summarise Long Histories

```python
def summarise_old_turns(old_messages: list[dict]) -> str:
    """Compress old conversation turns to a summary."""
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # use cheap model for summarisation
        max_tokens=200,
        messages=[{
            "role": "user",
            "content": f"Summarise this conversation in 3-5 sentences, focusing on decisions and key facts:\n\n{format_messages(old_messages)}"
        }],
    )
    return response.content[0].text
```

---

## Lever 5: Output Token Control

Output tokens cost 5x more than input tokens (Sonnet: $3 input vs $15 output per M). Constrain outputs.

```python
# Bad: model generates however much it wants
response = client.messages.create(model="claude-sonnet-4-6", max_tokens=4096, ...)

# Good: constrain to what you actually need
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=256,   # set to what the task actually requires
    system="Be concise. Answer in 1-3 sentences unless detail is explicitly requested.",
    ...
)
```

For classification or extraction tasks, max_tokens can be as low as 10-50.

---

## Lever 6: Semantic Caching

Cache LLM responses for semantically similar queries. See [[infra/caching]] for implementation.

```python
# If a user asks "what is RAG?" and another asks "explain RAG to me"
# — same semantic intent, same answer, one LLM call
```

Typical cache hit rate for customer support / FAQ use cases: 30-60%.

---

## Lever 7: Streaming for UX, Not Cost

Streaming doesn't reduce token cost — you pay the same tokens either way. Use streaming for user experience (responses appear faster), not cost reduction.

---

## Combined Savings Example

A RAG customer support bot, 10,000 queries/day, Sonnet 4.6:

| Optimisation | Before | After | Saving |
|---|---|---|---|
| Baseline (no optimisation) | $3,450/mo | — | — |
| Prompt caching (8K system prompt) | $3,450 | $1,200 | 65% |
| Route 40% to Haiku | $1,200 | $800 | 33% |
| Semantic cache (40% hit rate) | $800 | $480 | 40% |
| Trim conversation history | $480 | $400 | 17% |
| **Combined** | **$3,450** | **$400** | **88%** |

These optimisations stack multiplicatively.

---

## Monitoring Costs

Track costs in production — don't discover overruns from your invoice.

```python
from dataclasses import dataclass

PRICING = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0, "cache_write": 3.75, "cache_read": 0.30},
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0, "cache_write": 1.25, "cache_read": 0.10},
    "claude-opus-4-7": {"input": 5.0, "output": 25.0, "cache_write": 6.25, "cache_read": 0.50},
}

def log_call_cost(model: str, usage) -> float:
    p = PRICING[model]
    cost = (
        usage.input_tokens * p["input"] / 1_000_000
        + usage.output_tokens * p["output"] / 1_000_000
        + getattr(usage, "cache_creation_input_tokens", 0) * p["cache_write"] / 1_000_000
        + getattr(usage, "cache_read_input_tokens", 0) * p["cache_read"] / 1_000_000
    )
    # Log to your observability platform
    langfuse.log_cost(model=model, cost_usd=cost)
    return cost
```

---

## Key Facts

- Cost formula: (input_tokens × input_price + output_tokens × output_price) × calls/day × 30
- Sonnet 4.6 pricing: $3/M input, $15/M output, $3.75/M cache write, $0.30/M cache read
- Prompt caching 90% reduction: 5K system tokens cached → $0.015 → $0.0015 per call
- 1-hour TTL cache: 2x write cost, 0.1x read cost — use for documents queried repeatedly
- Haiku vs Sonnet vs Opus relative cost: 1x / ~3x / ~5x
- Batch API: 50% off standard pricing, async within 24 hours, up to 10,000 requests per batch
- Output tokens cost 5x input tokens (Sonnet: $3 input vs $15 output per M) — constrain max_tokens
- Semantic caching hit rate for customer support / FAQ use cases: 30-60%
- Combined levers example: $3,450/mo → $400/mo (88% reduction) for 10K queries/day RAG bot
- Streaming does not reduce token cost — pay the same tokens; use it for UX only

## Connections

- [[apis/anthropic-api]] — prompt caching cache_control syntax and Batch API reference
- [[llms/tokenisation]] — how tokens are counted and why it matters for cost
- [[prompting/context-engineering]] — prompt compression and sliding window strategies
- [[synthesis/llm-decision-guide]] — model selection for cost/quality balance
- [[observability/tracing]] — tracking cost per call in production with Langfuse/LangSmith

## Open Questions

- At what daily call volume does semantic caching overhead (embedding every query) pay back its own cost?
- Does Haiku-based complexity routing (classifier call → route to Sonnet/Haiku) actually save money when the classification itself incurs latency and a call cost?
- Will Anthropic introduce tiered pricing for very high-volume customers that makes these optimisations less critical?
