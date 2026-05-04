---
type: synthesis
category: synthesis
para: resource
tags: [debugging, llm, latency, streaming, runbook]
sources: []
updated: 2026-05-02
tldr: Runbook for diagnosing slow LLM responses, stalling streams, or high time-to-first-token.
---

# Debug: LLM High Latency

**Symptom:** LLM responses are slow to start, stream stalls mid-response, or total generation time exceeds SLA. Was faster before.

---

## Quick Diagnosis

| Pattern | Likely cause |
|---|---|
| High time-to-first-token (TTFT) | Model overloaded, prompt cache miss, cold start |
| Stream starts fast then stalls | Output token limit too high, network congestion |
| Consistently slow on large inputs | Prompt too long — context processing overhead |
| Slow only at peak hours | Provider rate limiting or capacity pressure |
| Was fast, now slow after prompt change | Prompt cache invalidated by prefix change |

---

## Likely Causes (ranked by frequency)

1. Prompt cache miss — prefix changed, full context reprocessed on every call
2. Provider capacity pressure at peak — API returning 529 or throttling
3. Prompt too large — unnecessary context inflating input tokens
4. Output `max_tokens` set too high — model generates to limit even when done
5. No streaming — waiting for full response before returning anything to the user

---

## First Checks (fastest signal first)

- [ ] Check TTFT separately from total generation time — is the model slow to start or slow to finish?
- [ ] Check whether prompt cache is hitting — look for `cache_read_input_tokens` in the response
- [ ] Check whether streaming is enabled — if not, user waits for full completion before seeing anything
- [ ] Check prompt token count — is it growing unboundedly with conversation history?
- [ ] Check provider status page and error logs for 529 or rate limit responses

**Signal example:** TTFT spikes from 400ms to 4s after a system prompt change — the cache prefix no longer matches, so every call pays full context processing cost instead of the cached rate.

---

## Drill Paths

| Suspect | Go to |
|---|---|
| Prompt cache not hitting | [[apis/anthropic-api]] |
| Prompt growing too large | [[prompting/techniques]] |
| Tracing latency per step | [[observability/tracing]] |
| Rate limiting and retry strategy | [[cs-fundamentals/error-handling-patterns]] |
| Streaming implementation | [[web-frameworks/fastapi]] |

---

## Fix Patterns

- Enable streaming — user sees first token in <1s even if total generation takes 10s
- Pin the cache prefix — keep system prompt and static context identical across calls; only the user turn changes
- Truncate conversation history — keep last N turns only; do not pass full history on every call
- Set `max_tokens` to a realistic ceiling for the task — not the model maximum
- Add a timeout on the stream — detect stalls and retry rather than waiting indefinitely

---

## When This Is Not the Issue

If TTFT is fast but the user experience still feels slow:

- The bottleneck is downstream of the model — check how your application processes and forwards the stream
- Check whether you are buffering the full response before sending to the client
- Check network latency between your server and the provider endpoint

Pivot to [[observability/langfuse]] to break down latency per component across the full call chain.

---

## Connections

[[apis/anthropic-api]] · [[observability/tracing]] · [[observability/langfuse]] · [[prompting/techniques]] · [[cs-fundamentals/error-handling-patterns]]
## Open Questions

- What has changed since this synthesis was written that would alter the conclusions?
- What evidence would cause you to revise the key recommendation here?
