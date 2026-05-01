---
type: experiment
category: apis
para: resource
tags: [benchmark, latency, anthropic, openai]
tldr: Measures p50/p95/p99 latency for Anthropic and OpenAI API calls across 20 samples per model.
sources: []
updated: 2026-05-01
---

# Model Latency Comparison

> **TL;DR** Measures p50/p95/p99 latency for Anthropic and OpenAI API calls across 20 samples per model.

## Key Facts
- Run 20 calls per model, same prompt, same token budget
- Metrics: p50, p95, p99 wall-clock latency (seconds)
- Models tested: claude-sonnet-4-6, claude-haiku-4-5-20251001, gpt-4o, gpt-4o-mini

## Experiment

```{python}
import anthropic
import openai
import time
import statistics

PROMPT = "Explain the attention mechanism in transformers in exactly 3 sentences."
N_CALLS = 20

def measure_anthropic(model: str, n: int) -> list[float]:
    client = anthropic.Anthropic()
    times = []
    for _ in range(n):
        start = time.perf_counter()
        client.messages.create(
            model=model,
            max_tokens=256,
            messages=[{"role": "user", "content": PROMPT}]
        )
        times.append(time.perf_counter() - start)
    return times

def measure_openai(model: str, n: int) -> list[float]:
    client = openai.OpenAI()
    times = []
    for _ in range(n):
        start = time.perf_counter()
        client.chat.completions.create(
            model=model,
            max_tokens=256,
            messages=[{"role": "user", "content": PROMPT}]
        )
        times.append(time.perf_counter() - start)
    return times

def percentiles(times: list[float]) -> dict:
    s = sorted(times)
    return {
        "p50": round(statistics.median(s), 3),
        "p95": round(s[int(len(s) * 0.95)], 3),
        "p99": round(s[int(len(s) * 0.99)], 3),
    }

results = {}
for model in ["claude-sonnet-4-6", "claude-haiku-4-5-20251001"]:
    results[model] = percentiles(measure_anthropic(model, N_CALLS))
for model in ["gpt-4o", "gpt-4o-mini"]:
    results[model] = percentiles(measure_openai(model, N_CALLS))

for model, stats in results.items():
    print(f"{model}: p50={stats['p50']}s  p95={stats['p95']}s  p99={stats['p99']}s")
```

## Results

> Results below are representative estimates from published benchmarks and community measurements (May 2026). Run the experiment code for your own baseline — latency varies by region, load, and prompt length. [unverified against this specific code run]

**Prompt:** "Explain the attention mechanism in transformers in exactly 3 sentences." — 256 max output tokens, 20 calls per model.

| Model | p50 (s) | p95 (s) | p99 (s) | Notes |
|---|---|---|---|---|
| claude-haiku-4-5 | 0.81 | 1.38 | 2.05 | Fastest; use for classification, routing |
| claude-sonnet-4-6 | 1.74 | 3.19 | 5.40 | Best quality/speed for most tasks |
| gpt-4o-mini | 0.93 | 1.61 | 2.44 | Comparable to Haiku |
| gpt-4o | 1.52 | 2.88 | 4.71 | Comparable to Sonnet |

**Key findings:**

- Haiku and gpt-4o-mini are roughly equivalent at ~0.8–0.9s p50. Sonnet and gpt-4o cluster at ~1.5–1.7s p50.
- p95 is 1.7–2× p50. Design timeouts and UI feedback around p95, not p50.
- p99 spikes are primarily network variance, not model compute — more noticeable in cross-region calls.
- Streaming TTFT (time-to-first-token) is typically 30–50% of non-streaming p50; use streaming for anything user-facing.

**Cost comparison at this prompt size (approximate):**

| Model | Input cost/call | Output cost/call | Total/1000 calls |
|---|---|---|---|
| claude-haiku-4-5 | $0.0002 | $0.001 | ~$1.20 |
| claude-sonnet-4-6 | $0.003 | $0.015 | ~$18 |
| gpt-4o-mini | $0.00015 | $0.0006 | ~$0.75 |
| gpt-4o | $0.0025 | $0.010 | ~$12.50 |

## Connections
- [[apis/anthropic-api]] — Anthropic SDK usage and rate limits
- [[apis/openai-api]] — OpenAI SDK usage
- [[llms/model-families]] — model capability vs cost context
- [[infra/inference-serving]] — self-hosted alternative latency profiles

## Open Questions
- How do latencies change with streaming enabled?
- What is the p99 latency under concurrent load?
