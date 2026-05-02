---
type: entity
category: llms
tags: [claude, anthropic, opus, sonnet, haiku, benchmarks, extended-thinking]
sources: []
updated: 2026-04-29
para: resource
tldr: The Claude 4.x model family (Opus 4.7, Sonnet 4.6, Haiku 4.5) — model selection guide, extended thinking, prompt caching, and the RSP safety framework underlying all Claude deployments.
---

# Claude

> **TL;DR** The Claude 4.x model family (Opus 4.7, Sonnet 4.6, Haiku 4.5) — model selection guide, extended thinking, prompt caching, and the RSP safety framework underlying all Claude deployments.

Anthropic's family of AI assistants. The current (April 2026) generation is Claude 4.x. Trained with [[safety/constitutional-ai]] and optimised for helpfulness, harmlessness, and honesty.

---

## Model Lineup (April 2026)

| Model | Context | Thinking | SWE-bench | GPQA | Pricing (in/out per M) |
|---|---|---|---|---|---|
| **claude-opus-4-7** | 1M tokens | Yes | ~80%+ | ~91%+ | $5 / $25 |
| **claude-opus-4-6** | 1M tokens | Yes | 80.8% | 91.3% | $5 / $25 |
| **claude-sonnet-4-6** | 1M tokens | Yes | 79.6% | — | $3 / $15 |
| **claude-haiku-4-5-20251001** | 200K tokens | No | 73.3% | — | $1 / $5 |

> [Source: Perplexity research / benchlm.ai, 2026-04-29]

Opus 4.7 released April 16 2026. Sonnet 4.6 is the default recommendation for most production workloads. 1.2 percentage points behind Opus 4.6 on SWE-bench at 40% lower cost.

### Which Model to Use

- **Haiku 4.5** — classification, routing, extraction, summarisation at high volume. Fastest, cheapest.
- **Sonnet 4.6** — daily driver. Complex reasoning, code generation, agent tasks. The right default.
- **Opus 4.6 / 4.7** — hardest problems where quality > cost. Extended architectural reasoning, research synthesis, complex multi-step code.

---

## Extended Thinking

Claude's deep reasoning mode. The model reasons internally (invisible unless you request the thinking block) before producing its final answer.

```python
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[...]
)
# response.content includes a ThinkingBlock + TextBlock
```

Available on Opus and Sonnet. Not available on Haiku. Do not combine with explicit chain-of-thought prompting. The internal reasoning replaces it.

---

## Prompt Caching

Claude's most impactful cost feature. Cache the system prompt, large documents, or few-shot examples. Subsequent calls with the same prefix pay 0.1x read cost.

All Claude 4.x models support both 5-minute and 1-hour cache TTLs. See [[apis/anthropic-api]] for the full breakdown.

With a 200K-token document as context:
- Without caching: every call pays for 200K input tokens
- With caching (1-hour TTL): first call pays 2x, subsequent calls pay 0.1x — 95% cost reduction for repeated queries

---

## Claude's Character

Anthropic publishes explicit documentation of Claude's values and character. Key traits:
- Intellectual curiosity across all domains
- Warmth and genuine care for the humans it works with
- Playful wit balanced with substance
- Directness combined with openness to other views
- Deep commitment to honesty and ethics

These are explicitly trained via [[safety/constitutional-ai]] and reinforcement learning from human feedback. Claude is not simply following rules. It has internalised values.

---

## Context Window and Long-Context Behaviour

All Claude 4.x models support 1M tokens (Haiku: 200K). For practical reference:
- 1M tokens ≈ 750K words ≈ an entire codebase
- At 1M context, quality degrades for information retrieval tasks if the key information is buried in the middle (the "lost in the middle" problem)
- For RAG tasks, Claude performs better on retrieved chunks than on raw long context injection

---

## Vision and Multimodal

Claude's best-in-class strength is document understanding: PDFs, tables, charts, financial statements, technical diagrams. See [[multimodal/vision]] for the full treatment.

---

## Responsible Scaling Policy (RSP)

