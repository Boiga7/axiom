---
type: concept
category: prompting
tags: [context-engineering, context-window, compression, summarisation, kv-cache, long-context, context-rot, compaction, sub-agents]
sources: []
updated: 2026-05-01
para: resource
tldr: "Context engineering manages ALL tokens in the context window — not just the prompt text. Context rot degrades recall as token count grows. Three techniques for long-horizon tasks: compaction, note-taking, sub-agent isolation."
---

# Context Engineering

> **TL;DR** Context engineering manages ALL tokens in the context window — not just the prompt text. Context rot degrades recall as token count grows. Three techniques for long-horizon tasks: compaction, note-taking, sub-agent isolation."

Managing what goes into the context window is a core engineering discipline. As models get 1M-token windows, the problem shifts from "how do I fit this?" to "what should I include, and where?" Context engineering is the answer.

## Context Engineering vs Prompt Engineering

**Prompt engineering** focuses on crafting effective instructions — primarily the system prompt and user messages.

**Context engineering** is the broader discipline: optimising ALL tokens available to the model during inference. System prompts, tools, external data, message history, retrieved documents, tool results — everything.

The key insight from Anthropic: "Context refers to the set of tokens included when sampling from a large-language model. The engineering problem at hand is optimising the utility of those tokens against the inherent constraints of LLMs."

Context engineering is continuous (every inference is a curation decision) where prompt engineering is discrete (you write a prompt once).

> [Source: Anthropic Engineering: Effective Context Engineering for AI Agents, 2025]

---

## Context Rot

As the number of tokens in the context window grows, the model's ability to accurately recall information from that context degrades. Anthropic calls this **context rot**.

Why it happens: the transformer architecture creates n² pairwise relationships for n tokens. As sequences grow, attention capacity is stretched. Models also see less training data with very long sequences, leaving them less experienced with managing long-range dependencies.

Context rot compounds in agents: each tool call adds tokens to context. Without management, a long-running agent degrades its own performance as it runs.

The fix is engineering, not bigger context windows:

---

## The "Lost in the Middle" Problem

---

## The Context Window as a Resource

The context window is not infinite compute — it's a budget. Every token costs:
- **Money:** at $3/M (Sonnet 4.6), 100K tokens = $0.30 per call
- **Latency:** time-to-first-token grows with context length
- **Quality:** the "lost in the middle" problem — models retrieve information better from the start and end of context

The job of context engineering is to maximise signal per token.

---

## The "Lost in the Middle" Problem

Models have better recall for information at the start and end of a long context:

```
Context: [A] [B] [C] ... [X] [Y] [Z]
Best recall: A, Y, Z
Worst recall: items in the middle (M, N, O, ...)
```

Mitigation: put the most important information first (system prompt) and last (recent conversation), not in the middle.

For RAG, put retrieved documents *before* the question:

```python
# Good: context before question
prompt = f"""Use the following context to answer the question.

Context:
{retrieved_docs}

Question: {user_question}
Answer:"""

# Worse: context after question buries it in the middle of a long conversation
```

---

## What Belongs in the Context Window

**Must be in context (no alternative):**
- Current user message
- Recent conversation turns (last 3-10 turns)
- Retrieved documents specific to this query
- Active task state

**Should be in context (if space allows):**
- System prompt and persona
- Tool definitions
- User preferences / personalisation

**Should NOT be in context (use retrieval instead):**
- Full document corpus
- All past conversation history
- General knowledge (the model already has this)
- Boilerplate that never changes (cache instead)

---

## Conversation History Management

Naive approach: append every turn forever → context fills up and costs explode.

### Sliding Window

Keep only the last N turns:

```python
def trim_history(messages: list[dict], max_turns: int = 10) -> list[dict]:
    # Always keep system message
    system = [m for m in messages if m["role"] == "system"]
    turns = [m for m in messages if m["role"] != "system"]
    
    # Keep last max_turns messages (in pairs)
    trimmed_turns = turns[-max_turns * 2:]  # user + assistant = 2 messages per turn
    return system + trimmed_turns
```

