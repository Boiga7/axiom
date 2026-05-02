---
type: entity
category: apis
tags: [openai, api, gpt, function-calling, assistants, embeddings, whisper]
sources: []
updated: 2026-05-01
para: resource
tldr: The OpenAI API is the most widely integrated LLM API — nearly every framework supports it, many providers expose compatible endpoints, and it covers chat, function calling, embeddings, vision, audio, and reasoning models (o1/o3).
---

# OpenAI API

> **TL;DR** The OpenAI API is the most widely integrated LLM API — nearly every framework supports it, many providers expose compatible endpoints, and it covers chat, function calling, embeddings, vision, audio, and reasoning models (o1/o3).

The API behind GPT-4o, o1/o3, DALL-E 3, Whisper, and the text embedding models. The most widely integrated LLM API. Nearly every LLM framework supports it, and many alternative providers (Together, Fireworks, Groq, vLLM) expose an OpenAI-compatible endpoint.

---

## Models (April 2026)

| Model | Context | Strength | Pricing (in/out per M) |
|---|---|---|---|
| **gpt-4o** | 128K | Multimodal, fast, capable | $2.50 / $10 |
| **gpt-4o-mini** | 128K | Fast, cheap | $0.15 / $0.60 |
| **o3** | 200K | Best reasoning | $10 / $40 |
| **o3-mini** | 200K | Reasoning at lower cost | $1.10 / $4.40 |
| **o1** | 200K | Strong reasoning | $15 / $60 |
| **text-embedding-3-large** | 8K | Embeddings (MTEB 64.6) | $0.13 / — |
| **text-embedding-3-small** | 8K | Cheap embeddings | $0.02 / — |

---

## Chat Completions

The core API. Most calls go through `/v1/chat/completions`.

```python
from openai import OpenAI

client = OpenAI()  # reads OPENAI_API_KEY from env

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Explain KV cache in two sentences."},
    ],
    max_tokens=200,
    temperature=0.7,
)

print(response.choices[0].message.content)
print(f"Tokens: {response.usage.total_tokens}")
```

### Streaming

```python
with client.chat.completions.stream(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Write a haiku about transformers"}],
) as stream:
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
```

### Async

```python
from openai import AsyncOpenAI

async_client = AsyncOpenAI()

async def chat(message: str) -> str:
    response = await async_client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": message}],
    )
    return response.choices[0].message.content
```

---

## Function Calling / Tool Use

```python
import json

tools = [
    {
        "type": "function",
        "function": {
            "name": "get_current_weather",
            "description": "Get the current weather for a location",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {
                        "type": "string",
                        "description": "City and country, e.g. London, UK",
                    },
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            },
        },
    }
]

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather in Tokyo?"}],
    tools=tools,
    tool_choice="auto",
)

# Check if model wants to call a tool
if response.choices[0].finish_reason == "tool_calls":
    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    
    # Execute the function
    weather_result = get_current_weather(**args)
    
    # Send result back
    messages = [
        {"role": "user", "content": "What's the weather in Tokyo?"},
        response.choices[0].message,  # assistant message with tool_calls
        {
            "role": "tool",
            "content": json.dumps(weather_result),
            "tool_call_id": tool_call.id,
        },
    ]
    final = client.chat.completions.create(model="gpt-4o", messages=messages)
```

### Parallel Tool Calls

GPT-4o can call multiple tools in one response. Iterate over `tool_calls`:

```python
for tool_call in response.choices[0].message.tool_calls:
    # Execute each tool, collect results
    # Then append all tool results to messages before next call
```

### Structured Output (JSON Schema)

```python
from pydantic import BaseModel

class CalendarEvent(BaseModel):
    name: str
    date: str
    participants: list[str]

completion = client.beta.chat.completions.parse(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Alice and Bob meet Friday at 3pm."}],
    response_format=CalendarEvent,
)
event = completion.choices[0].message.parsed
# event.name, event.date, event.participants — fully typed
```

---

## Reasoning Models (o1, o3)

Reasoning models use internal chain-of-thought before responding. The interface differs slightly:

```python
response = client.chat.completions.create(
    model="o3",
    messages=[{"role": "user", "content": "Prove that √2 is irrational."}],
    # reasoning_effort="high"  # optional: "low", "medium", "high"
)
# response.usage.completion_tokens_details.reasoning_tokens — internal reasoning cost
```

- No `temperature` parameter — reasoning models are deterministic
- No `system` message on o1 (use `developer` role instead)
- Higher latency (seconds to minutes for hard problems)
- `reasoning_tokens` are billed but not visible in the response

---

## Embeddings

```python
response = client.embeddings.create(
    model="text-embedding-3-large",
    input=["Hello world", "How are you?"],
    encoding_format="float",  # or "base64"
)

embeddings = [item.embedding for item in response.data]
# embeddings[0] is a list of 3072 floats

# Matryoshka truncation — smaller dimensions, lower cost
response = client.embeddings.create(
    model="text-embedding-3-large",
    input="Hello world",
    dimensions=256,   # reduce from 3072 to 256 with minimal quality loss
)
```

