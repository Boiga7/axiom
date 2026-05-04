---
type: concept
category: observability
tags: [observability, langfuse, langsmith, tracing, monitoring, llm-ops, opentelemetry]
sources: []
updated: 2026-04-29
para: area
tldr: LLM observability platform comparison — Langfuse (best self-hosted, MIT, ClickHouse), LangSmith (LangChain shops), Arize Phoenix (ML+LLM unified) — plus cost gates and online eval patterns.
---

# LLM Observability

> **TL;DR** LLM observability platform comparison — Langfuse (best self-hosted, MIT, ClickHouse), LangSmith (LangChain shops), Arize Phoenix (ML+LLM unified) — plus cost gates and online eval patterns.

Tracing, monitoring, and evaluating AI systems in production. Without it you are flying blind: no visibility into where latency comes from, why costs spike, which queries hallucinate, or which agent steps fail.

> [Source: Perplexity research, 2026-04-29]

---

## Why It's Infrastructure, Not a Nice-to-Have

LLM systems fail differently from traditional software:
- Failures are probabilistic, not deterministic
- A single prompt change can degrade outputs without raising an exception
- Cost spikes can come from one poorly-constrained agent loop
- Hallucinations don't throw errors — they silently return wrong answers

You cannot debug a production LLM system without traces.

---

## Core Concepts

### Traces and Spans

A **trace** is a single end-to-end request through your system. A **span** is one step within that trace (one LLM call, one tool call, one retrieval).

```
Trace: "What is the weather in London?"
  ├─ Span: retrieve_context (15ms)
  ├─ Span: llm_call [claude-sonnet-4-6] (1,240ms, 847 tokens)
  │     ├─ Span: tool_call: get_weather (320ms)
  │     └─ Span: llm_call: final_response (680ms)
  └─ Span: format_output (2ms)
```

### Key Metrics

| Metric | Why it matters |
|---|---|
| **Latency (p50/p95/p99)** | User experience; find the slow path |
| **Token usage (input/output)** | Direct cost driver |
| **Cost per call** | Budget control |
| **Cache hit rate** | Are you actually saving money on caching? |
| **Error rate** | API failures, rate limits |
| **Hallucination rate** | Online eval via LLM-as-judge |
| **Task completion rate** | For agents: did it actually work? |

### Cost Gates

A hard limit that stops an agent loop from running up an unbounded bill:

```python
if total_tokens_used > TOKEN_BUDGET:
    raise CostLimitExceeded(f"Exceeded {TOKEN_BUDGET} token budget")
```

Implement at the orchestration layer. Soft warn at 80%, hard stop at 100%.

---

## Langfuse

**The best self-hosted option.** Open-source (MIT license), runs on ClickHouse + Postgres.

**Key facts (April 2026):**
- Acquired by ClickHouse, Inc. on January 16, 2026 alongside a $400M Series D at $15B valuation
- MIT license retained for core features after acquisition — no new pricing gates
- Technical foundation: Langfuse v3 migrated to ClickHouse because PostgreSQL couldn't handle high-throughput ingestion + fast analytical reads simultaneously
- Scale: 2,000+ paying customers, 26M+ SDK installs/month, 6M+ Docker pulls, used by 63 of the Fortune 500

**Self-hosting:** Docker Compose for dev, Kubernetes + ClickHouse Cloud for production.

**Integration (Python):**
```python
from langfuse import Langfuse
langfuse = Langfuse()

with langfuse.start_as_current_span("llm-call"):
    response = client.messages.create(...)
    langfuse.score_current_trace("quality", 0.9)
```

**LangChain callback:**
```python
from langfuse.callback import CallbackHandler
handler = CallbackHandler()
chain.invoke(input, config={"callbacks": [handler]})
```

**LangGraph:** Pass the Langfuse callback handler to your compiled graph.

**Features:** Tracing, prompt management, online evals, datasets, annotation queues, A/B testing.

---

## LangSmith

**Best if you're all-in on LangChain/LangGraph.** SaaS-first with self-hosted option.

**Key facts:**
- Added OpenTelemetry (OTel) support in March 2025 — can now receive traces from any OTel-compatible system
- Deep integration with LangChain ecosystem — traces auto-captured for all LangChain components
- Stronger hosted evaluation tooling than Langfuse

**Integration:**
```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=<key>
export LANGCHAIN_PROJECT=my-project
```

Any LangChain/LangGraph code now auto-traces to LangSmith.

**Features:** Tracing, dataset management, evaluation runs, playground, annotation queues, testing.

---

## Arize Phoenix

**Best for unified ML + LLM observability.** Raised $70M Series C (February 2025). Bridges traditional ML monitoring and LLM tracing in one platform.

**Differentiator:** UMAP embeddings visualisation — see the shape of your embedding space and spot distribution drift visually.

**OpenTelemetry-native:** Accepts traces from any OTel-compatible source. Works with LangChain, LlamaIndex, and custom instrumentation.

---

## Platform Comparison