### Progressive Summarisation

Summarise old turns, keep recent ones verbatim:

```python
def compress_history(messages: list[dict], keep_recent: int = 6) -> list[dict]:
    system = [m for m in messages if m["role"] == "system"]
    turns = [m for m in messages if m["role"] != "system"]
    
    if len(turns) <= keep_recent:
        return messages
    
    to_compress = turns[:-keep_recent]
    recent = turns[-keep_recent:]
    
    summary = summarise_turns(to_compress)  # call LLM to summarise
    
    return system + [
        {"role": "system", "content": f"Previous conversation summary:\n{summary}"}
    ] + recent
```

### Token Budget

More precise than message count:

```python
import tiktoken

def fit_history_to_budget(
    messages: list[dict],
    token_budget: int = 50_000,
    model: str = "gpt-4o",
) -> list[dict]:
    enc = tiktoken.encoding_for_model(model)
    
    total = 0
    fitted = []
    
    for msg in reversed(messages):
        tokens = len(enc.encode(msg["content"]))
        if total + tokens > token_budget:
            break
        fitted.insert(0, msg)
        total += tokens
    
    return fitted
```

---

## Context Compression

### LLMLingua / LLMLingua-2

Compress prompts by removing tokens the model can predict (low information content). Claims 3-5x compression with <5% quality loss.

```python
from llmlingua import PromptCompressor

compressor = PromptCompressor(model_name="microsoft/llmlingua-2-bert-large-multilingual-cased-meetingbank")

compressed = compressor.compress_prompt(
    context=retrieved_docs,
    target_token=1000,  # compress to 1000 tokens
    rate=0.5,           # or specify compression rate
)
print(compressed["compressed_prompt"])
print(f"Tokens: {compressed['origin_tokens']} → {compressed['compressed_tokens']}")
```

### Selective RAG

Instead of injecting all retrieved docs, inject only the relevant sentences:

```python
def extract_relevant_sentences(query: str, doc: str, top_k: int = 3) -> str:
    sentences = doc.split(". ")
    # Embed each sentence, rank by similarity to query
    scored = [(cosine_similarity(embed(query), embed(s)), s) for s in sentences]
    top = sorted(scored, reverse=True)[:top_k]
    return ". ".join([s for _, s in top])
```

### Structured Summarisation

Rather than passing raw documents, pass structured summaries:

```python
def summarise_for_context(doc: str, query: str) -> str:
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",  # cheap model for summarisation
        max_tokens=300,
        messages=[{
            "role": "user",
            "content": f"Summarise the following document, focusing on information relevant to: {query}\n\nDocument:\n{doc}"
        }],
    )
    return response.content[0].text
```

---

## Prompt Caching for Static Context

Long, reused context (system prompts, few-shot examples, documents) should be cached.

```python
import anthropic

client = anthropic.Anthropic()

# Mark the static prefix for caching
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": very_long_system_prompt,      # 10,000 tokens
            "cache_control": {"type": "ephemeral"},  # cache for 5 minutes
        }
    ],
    messages=[{"role": "user", "content": user_query}],  # varies per call
)
# First call: pays 1.25x for system prompt tokens (write to cache)
# Subsequent calls within 5 min: pays 0.1x (read from cache)
# Savings at 1-hour TTL: first call 2x, then 0.1x — 95% reduction on repeated queries
```

See [[apis/anthropic-api]] for the full prompt caching reference.

---

## Long-Horizon Task Strategies

Extended tasks spanning hours accumulate context until it becomes a liability. Three strategies:

### Compaction

Summarise message history when approaching context limits. Preserve critical decisions and unresolved issues; discard redundant tool outputs and completed steps.

