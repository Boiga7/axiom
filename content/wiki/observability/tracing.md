---
type: concept
category: observability
tags: [opentelemetry, tracing, otel, langfuse, spans, llm-observability]
sources: []
updated: 2026-04-29
para: area
tldr: OTel GenAI semantic conventions, manual and auto-instrumentation for Anthropic/LangChain, Langfuse native SDK patterns, cost tracking per trace, and Prometheus alerting thresholds.
---

# LLM Tracing with OpenTelemetry

> **TL;DR** OTel GenAI semantic conventions, manual and auto-instrumentation for Anthropic/LangChain, Langfuse native SDK patterns, cost tracking per trace, and Prometheus alerting thresholds.

Distributed tracing for LLM systems. Every LLM call, retrieval, tool execution, and agent step should be a span. Without tracing you're flying blind — you can't debug latency, cost overruns, or quality regressions.

---

## Why LLM Systems Need Tracing

A RAG pipeline has 5-10 steps: embed query → search vector DB → rerank → build prompt → LLM call → parse output. When something goes wrong (wrong answer, high latency, high cost), you need to know which step failed. Tracing makes that visible.

Key signals to capture:
- **Latency:** which step is slow? Is it the retrieval, the LLM, or parsing?
- **Token counts:** per-call input/output tokens for cost attribution
- **Model and version:** which model answered? Was it the right one?
- **Retrieval quality:** what was retrieved? Was it relevant?
- **Errors:** did any step fail? What was the error?

---

## OpenTelemetry Semantic Conventions for LLMs

OTel added LLM-specific semantic conventions (GenAI conventions) in 2024. Key span attributes:

```
gen_ai.system              = "anthropic" | "openai" | "cohere"
gen_ai.request.model       = "claude-sonnet-4-6"
gen_ai.request.max_tokens  = 1024
gen_ai.request.temperature = 0.7
gen_ai.response.model      = "claude-sonnet-4-6"  # actual model used
gen_ai.usage.input_tokens  = 523
gen_ai.usage.output_tokens = 187
gen_ai.operation.name      = "chat" | "text_completion" | "embeddings"
```

---

## Manual OTel Instrumentation

```python
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import anthropic

# Setup
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://localhost:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("my_llm_app")

# Instrument a RAG pipeline
def rag_query(question: str) -> str:
    with tracer.start_as_current_span("rag_query") as root_span:
        root_span.set_attribute("question", question[:200])
        
        # Retrieval span
        with tracer.start_as_current_span("retrieve") as span:
            docs = vector_store.search(question, k=5)
            span.set_attribute("docs_retrieved", len(docs))
            span.set_attribute("query", question)
        
        # Reranking span
        with tracer.start_as_current_span("rerank") as span:
            docs = reranker.rerank(question, docs, top_n=3)
            span.set_attribute("docs_after_rerank", len(docs))
        
        # LLM call span
        with tracer.start_as_current_span("llm_call") as span:
            client = anthropic.Anthropic()
            response = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=512,
                messages=[{"role": "user", "content": build_prompt(question, docs)}],
            )
            span.set_attribute("gen_ai.system", "anthropic")
            span.set_attribute("gen_ai.request.model", "claude-sonnet-4-6")
            span.set_attribute("gen_ai.usage.input_tokens", response.usage.input_tokens)
            span.set_attribute("gen_ai.usage.output_tokens", response.usage.output_tokens)
            answer = response.content[0].text
        
        root_span.set_attribute("answer_length", len(answer))
        return answer
```

---

## Auto-Instrumentation

Libraries handle the instrumentation automatically:

```python
# OpenLLMetry — auto-instruments OpenAI, Anthropic, LangChain, LlamaIndex
from opentelemetry.instrumentation.anthropic import AnthropicInstrumentor

AnthropicInstrumentor().instrument()

# Now every anthropic.Anthropic().messages.create() call is automatically traced
# with all gen_ai.* attributes populated
```

```bash
pip install opentelemetry-instrumentation-anthropic
pip install opentelemetry-instrumentation-openai
pip install opentelemetry-instrumentation-langchain
```

---

## Langfuse as OTel Backend

Langfuse accepts OTel traces and shows them as traces/spans in its UI:

