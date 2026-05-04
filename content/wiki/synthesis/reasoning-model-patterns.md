---
type: synthesis
category: synthesis
para: resource
tags: [reasoning-models, extended-thinking, o3, budget-tokens, adaptive-thinking, gemini, deepseek-r1, synthesis]
sources: []
updated: 2026-05-03
tldr: "A production decision framework for when to use reasoning models and extended thinking — covering task fit, budget_tokens selection, cross-provider comparison, and cost/latency tradeoffs."
---

# Reasoning Model Patterns

> **TL;DR** Reasoning models (Claude extended thinking, o3, Gemini 2.5 Pro thinking mode, DeepSeek R1) improve accuracy on verifiable, multi-step tasks but add latency and cost that make them wrong for classification, retrieval, and high-volume pipelines. This page covers the decision framework, budget selection, and cross-provider comparison.

> [Source: Anthropic API docs / platform.claude.com, WebSearch, 2026-05-03]

---

## What Is a Reasoning Model?

A reasoning model allocates a dedicated chain-of-thought phase before producing its final answer. This internal scratchpad lets the model self-verify intermediate steps, backtrack, and try alternative approaches — behaviours that standard autoregressive generation cannot do mid-token.

The implementation varies by provider:

- **Claude (Anthropic):** a `thinking` block in the API response, streamed separately from the text block
- **OpenAI o-series:** reasoning tokens consumed internally; partially surfaced via `reasoning_effort`
- **Gemini 2.5 Pro / Flash:** a `thinkingConfig` parameter with a token budget
- **DeepSeek R1:** reasoning traces emitted inside `<think>` tags before the final answer

In all cases, the model pays a token tax (latency + cost) upfront in exchange for higher accuracy on tasks where reasoning depth matters.

---

## When Thinking Helps

Use a reasoning model when the task has these properties:

**Multi-step math, logic, and formal proofs.** The model can check each step against the next instead of committing to a plausible-sounding trajectory. AIME 2024 pass@1 on R1 improved from 15.6% to 77.9% during GRPO training solely because RL rewarded correct chains.

**Algorithm design and complex debugging.** Reasoning allows the model to mentally trace execution paths, catch off-by-one errors, and evaluate alternative implementations before writing. Claude Opus 4.5 scores 80.9% on SWE-bench Verified — substantially ahead of its non-thinking baseline — and o3 hits 69.1% on the same benchmark.

**Tasks requiring self-verification.** When correctness matters and the output can be internally cross-checked (e.g., "does this proof follow from premise A?"), extended thinking lets the model act as its own adversarial reviewer before answering.

**Low-latency tolerance with high accuracy requirement.** If the user can wait 10–60 seconds and a wrong answer has meaningful cost (e.g., an architectural decision, a medical triage question, a security audit), the latency tradeoff is worth it. The key test: would you pay a human expert to spend more time thinking? If yes, use a reasoning model.

---

## When Thinking Hurts or Wastes Money

**Simple factual retrieval.** Looking up a library version, a date, a definition, or a well-established procedure does not benefit from extended reasoning. The answer is in the model's weights. Extended thinking adds 10+ seconds of latency and 3–5x the token cost for zero accuracy improvement.

**Creative writing.** Thinking tends to over-plan, producing prose that feels mechanical and overly structured. Standard temperature-driven generation with a well-crafted system prompt outperforms extended thinking on creative tasks.

**Short-answer classification.** Sentiment analysis, intent classification, format validation, routing decisions — these are pattern-matching tasks. A reasoning model burning 5,000 tokens to decide "positive or negative" is money incinerated.

**High-volume chained pipelines.** A pipeline that applies extended thinking to 1 million records at 30 seconds per call takes approximately one year to complete. At scale, reasoning model latency compounds from an engineering inconvenience into a product constraint. Worse: if your pipeline chains multiple LLM calls (e.g., extract → classify → summarise → rank), enabling thinking at each step multiplies both cost and latency multiplicatively, not additively.

**Sub-second UX requirements.** Reasoning model time-to-first-token is typically 2–10 seconds on standard API endpoints. If users expect instant feedback, standard models with streaming are the only viable path.

---

## Cross-Provider Model Comparison

### Claude Extended Thinking (Anthropic)