Anthropic's commitment to safety at capability levels. Each Claude model is evaluated against a defined set of dangerous capability thresholds before deployment. If a model crosses a threshold, deployment is paused until mitigations are in place.

The RSP is public. See [[safety/alignment]] for details.

---

## Claude Code

Claude's agentic coding tool. Uses Claude Sonnet 4.6 by default, switchable to Opus. See [[ai-tools/claude-code]] for the full tool treatment.

---

## Key Facts

- Claude Opus 4.6: 80.8% SWE-bench Verified, 91.3% GPQA Diamond, $5/$25 per M tokens
- Claude Sonnet 4.6: 79.6% SWE-bench, $3/$15 per M — recommended production default
- Claude Haiku 4.5: 73.3% SWE-bench, $1/$5 per M — high-volume classification/routing
- Extended thinking available on Opus and Sonnet; not on Haiku
- 1M token context (Haiku: 200K); 1M tokens ≈ an entire large codebase
- Prompt caching: 95% cost reduction for repeated 200K-token document queries (1-hour TTL)
- "Lost in the middle" degradation: RAG over retrieved chunks outperforms raw long context injection

## Common Failure Cases

**Prompt caching miss because the cached prefix is not byte-identical across requests**
Why: cache hits require that the content before the `cache_control` breakpoint is exactly the same on every call; any change in whitespace, dynamic timestamps, or user-ID injection into the system prompt invalidates the cache and charges full input cost.
Detect: cache hit rate in the Anthropic API usage dashboard is near 0% despite an apparently stable system prompt; cost per call matches uncached pricing.
Fix: move all dynamic content (user ID, session context, timestamps) after the last `cache_control` breakpoint, so the static prefix before it never changes.

**Extended thinking enabled on Haiku, causing a 400 API error**
Why: the `thinking` parameter is only valid for Opus and Sonnet models; passing `thinking={"type": "enabled", ...}` to a Haiku model ID returns an `invalid_request_error`.
Detect: the API call raises a `BadRequestError` with a message about unsupported parameters; the model string in the request is `claude-haiku-*`.
Fix: check the model string before enabling thinking; gate `thinking` on model family — only enable for `claude-opus-*` or `claude-sonnet-*`.

**"Lost in the middle" degrades retrieval quality at 1M-token context, but the failure is silent**
Why: when the key document or fact is placed in the middle of a 1M-token context, Claude's retrieval accuracy degrades significantly compared to placing it at the beginning or end; the model still produces a confident, fluent answer using peripheral context.
Detect: accuracy drops in eval runs when the target document is placed at positions 30-70% through the context; the model gives plausible but wrong answers with no expressed uncertainty.
Fix: place the most important context at the start or end of the prompt; use RAG to surface the top-k chunks and inject them near the beginning rather than injecting the full corpus.

**Explicit chain-of-thought prompt combined with extended thinking produces lower-quality output than either alone**
Why: the model's internal reasoning already performs chain-of-thought; adding an explicit "think step by step" instruction interferes with the extended thinking process and can cause the model to repeat reasoning redundantly or truncate the thinking block.
Detect: response quality is lower than without CoT instructions; the thinking block is shorter than expected or the final answer contradicts the thinking.
Fix: remove explicit CoT instructions (e.g., "think step by step", "reason through this") when extended thinking is enabled; let the thinking parameter handle reasoning internally.

## Connections

- [[apis/anthropic-api]] — full API reference including prompt caching and extended thinking
- [[safety/constitutional-ai]] — how Claude is trained to be helpful and harmless
- [[safety/alignment]] — RSP (Responsible Scaling Policy) and safety evaluations
- [[prompting/techniques]] — getting the best out of Claude; do not use explicit CoT with extended thinking
- [[ai-tools/claude-code]] — Claude as an autonomous coding agent (Sonnet 4.6 by default)
- [[llms/model-families]] — Claude in context of the broader model landscape

## Open Questions

- How does Claude Opus 4.7 differ from 4.6 in practice — is the improvement primarily reasoning depth?
- What is the practical quality ceiling for extended thinking on frontier coding tasks?
- How does "lost in the middle" degradation scale as context grows from 200K to 1M tokens?
