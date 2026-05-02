---
type: entity
category: observability
para: resource
tags: [arize, phoenix, observability, llm-monitoring, ml-monitoring, evals, open-source]
sources: []
updated: 2026-05-01
tldr: Open-source AI observability platform from Arize AI ($70M Series C, 2024).
---

# Arize Phoenix

Open-source AI observability platform from Arize AI ($70M Series C, 2024). The best choice when you need unified observability for both traditional ML models and LLM applications — one platform across the full model lifecycle.

Arize has two products:
- **Arize AI** — managed cloud platform for production ML/LLM monitoring (paid)
- **Arize Phoenix** — open-source, local-first observability and eval tool (free, Apache 2.0)

Phoenix is the self-hosted option covered here.

---

## What Phoenix Gives You

- **Traces and spans** via OpenTelemetry — LLM calls, retrieval, embeddings, agent steps
- **Embedding visualisation** — UMAP/t-SNE projection of embedding spaces; spot drift and clusters
- **Eval framework** — run evaluations against traces; template-based LLM-as-judge
- **Dataset management** — curate datasets from production traces for fine-tuning and evals
- **Experiment tracking** — compare prompt versions, model versions, and retrieval strategies side-by-side

**Differentiator vs Langfuse:** Phoenix's embedding visualisation and ML model monitoring are unmatched. If you're building on top of embeddings (RAG, semantic search) or have traditional ML models alongside LLMs, Phoenix is the better choice.

---

## Quick Start

```bash
pip install arize-phoenix
python -m phoenix.server.main   # starts UI at localhost:6006
```

Or Docker:
```bash
docker run -p 6006:6006 -p 4317:4317 arizephoenix/phoenix:latest
```

---

## OpenTelemetry Integration

Phoenix uses OTel natively — any OpenTelemetry-instrumented code sends traces to Phoenix.

```python
import phoenix as px
from phoenix.otel import register

# Configure OTel to send to Phoenix
tracer_provider = register(
    project_name="my-rag-app",
    endpoint="http://localhost:4317",   # Phoenix gRPC endpoint
)

# Instrument Anthropic calls automatically
from openinference.instrumentation.anthropic import AnthropicInstrumentor
AnthropicInstrumentor().instrument(tracer_provider=tracer_provider)

# Now all Anthropic calls are traced automatically
import anthropic
client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=512,
    messages=[{"role": "user", "content": "Hello"}],
)
# Trace appears in Phoenix UI at localhost:6006
```

---

## RAG Tracing

```python
from opentelemetry import trace
from openinference.semconv.trace import SpanAttributes

tracer = trace.get_tracer(__name__)

def rag_query(question: str) -> str:
    with tracer.start_as_current_span("rag-pipeline") as span:
        span.set_attribute(SpanAttributes.INPUT_VALUE, question)

        # Retrieval span
        with tracer.start_as_current_span("retrieval") as ret_span:
            chunks = retrieve(question)
            ret_span.set_attribute(SpanAttributes.RETRIEVAL_DOCUMENTS, str(chunks))

        # Generation span (auto-traced if using AnthropicInstrumentor)
        answer = generate(question, chunks)

        span.set_attribute(SpanAttributes.OUTPUT_VALUE, answer)
        return answer
```

---

## Evaluation Framework

```python
import phoenix as px
from phoenix.evals import (
    HallucinationEvaluator,
    QAEvaluator,
    RelevanceEvaluator,
    run_evals,
)

# Start Phoenix in-process
session = px.launch_app()

# Fetch traces from Phoenix
traces_df = px.Client().get_spans_dataframe()

# Run evaluations using LLM-as-judge
evaluators = [
    HallucinationEvaluator(model="claude-sonnet-4-6"),
    QAEvaluator(model="claude-sonnet-4-6"),
    RelevanceEvaluator(model="claude-sonnet-4-6"),
]

eval_df = run_evals(
    dataframe=traces_df,
    evaluators=evaluators,
    provide_explanation=True,
)

# Log evals back to Phoenix
px.Client().log_evaluations(eval_df)
```

---

## Embedding Visualisation

Phoenix's killer feature — visualise embedding spaces to diagnose retrieval problems:

```python
import phoenix as px
import pandas as pd

# Load embeddings from your vector store or model
embedding_df = pd.DataFrame({
    "id": chunk_ids,
    "text": chunk_texts,
    "embedding": embeddings,   # list of float arrays
    "metadata": metadatas,
})

# Create an Inferences object and upload to Phoenix
schema = px.Schema(
    prediction_id_column_name="id",
    prompt_column_names=px.EmbeddingColumnNames(
        raw_column_name="text",
        vector_column_name="embedding",
    ),
)
inferences = px.Inferences(dataframe=embedding_df, schema=schema)
px.launch_app(primary=inferences)

# Phoenix projects embeddings to 2D (UMAP) and renders them in the UI
# Hover any point to see the text; select clusters to inspect
# Drag to compare query embeddings against corpus embeddings
```

**Use cases:**
- Find chunks that cluster far from queries (bad retrieval coverage)
- Spot topic clusters in your corpus
- Detect embedding drift when you change models

---

## When to Choose Phoenix vs Langfuse

| Need | Phoenix | Langfuse |
|---|---|---|
| RAG embedding visualisation | ✓ Best-in-class | — |
| Traditional ML model monitoring | ✓ | — |
| Self-hosted with full data ownership | ✓ | ✓ |
| Prompt management registry | Limited | ✓ |
| Human annotation UI | Basic | ✓ |
| ClickHouse scale backend | — | ✓ (post-acquisition) |
| OpenTelemetry native | ✓ | ✓ |

---

## Key Facts

- Arize Phoenix: open-source (Apache 2.0); runs locally or in Docker; `pip install arize-phoenix`
- Arize AI: managed cloud; $70M Series C (2024)
- OTel native: auto-instrumentation for Anthropic, OpenAI, LangChain, LlamaIndex, DSPy
- Embedding UMAP: unique feature for RAG corpus and retrieval diagnosis
- Eval templates: Hallucination, QA correctness, Relevance, Toxicity — out of the box
- UI port: 6006 (HTTP); 4317 (gRPC OTel endpoint)

---

## Connections

[[observability/platforms]] · [[observability/langfuse]] · [[observability/tracing]] · [[rag/pipeline]] · [[evals/methodology]] · [[infra/vector-stores]]