Lightweight compaction: once a tool result appears deep in history, the raw output is dispensable — summarise or drop it. Keep the conclusion, not the evidence.

Rule: maximise recall first (capture everything relevant), then improve precision (cut what's no longer load-bearing).

### Structured Note-Taking

Agents write notes to external storage, retrieve them later. Persistent memory with minimal context overhead.

Claude Code demonstrates this with to-do lists. A Pokémon-playing Claude agent maintained strategic notes across thousands of steps, tracking progress and combat strategies across sessions.

Anthropic's memory tool on the Developer Platform enables agents to store and consult information outside the context window through a file-based system.

### Sub-Agent Architectures

Specialised sub-agents handle focused tasks with clean context windows. The coordinator holds strategy; sub-agents handle deep work and return condensed summaries (1,000-2,000 tokens), not raw outputs.

This isolates detailed search or computation context within sub-agents, keeping the lead agent's context focused on synthesis.

See [[agents/practical-agent-design]] for when to use sub-agents vs compaction.

---

## Just-in-Time Retrieval

Rather than loading all relevant data upfront, agents maintain lightweight identifiers (file paths, URLs, stored queries) and retrieve information dynamically during execution.

This mirrors how humans work: we use file hierarchies and naming conventions to retrieve on demand, not memorise entire repositories. Claude Code exemplifies this — it uses targeted queries and Bash commands to analyse large codebases without loading everything into context.

Trade-off: runtime exploration trades speed for intelligence. The agent needs proper tools, clear heuristics, and good naming conventions to navigate effectively. Hybrid approaches (some upfront, some JIT) often work best.

---

## Context Window Strategy by Use Case

| Use case | Strategy |
|---|---|
| Simple Q&A | System prompt + single turn |
| Multi-turn chat | Sliding window (last 10 turns) + summarisation |
| RAG (document QA) | Top-5 retrieved chunks (2-4K tokens), query last |
| Long document analysis | Full document + specific question (use 1M context) |
| Agent with tools | Compact history + tool definitions + current task |
| Long-horizon agent | Compaction or note-taking when approaching limits |
| Multi-agent handoff | Task description + condensed sub-agent summaries only |

---

## Key Facts

- Context engineering > prompt engineering: manages all tokens in context, not just instructions — recall, cost, latency all depend on what's in the window
- Context rot: recall degrades as token count grows (n² attention relationships); active management is required, not optional
- Cost at scale: 100K tokens per call × $3/M (Sonnet 4.6) = $0.30 per call
- "Lost in the middle": best recall at start and end of context; put key info first and last, not middle
- Sliding window default: keep last 10 turns (20 messages) for most chat applications
- Long-horizon tasks: use compaction, note-taking, or sub-agent isolation when approaching context limits
- LLMLingua / LLMLingua-2: 3-5x prompt compression with <5% quality loss claimed
- Prompt caching (Anthropic): first call 1.25x cost at 5-min TTL, 2x at 1-hour TTL; subsequent calls 0.1x — 95% reduction
- Minimum cacheable prefix: 1,024 tokens for Sonnet/Haiku; 2,048 for Opus
- For RAG: put retrieved documents before the question, not after
- Principle: "the smallest possible set of high-signal tokens that maximise the likelihood of the desired outcome"

## Connections

- [[llms/tokenisation]] — how tokens are counted
- [[apis/anthropic-api]] — prompt caching reference and cache_control syntax
- [[rag/pipeline]] — retrieval as context selection
- [[agents/memory]] — managing context across agent sessions
- [[agents/practical-agent-design]] — when to use compaction vs sub-agent isolation
- [[prompting/techniques]] — structuring the context you include

## Open Questions

- At what token count does LLMLingua's compression quality loss become unacceptable for production RAG?
- Is progressive summarisation or selective RAG the better strategy for very long (50+ turn) conversations?
- How does the "lost in the middle" effect scale as context grows from 200K to 1M tokens?
