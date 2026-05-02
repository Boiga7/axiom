---
type: concept
category: rag
tags: [graphrag, knowledge-graph, microsoft, lazygraphrag, entity-extraction, community-detection]
sources: []
updated: 2026-04-29
para: resource
tldr: GraphRAG builds entity/relationship knowledge graphs with Leiden community detection for multi-hop synthesis queries; LazyGraphRAG (2024) achieves 0.1% of full GraphRAG indexing cost at 70-80% quality.
---

# GraphRAG

> **TL;DR** GraphRAG builds entity/relationship knowledge graphs with Leiden community detection for multi-hop synthesis queries; LazyGraphRAG (2024) achieves 0.1% of full GraphRAG indexing cost at 70-80% quality.

Microsoft's graph-based retrieval approach. Instead of treating documents as isolated chunks, GraphRAG builds a knowledge graph of entities and relationships, then uses community detection and graph traversal for retrieval. Dramatically better than standard RAG for questions requiring synthesis across many documents.

---

## Why Standard RAG Fails at Complex Queries

Standard RAG: embed query → retrieve top-k chunks → generate answer.

This works for local queries ("What does document X say about Y?") but fails for global queries ("What are the main themes across all these documents?" or "How do the different approaches compare?").

The core problem: relevant information is distributed across dozens of chunks, no single chunk scores highly enough to be retrieved, so the answer is never assembled.

---

## GraphRAG Architecture

```
Documents
    ↓ Entity extraction (LLM)
Entities + Relationships → Knowledge Graph
    ↓ Community detection (Leiden algorithm)
Communities (hierarchical clusters of related entities)
    ↓ Community summarisation (LLM)
Community Reports
    ↓ At query time
Query → Global search (community reports) OR Local search (entity subgraph)
```

### Phase 1: Indexing

```python
# Using the Microsoft GraphRAG library
# pip install graphrag

# Configuration: graphrag/settings.yml
# Run indexing pipeline
import subprocess
subprocess.run(["python", "-m", "graphrag", "index", "--root", "./graphrag_workspace"])
```

The indexing pipeline:
1. **Chunk documents** (standard text splitting)
2. **Extract entities and relationships** (LLM call per chunk — expensive)
3. **Build graph** (entities = nodes, relationships = edges)
4. **Detect communities** (Leiden algorithm finds clusters of related entities)
5. **Summarise communities** at multiple levels (LLM generates a paragraph per community)

### Phase 2: Query

Two query modes:

**Global search** — answers synthesis questions using community reports:
```python
import asyncio
from graphrag.query.structured_search.global_search.search import GlobalSearch

search = GlobalSearch(
    llm=llm,
    context_builder=community_context_builder,
    response_type="Multiple Paragraphs",
)
result = await search.asearch("What are the main themes in these documents?")
print(result.response)
```

**Local search** — answers specific questions using entity subgraph + related chunks:
```python
from graphrag.query.structured_search.local_search.search import LocalSearch

search = LocalSearch(
    llm=llm,
    context_builder=local_context_builder,
    entity_text_embeddings=store,
)
result = await search.asearch("What did the CEO say about Q4 revenue?")
```

---

## LazyGraphRAG

Microsoft's 2024 cost optimisation. Full GraphRAG costs ~$100 per million tokens (LLM calls for every entity extraction). LazyGraphRAG reduces this to 0.1% of full GraphRAG cost.

**Key insight:** skip the expensive indexing-time LLM calls. Instead:
- Use NLP (not LLMs) to extract noun phrases as candidate entities at index time
- Defer all LLM calls to query time
- At query time, only call the LLM on the most relevant chunks

```
Full GraphRAG:
  Index cost: HIGH (LLM per chunk for entity extraction + community summarisation)
  Query cost: LOW (community reports already built)

LazyGraphRAG:
  Index cost: LOW (NLP only)
  Query cost: MEDIUM (selective LLM calls on relevant content)
  
  Total: ~0.1% of full GraphRAG for same quality on most queries
```

---

## LlamaIndex GraphRAG

LlamaIndex wraps GraphRAG with a simpler API:

```python
from llama_index.core import PropertyGraphIndex
from llama_index.core.indices.property_graph import SimpleLLMPathExtractor

# Build the graph
index = PropertyGraphIndex.from_documents(
    documents,
    llm=llm,
    embed_model=embed_model,
    kg_extractors=[
        SimpleLLMPathExtractor(
            llm=llm,
            max_paths_per_chunk=10,
        )
    ],
    show_progress=True,
)

# Query
query_engine = index.as_query_engine(
    include_text=True,
    response_mode="tree_summarize",
)
response = query_engine.query("Summarise the key themes across all documents.")
```

---

## LangChain Graph Integration