**Models:** `claude-opus-4-7` and earlier with `thinking: {type: "enabled", budget_tokens: N}` (deprecated on 4.7+). Newer models use adaptive thinking.

**Adaptive thinking (current approach):** `thinking: {type: "adaptive"}` — Claude evaluates each request and decides whether to produce a thinking block and how long to spend on it. Manual `budget_tokens` is deprecated on `claude-opus-4-7` and later; passing it returns a 400 error.

**Legacy explicit budget:** Available on `claude-opus-4-6` and `claude-sonnet-4-6`. Range: 1,024 to 32,000+ tokens. Billed as output tokens at output token price.

```python
# Legacy explicit budget (opus-4-6 / sonnet-4-6 only)
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[{"role": "user", "content": "Prove that sqrt(2) is irrational."}]
)
# response.content[0] is a ThinkingBlock, [1] is TextBlock

# Adaptive (opus-4-7+)
response = client.messages.create(
    model="claude-opus-4-7",
    max_tokens=16000,
    thinking={"type": "adaptive"},
    messages=[{"role": "user", "content": "Design a distributed rate limiter."}]
)
```

Thinking blocks are streamed separately. In the streaming response, `type: "thinking"` events arrive before `type: "text"` events. See [[apis/anthropic-api]] for the streaming implementation.

**Benchmarks (April 2026):** Claude Opus 4.5: 80.9% SWE-bench Verified, outperforming o3 (69.1%) and Gemini 3 Pro (76.2%) on software engineering tasks.

---

### OpenAI o3 / o3-mini / o4-mini

Released April 2026. Reasoning tokens are consumed internally; the model does not expose the full chain-of-thought by default.

```python
from openai import OpenAI
client = OpenAI()

response = client.chat.completions.create(
    model="o3",
    reasoning_effort="high",   # "low" | "medium" | "high"
    messages=[{"role": "user", "content": "Solve this AIME problem..."}]
)
# response.usage.completion_tokens_details.reasoning_tokens gives token count
```

**Effort levels map approximately to:**

| Effort | Reasoning tokens (approx) | Latency | Use case |
|---|---|---|---|
| `low` | 1,000–5,000 | 2–5s | Light reasoning, routing decisions |
| `medium` | 5,000–20,000 | 5–20s | Default — most complex tasks |
| `high` | 20,000–50,000+ | 20–120s | Frontier math, hard proofs |

**Pricing:** o3 at $10/$40 per M input/output tokens (reasoning tokens billed as output). o3-mini at $1.10/$4.40 — the cost-efficient reasoning tier. No `temperature` parameter on o-series models.

**Benchmarks:** o3: 88.9% AIME 2026, 83.3% GPQA Diamond, 69.1% SWE-bench Verified, 2706 Elo competitive programming.

---

### Gemini 2.5 Pro / 2.5 Flash (Google)

Both Gemini 2.5 Pro and 2.5 Flash support a thinking mode controlled by `thinkingConfig`.

```python
import google.generativeai as genai

model = genai.GenerativeModel("gemini-2.5-pro")
response = model.generate_content(
    "Solve this integral step by step...",
    generation_config=genai.GenerationConfig(
        thinking_config=genai.ThinkingConfig(thinking_budget=10000)
    )
)
```

Gemini 2.5 Flash thinking is competitively priced ($0.15/$0.60 per M input/output) and is the recommended tier for cost-sensitive reasoning tasks where Claude Opus pricing is prohibitive. Gemini 2.5 Pro ($1.25/$10) targets frontier reasoning.

**Context:** 1M token context window on both models — the largest available commercially. Thinking tokens add to this budget, so extremely long-context + heavy-thinking combinations can hit limits.

---

### DeepSeek R1

Open-weights reasoning model. Does not use a `budget_tokens` API parameter — reasoning depth is controlled implicitly by the model's training.

```python
from openai import OpenAI  # DeepSeek uses OpenAI-compatible API

client = OpenAI(
    api_key="your-deepseek-key",
    base_url="https://api.deepseek.com"
)

response = client.chat.completions.create(
    model="deepseek-reasoner",   # R1 model name
    max_tokens=8000,             # must cover <think>...</think> + final answer
    messages=[{"role": "user", "content": "Prove the AM-GM inequality."}]
)
# response.choices[0].message.reasoning_content  → the chain-of-thought
# response.choices[0].message.content            → the final answer
```

