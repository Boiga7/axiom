---
type: concept
category: infra
tags: [caching, redis, semantic-cache, llm, cost, latency, vector-similarity]
sources: []
updated: 2026-04-29
para: resource
tldr: LLM response caching combines semantic caching (Redis + vector similarity, eliminates API calls on hits) with Anthropic prompt caching (reduces token cost to 0.1x on repeated prefixes) — complementary strategies at different layers.
---

# LLM Response Caching

> **TL;DR** LLM response caching combines semantic caching (Redis + vector similarity, eliminates API calls on hits) with Anthropic prompt caching (reduces token cost to 0.1x on repeated prefixes) — complementary strategies at different layers.

Caching LLM responses reduces latency and cost by returning stored answers instead of making API calls. Two distinct strategies: **exact caching** (same prompt → same result) and **semantic caching** (similar prompt → reuse stored answer). For LLM applications, semantic caching is the more powerful tool.

---

## The Two Caching Layers

```
User query
    ↓
[1] Semantic cache lookup  ← Redis + vector similarity
    ↓ cache miss
[2] Prompt cache (Anthropic)  ← automatic on system prompt prefix
    ↓
LLM API call
    ↓
Store response in semantic cache
    ↓
Return answer
```

These are complementary. Prompt caching (handled by Anthropic's API) reduces input token cost on every call. Semantic caching eliminates the API call entirely on cache hits.

---

## Semantic Caching

The idea: embed the user's query, store the (embedding, response) pair in Redis, and on future queries check if any stored embedding is close enough to reuse the response.

### Architecture

```
Query → Embed → Vector similarity search in Redis
    ↓                          ↓
  hit: return cached response   miss: call LLM, embed, store
```

Similarity threshold is the key tuning parameter — typically cosine similarity ≥ 0.93.

### Implementation

```python
import hashlib
import json
import numpy as np
import redis
from anthropic import Anthropic

client = Anthropic()
r = redis.Redis(host="localhost", port=6379, decode_responses=True)

SIMILARITY_THRESHOLD = 0.93
CACHE_TTL = 3600  # 1 hour


def embed(text: str) -> list[float]:
    """Use any embedding model — OpenAI, Cohere, or local."""
    import openai
    response = openai.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


def cosine_similarity(a: list[float], b: list[float]) -> float:
    a, b = np.array(a), np.array(b)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def cache_lookup(query: str) -> str | None:
    query_embedding = embed(query)

    # Scan cached keys (use Redis Search / RediSearch in production)
    for key in r.scan_iter("llm_cache:*"):
        stored = json.loads(r.get(key))
        similarity = cosine_similarity(query_embedding, stored["embedding"])
        if similarity >= SIMILARITY_THRESHOLD:
            return stored["response"]

    return None


def cache_store(query: str, response: str) -> None:
    embedding = embed(query)
    key = f"llm_cache:{hashlib.sha256(query.encode()).hexdigest()}"
    r.setex(
        key,
        CACHE_TTL,
        json.dumps({"query": query, "embedding": embedding, "response": response}),
    )


def cached_llm_call(query: str) -> tuple[str, bool]:
    """Returns (response, cache_hit)."""
    cached = cache_lookup(query)
    if cached:
        return cached, True

    response = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=512,
        messages=[{"role": "user", "content": query}],
    )
    answer = response.content[0].text
    cache_store(query, answer)
    return answer, False
```

### Production: Redis with RediSearch

Scanning all keys is O(n). In production, use **RediSearch** with vector indexing for O(log n) nearest-neighbour lookup:

```python
from redis.commands.search.field import VectorField, TextField
from redis.commands.search.indexDefinition import IndexDefinition, IndexType
from redis.commands.search.query import Query
import numpy as np

# Create index once on startup
def create_index(r: redis.Redis) -> None:
    try:
        r.ft("llm_cache_idx").info()
    except Exception:
        r.ft("llm_cache_idx").create_index(
            fields=[
                TextField("query"),
                TextField("response"),
                VectorField(
                    "embedding",
                    "HNSW",
                    {
                        "TYPE": "FLOAT32",
                        "DIM": 1536,  # text-embedding-3-small dimension
                        "DISTANCE_METRIC": "COSINE",
                    },
                ),
            ],
            definition=IndexDefinition(prefix=["llm_cache:"], index_type=IndexType.HASH),
        )


def semantic_search(r: redis.Redis, query_embedding: list[float], top_k: int = 1) -> list[dict]:
    embedding_bytes = np.array(query_embedding, dtype=np.float32).tobytes()
    q = (
        Query(f"*=>[KNN {top_k} @embedding $vec AS score]")
        .sort_by("score")
        .return_fields("query", "response", "score")
        .dialect(2)
    )
    results = r.ft("llm_cache_idx").search(q, query_params={"vec": embedding_bytes})
    return [
        {
            "query": doc.query,
            "response": doc.response,
            "score": float(doc.score),
        }
        for doc in results.docs
    ]
```

---

## Exact Caching

Simpler: hash the full prompt and store the response. Works for deterministic pipelines where the same prompt string appears repeatedly (e.g., batch processing, nightly reports).

```python
def exact_cache_key(model: str, messages: list[dict]) -> str:
    payload = json.dumps({"model": model, "messages": messages}, sort_keys=True)
    return f"exact:{hashlib.sha256(payload.encode()).hexdigest()}"


def exact_cached_call(model: str, messages: list[dict], ttl: int = 3600) -> str:
    key = exact_cache_key(model, messages)
    cached = r.get(key)
    if cached:
        return cached

    response = client.messages.create(model=model, max_tokens=512, messages=messages)
    answer = response.content[0].text
    r.setex(key, ttl, answer)
    return answer
```

---

## When to Cache vs Not

| Use case | Cache type | Rationale |
|---|---|---|
| FAQ chatbot, support bot | Semantic | High query repetition, same questions phrased differently |
| Document Q&A over a fixed corpus | Semantic | Same questions, deterministic context |
| Nightly batch reports | Exact | Identical prompts each run |
| Creative writing | None | Output should vary; caching undermines intent |
| Code generation | Exact only | Semantic cache risky — slight variation can break code |
| Streaming responses | None (or cache post-stream) | Can't stream a cached string the same way |
| High-stakes decisions (medical, legal) | None | Stale responses can cause harm |
| Real-time data queries (prices, news) | None | Data changes faster than TTL |
| Per-user personalised responses | Exact (per-user key) | Responses include user-specific state |

### The Cache Hit Rate Ceiling

Semantic caching works best when:
- Users ask similar questions from a bounded domain (support, FAQs, documentation Q&A)
- Query volume is high (≥1,000/day) — below this, the embedding overhead may exceed savings
- Corpus is relatively static

Typical hit rates:
- Customer support bots: 30–60%
- Internal knowledge base Q&A: 20–40%
- General-purpose chat: 5–15%

---

## Prompt Caching (Anthropic-side)

Distinct from semantic caching — this is handled automatically by the Anthropic API when you mark prefixes with `cache_control`. You don't need Redis for this.

```python
response = client.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=1024,
    system=[
        {
            "type": "text",
            "text": LARGE_SYSTEM_PROMPT,  # 5,000+ tokens
            "cache_control": {"type": "ephemeral"},  # 5-min TTL, 0.1x read cost
        }
    ],
    messages=[{"role": "user", "content": user_query}],
)
# Check cache hit:
print(response.usage.cache_read_input_tokens)   # > 0 on hit
print(response.usage.cache_creation_input_tokens)  # > 0 on first write
```

Cache tiers:
- `"ephemeral"` — 5-minute TTL, 1.25x write, 0.1x read
- `"persistent"` — 1-hour TTL, 2x write, 0.1x read — use for documents queried repeatedly

Use prompt caching for: system prompts, large RAG context passed on every call, few-shot examples.

---

## Invalidation Strategy

Cache entries go stale when:
- The underlying corpus changes (new documents, updated policies)
- The model is updated (cached responses from old model may be wrong)
- Business rules change

```python
def invalidate_cache(prefix: str = "llm_cache:") -> int:
    """Flush all cache entries matching a prefix."""
    keys = list(r.scan_iter(f"{prefix}*"))
    if keys:
        return r.delete(*keys)
    return 0

# Partial invalidation: tag entries by corpus version
def cache_store_versioned(query: str, response: str, corpus_version: str) -> None:
    embedding = embed(query)
    key = f"llm_cache:{corpus_version}:{hashlib.sha256(query.encode()).hexdigest()}"
    r.setex(key, CACHE_TTL, json.dumps({
        "query": query,
        "embedding": embedding,
        "response": response,
        "corpus_version": corpus_version,
    }))

# On corpus update, flush old version
invalidate_cache(prefix=f"llm_cache:v1:")
```

---

## Observability

Track cache performance in production:

```python
from dataclasses import dataclass, field
from collections import defaultdict

@dataclass
class CacheMetrics:
    hits: int = 0
    misses: int = 0
    latency_hit_ms: list[float] = field(default_factory=list)
    latency_miss_ms: list[float] = field(default_factory=list)

    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total else 0.0

    @property
    def avg_hit_latency(self) -> float:
        return sum(self.latency_hit_ms) / len(self.latency_hit_ms) if self.latency_hit_ms else 0.0

metrics = CacheMetrics()

# Log to Langfuse or your observability platform
langfuse.log_event("cache_hit" if hit else "cache_miss", {"similarity": similarity})
```

---

## Key Facts

- Semantic cache similarity threshold: cosine similarity >= 0.93 (typical starting point)
- Production lookup: use RediSearch with HNSW indexing for O(log n) vs O(n) scan
- Cache TTL: 1 hour is a reasonable default; version-tag entries to enable partial invalidation
- Typical hit rates: support bots 30-60%, internal KB Q&A 20-40%, general chat 5-15%
- Minimum query volume for semantic caching to be worthwhile: ~1,000/day
- Never cache: creative generation, real-time data, high-stakes decisions, streaming responses
- Prompt caching (Anthropic-side) is distinct from Redis semantic caching — it happens inside the API

## Connections

- [[synthesis/cost-optimisation]] — semantic caching in the broader cost reduction strategy
- [[apis/anthropic-api]] — prompt caching via `cache_control` (Anthropic-side, complements Redis caching)
- [[infra/vector-stores]] — Qdrant/Weaviate can also serve as the semantic cache backing store
- [[observability/platforms]] — tracking cache hit rates and latency savings in Langfuse/LangSmith

## Open Questions

- What is the recommended similarity threshold for code-related queries where 0.93 may be too permissive?
- How do you efficiently invalidate semantic cache entries when the underlying document corpus changes?
- Is there a meaningful quality difference between RediSearch HNSW and standalone vector stores for cache lookup?
