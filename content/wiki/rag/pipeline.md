---
type: concept
category: rag
tags: [rag, retrieval, embeddings, chunking, reranking, graphrag, ragas]
sources: []
updated: 2026-05-01
para: resource
tldr: Production RAG pipeline — hybrid BM25+dense retrieval, Cohere reranking (10-25% precision gain), RAGAS evaluation (faithfulness >0.9, context precision >0.8), and when GraphRAG beats standard retrieval.
---

# RAG — Retrieval-Augmented Generation

> **TL;DR** Production RAG pipeline — hybrid BM25+dense retrieval, Cohere reranking (10-25% precision gain), RAGAS evaluation (faithfulness >0.9, context precision >0.8), and when GraphRAG beats standard retrieval.

The production-proven pattern for grounding LLMs in external knowledge without fine-tuning. The LLM is given retrieved context at query time rather than having knowledge baked in at training time.

> [Source: Perplexity research, 2026-04-29] [unverified]

---

## Why RAG Beats Fine-Tuning for Most Use Cases

Fine-tuning bakes knowledge into weights — expensive, slow to update, and opaque. RAG keeps knowledge in a retrievable store — cheap to update, inspectable, and citable. 57% of orgs that build AI systems don't fine-tune at all. RAG is the first thing to reach for when the problem is "the model doesn't know X."

RAG is the right choice when:
- Knowledge changes frequently (product docs, code, pricing)
- You need citations and verifiability
- You have < $10K compute budget
- Domain knowledge is proprietary

Fine-tuning wins when:
- You need a specific *style* or *format* not achievable with prompting
- Inference latency matters more than update frequency
- You're building a specialized task model (code completion, legal classification)

See [[fine-tuning/decision-framework]] for the full decision framework.

---

## The RAG Pipeline

```
Query
  ↓
[Query Processing]   embed, expand, rewrite
  ↓
[Retrieval]          BM25 + dense vector search (hybrid)
  ↓
[Reranking]          Cohere Rerank / cross-encoder
  ↓
[Context Assembly]   top-k chunks → prompt
  ↓
[Generation]         LLM with retrieved context
  ↓
Answer + Citations
```

---

## Chunking

How you split documents determines retrieval quality more than the retrieval algorithm.

| Strategy | Description | Accuracy | When to use |
|---|---|---|---|
| **Recursive / fixed-size** | Split at 512 tokens, 10–20% overlap | ~69% | Default; works well for prose |
| **Semantic** | Split at topic boundaries (sentence embeddings) | Better for complex docs | Technical docs, long-form content |
| **Metadata-aware** | Preserve headers, code blocks, tables as atomic units | High for structured content | Codebases, API docs, spreadsheets |
| **Late chunking** | Embed the full document first, then chunk embedding space | Best for long-doc retrieval | Research papers, books |

**512 tokens with 10–20% overlap** is the production default for most use cases. Smaller chunks (128–256) improve precision; larger chunks (1,024+) improve recall but add noise.

Parent document retrieval — retrieve small chunks for precision, expand to parent chunk for context — is a common trick to get both.

---

## Embedding Models

| Model | MTEB Score | Notes |
|---|---|---|
| **Cohere embed-v4** | 65.2 | Best overall; multilingual; supports binary quantisation |
| **OpenAI text-embedding-3-large** | 64.6 | Widely used; good multilingual |
| **BGE-M3** | 63.0 | Open-source; runs locally; best open model |
| **fastembed** | ~62.0 | Local, fast; good for dev/CI |

For most production systems: Cohere embed-v4 if you want managed, BGE-M3 if you need self-hosted or zero-cost.

---

## Retrieval: Hybrid Search

**BM25 (lexical)** — keyword overlap, exact matches, handles rare/proper nouns well.  
**Dense vector search** — semantic similarity via embeddings, handles paraphrasing and synonyms.  
**Hybrid** — combine BM25 score + vector score with reciprocal rank fusion (RRF).

Hybrid is the production default. BM25 alone misses semantic variations; dense alone misses exact-match keywords. Hybrid outperforms either alone on most benchmarks.

Vector store options: [[infra/vector-stores]] — pgvector (Postgres-native, easiest), Chroma (local dev), Qdrant (production self-hosted), Pinecone (fully managed).

---

## Reranking

The single biggest precision lever in a RAG pipeline. After retrieval, pass top-20 candidates through a cross-encoder reranker and keep top-5.