```python
from langfuse.opentelemetry import configure_langfuse_tracing

configure_langfuse_tracing(
    public_key="pk-lf-...",
    secret_key="sk-lf-...",
    host="https://cloud.langfuse.com",
)

# All OTel spans now appear in Langfuse
```

Or use Langfuse's native SDK (more features):

```python
from langfuse import Langfuse
from langfuse.decorators import observe, langfuse_context

langfuse = Langfuse()

@observe()  # auto-creates a trace for each function call
def rag_pipeline(question: str) -> str:
    with langfuse_context.observe(name="retrieve") as span:
        docs = vector_store.search(question)
        span.update(metadata={"num_docs": len(docs)})
    
    with langfuse_context.observe(name="llm_call") as span:
        response = call_llm(question, docs)
        span.update(
            usage={"input": response.usage.input_tokens, "output": response.usage.output_tokens},
            model="claude-sonnet-4-6",
        )
    
    return response
```

---

## LangSmith Integration

```python
import os
os.environ["LANGCHAIN_TRACING_V2"] = "true"
os.environ["LANGCHAIN_API_KEY"] = "ls_..."
os.environ["LANGCHAIN_PROJECT"] = "my_rag_project"

# All LangChain calls now traced to LangSmith automatically
from langchain_anthropic import ChatAnthropic
llm = ChatAnthropic(model="claude-sonnet-4-6")
# Every call to llm.invoke() is traced
```

---

## Cost Tracking

Track cost per trace to find expensive paths:

```python
PRICING = {
    "claude-sonnet-4-6": {"input": 3.0, "output": 15.0},  # per million tokens
    "claude-haiku-4-5-20251001": {"input": 1.0, "output": 5.0},
    "claude-opus-4-7": {"input": 5.0, "output": 25.0},
}

def calculate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    p = PRICING[model]
    return (input_tokens * p["input"] + output_tokens * p["output"]) / 1_000_000

# In your span
span.set_attribute("cost_usd", calculate_cost(model, in_tokens, out_tokens))
```

---

## Alerting on Quality Signals

Set up alerts for:
- P99 latency > 10s (SLA breach)
- Error rate > 1% (model/API issues)
- Average tokens/call > threshold (prompt bloat)
- Cached token ratio < expected (prompt cache regression)

```python
# Prometheus metrics alongside OTel traces
from prometheus_client import Counter, Histogram

llm_latency = Histogram("llm_call_seconds", "LLM call latency", ["model", "operation"])
llm_errors = Counter("llm_errors_total", "LLM errors", ["model", "error_type"])
llm_tokens = Counter("llm_tokens_total", "LLM tokens used", ["model", "type"])

# Instrument
with llm_latency.labels(model="claude-sonnet-4-6", operation="chat").time():
    response = client.messages.create(...)
    llm_tokens.labels(model="claude-sonnet-4-6", type="input").inc(response.usage.input_tokens)
    llm_tokens.labels(model="claude-sonnet-4-6", type="output").inc(response.usage.output_tokens)
```

---

## Key Facts

- OTel GenAI conventions (2024): gen_ai.system, gen_ai.request.model, gen_ai.usage.input_tokens, gen_ai.usage.output_tokens are the standard span attributes
- opentelemetry-instrumentation-anthropic: auto-instruments all Anthropic SDK calls with gen_ai.* attributes
- Langfuse @observe() decorator: auto-creates a trace per function call with zero-boilerplate span creation
- LangSmith auto-tracing: set LANGCHAIN_TRACING_V2=true — every LangChain/LangGraph call is captured
- Alerting thresholds: P99 latency >10s, error rate >1%, cached token ratio below expected
- Cost tracking: Sonnet 4.6 $3/$15 per M, Haiku 4.5 $1/$5, Opus 4.7 $5/$25

## Connections

- [[observability/platforms]] — Langfuse, LangSmith, Arize Phoenix platform comparison
- [[python/ecosystem]] — structlog for structured logging alongside OTel traces
- [[evals/methodology]] — online evals that plug into the tracing pipeline
- [[agents/langgraph]] — agent step tracing in LangGraph

## Open Questions

- Will the OTel GenAI semantic conventions stabilise at 1.0 in 2026, and will Anthropic SDK ship official OTel instrumentation?
- How does trace sampling strategy affect cost attribution accuracy for high-traffic production systems?
- Can Prometheus alerting on token budgets reliably catch agent runaway before it causes significant cost overruns?
