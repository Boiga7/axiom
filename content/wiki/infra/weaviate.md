---
type: entity
category: infra
para: resource
tags: [weaviate, vector-store, hybrid-search, graphql, bm25, production]
sources: []
updated: 2026-05-01
tldr: Open-source vector database with built-in hybrid search (BM25 + dense vector), a GraphQL API, and first-class support for module-based vectorisation.
---

# Weaviate

Open-source vector database with built-in hybrid search (BM25 + dense vector), a GraphQL API, and first-class support for module-based vectorisation. Production-ready for high-scale retrieval workloads.

**Use when:** you need hybrid search out of the box, want a production-grade managed option (Weaviate Cloud), or are building multi-tenant RAG applications.

---

## How It Compares

| | Weaviate | pgvector | Pinecone | Qdrant |
|---|---|---|---|---|
| Hybrid search | ✓ Built-in BM25 | Manual (pg_search) | ✓ (managed) | ✓ |
| Self-hosted | ✓ Docker/K8s | ✓ (Postgres) | — | ✓ |
| Managed cloud | ✓ Weaviate Cloud | Via RDS/Supabase | ✓ Only | ✓ |
| GraphQL API | ✓ | — | — | — |
| Multi-tenancy | ✓ Tenant isolation | Manual RLS | — | ✓ |
| Filtering | ✓ Pre/post-filter | ✓ | ✓ | ✓ |
| Best for | Hybrid + modules | Existing Postgres stack | Fully managed simplicity | High-perf open-source |

---

## Core Concepts

- **Collection** (formerly Class): a schema for a set of objects (like a table)
- **Object**: a document with properties + an embedding vector
- **Vectoriser module**: a module (text2vec-openai, text2vec-cohere, text2vec-ollama) that auto-embeds objects on insert
- **Hybrid search**: combines BM25 keyword score and vector similarity score via a weighted fusion

---

## Quick Start — Docker

```yaml
# docker-compose.yml
version: '3.4'
services:
  weaviate:
    image: cr.weaviate.io/semitechnologies/weaviate:1.24.0
    ports:
      - "8080:8080"
      - "50051:50051"
    environment:
      QUERY_DEFAULTS_LIMIT: 25
      AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED: "true"
      PERSISTENCE_DATA_PATH: /var/lib/weaviate
      DEFAULT_VECTORIZER_MODULE: none   # or text2vec-openai
      ENABLE_MODULES: ""
      CLUSTER_HOSTNAME: node1
```

---

## Python Client

```python
import weaviate
from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.query import MetadataQuery

client = weaviate.connect_to_local()   # or connect_to_weaviate_cloud(url, api_key)

# Create a collection
if not client.collections.exists("Document"):
    client.collections.create(
        name="Document",
        vectorizer_config=Configure.Vectorizer.none(),   # bring your own vectors
        properties=[
            Property(name="title", data_type=DataType.TEXT),
            Property(name="content", data_type=DataType.TEXT),
            Property(name="source", data_type=DataType.TEXT),
        ],
    )

collection = client.collections.get("Document")
```

---

## Inserting Objects

```python
import numpy as np

# Insert with pre-computed embeddings
with collection.batch.dynamic() as batch:
    for doc in documents:
        embedding = embed(doc["content"])   # your embedding model
        batch.add_object(
            properties={
                "title": doc["title"],
                "content": doc["content"],
                "source": doc["url"],
            },
            vector=embedding.tolist(),
        )

# Single insert
collection.data.insert(
    properties={"title": "Test", "content": "Hello world"},
    vector=embed("Hello world").tolist(),
)
```

---

## Querying

```python
# Pure vector search
results = collection.query.near_vector(
    near_vector=embed(query).tolist(),
    limit=5,
    return_metadata=MetadataQuery(distance=True),
)

# Hybrid search (BM25 + vector) — Weaviate's killer feature
results = collection.query.hybrid(
    query=query_text,          # BM25 uses this
    vector=embed(query_text).tolist(),   # vector uses this
    alpha=0.75,                # 0 = pure BM25, 1 = pure vector, 0.75 = mostly vector
    limit=10,
    return_metadata=MetadataQuery(score=True),
)

for obj in results.objects:
    print(obj.properties["title"])
    print(obj.metadata.score)

# Filtered search
from weaviate.classes.query import Filter

results = collection.query.hybrid(
    query=query_text,
    vector=embed(query_text).tolist(),
    filters=Filter.by_property("source").equal("docs.anthropic.com"),
    limit=5,
)
```

---