```python
from langchain_community.graphs import Neo4jGraph
from langchain_experimental.graph_transformers import LLMGraphTransformer
from langchain_anthropic import ChatAnthropic

llm = ChatAnthropic(model="claude-sonnet-4-6")

# Extract graph from documents
transformer = LLMGraphTransformer(llm=llm)
graph_documents = transformer.convert_to_graph_documents(documents)

# Store in Neo4j
graph = Neo4jGraph(url="bolt://localhost:7687", username="neo4j", password="password")
graph.add_graph_documents(graph_documents)

# Query with natural language → Cypher
from langchain.chains import GraphCypherQAChain

chain = GraphCypherQAChain.from_llm(
    llm=llm,
    graph=graph,
    verbose=True,
)
result = chain.invoke("Who founded Anthropic and when?")
```

---

## When to Use GraphRAG vs Standard RAG

| Query type | Standard RAG | GraphRAG |
|---|---|---|
| "What does doc X say about Y?" | ✓ | Overkill |
| "Summarise the main themes" | ✗ | ✓ |
| "How are concepts A and B related?" | ✗ | ✓ |
| "What do all sources agree on?" | ✗ | ✓ |
| Simple FAQ over known docs | ✓ | Overkill |
| Research synthesis, due diligence | ✗ | ✓ |

---

## Cost Considerations

Full GraphRAG indexing on 1,000 documents (~500 tokens each):
- Entity extraction: 1,000 chunks × 1 LLM call = ~$1.50 (Sonnet)
- Community summarisation: varies by community count
- **Total indexing: $5-50 depending on corpus**

LazyGraphRAG: 95-99% cheaper at index time. Use LazyGraphRAG unless you need the pre-built community summaries for very large corpora.

---

## Key Facts

- GraphRAG phases: chunk → LLM entity extraction → build graph → Leiden community detection → LLM community summarisation
- LazyGraphRAG (2024): NLP noun phrases at index time (no LLM); LLM calls deferred to query time; 0.1% cost of full GraphRAG
- LazyGraphRAG quality: 70-80% of full GraphRAG on most benchmarks
- Indexing cost for 1,000 docs (~500 tokens each): $5-50 depending on corpus size and community count
- Global search: uses community reports for synthesis questions; Local search: entity subgraph + related chunks
- LangGraph vs GraphRAG: different things — LangGraph is a graph-based agent runtime, not a retrieval system

## Common Failure Cases

**Indexing cost blows past budget on first run**  
Why: entity extraction runs one LLM call per chunk; a 10,000-chunk corpus easily costs $50-500 with a capable model.  
Detect: check LLM API spend after the first `graphrag index` run; `$10+` is a warning sign.  
Fix: use LazyGraphRAG for the first pass, or index a 100-chunk sample before committing to full indexing.

**Graph quality collapses on noisy/boilerplate documents**  
Why: LLM extracts entities from headers, footers, and disclaimers, polluting the graph with low-signal nodes.  
Detect: inspect the graph's entity list; if you see "Page 1 of 10" or "Confidential" as entities, the input is too noisy.  
Fix: clean and deduplicate documents before indexing; filter short/boilerplate chunks upstream.

**Local search returns irrelevant results despite correct global search**  
Why: entity subgraph traversal depends on correct entity extraction; proper nouns or technical terms the LLM misses become orphan nodes.  
Detect: run the same query as both local and global search; if global is accurate and local is not, the entity graph is incomplete.  
Fix: review entity extraction prompts; add domain-specific examples for rare technical entities.

**Cypher queries fail or return empty results with LangChain integration**  
Why: the LLM-generated Cypher query syntax doesn't match the Neo4j schema or uses relationship names that don't exist.  
Detect: enable `verbose=True` on `GraphCypherQAChain`; read the generated Cypher and run it manually in Neo4j Browser.  
Fix: provide the schema explicitly in the chain's system prompt; restrict allowed relationship types.

**LazyGraphRAG quality gap is unacceptable for synthesis queries**  
Why: NLP noun-phrase extraction misses semantic relationships that full LLM entity extraction captures.  
Detect: run the same synthesis query on LazyGraphRAG and a 100-doc full GraphRAG sample; compare coherence.  
Fix: if quality gap exceeds tolerance, invest in full GraphRAG indexing for the high-value subset of documents.

## Connections

- [[rag/pipeline]] — standard RAG pipeline, where GraphRAG fits as an alternative
- [[rag/hybrid-retrieval]] — combine graph retrieval with vector retrieval
- [[agents/langgraph]] — LangGraph (different thing — graph-based agent runtime)
- [[infra/vector-stores]] — vector stores used alongside the knowledge graph

## Open Questions

- In practice, how often do production RAG systems actually need GraphRAG vs hybrid retrieval + reranking?
- Does LazyGraphRAG's quality gap close further for smaller, denser knowledge corpora vs large document sets?
- How does Neo4j integration via LangChain compare to Microsoft's own GraphRAG library for enterprise deployments?