---

## Vision

```python
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": "https://example.com/image.jpg",
                        # or base64: "data:image/jpeg;base64,{base64_string}"
                        "detail": "high",  # "low", "high", "auto"
                    },
                },
            ],
        }
    ],
)
```

---

## Whisper: Audio Transcription

```python
with open("audio.mp3", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
        language="en",         # optional, auto-detected if omitted
        response_format="text",
    )
print(transcript)
```

---

## Error Handling

```python
from openai import (
    OpenAI, APIConnectionError, RateLimitError,
    APIStatusError, AuthenticationError
)
import time

def chat_with_retry(messages: list, max_retries: int = 3) -> str:
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
            )
            return response.choices[0].message.content
        except RateLimitError:
            wait = 2 ** attempt
            time.sleep(wait)
        except APIStatusError as e:
            if e.status_code == 529:  # overloaded
                time.sleep(5)
            else:
                raise
    raise RuntimeError("Max retries exceeded")
```

---

## OpenAI-Compatible Endpoints

Many providers expose the same API. Drop-in replacement:

```python
from openai import OpenAI

# Together AI
client = OpenAI(
    api_key="TOGETHER_API_KEY",
    base_url="https://api.together.xyz/v1",
)

# Local vLLM
client = OpenAI(
    api_key="not-needed",
    base_url="http://localhost:8000/v1",
)

# Groq
client = OpenAI(
    api_key="GROQ_API_KEY",
    base_url="https://api.groq.com/openai/v1",
)
```

Same code, different backend.

---

## Key Facts

- text-embedding-3-large: 3072-dimensional, MTEB 64.6, $0.13/M tokens; supports Matryoshka truncation to 256 dims
- o3/o1 reasoning models: no `temperature`, no `system` message on o1 (use `developer` role)
- `reasoning_tokens` are billed but not visible in the response
- OpenAI-compatible endpoint: swap `base_url` and `api_key` — same code works with Together, Groq, local vLLM
- Structured output via `client.beta.chat.completions.parse` enforces Pydantic schema
- Whisper audio transcription: `whisper-1` model, `language` optional (auto-detected)
- GPT-4o context window: 128K tokens; o3: 200K tokens

## Common Failure Cases

**`RateLimitError` floods during batch processing despite exponential backoff**  
Why: concurrent threads all hit rate limits at the same time; exponential backoff without jitter causes them to retry in synchronized waves.  
Detect: bursts of 429 errors at regular intervals in the logs; retries succeed but the pattern repeats.  
Fix: add random jitter to the backoff delay: `wait = (2 ** attempt) + random.uniform(0, 1)`; use a token bucket or semaphore to cap concurrency.

**Structured output via `response_format` fails on nested Pydantic models**  
Why: the `client.beta.chat.completions.parse` method has constraints on Pydantic model complexity; recursive or deeply nested models may fail schema validation.  
Detect: `BadRequestError: Invalid schema` when using complex Pydantic models with `response_format`.  
Fix: flatten the schema; avoid recursive references; test the schema with OpenAI's JSON Schema validator before using it.

**o3/o1 reasoning model ignores `temperature` parameter causing unexpected variation**  
Why: reasoning models don't accept `temperature`; passing it raises a `BadRequestError` or is silently ignored depending on the SDK version.  
Detect: `BadRequestError: Unsupported parameter: 'temperature'` for o-series models.  
Fix: remove `temperature` from o-series calls; reasoning models are deterministic by design.

**Whisper transcription is inaccurate for domain-specific terminology**  
Why: Whisper was trained on general speech; domain jargon (medical, legal, proprietary product names) has high error rates.  
Detect: proper nouns, product names, and technical terms are consistently misspelled in the transcript.  
Fix: pass a `prompt` parameter with a list of expected domain terms; Whisper uses this as context for decoding.

**Parallel tool calls return out of order, corrupting the message history**  
Why: when multiple tool calls are returned in one response, results must be appended in the same order as the `tool_calls` list; out-of-order results cause `Invalid tool_call_id` errors.  
Detect: `BadRequestError: Invalid tool_call_id` on the follow-up call.  
Fix: iterate `response.choices[0].message.tool_calls` in order; match each result to its `tool_call_id` explicitly.

## Connections

- [[apis/anthropic-api]] — comparison on prompt caching, tool use, and extended thinking
- [[llms/model-families]] — full GPT/o1/o3 model family breakdown and benchmarks
- [[infra/inference-serving]] — vLLM exposes an OpenAI-compatible endpoint for self-hosted serving
- [[rag/embeddings]] — text-embedding-3-large vs Cohere embed-v4 vs BGE-M3 comparison
- [[multimodal/audio]] — Whisper transcription and TTS endpoints exposed by the OpenAI audio APIs

## Open Questions

- How does o3's reasoning quality compare to Claude extended thinking on software engineering tasks (SWE-bench)?
- What is the practical quality difference between text-embedding-3-large at full 3072 dims vs Matryoshka-truncated 512?
- When will OpenAI add prompt caching comparable to Anthropic's `cache_control` for repeated system prompts?