| Platform | Best for | License | Self-host | OTel |
|---|---|---|---|---|
| **Langfuse** | Self-hosted, cost-conscious | MIT | Yes (easy) | Yes |
| **LangSmith** | LangChain shops | Proprietary | Yes (complex) | Yes (Mar 2025) |
| **Arize Phoenix** | ML + LLM unified | Apache 2.0 | Yes | Yes |
| **Helicone** | Simple API proxy logging | Proprietary | Yes | No |
| **Braintrust** | Eval-first, CI integration | Proprietary | No | Partial |

For new projects: default to Langfuse for self-hosted, LangSmith if already in the LangChain ecosystem.

---

## OpenTelemetry for LLMs

OTel is the standard observability protocol. The OpenTelemetry semantic conventions for LLMs (under development) define standard span attributes:

```
llm.model_name
llm.token_count.prompt
llm.token_count.completion
llm.request.type
gen_ai.operation.name
gen_ai.request.model
gen_ai.usage.input_tokens
gen_ai.usage.output_tokens
```

Using OTel means your traces work with any backend (Langfuse, LangSmith, Jaeger, Grafana).

---

## Evaluation in Production (Online Evals)

The bridge between observability and evaluation. Sample a fraction of production traffic, score it with an LLM judge, surface anomalies.

```python
# Langfuse: attach a score to any trace
langfuse.create_score(
    trace_id=trace_id,
    name="faithfulness",
    value=0.87,
    comment="Checked against retrieved context"
)
```

Build an annotation queue for human review of borderline scores. Use the scored data to improve your golden set for offline evals.

---

## Key Facts

- Langfuse: acquired by ClickHouse Jan 16 2026 alongside $400M Series D at $15B valuation; MIT license retained
- Langfuse scale: 2,000+ paying customers, 26M+ SDK installs/month, 63 of Fortune 500 [Source: Perplexity research, 2026-04-29]
- Langfuse v3: migrated to ClickHouse because PostgreSQL couldn't handle high-throughput ingestion + fast analytical reads
- LangSmith: added OTel support March 2025 — now receives traces from any OTel-compatible system
- Arize Phoenix: $70M Series C (February 2025); best for unified ML monitoring + LLM tracing; Apache 2.0
- Cost gates: soft warn at 80% of token budget, hard stop at 100%
- OTel GenAI conventions: gen_ai.usage.input_tokens, gen_ai.usage.output_tokens, gen_ai.request.model are the key attributes

## Common Failure Cases

**Traces missing for async code — spans never close**  
Why: an `async def` function creates a span but an unhandled exception exits before the span's context manager closes it; the span is never exported.  
Detect: trace shows parent spans with no children for async code paths; unclosed span warnings appear in the OTel SDK debug log.  
Fix: always use context managers (`with tracer.start_as_current_span(...)`) not manual `start_span`/`end_span`; add a `finally` block if you must use the manual API.

**Cost gate threshold triggers on input tokens, ignores cached tokens**  
Why: the cost calculation uses `usage.input_tokens` but doesn't subtract `cache_read_input_tokens`; cached reads are counted at full price.  
Detect: cost gate fires earlier than expected; actual Anthropic invoice is lower than the internal cost estimate.  
Fix: calculate cost as `(input_tokens - cache_read_input_tokens) * full_price + cache_read_input_tokens * 0.1 * full_price + output_tokens * output_price`.

**Langfuse callback not attached to LangGraph nested subgraph**  
Why: the callback handler was passed to the top-level graph's `invoke` but not propagated to compiled subgraphs; subgraph node spans are missing from the trace.  
Detect: top-level spans appear in Langfuse but subgraph tool calls are absent; trace shows gaps in the timeline.  
Fix: pass the callback handler in `config={"callbacks": [handler]}` to every `subgraph.invoke()` call, not just the root graph.

**Online eval judge introduces systematic bias for a user segment**  
Why: the LLM judge was calibrated on English responses; it scores non-English or code-heavy responses lower regardless of correctness.  
Detect: judge scores correlate with language or content type; human review shows judge disagrees with humans at higher rate for non-English users.  
Fix: calibrate the judge separately per content type; use language-aware judges for multilingual products; monitor judge accuracy by segment.

**High-cardinality span attributes cause ClickHouse/storage blowout**  
Why: a span attribute includes a raw user query string or a UUID per request; the attribute column has millions of unique values, exploding storage and slowing analytical queries.  
Detect: Langfuse/ClickHouse storage grows faster than request volume; query performance degrades on the attributes table.  
Fix: hash or bucket high-cardinality values before attaching as span attributes; keep user identifiers as trace-level metadata, not per-span attributes.

## Connections

- [[observability/tracing]] — OTel instrumentation and Langfuse/LangSmith integration patterns
- [[observability/datadog]] — Datadog unified observability: APM, synthetic monitoring, CI Visibility, and SLOs
- [[evals/methodology]] — offline evaluation methodology complementing online evals
- [[agents/langgraph]] — tracing LangGraph agent runs with Langfuse callback
- [[apis/anthropic-api]] — token usage and cost in API response object
- [[python/ecosystem]] — async instrumentation patterns

## Open Questions

- Does the ClickHouse acquisition change Langfuse's self-hosted deployment complexity in the medium term?
- How does Arize Phoenix's UMAP visualisation hold up for embedding spaces with >1M vectors?
- What is the practical overhead of OTel instrumentation on LLM API call latency in high-throughput production?
