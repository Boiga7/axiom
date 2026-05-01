---
type: synthesis
category: synthesis
tags: [getting-started, setup, first-call, anthropic, api-key, beginners]
sources: []
updated: 2026-04-29
para: resource
tldr: First working Anthropic API call in under 10 minutes — API key setup, SDK install, stateless multi-turn conversation pattern, streaming, and the nine most common beginner mistakes.
---

# Getting Started with AI Engineering

> **TL;DR** First working Anthropic API call in under 10 minutes — API key setup, SDK install, stateless multi-turn conversation pattern, streaming, and the nine most common beginner mistakes.

Your first working LLM integration in under 10 minutes. This page assumes you know Python. Everything else is explained from scratch.

---

## 1. Get an API Key

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account, verify email
3. Navigate to **API Keys** → **Create Key**
4. Copy it — you won't see it again

Store it as an environment variable, never in code:

```bash
# .env
ANTHROPIC_API_KEY=sk-ant-...
```

```python
# Load it in Python
import os
from dotenv import load_dotenv

load_dotenv()
api_key = os.environ["ANTHROPIC_API_KEY"]  # KeyError if missing — intentional
```

Add `.env` to `.gitignore` before your first commit. Leaked API keys are a real cost risk.

---

## 2. Install the SDK

```bash
pip install anthropic python-dotenv
# or with uv (faster):
uv add anthropic python-dotenv
```

---

## 3. Your First API Call

```python
import anthropic

client = anthropic.Anthropic()  # reads ANTHROPIC_API_KEY from environment

response = client.messages.create(
    model="claude-haiku-4-5-20251001",  # cheapest model — right for experiments
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "What is the capital of France?"}
    ],
)

print(response.content[0].text)  # Paris
```

Run it. If you see "Paris", you're connected.

---

## 4. Understanding the Response

```python
print(response.id)              # "msg_01XFDUDYJgAACzvnptvVoYEL" — unique message ID
print(response.model)           # "claude-haiku-4-5-20251001"
print(response.stop_reason)     # "end_turn" — model finished naturally
print(response.content)         # list of content blocks
print(response.content[0].type) # "text"
print(response.content[0].text) # the actual answer

# Token usage — this is what you pay for
print(response.usage.input_tokens)   # tokens you sent
print(response.usage.output_tokens)  # tokens the model generated
```

The `content` field is a list because the model can return multiple blocks (text + tool calls). For simple chat, `response.content[0].text` is always what you want.

---

## 5. System Prompts

A system prompt sets the model's role and behaviour before the conversation starts. It's the most impactful thing you control.

```python
response = client.messages.create(
    model="claude-haiku-4-5-20251001",
    max_tokens=256,
    system="You are a concise assistant. Answer in one sentence maximum.",
    messages=[
        {"role": "user", "content": "Explain quantum computing."}
    ],
)
print(response.content[0].text)
# "Quantum computing uses quantum mechanical phenomena like superposition
#  and entanglement to process information differently than classical computers."
```

Without the system prompt, the model gives a longer answer. The system prompt is not magic — it's an instruction the model follows. Write it like you'd brief a new colleague.

---

## 6. Multi-Turn Conversation

The API is stateless. To have a conversation, you pass the full history on every call:

```python
messages = []

def chat(user_message: str) -> str:
    messages.append({"role": "user", "content": user_message})

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=messages,
    )

    assistant_message = response.content[0].text
    messages.append({"role": "assistant", "content": assistant_message})
    return assistant_message

print(chat("My name is Lewis."))
print(chat("What's my name?"))  # Correctly says "Lewis" — it has the history
```

The `messages` list grows with every turn. In production you'll need to trim it — see [[prompting/context-engineering]].

---

## 7. Streaming

Without streaming, you wait for the full response before seeing anything. With streaming, text appears word by word — much better UX for longer responses.

```python
with client.messages.stream(
    model="claude-haiku-4-5-20251001",
    max_tokens=512,
    messages=[{"role": "user", "content": "Write a haiku about Python."}],
) as stream:
    for text in stream.text_stream:
        print(text, end="", flush=True)
print()  # newline at end
```

---

## 8. Async (for Django / FastAPI)

If your backend is async (FastAPI, Django async views), use the async client:

```python
import asyncio
import anthropic

async def async_chat(query: str) -> str:
    client = anthropic.AsyncAnthropic()
    response = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{"role": "user", "content": query}],
    )
    return response.content[0].text

# Test it
asyncio.run(async_chat("Hello"))
```

---

## 9. Common First Mistakes

| Mistake | Fix |
|---|---|
| `AuthenticationError` | Check `ANTHROPIC_API_KEY` is set in your environment, not just the `.env` file — run `load_dotenv()` first |
| `max_tokens` too low — response cuts off mid-sentence | Increase `max_tokens`. Set it to what the task actually needs, not 50 |
| Passing `"assistant"` as first message role | First message must be `"user"` |
| Alternating roles wrong | Messages must strictly alternate user → assistant → user → assistant |
| Using `response.content` as a string | It's a list. Always `response.content[0].text` |
| Hardcoding the API key in code | Use environment variables. Always. |
| Using `claude-opus-4-7` for everything | Use Haiku for experiments and classification; Sonnet for production tasks |
| Not setting a system prompt | The model has no context about its role — always set one |
| `max_tokens=4096` everywhere | Output tokens cost 5x input tokens. Set it to what the task needs |

---

## 10. What's Next

You've made your first API call. The natural next steps, in order:

1. **Add a system prompt** to shape the model's behaviour for your use case
2. **Build multi-turn chat** with history management
3. **Add tool use** — give the model access to functions your code defines
4. **Add RAG** — let the model answer questions from your own documents
5. **Write tests** with mocked API calls — see [[test-automation/testing-llm-apps]]
6. **Add evals** — measure quality before shipping — see [[evals/methodology]]

See [[synthesis/learning-path]] for a structured progression through the whole stack.

---

## Key Facts

- SDK install: `pip install anthropic python-dotenv` or `uv add anthropic python-dotenv`
- Always read API key from environment: `os.environ["ANTHROPIC_API_KEY"]` — never hardcode
- First message role must be `"user"` — `"assistant"` as first role causes an error
- Messages must strictly alternate: user → assistant → user → assistant
- `response.content` is a list of content blocks — always access text as `response.content[0].text`
- API is stateless: pass the full conversation history on every call
- Use Haiku for experiments and classification; Sonnet for production tasks; Opus only for complex reasoning
- Output tokens cost 5x input tokens — set max_tokens to what the task actually needs, not 4096
- `stop_reason: "end_turn"` means the model finished naturally; `"max_tokens"` means it was cut off

## Connections

- [[apis/anthropic-api]] — full API reference: caching, batch, streaming, tool use
- [[llms/claude]] — which model to use for what task and why
- [[synthesis/cost-optimisation]] — how to keep costs low as you scale
- [[synthesis/learning-path]] — what to learn next and in what order
- [[prompting/techniques]] — system prompt design and XML structuring once the basics work

## Open Questions

- Is `uv` universally better than `pip install` for new AI engineering projects, or are there cases where pip is still preferable?
- Should beginners start with Haiku even for quality-sensitive tasks just to validate the integration first?
- At what point does the `AsyncAnthropic` client become necessary vs optional for typical web backends?