| Reranker | Notes |
|---|---|
| **Cohere Rerank v4.0 Pro** | Best quality; 10–25% precision gain; API |
| **Jina Reranker v3** | Open-source option; good quality |
| **BGE Reranker** | Local, no API cost |

Reranking adds ~200ms latency for most workloads. Worth it unless latency is the primary constraint.

---

## GraphRAG

For queries requiring multi-hop reasoning across entities and relationships — "how does X relate to Y?" — graph-based retrieval outperforms naive chunk retrieval.

**Full GraphRAG (Microsoft):**
1. LLM extracts entities and relationships from all documents → knowledge graph
2. At query time, traverse the graph to find relevant communities and relationships
3. Summarise community reports → answer

Cost: very high (many LLM calls for graph construction). Use when complex cross-document reasoning is the primary use case.

**LazyGraphRAG (Microsoft, 2024):**
- Builds minimal graph at index time; constructs community reports lazily at query time
- 0.1% of the cost of full GraphRAG
- 70–80% of the quality on most benchmarks

For most use cases: start with hybrid retrieval + reranking. Add LazyGraphRAG if complex multi-hop queries are failing.

---

## Agentic RAG

Rather than a static retrieve-once pipeline, agentic RAG lets the LLM:
- Issue multiple retrieval queries
- Decide when it has enough context
- Reformulate queries when results are poor
- Synthesise across retrieved sets

Implemented as a [[agents/langgraph]] graph node or a tool the agent calls. The agent loop typically runs 2–4 retrieval iterations before answering.

---

## Evaluation with RAGAS

RAGAS is the standard evaluation framework for RAG pipelines. Four metrics:

| Metric | Measures |
|---|---|
| **Faithfulness** | Does the answer stick to the retrieved context? (no hallucination) |
| **Answer Relevancy** | Is the answer actually relevant to the question? |
| **Context Precision** | Are the retrieved chunks relevant? |
| **Context Recall** | Did retrieval find all necessary information? |

Run RAGAS on a golden set of question/answer/context triples. Target: faithfulness > 0.9, context precision > 0.8 before production.

See [[evals/methodology]] for how RAG evaluation fits into the broader eval strategy.

---

## Common Failure Modes

| Failure | Cause | Fix |
|---|---|---|
| LLM contradicts retrieved context | Low-quality system prompt | Add explicit "answer only from context" instruction |
| Good chunks retrieved but wrong answer | Chunking loses cross-chunk logic | Parent doc retrieval, larger chunks |
| Correct knowledge exists but not retrieved | Low recall | Hybrid search, query expansion |
| Top-k includes noise | Poor reranking | Add reranker; reduce top-k |
| Answers contain hallucinations | Model fills gaps | Enable citations; check faithfulness |

---

## Key Facts

- RAG vs fine-tuning default: 57% of orgs don't fine-tune; reach for RAG first unless you need style/format changes
- Chunking default: 512 tokens + 10-20% overlap; "69% accuracy" cited for recursive chunking [Source: Perplexity research, 2026-04-29] [unverified]
- Reranking gain: 10-25% NDCG improvement; Cohere Rerank v4.0 Pro is the default production choice
- RAGAS targets before production: faithfulness >0.9, context precision >0.8
- Agentic RAG: typically 2-4 retrieval iterations; LangGraph tool node or standalone tool
- LazyGraphRAG: 0.1% of full GraphRAG cost; add it when multi-hop synthesis queries are failing

## Connections

- [[apis/anthropic-api]] — feeding retrieved context to Claude; Citations API
- [[infra/vector-stores]] — storage backends for embeddings
- [[evals/methodology]] — evaluating RAG pipeline quality with RAGAS
- [[prompting/techniques]] — how to structure retrieved context in prompts
- [[fine-tuning/decision-framework]] — when RAG isn't enough
- [[rag/chunking]] — chunking strategies
- [[rag/embeddings]] — embedding model selection
- [[rag/hybrid-retrieval]] — BM25 + dense hybrid retrieval
- [[rag/reranking]] — second-pass scoring
- [[rag/graphrag]] — GraphRAG variant for entity- and relationship-rich corpora; LazyGraphRAG cuts cost ~1000x

## Open Questions

- When agentic RAG runs 2-4 retrieval iterations, how does cost compare to GraphRAG for the same query?
- What is the practical faithfulness ceiling for RAG systems on adversarial or ambiguous queries?
- Does the RAG vs fine-tuning decision change as inference cost drops toward zero?