## Multi-Tenancy

Weaviate supports tenant isolation. Each tenant has their own shard within a collection. Essential for SaaS RAG applications.

```python
# Create collection with multi-tenancy enabled
client.collections.create(
    name="UserDocument",
    multi_tenancy_config=Configure.multi_tenancy(enabled=True),
    properties=[Property(name="content", data_type=DataType.TEXT)],
)

collection = client.collections.get("UserDocument")

# Add tenants
collection.tenants.create(["user-abc", "user-xyz"])

# Insert for a specific tenant
tenant_collection = collection.with_tenant("user-abc")
tenant_collection.data.insert(
    properties={"content": "user-abc's private document"},
    vector=embed("user-abc's private document").tolist(),
)

# Query is isolated to tenant
results = tenant_collection.query.hybrid(query="private doc", limit=5)
```

---

## Weaviate Cloud (Managed)

```python
import weaviate
from weaviate.auth import AuthApiKey

client = weaviate.connect_to_weaviate_cloud(
    cluster_url="https://your-cluster.weaviate.network",
    auth_credentials=AuthApiKey("your-api-key"),
)
```

Tiers: Sandbox (free, 14-day expiry), Standard (SLA, auto-scaling), Enterprise (dedicated).

---

## Key Facts

- Open-source (BSD-3); Weaviate Cloud for managed; `pip install weaviate-client`
- Hybrid search: weighted fusion of BM25 + dense vector (alpha=0.75 default — mostly vector)
- Multi-tenancy: built-in tenant isolation; each tenant is a separate shard
- GraphQL API: powerful querying, filtering, aggregation directly from HTTP
- Auto-vectorisation: modules (text2vec-openai, text2vec-cohere) embed on insert if configured
- v4 Python client (current): `weaviate.connect_to_local()`, `collection.query.hybrid()`

---

## Common Failure Cases

**Hybrid search returns worse results than pure vector search due to BM25/vector score mismatch**  
Why: BM25 scores and cosine similarity scores are on different scales; Weaviate's default weighted fusion can over-weight BM25 for short keyword queries where BM25 variance is high.  
Detect: `alpha=0.75` hybrid results have lower relevance than `near_vector` alone on your eval set; top results contain exact keyword matches that are semantically irrelevant.  
Fix: tune `alpha` — start at 0.5 and evaluate; for semantic queries, increase alpha toward 1.0; for keyword-critical queries (product codes, IDs), decrease toward 0.

**Multi-tenancy query returns results from the wrong tenant**  
Why: querying `collection` directly (without `.with_tenant()`) runs across all tenants; in a multi-tenant setup this leaks cross-tenant data.  
Detect: search results include documents from other users; `source` property shows an unexpected tenant's data.  
Fix: always use `collection.with_tenant(tenant_id)` before any query or insert in multi-tenant collections; add an assertion that `tenant_id` is non-empty before constructing the tenant collection reference.

**Batch insert silently drops objects when a property value exceeds the data type constraint**  
Why: `batch.add_object()` in dynamic batch mode buffers failures and continues; objects with invalid property values (e.g., a TEXT property receiving a list) are silently skipped.  
Detect: inserted object count is lower than expected; `batch.number_errors` is non-zero after the `with` block exits.  
Fix: check `batch.failed_objects` after every batch; log failed objects with their error messages; validate property types before insertion.

**Weaviate Docker container loses all data on restart because persistence path is not mounted**  
Why: `PERSISTENCE_DATA_PATH=/var/lib/weaviate` inside the container is not mapped to a host volume; container restart wipes the data.  
Detect: collections and objects disappear after `docker compose restart`; starting fresh with an empty collection.  
Fix: add `- ./weaviate_data:/var/lib/weaviate` to the volumes section in `docker-compose.yml`; verify the path is writable.

**v4 Python client `connect_to_local()` raises `WeaviateConnectionError` when gRPC port is not exposed**  
Why: Weaviate v4 client uses gRPC (port 50051) for data operations; if only port 8080 is mapped, the v4 client fails to connect even though the REST API is reachable.  
Detect: `WeaviateConnectionError: Failed to connect to Weaviate` despite the container running; the REST endpoint responds on 8080 but the client errors.  
Fix: expose both ports in docker-compose: `- "8080:8080"` and `- "50051:50051"`; or use `connect_to_local(grpc_port=50051)` to confirm the gRPC channel explicitly.

## Connections

[[infra/vector-stores]] · [[rag/pipeline]] · [[rag/reranking]] · [[rag/ragas]] · [[observability/arize]]