**Critical production note:** R1 emits the full reasoning trace inside `<think>` tags. These count against `max_tokens`. Set `max_tokens` = (expected reasoning length) + (expected answer length). A common footgun: setting `max_tokens=512` for the answer without accounting for the 3,000-token thinking trace, producing truncated or empty final answers.

**Pricing:** $0.55/$2.19 per M input/output tokens — 96% cheaper than o1 at launch. Distilled variants (1.5B–70B) are available for local deployment via llama.cpp / vLLM. See [[llms/deepseek-r1]] for the full treatment.

---

## `budget_tokens` Selection Guide (Claude Legacy API)

For `claude-opus-4-6` and `claude-sonnet-4-6` with explicit `budget_tokens`:

| Task type | Recommended budget | Rationale |
|---|---|---|
| Simple structured output (JSON extraction, classification) | 1,024–2,048 | Overhead only; keep minimal |
| Moderate reasoning (code review, logical deduction) | 5,000–8,000 | Default starting point |
| Complex multi-step reasoning (debugging subtle bugs, system design) | 10,000–16,000 | Covers most hard tasks |
| Hard math, formal proofs, AIME-level problems | 16,000–32,000 | Needs space to explore and backtrack |
| Frontier research / most complex agent decisions | 32,000+ | Use batch API; avoid on streaming UX |

**Tuning protocol:**
1. Start at 5,000 tokens for any new task type.
2. Run your eval suite. If outputs are wrong or incomplete, double the budget.
3. Repeat until accuracy plateaus. Most tasks plateau below 16,000 tokens.
4. For budgets above 32,000, switch to the Batch API to avoid network timeout issues.

The budget is a target, not a hard cap — actual consumption varies. At the 32K+ range, the Batch API is recommended.

---

## Cost and Latency Tradeoffs

**Token cost multiplier.** Thinking tokens on Claude are billed as output tokens. At Claude Sonnet 4.6 ($15/M output), 10,000 thinking tokens cost $0.15 per call — before the actual answer. At 10,000 calls/day, that is $1,500/month in thinking overhead alone.

**Thinking tokens vs standard output cost comparison:**

| Provider | Thinking token cost | Standard output cost | Multiplier |
|---|---|---|---|
| Claude Sonnet 4.6 | $15/M (same as output) | $15/M | 1x nominal, but additive |
| o3 | $40/M (output) | $40/M | High absolute cost |
| o3-mini | $4.40/M | $4.40/M | Cheapest reasoning tier |
| Gemini 2.5 Flash | $0.60/M | $0.60/M | Most cost-efficient |
| DeepSeek R1 | $2.19/M | $2.19/M | Open-weights option available |

**Latency.** Time-to-first-token for reasoning models is 2–10 seconds at low budgets, 10–60+ seconds at high budgets. Standard models stream first tokens in under 500ms. This gap is the primary reason reasoning models cannot replace standard models in interactive UX without a deliberate "thinking..." state.

**Streaming thinking blocks to reduce perceived latency.** Stream the thinking block to the UI as it arrives. This converts a 30-second blank wait into a 30-second "thinking..." animation — substantially better UX. Anthropic's streaming API sends `thinking` events before `text` events; consume and display them.

```python
with client.messages.stream(
    model="claude-opus-4-6",
    max_tokens=16000,
    thinking={"type": "enabled", "budget_tokens": 10000},
    messages=[...]
) as stream:
    for event in stream:
        if event.type == "content_block_start":
            if event.content_block.type == "thinking":
                print("[thinking...]")
        elif event.type == "content_block_delta":
            if hasattr(event.delta, "thinking"):
                print(event.delta.thinking, end="", flush=True)
            elif hasattr(event.delta, "text"):
                print(event.delta.text, end="", flush=True)
```

**Prompt caching to offset cost.** On repeat calls with the same system prompt, mark the system prompt with `cache_control` to cache it. The cached prefix costs 0.1x on re-read. This partially offsets thinking token cost for multi-turn sessions. See [[synthesis/cost-optimisation]] and [[apis/anthropic-api]] for caching implementation.

---

## Production Decision Framework

```
Is the task verifiable / does it have a correct answer?
├── No (creative writing, subjective summary, conversational)
│   └── Use standard model. Reasoning adds mechanical quality, not creativity.
│
└── Yes → Does accuracy matter more than latency?
    ├── No (latency < 1s required, or volume > 100k calls/day)
    │   └── Use standard model (Claude Sonnet/Haiku, GPT-4o, Gemini Flash).
    │       If pipeline chains 3+ LLM calls: standard only.
    │
    └── Yes → What is the task complexity?
        ├── Simple (classification, retrieval, extraction, routing)
        │   └── Use standard model. Thinking budget 1,024 if needed as sanity check.
        │
        ├── Moderate (code review, SQL generation, logical deduction)
        │   └── Use reasoning model with low/medium effort.
        │       Claude: adaptive thinking or 5,000 budget_tokens
        │       OpenAI: o3-mini effort=medium
        │       Google: Gemini 2.5 Flash thinking_budget=5000
        │
        └── Hard (algorithm design, formal proof, frontier coding, security audit)
            └── Use frontier reasoning model.
                Claude: Opus 4.7 adaptive or Opus 4.6 budget_tokens=16000–32000
                OpenAI: o3 effort=high
                Google: Gemini 2.5 Pro thinking_budget=16000+
                Cost-sensitive: DeepSeek R1 via API or local distilled model
```

**Cost-quality tier ordering (May 2026):**

| Tier | Model | Best for | Cost (output/M) |
|---|---|---|---|
| Cheapest reasoning | o3-mini (medium) or Gemini 2.5 Flash thinking | Moderate tasks at scale | $4.40 / $0.60 |
| Balanced | Claude Sonnet 4.6 adaptive | Production default; near-Opus quality | $15 |
| Frontier (cost-efficient) | DeepSeek R1 API | Hard tasks, cost-sensitive | $2.19 |
| Frontier (quality) | Claude Opus 4.7 / o3 | Hardest tasks, accuracy first | $25 / $40 |
| Self-hosted | DeepSeek R1-Distill-70B | No API dependency, GPU available | Hardware only |

---

## Common Production Mistakes

**Enabling thinking on every call in a pipeline.** Thinking is multiplicative. A 5-step pipeline with 10,000-token budgets per step burns 50,000 thinking tokens per request — at Claude Sonnet pricing, that is $0.75/pipeline call before any actual output. Reserve reasoning for the steps where it genuinely matters (the decision node), not the mechanical steps (format, extract, route).

**Not accounting for thinking tokens in `max_tokens`.** For DeepSeek R1, thinking traces appear inside `<think>` and count against `max_tokens`. For Claude legacy API, the `max_tokens` budget covers thinking + output — set it high enough. A common failure: `max_tokens=512` with `budget_tokens=5000` means the model runs out of tokens before producing the answer.

**Using reasoning models for latency benchmarks.** If you benchmark a reasoning model in your integration test, its latency profile (10–60s) will skew the p95/p99 numbers in ways that mask normal call latency. Keep reasoning model calls in a separate metric namespace.

**Treating adaptive thinking as free.** Adaptive thinking on Claude Opus 4.7 means Claude decides when to think. On a complex enough prompt, it will always think — and bill accordingly. Monitor token usage by day during initial rollout.

---

## Connections

- [[llms/claude]] — Claude model family; extended thinking availability per model tier
- [[llms/deepseek-r1]] — DeepSeek R1 GRPO training, `<think>` tags, `max_tokens` footgun, distilled variants
- [[llms/model-families]] — o3, Gemini 2.5, Claude 4.x in competitive context
- [[apis/anthropic-api]] — `thinking` parameter, streaming implementation, prompt caching
- [[apis/openai-api]] — o3/o3-mini `reasoning_effort` parameter, pricing
- [[apis/google-ai]] — Gemini 2.5 Pro/Flash `thinkingConfig`, context limits
- [[prompting/techniques]] — do not combine explicit CoT prompting with extended thinking
- [[evals/benchmarks]] — AIME, SWE-bench, GPQA Diamond — the benchmarks used to compare reasoning models
- [[synthesis/cost-optimisation]] — prompt caching, model routing, and the 60-90% cost reduction playbook
- [[fine-tuning/dpo-grpo]] — GRPO training objective that produced DeepSeek R1's reasoning capability
